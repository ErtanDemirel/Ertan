using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

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
