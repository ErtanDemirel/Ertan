using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/applications")]
public class ApplicationController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileStorageService _files;

    public ApplicationController(AppDbContext db, FileStorageService files)
    {
        _db = db; _files = files;
    }

    /// <summary>Kamuya açık iş başvuru formu (kimlik doğrulaması gerektirmez).</summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Submit(JobApplicationRequest req, CancellationToken ct)
    {
        var app = new JobApplication
        {
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            NationalId = req.NationalId,
            Phone = req.Phone,
            Email = req.Email,
            BirthDate = req.BirthDate,
            Address = req.Address,
            Position = req.Position,
            Education = req.Education,
            ExperienceYears = req.ExperienceYears,
            PreviousWorkplace = req.PreviousWorkplace,
            Notes = req.Notes,
            Status = ApplicationStatus.New
        };
        _db.JobApplications.Add(app);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = app.Id, message = "Başvurunuz alındı. Teşekkür ederiz." });
    }

    /// <summary>Kamuya açık: başvuruya CV ekler.</summary>
    [AllowAnonymous]
    [HttpPost("{id:int}/cv")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> UploadCv(int id, IFormFile file, CancellationToken ct)
    {
        var app = await _db.JobApplications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return NotFound();
        try
        {
            var info = await _files.SaveAsync(file, "cv", ct);
            app.CvFileName = info.FileName;
            app.CvStoredPath = info.StoredPath;
            app.CvContentType = info.ContentType;
            await _db.SaveChangesAsync(ct);
            return Ok(new { message = "CV yüklendi." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>İK: aday listesi (durum filtresi).</summary>
    [Authorize(Roles = "Admin,Manager")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<JobApplicationDto>>> List(
        [FromQuery] string? status, CancellationToken ct)
    {
        var q = _db.JobApplications.AsNoTracking().AsQueryable();
        if (Enum.TryParse<ApplicationStatus>(status, true, out var st))
            q = q.Where(a => a.Status == st);
        var rows = await q.OrderByDescending(a => a.CreatedAt).Take(500).ToListAsync(ct);
        return Ok(rows.Select(a => Map(a, null)).ToList());
    }

    /// <summary>İK: aday detayı + geçmiş çalışma bilgisi (TCKN eşleşmesi).</summary>
    [Authorize(Roles = "Admin,Manager")]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<JobApplicationDto>> Get(int id, CancellationToken ct)
    {
        var app = await _db.JobApplications.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return NotFound();

        PriorEmploymentDto? prior = null;
        if (!string.IsNullOrWhiteSpace(app.NationalId))
        {
            var match = await _db.Personnel.AsNoTracking()
                .FirstOrDefaultAsync(p => p.NationalId == app.NationalId, ct);
            prior = BuildPrior(match);
        }
        return Ok(Map(app, prior));
    }

    /// <summary>İK: aday durumunu günceller.</summary>
    [Authorize(Roles = "Admin,Manager")]
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateApplicationStatusRequest req, CancellationToken ct)
    {
        var app = await _db.JobApplications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return NotFound();
        if (!Enum.TryParse<ApplicationStatus>(req.Status, true, out var st))
            return BadRequest(new { message = "Geçersiz durum." });

        app.Status = st;
        app.ReviewNote = req.ReviewNote;
        app.ReviewedByUserId = User.GetUserId();
        app.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Durum güncellendi." });
    }

    /// <summary>İK: adayın CV'sini indirir.</summary>
    [Authorize(Roles = "Admin,Manager")]
    [HttpGet("{id:int}/cv")]
    public async Task<IActionResult> DownloadCv(int id, CancellationToken ct)
    {
        var app = await _db.JobApplications.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app?.CvStoredPath is null) return NotFound();
        var (stream, contentType) = _files.Open(app.CvStoredPath, app.CvContentType ?? "application/octet-stream");
        return File(stream, contentType, app.CvFileName ?? "cv");
    }

    // ---- helpers ----
    private static PriorEmploymentDto? BuildPrior(Personnel? p)
    {
        if (p is null) return new PriorEmploymentDto(false, null, null, null, null, null, false, null, null);
        var end = p.ExitDate ?? DateTime.UtcNow;
        int? months = p.HireDate is null ? null
            : Math.Max(0, ((end.Year - p.HireDate.Value.Year) * 12) + end.Month - p.HireDate.Value.Month);
        var currentlyEmployed = p.ExitDate is null && p.IsActive;
        return new PriorEmploymentDto(
            true, p.Id, $"{p.FirstName} {p.LastName}", p.SicilNo,
            p.HireDate, p.ExitDate, currentlyEmployed, months, p.ExitReason);
    }

    private static JobApplicationDto Map(JobApplication a, PriorEmploymentDto? prior) => new(
        a.Id, a.FirstName, a.LastName, $"{a.FirstName} {a.LastName}",
        a.NationalId, a.Phone, a.Email, a.BirthDate, a.Address, a.Position, a.Education,
        a.ExperienceYears, a.PreviousWorkplace, a.Notes, a.Status.ToString(), a.ReviewNote,
        a.CvStoredPath != null, a.CreatedAt, prior);
}
