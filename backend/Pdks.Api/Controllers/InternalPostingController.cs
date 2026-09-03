using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>
/// İç ilanlar: yetkililer açar, personel başvurur, İK değerlendirir.
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public class InternalPostingController : ControllerBase
{
    private readonly AppDbContext _db;
    public InternalPostingController(AppDbContext db) => _db = db;

    // ---------- İlanlar ----------
    /// <summary>Açık ilanlar (personel için başvuru durumu ile). all=true ise pasifler de gelir (yönetici).</summary>
    [HttpGet("internal-postings")]
    public async Task<ActionResult<IEnumerable<InternalPostingDto>>> List([FromQuery] bool all, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        var q = _db.InternalPostings.AsQueryable();
        if (!(all && User.IsManagerOrAdmin())) q = q.Where(p => p.IsActive);
        var rows = await q.OrderByDescending(p => p.CreatedAt).AsNoTracking().ToListAsync(ct);

        var ids = rows.Select(r => r.Id).ToList();
        var apps = await _db.InternalApplications.Where(a => ids.Contains(a.PostingId)).AsNoTracking().ToListAsync(ct);
        var counts = apps.GroupBy(a => a.PostingId).ToDictionary(g => g.Key, g => g.Count());
        var mine = apps.Where(a => a.PersonnelId == pid).ToDictionary(a => a.PostingId);

        return Ok(rows.Select(p =>
        {
            var my = mine.GetValueOrDefault(p.Id);
            return new InternalPostingDto(p.Id, p.Title, p.Description, p.Department, p.Location,
                p.PositionCount, p.Deadline, p.IsActive, p.CreatedAt,
                counts.GetValueOrDefault(p.Id), my is not null, my?.Status.ToString());
        }).ToList());
    }

    [HttpPost("internal-postings")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<InternalPostingDto>> Create(CreatePostingRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest(new { message = "Başlık zorunludur." });
        var p = new InternalPosting
        {
            Title = req.Title.Trim(), Description = req.Description?.Trim(),
            Department = req.Department?.Trim(), Location = req.Location?.Trim(),
            PositionCount = req.PositionCount, Deadline = req.Deadline, IsActive = req.IsActive,
            CreatedByUserId = User.GetUserId(), CreatedAt = DateTime.UtcNow
        };
        _db.InternalPostings.Add(p);
        await _db.SaveChangesAsync(ct);
        return Ok(new InternalPostingDto(p.Id, p.Title, p.Description, p.Department, p.Location,
            p.PositionCount, p.Deadline, p.IsActive, p.CreatedAt, 0, false, null));
    }

    [HttpPut("internal-postings/{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(int id, CreatePostingRequest req, CancellationToken ct)
    {
        var p = await _db.InternalPostings.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return NotFound();
        p.Title = req.Title.Trim(); p.Description = req.Description?.Trim();
        p.Department = req.Department?.Trim(); p.Location = req.Location?.Trim();
        p.PositionCount = req.PositionCount; p.Deadline = req.Deadline; p.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "İlan güncellendi." });
    }

    // ---------- Başvuru ----------
    [HttpPost("internal-postings/{id:int}/apply")]
    public async Task<ActionResult<InternalApplicationDto>> Apply(int id, ApplyPostingRequest req, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return BadRequest(new { message = "Bu hesap bir personel kaydına bağlı değil." });

        var posting = await _db.InternalPostings.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (posting is null) return NotFound();
        if (!posting.IsActive) return BadRequest(new { message = "İlan kapanmış." });
        if (posting.Deadline is not null && posting.Deadline < DateOnly.FromDateTime(DateTime.UtcNow))
            return BadRequest(new { message = "Son başvuru tarihi geçti." });

        if (await _db.InternalApplications.AnyAsync(a => a.PostingId == id && a.PersonnelId == pid, ct))
            return BadRequest(new { message = "Bu ilana zaten başvurdunuz." });

        var app = new InternalApplication
        {
            PostingId = id, PersonnelId = pid.Value, Note = req.Note?.Trim(),
            Status = ApplicationStatus.New, CreatedAt = DateTime.UtcNow
        };
        _db.InternalApplications.Add(app);
        await _db.SaveChangesAsync(ct);
        app = await _db.InternalApplications.Include(a => a.Posting).Include(a => a.Personnel)
            .FirstAsync(a => a.Id == app.Id, ct);
        return Ok(Map(app));
    }

    /// <summary>Personelin kendi başvuruları.</summary>
    [HttpGet("internal-postings/my-applications")]
    public async Task<ActionResult<IEnumerable<InternalApplicationDto>>> MyApplications(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(Array.Empty<InternalApplicationDto>());
        var rows = await _db.InternalApplications.Include(a => a.Posting).Include(a => a.Personnel)
            .Where(a => a.PersonnelId == pid).OrderByDescending(a => a.CreatedAt).AsNoTracking().ToListAsync(ct);
        return Ok(rows.Select(Map).ToList());
    }

    /// <summary>İK/Amir: bir ilanın başvuruları.</summary>
    [HttpGet("internal-postings/{id:int}/applications")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<InternalApplicationDto>>> Applications(int id, CancellationToken ct)
    {
        var rows = await _db.InternalApplications.Include(a => a.Posting).Include(a => a.Personnel)
            .Where(a => a.PostingId == id).OrderByDescending(a => a.CreatedAt).AsNoTracking().ToListAsync(ct);
        return Ok(rows.Select(Map).ToList());
    }

    /// <summary>İK/Amir: başvuruyu değerlendir (durum + not).</summary>
    [HttpPost("internal-applications/{id:int}/decide")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<InternalApplicationDto>> Decide(int id, DecideApplicationRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<ApplicationStatus>(req.Status, true, out var st))
            return BadRequest(new { message = "Geçersiz durum." });
        var app = await _db.InternalApplications.Include(a => a.Posting).Include(a => a.Personnel)
            .FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return NotFound();
        app.Status = st;
        app.HandlerComment = req.Comment;
        app.HandledByUserId = User.GetUserId();
        app.HandledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(Map(app));
    }

    private static InternalApplicationDto Map(InternalApplication a) => new(
        a.Id, a.PostingId, a.Posting?.Title ?? "", a.PersonnelId,
        a.Personnel is null ? "" : $"{a.Personnel.FirstName} {a.Personnel.LastName}",
        a.Personnel?.SicilNo, a.Personnel?.Department, a.Note, a.Status.ToString(),
        a.HandlerComment, a.CreatedAt, a.HandledAt);
}
