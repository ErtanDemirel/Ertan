using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuditService _audit;
    public UsersController(AppDbContext db, AuditService audit) { _db = db; _audit = audit; }

    [HttpGet]
    public async Task<ActionResult<object>> List(CancellationToken ct)
    {
        var rows = await _db.Users.Include(u => u.Personnel).AsNoTracking()
            .OrderBy(u => u.Username)
            .Select(u => new
            {
                u.Id, u.Username, Role = u.Role.ToString(), u.IsActive,
                u.CanDistributePayroll,
                FullName = u.Personnel != null ? u.Personnel.FirstName + " " + u.Personnel.LastName : null
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    public record PayrollPermissionRequest(bool Enabled);

    /// <summary>Kullanıcıya bordro dağıtım yetkisi verir/alır.</summary>
    [HttpPost("{id:int}/payroll-permission")]
    public async Task<IActionResult> SetPayrollPermission(int id, PayrollPermissionRequest req, CancellationToken ct)
    {
        var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u is null) return NotFound();
        u.CanDistributePayroll = req.Enabled;
        // Yetki değişince mevcut oturumlar (eski claim) geçersiz olsun
        var sessions = await _db.RefreshTokens.Where(t => t.UserId == id && !t.IsRevoked).ToListAsync(ct);
        sessions.ForEach(s => s.IsRevoked = true);
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("user.payroll_permission", User.GetUserId(),
            $"user={id} enabled={req.Enabled}", HttpContext.Connection.RemoteIpAddress?.ToString(), ct);
        return Ok(new { message = req.Enabled ? "Bordro yetkisi verildi." : "Bordro yetkisi kaldırıldı. Kullanıcı yeniden giriş yapmalı." });
    }
}
