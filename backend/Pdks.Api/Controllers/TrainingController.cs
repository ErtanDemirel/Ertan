using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>
/// Eğitim videoları. İK/İSG (Admin/Amir) yükler; personel izler (ileri sarılamaz,
/// kaldığı yerden devam eder). İzlenme oranları panelden takip edilir.
/// </summary>
[ApiController]
[Route("api/trainings")]
[Authorize]
public class TrainingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileStorageService _files;
    public TrainingController(AppDbContext db, FileStorageService files) { _db = db; _files = files; }

    // ---------- Yükleme (İK/İSG) ----------
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    [RequestSizeLimit(524_288_000)]                       // 500 MB
    [RequestFormLimits(MultipartBodyLengthLimit = 524_288_000)]
    public async Task<ActionResult<TrainingAdminDto>> Create(
        [FromForm] string title, [FromForm] string? description, [FromForm] string? category,
        [FromForm] bool isMandatory, IFormFile video, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(title)) return BadRequest(new { message = "Başlık zorunludur." });
        if (video is null) return BadRequest(new { message = "Video dosyası zorunludur." });
        try
        {
            var info = await _files.SaveVideoAsync(video, "training", ct);
            var t = new Training
            {
                Title = title.Trim(),
                Description = description?.Trim(),
                Category = string.IsNullOrWhiteSpace(category) ? "İK" : category!.Trim(),
                IsMandatory = isMandatory,
                VideoPath = info.StoredPath,
                VideoContentType = info.ContentType,
                VideoFileName = info.FileName,
                CreatedByUserId = User.GetUserId(),
                CreatedAt = DateTime.UtcNow
            };
            _db.Trainings.Add(t);
            await _db.SaveChangesAsync(ct);
            return Ok(await AdminDtoAsync(t, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ---------- Personel görünümü ----------
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TrainingDto>>> List(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        var trainings = await _db.Trainings.Where(t => t.IsActive)
            .OrderByDescending(t => t.CreatedAt).AsNoTracking().ToListAsync(ct);
        var progress = pid is null ? new List<TrainingProgress>() :
            await _db.TrainingProgresses.Where(p => p.PersonnelId == pid).AsNoTracking().ToListAsync(ct);
        var map = progress.ToDictionary(p => p.TrainingId);
        return Ok(trainings.Select(t => ToDto(t, map.GetValueOrDefault(t.Id))).ToList());
    }

    // ---------- Video akışı (range destekli → sarma/devam) ----------
    [HttpGet("{id:int}/video")]
    public async Task<IActionResult> Video(int id, CancellationToken ct)
    {
        var t = await _db.Trainings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (t is null) return NotFound();
        try
        {
            var path = _files.ResolvePath(t.VideoPath);
            return PhysicalFile(path, t.VideoContentType, enableRangeProcessing: true);
        }
        catch (FileNotFoundException) { return NotFound(); }
    }

    // ---------- İlerleme bildirimi ----------
    [HttpPost("{id:int}/progress")]
    public async Task<ActionResult<TrainingDto>> Progress(int id, ReportProgressRequest req, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return BadRequest(new { message = "Bu hesap bir personel kaydına bağlı değil." });

        var t = await _db.Trainings.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return NotFound();

        // Süreyi ilk gelen istemci değerinden öğren
        if (t.DurationSeconds <= 0 && req.Duration is > 0) t.DurationSeconds = req.Duration.Value;

        var prog = await _db.TrainingProgresses.FirstOrDefaultAsync(p => p.TrainingId == id && p.PersonnelId == pid, ct);
        if (prog is null)
        {
            prog = new TrainingProgress { TrainingId = id, PersonnelId = pid.Value, StartedAt = DateTime.UtcNow };
            _db.TrainingProgresses.Add(prog);
        }
        prog.StartedAt ??= DateTime.UtcNow;

        var cap = t.DurationSeconds > 0 ? t.DurationSeconds : Math.Max(req.Position, prog.WatchedSeconds);
        var newWatched = Math.Min(cap, Math.Max(prog.WatchedSeconds, Math.Max(0, req.Position)));
        prog.WatchedSeconds = newWatched;
        prog.UpdatedAt = DateTime.UtcNow;

        if (!prog.Completed && t.DurationSeconds > 0 && newWatched >= (int)(t.DurationSeconds * 0.98))
        {
            prog.Completed = true;
            prog.CompletedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(t, prog));
    }

    // ---------- Yönetici: liste + izlenme oranları ----------
    [HttpGet("admin")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<TrainingAdminDto>>> Admin(CancellationToken ct)
    {
        var trainings = await _db.Trainings.OrderByDescending(t => t.CreatedAt).AsNoTracking().ToListAsync(ct);
        var result = new List<TrainingAdminDto>();
        foreach (var t in trainings) result.Add(await AdminDtoAsync(t, ct));
        return Ok(result);
    }

    [HttpGet("{id:int}/report")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<object>> Report(int id, CancellationToken ct)
    {
        var t = await _db.Trainings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return NotFound();

        var people = await _db.Personnel.Where(p => p.IsActive).AsNoTracking()
            .Select(p => new { p.Id, p.FirstName, p.LastName, p.SicilNo }).ToListAsync(ct);
        var progress = await _db.TrainingProgresses.Where(p => p.TrainingId == id).AsNoTracking().ToListAsync(ct);
        var map = progress.ToDictionary(p => p.PersonnelId);

        var rows = people.Select(p =>
        {
            var pr = map.GetValueOrDefault(p.Id);
            return new TrainingProgressRowDto(
                p.Id, $"{p.FirstName} {p.LastName}", p.SicilNo,
                pr?.WatchedSeconds ?? 0, Percent(t.DurationSeconds, pr?.WatchedSeconds ?? 0, pr?.Completed ?? false),
                pr?.Completed ?? false, pr?.CompletedAt);
        }).OrderByDescending(r => r.Completed).ThenByDescending(r => r.ProgressPercent).ToList();

        return Ok(new
        {
            training = new { t.Id, t.Title, t.Category, t.DurationSeconds, t.IsMandatory },
            rows,
            assigned = rows.Count,
            completed = rows.Count(r => r.Completed)
        });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var t = await _db.Trainings.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return NotFound();
        t.IsActive = false; // yumuşak silme (ilerleme kayıtları korunur)
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Eğitim pasife alındı." });
    }

    // ---------- helpers ----------
    private static int Percent(int duration, int watched, bool completed)
    {
        if (completed) return 100;
        if (duration <= 0) return 0;
        return Math.Min(100, (int)Math.Round(watched * 100.0 / duration));
    }

    private static TrainingDto ToDto(Training t, TrainingProgress? p) => new(
        t.Id, t.Title, t.Description, t.Category, t.DurationSeconds, t.IsMandatory, t.IsActive,
        p?.WatchedSeconds ?? 0, p?.Completed ?? false, p?.CompletedAt,
        Percent(t.DurationSeconds, p?.WatchedSeconds ?? 0, p?.Completed ?? false));

    private async Task<TrainingAdminDto> AdminDtoAsync(Training t, CancellationToken ct)
    {
        var assigned = await _db.Personnel.CountAsync(p => p.IsActive, ct);
        var completed = await _db.TrainingProgresses.CountAsync(p => p.TrainingId == t.Id && p.Completed, ct);
        var rate = assigned > 0 ? (int)Math.Round(completed * 100.0 / assigned) : 0;
        return new TrainingAdminDto(t.Id, t.Title, t.Description, t.Category, t.DurationSeconds,
            t.IsMandatory, t.IsActive, t.VideoFileName, t.CreatedAt, assigned, completed, rate);
    }
}
