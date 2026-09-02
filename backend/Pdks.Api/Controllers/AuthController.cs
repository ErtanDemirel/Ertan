using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly PasswordHasher _hasher;
    private readonly TokenService _tokens;
    private readonly ISmsSender _sms;
    private readonly AuditService _audit;
    private readonly OtpOptions _otp;
    private readonly JwtOptions _jwt;
    private readonly ILogger<AuthController> _log;

    public AuthController(AppDbContext db, PasswordHasher hasher, TokenService tokens,
        ISmsSender sms, AuditService audit, IOptions<OtpOptions> otp, IOptions<JwtOptions> jwt,
        ILogger<AuthController> log)
    {
        _db = db; _hasher = hasher; _tokens = tokens; _sms = sms; _audit = audit;
        _otp = otp.Value; _jwt = jwt.Value; _log = log;
    }

    private string? Ip() => HttpContext.Connection.RemoteIpAddress?.ToString();

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.Personnel)
            .FirstOrDefaultAsync(u => u.Username == req.Username, ct);

        // Hesap kilidi kontrolü (brute-force koruması)
        if (user is not null && user.LockoutEnd is not null && user.LockoutEnd > DateTime.UtcNow)
        {
            await _audit.LogAsync("auth.login.locked", user.Id, req.Username, Ip(), ct);
            return StatusCode(StatusCodes.Status423Locked, new
            {
                message = "Hesabınız çok fazla hatalı denemeden dolayı geçici olarak kilitlendi. Lütfen biraz sonra tekrar deneyin."
            });
        }

        // Zamanlama saldırılarına karşı: kullanıcı yoksa da doğrulama süresi harca
        var ok = user is not null && user.IsActive
                 && _hasher.Verify(req.Password, user.PasswordHash, user.PasswordSalt);
        if (!ok)
        {
            if (user is not null)
            {
                user.FailedLoginCount++;
                if (user.FailedLoginCount >= MaxFailedAttempts)
                {
                    user.LockoutEnd = DateTime.UtcNow.Add(LockoutDuration);
                    user.FailedLoginCount = 0;
                }
                await _db.SaveChangesAsync(ct);
            }
            await _audit.LogAsync("auth.login.fail", user?.Id, req.Username, Ip(), ct);
            return Unauthorized(new { message = "Kullanıcı adı veya şifre hatalı." });
        }

        user!.LastLoginAt = DateTime.UtcNow;
        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        var auth = await BuildAuthResponseAsync(user, ct);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("auth.login.ok", user.Id, req.Username, Ip(), ct);
        return Ok(auth);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest req, CancellationToken ct)
    {
        var token = await _db.RefreshTokens
            .Include(t => t.User).ThenInclude(u => u!.Personnel)
            .FirstOrDefaultAsync(t => t.Token == req.RefreshToken, ct);

        if (token is null || token.IsRevoked || token.ExpiresAt < DateTime.UtcNow || token.User is null)
            return Unauthorized(new { message = "Oturum süresi doldu, tekrar giriş yapın." });

        token.IsRevoked = true; // rotate
        var auth = await BuildAuthResponseAsync(token.User, ct);
        await _db.SaveChangesAsync(ct);
        return Ok(auth);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest req, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username, ct);

        // Kullanıcı numarasını ifşa etmemek için her durumda aynı yanıt.
        if (user is not null && user.IsActive && !string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            // Önceki kullanılmamış kodları geçersiz kıl
            var old = await _db.PasswordResetCodes
                .Where(c => c.UserId == user.Id && !c.IsUsed)
                .ToListAsync(ct);
            old.ForEach(c => c.IsUsed = true);

            var code = GenerateNumericCode(_otp.Length);
            var (hash, salt) = _hasher.Hash(code);
            _db.PasswordResetCodes.Add(new PasswordResetCode
            {
                UserId = user.Id,
                CodeHash = $"{salt}:{hash}",
                ExpiresAt = DateTime.UtcNow.AddMinutes(_otp.ExpiryMinutes),
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);

            await _sms.SendAsync(user.PhoneNumber!,
                $"COKO-SIS sifre sifirlama kodunuz: {code}. {_otp.ExpiryMinutes} dk gecerlidir.", ct);
        }

        return Ok(new { message = "Telefon numaranıza bir doğrulama kodu gönderildi (kayıtlıysa)." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest req, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username, ct);
        if (user is null)
            return BadRequest(new { message = "Kod geçersiz veya süresi dolmuş." });

        var reset = await _db.PasswordResetCodes
            .Where(c => c.UserId == user.Id && !c.IsUsed)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (reset is null || reset.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "Kod geçersiz veya süresi dolmuş." });

        if (reset.AttemptCount >= _otp.MaxAttempts)
        {
            reset.IsUsed = true;
            await _db.SaveChangesAsync(ct);
            return BadRequest(new { message = "Çok fazla hatalı deneme. Yeni kod isteyin." });
        }

        var parts = reset.CodeHash.Split(':', 2);
        var valid = parts.Length == 2 && _hasher.Verify(req.Code, parts[1], parts[0]);
        if (!valid)
        {
            reset.AttemptCount++;
            await _db.SaveChangesAsync(ct);
            return BadRequest(new { message = "Kod hatalı." });
        }

        if (!PasswordPolicy.IsValid(req.NewPassword, out var policyError))
            return BadRequest(new { message = policyError });

        var (hash, salt) = _hasher.Hash(req.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        reset.IsUsed = true;

        // Tüm aktif oturumları sonlandır
        var sessions = await _db.RefreshTokens.Where(t => t.UserId == user.Id && !t.IsRevoked).ToListAsync(ct);
        sessions.ForEach(s => s.IsRevoked = true);

        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Şifreniz güncellendi. Yeni şifreyle giriş yapabilirsiniz." });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == User.GetUserId(), ct);
        if (user is null) return Unauthorized();

        if (!_hasher.Verify(req.CurrentPassword, user.PasswordHash, user.PasswordSalt))
            return BadRequest(new { message = "Mevcut şifre hatalı." });

        if (!PasswordPolicy.IsValid(req.NewPassword, out var policyError))
            return BadRequest(new { message = policyError });

        var (hash, salt) = _hasher.Hash(req.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("auth.password.change", user.Id, null, Ip(), ct);
        return Ok(new { message = "Şifre güncellendi." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserInfo>> Me(CancellationToken ct)
    {
        var user = await _db.Users.Include(u => u.Personnel)
            .FirstOrDefaultAsync(u => u.Id == User.GetUserId(), ct);
        if (user is null) return Unauthorized();
        return Ok(ToUserInfo(user));
    }

    // ---- helpers ----
    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct)
    {
        var access = _tokens.CreateAccessToken(user);
        var refresh = _tokens.CreateRefreshToken();
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refresh,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays)
        });
        _ = ct;
        return new AuthResponse(
            access, refresh,
            DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes),
            ToUserInfo(user));
    }

    private static UserInfo ToUserInfo(User u) => new(
        u.Id, u.Username, u.Role.ToString(), u.PersonnelId,
        u.Personnel is null ? null : $"{u.Personnel.FirstName} {u.Personnel.LastName}",
        u.CanDistributePayroll);

    private static string GenerateNumericCode(int length)
    {
        var digits = new char[length];
        for (int i = 0; i < length; i++)
            digits[i] = (char)('0' + RandomNumberGenerator.GetInt32(0, 10));
        return new string(digits);
    }
}
