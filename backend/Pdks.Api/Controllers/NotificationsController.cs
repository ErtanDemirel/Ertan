using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

public record RegisterDeviceRequest(string Token, string? Platform);

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    /// <summary>Mobil cihazın push token'ını kaydeder/günceller (giriş yapan kullanıcıya bağlar).</summary>
    [HttpPost("register-device")]
    public async Task<IActionResult> RegisterDevice(RegisterDeviceRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
            return BadRequest(new { message = "Token gerekli." });

        var uid = User.GetUserId();
        var existing = await _db.PushTokens.FirstOrDefaultAsync(t => t.Token == req.Token, ct);
        if (existing is null)
        {
            _db.PushTokens.Add(new PushToken
            {
                UserId = uid, Token = req.Token.Trim(), Platform = req.Platform,
                IsActive = true, CreatedAt = DateTime.UtcNow, LastUsedAt = DateTime.UtcNow
            });
        }
        else
        {
            // Aynı cihaz başka bir kullanıcıya taşınmış olabilir (cihaz devri) → sahibi güncelle.
            existing.UserId = uid;
            existing.Platform = req.Platform ?? existing.Platform;
            existing.IsActive = true;
            existing.LastUsedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Cihaz kaydedildi." });
    }

    /// <summary>Cihazın push kaydını kaldırır (çıkışta çağrılır).</summary>
    [HttpPost("unregister-device")]
    public async Task<IActionResult> UnregisterDevice(RegisterDeviceRequest req, CancellationToken ct)
    {
        var uid = User.GetUserId();
        var tok = await _db.PushTokens.FirstOrDefaultAsync(t => t.Token == req.Token && t.UserId == uid, ct);
        if (tok is not null) { _db.PushTokens.Remove(tok); await _db.SaveChangesAsync(ct); }
        return Ok(new { message = "Cihaz kaydı kaldırıldı." });
    }

    [HttpGet("my")]
    public async Task<ActionResult<object>> My(CancellationToken ct)
    {
        var uid = User.GetUserId();
        var items = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == uid)
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .Select(n => new { n.Id, n.Title, n.Body, n.Type, n.IsRead, n.CreatedAt })
            .ToListAsync(ct);
        var unread = items.Count(i => !i.IsRead);
        return Ok(new { items, unread });
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> Read(int id, CancellationToken ct)
    {
        var uid = User.GetUserId();
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == uid, ct);
        if (n is null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Okundu." });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll(CancellationToken ct)
    {
        var uid = User.GetUserId();
        var items = await _db.Notifications.Where(n => n.UserId == uid && !n.IsRead).ToListAsync(ct);
        items.ForEach(n => n.IsRead = true);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Tümü okundu." });
    }
}
