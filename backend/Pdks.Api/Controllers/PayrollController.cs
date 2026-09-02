using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/payroll")]
[Authorize]
public class PayrollController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileStorageService _files;
    private readonly AuditService _audit;

    public PayrollController(AppDbContext db, FileStorageService files, AuditService audit)
    {
        _db = db; _files = files; _audit = audit;
    }

    /// <summary>İK: bordro PDF yükler (personel + dönem).</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<ActionResult<PayslipDto>> Upload(
        [FromForm] int personnelId, [FromForm] int year, [FromForm] int month,
        [FromForm] decimal? netAmount, [FromForm] string? note, IFormFile file,
        CancellationToken ct)
    {
        if (month < 1 || month > 12) return BadRequest(new { message = "Ay 1-12 arasında olmalı." });
        var personnel = await _db.Personnel.FirstOrDefaultAsync(p => p.Id == personnelId, ct);
        if (personnel is null) return BadRequest(new { message = "Personel bulunamadı." });

        try
        {
            var info = await _files.SaveAsync(file, "payroll", ct);
            var slip = new Payslip
            {
                PersonnelId = personnelId,
                Year = year,
                Month = month,
                FileName = info.FileName,
                StoredPath = info.StoredPath,
                ContentType = info.ContentType,
                SizeBytes = info.SizeBytes,
                NetAmount = netAmount,
                Note = note,
                UploadedByUserId = User.GetUserId()
            };
            _db.Payslips.Add(slip);
            await _db.SaveChangesAsync(ct);
            await _audit.LogAsync("payroll.upload", User.GetUserId(),
                $"personnel={personnelId} {year}/{month}", Ip(), ct);

            return Ok(Map(slip, personnel));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>İK: bordroları listeler (personel/yıl filtresi).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<PayslipDto>>> List(
        [FromQuery] int? personnelId, [FromQuery] int? year, CancellationToken ct)
    {
        var q = _db.Payslips.Include(p => p.Personnel).AsNoTracking().AsQueryable();
        if (personnelId.HasValue) q = q.Where(p => p.PersonnelId == personnelId);
        if (year.HasValue) q = q.Where(p => p.Year == year);
        var rows = await q.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).Take(500).ToListAsync(ct);
        return Ok(rows.Select(p => Map(p, p.Personnel)).ToList());
    }

    /// <summary>Personel: kendi bordroları.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<PayslipDto>>> My(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(Array.Empty<PayslipDto>());
        var rows = await _db.Payslips.Include(p => p.Personnel).AsNoTracking()
            .Where(p => p.PersonnelId == pid)
            .OrderByDescending(p => p.Year).ThenByDescending(p => p.Month)
            .ToListAsync(ct);
        return Ok(rows.Select(p => Map(p, p.Personnel)).ToList());
    }

    /// <summary>Bordroyu indirir (sahibi veya İK).</summary>
    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> Download(int id, CancellationToken ct)
    {
        var slip = await _db.Payslips.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (slip is null) return NotFound();

        var pid = User.GetPersonnelId();
        if (!User.IsManagerOrAdmin() && slip.PersonnelId != pid) return Forbid();

        await _audit.LogAsync("payroll.download", User.GetUserId(), $"payslip={id}", Ip(), ct);
        var (stream, contentType) = _files.Open(slip.StoredPath, slip.ContentType);
        return File(stream, contentType, slip.FileName);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var slip = await _db.Payslips.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (slip is null) return NotFound();
        _files.Delete(slip.StoredPath);
        _db.Payslips.Remove(slip);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private string? Ip() => HttpContext.Connection.RemoteIpAddress?.ToString();

    private static PayslipDto Map(Payslip p, Personnel? person) => new(
        p.Id, p.PersonnelId,
        person is null ? "" : person.FirstName + " " + person.LastName,
        person?.SicilNo ?? "",
        p.Year, p.Month, p.FileName, p.SizeBytes, p.NetAmount, p.Note, p.UploadedAt);
}
