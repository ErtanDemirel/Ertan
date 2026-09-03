using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>
/// Çalışan sesi: öneri, şikayet, ramak kala (iş güvenliği), dilek/istek.
/// Personel gönderir (isteğe bağlı anonim); Amir/Admin görüntüler ve durum günceller.
/// </summary>
[ApiController]
[Route("api/voice")]
[Authorize]
public class FeedbackController : ControllerBase
{
    private readonly AppDbContext _db;
    public FeedbackController(AppDbContext db) => _db = db;

    /// <summary>Yeni çalışan sesi kaydı oluşturur.</summary>
    [HttpPost]
    public async Task<ActionResult<FeedbackDto>> Create(CreateFeedbackRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<FeedbackKind>(req.Kind, true, out var kind))
            return BadRequest(new { message = "Geçersiz tür." });
        if (string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Açıklama zorunludur." });

        var pid = User.GetPersonnelId();
        var item = new FeedbackItem
        {
            PersonnelId = req.IsAnonymous ? null : pid,
            Kind = kind,
            Title = req.Title?.Trim(),
            Body = req.Body.Trim(),
            Location = req.Location?.Trim(),
            IsAnonymous = req.IsAnonymous,
            Status = FeedbackStatus.New,
            CreatedAt = DateTime.UtcNow
        };
        _db.FeedbackItems.Add(item);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(item, null));
    }

    /// <summary>Aktif kullanıcının kendi (anonim olmayan) kayıtları.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<FeedbackDto>>> My(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(Array.Empty<FeedbackDto>());
        var rows = await _db.FeedbackItems
            .Where(f => f.PersonnelId == pid)
            .OrderByDescending(f => f.CreatedAt)
            .AsNoTracking().ToListAsync(ct);
        return Ok(rows.Select(f => Map(f, null)).ToList());
    }

    /// <summary>Amir/Admin: tüm kayıtlar (tür + durum filtresiyle).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<FeedbackDto>>> List(
        [FromQuery] string? kind, [FromQuery] string? status, CancellationToken ct)
    {
        var q = _db.FeedbackItems.Include(f => f.Personnel).AsQueryable();
        if (Enum.TryParse<FeedbackKind>(kind, true, out var k)) q = q.Where(f => f.Kind == k);
        if (Enum.TryParse<FeedbackStatus>(status, true, out var s)) q = q.Where(f => f.Status == s);
        var rows = await q.OrderByDescending(f => f.CreatedAt).Take(500).AsNoTracking().ToListAsync(ct);
        return Ok(rows.Select(f => Map(f, f.Personnel)).ToList());
    }

    /// <summary>Amir/Admin: durum + not günceller.</summary>
    [HttpPost("{id:int}/status")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<FeedbackDto>> UpdateStatus(int id, UpdateFeedbackStatusRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<FeedbackStatus>(req.Status, true, out var st))
            return BadRequest(new { message = "Geçersiz durum." });
        var item = await _db.FeedbackItems.Include(f => f.Personnel).FirstOrDefaultAsync(f => f.Id == id, ct);
        if (item is null) return NotFound();

        item.Status = st;
        item.HandlerComment = req.Comment;
        item.HandledByUserId = User.GetUserId();
        item.HandledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(Map(item, item.Personnel));
    }

    private static FeedbackDto Map(FeedbackItem f, Personnel? p) => new(
        f.Id, f.Kind.ToString(), f.Title, f.Body, f.Location, f.IsAnonymous, f.Status.ToString(),
        f.IsAnonymous ? null : (p is null ? null : $"{p.FirstName} {p.LastName}"),
        f.IsAnonymous ? null : p?.SicilNo,
        f.HandlerComment, f.CreatedAt, f.HandledAt);
}
