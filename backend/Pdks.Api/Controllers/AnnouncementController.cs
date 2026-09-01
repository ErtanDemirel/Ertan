using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementController : ControllerBase
{
    private readonly AppDbContext _db;
    public AnnouncementController(AppDbContext db) => _db = db;

    /// <summary>Kullanıcının duyuruları (okundu bilgisiyle).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AnnouncementDto>>> List(CancellationToken ct)
    {
        var uid = User.GetUserId();
        var now = DateTime.UtcNow;
        var items = await _db.Announcements
            .Include(a => a.PublishedBy)
            .Where(a => a.IsActive && (a.ExpiresAt == null || a.ExpiresAt > now))
            .OrderByDescending(a => a.PublishedAt)
            .AsNoTracking()
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Body, a.IsMandatory, a.IsActive,
                a.PublishedBy!.Username, a.PublishedAt, a.ExpiresAt,
                a.Reads.Any(r => r.UserId == uid),
                a.Reads.Count))
            .ToListAsync(ct);
        return Ok(items);
    }

    /// <summary>Mobil için: henüz okunmamış ZORUNLU duyurular (okunmadan geçilemez).</summary>
    [HttpGet("unread-mandatory")]
    public async Task<ActionResult<IEnumerable<AnnouncementDto>>> UnreadMandatory(CancellationToken ct)
    {
        var uid = User.GetUserId();
        var now = DateTime.UtcNow;
        var items = await _db.Announcements
            .Include(a => a.PublishedBy)
            .Where(a => a.IsActive && a.IsMandatory
                        && (a.ExpiresAt == null || a.ExpiresAt > now)
                        && !a.Reads.Any(r => r.UserId == uid))
            .OrderByDescending(a => a.PublishedAt)
            .AsNoTracking()
            .Select(a => new AnnouncementDto(
                a.Id, a.Title, a.Body, a.IsMandatory, a.IsActive,
                a.PublishedBy!.Username, a.PublishedAt, a.ExpiresAt, false, a.Reads.Count))
            .ToListAsync(ct);
        return Ok(items);
    }

    /// <summary>"Okudum" onayı. Aynı kullanıcı için tekilleştirilir.</summary>
    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken ct)
    {
        var uid = User.GetUserId();
        var exists = await _db.Announcements.AnyAsync(a => a.Id == id, ct);
        if (!exists) return NotFound();

        var already = await _db.AnnouncementReads
            .AnyAsync(r => r.AnnouncementId == id && r.UserId == uid, ct);
        if (!already)
        {
            _db.AnnouncementReads.Add(new AnnouncementRead
            {
                AnnouncementId = id,
                UserId = uid,
                ReadAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }
        return Ok(new { message = "Okundu olarak işaretlendi." });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<AnnouncementDto>> Create(AnnouncementRequest req, CancellationToken ct)
    {
        var a = new Announcement
        {
            Title = req.Title.Trim(),
            Body = req.Body,
            IsMandatory = req.IsMandatory,
            ExpiresAt = req.ExpiresAt,
            PublishedByUserId = User.GetUserId(),
            PublishedAt = DateTime.UtcNow,
            IsActive = true
        };
        _db.Announcements.Add(a);
        await _db.SaveChangesAsync(ct);
        return Ok(new AnnouncementDto(a.Id, a.Title, a.Body, a.IsMandatory, a.IsActive,
            User.Identity?.Name ?? "", a.PublishedAt, a.ExpiresAt, false, 0));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(int id, AnnouncementRequest req, CancellationToken ct)
    {
        var a = await _db.Announcements.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a is null) return NotFound();
        a.Title = req.Title.Trim();
        a.Body = req.Body;
        a.IsMandatory = req.IsMandatory;
        a.ExpiresAt = req.ExpiresAt;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Duyuru güncellendi." });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var a = await _db.Announcements.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a is null) return NotFound();
        a.IsActive = false; // arşivle
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Kimler okudu / okumadı istatistiği.</summary>
    [HttpGet("{id:int}/read-stats")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<AnnouncementReadStatDto>>> ReadStats(int id, CancellationToken ct)
    {
        var reads = await _db.AnnouncementReads
            .Where(r => r.AnnouncementId == id)
            .ToDictionaryAsync(r => r.UserId, r => r.ReadAt, ct);

        var users = await _db.Users
            .Include(u => u.Personnel)
            .Where(u => u.IsActive && u.Role == UserRole.Personnel)
            .AsNoTracking()
            .Select(u => new
            {
                u.Id,
                Name = u.Personnel != null ? u.Personnel.FirstName + " " + u.Personnel.LastName : u.Username,
                Sicil = u.Personnel != null ? u.Personnel.SicilNo : null
            })
            .ToListAsync(ct);

        var stats = users.Select(u => new AnnouncementReadStatDto(
            u.Id, u.Name, u.Sicil,
            reads.ContainsKey(u.Id),
            reads.TryGetValue(u.Id, out var t) ? t : null)).ToList();

        return Ok(stats);
    }
}
