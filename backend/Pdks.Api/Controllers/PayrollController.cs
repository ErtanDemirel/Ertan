using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>
/// Bordro. GÜVENLİK: yükleme/dağıtma/listeleme yalnızca "bordro dağıtım yetkisi"
/// (User.CanDistributePayroll → JWT 'canPayroll' claim) olan kullanıcıya açıktır.
/// Admin dahi bu yetki olmadan başka birinin bordrosunu göremez. Personel yalnızca
/// kendisine ait ve DAĞITILMIŞ bordrosunu görüntüleyip indirebilir.
/// </summary>
[ApiController]
[Route("api/payroll")]
[Authorize]
public class PayrollController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly FileStorageService _files;
    private readonly AuditService _audit;
    private readonly NotificationService _notify;

    public PayrollController(AppDbContext db, FileStorageService files, AuditService audit, NotificationService notify)
    {
        _db = db; _files = files; _audit = audit; _notify = notify;
    }

    private bool CanDistribute => User.CanDistributePayroll();

    /// <summary>Bordro sorumlusu: bordro PDF yükler (henüz dağıtılmamış olarak).</summary>
    [HttpPost]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<ActionResult<PayslipDto>> Upload(
        [FromForm] int personnelId, [FromForm] int year, [FromForm] int month,
        [FromForm] decimal? netAmount, [FromForm] string? note, IFormFile file,
        CancellationToken ct)
    {
        if (!CanDistribute) return Deny();
        if (month < 1 || month > 12) return BadRequest(new { message = "Ay 1-12 arasında olmalı." });
        var personnel = await _db.Personnel.FirstOrDefaultAsync(p => p.Id == personnelId, ct);
        if (personnel is null) return BadRequest(new { message = "Personel bulunamadı." });

        try
        {
            var info = await _files.SaveAsync(file, "payroll", ct);
            var slip = new Payslip
            {
                PersonnelId = personnelId, Year = year, Month = month,
                FileName = info.FileName, StoredPath = info.StoredPath,
                ContentType = info.ContentType, SizeBytes = info.SizeBytes,
                NetAmount = netAmount, Note = note, UploadedByUserId = User.GetUserId(),
                IsDistributed = false
            };
            _db.Payslips.Add(slip);
            await _db.SaveChangesAsync(ct);
            await _audit.LogAsync("payroll.upload", User.GetUserId(), $"personnel={personnelId} {year}/{month}", Ip(), ct);
            return Ok(Map(slip, personnel));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Bordro sorumlusu: bordroları listeler (personel/yıl/dağıtım filtresi).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PayslipDto>>> List(
        [FromQuery] int? personnelId, [FromQuery] int? year, [FromQuery] bool? distributed, CancellationToken ct)
    {
        if (!CanDistribute) return Deny();
        var q = _db.Payslips.Include(p => p.Personnel).AsNoTracking().AsQueryable();
        if (personnelId.HasValue) q = q.Where(p => p.PersonnelId == personnelId);
        if (year.HasValue) q = q.Where(p => p.Year == year);
        if (distributed.HasValue) q = q.Where(p => p.IsDistributed == distributed);
        var rows = await q.OrderByDescending(p => p.Year).ThenByDescending(p => p.Month).Take(1000).ToListAsync(ct);
        return Ok(rows.Select(p => Map(p, p.Personnel)).ToList());
    }

    /// <summary>Bordro sorumlusu: seçili bordroları dağıtır ve seçilen kanallardan bildirir.</summary>
    [HttpPost("distribute")]
    public async Task<IActionResult> Distribute(DistributePayslipsRequest req, CancellationToken ct)
    {
        if (!CanDistribute) return Deny();
        var slips = await _db.Payslips.Include(p => p.Personnel)
            .Where(p => req.PayslipIds.Contains(p.Id)).ToListAsync(ct);

        int notified = 0;
        foreach (var slip in slips)
        {
            slip.IsDistributed = true;
            slip.DistributedAt = DateTime.UtcNow;
            slip.NotifiedInApp = req.NotifyInApp;
            slip.NotifiedSms = req.NotifySms;

            if (req.NotifyInApp || req.NotifySms)
            {
                var user = await _db.Users.FirstOrDefaultAsync(u => u.PersonnelId == slip.PersonnelId, ct);
                if (user is not null)
                {
                    await _notify.NotifyAsync(user, "Bordronuz hazır",
                        $"{slip.Month}/{slip.Year} dönemi bordronuz sistemde. Görüntülemek için Bordrolarım'a girin.",
                        "payroll", req.NotifyInApp, req.NotifySms, ct);
                    notified++;
                }
            }
        }
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("payroll.distribute", User.GetUserId(), $"count={slips.Count}", Ip(), ct);
        return Ok(new { message = $"{slips.Count} bordro dağıtıldı, {notified} personele bildirim gönderildi." });
    }

    /// <summary>Personel: kendi DAĞITILMIŞ bordroları.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<PayslipDto>>> My(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(Array.Empty<PayslipDto>());
        var rows = await _db.Payslips.Include(p => p.Personnel).AsNoTracking()
            .Where(p => p.PersonnelId == pid && p.IsDistributed)
            .OrderByDescending(p => p.Year).ThenByDescending(p => p.Month)
            .ToListAsync(ct);
        return Ok(rows.Select(p => Map(p, p.Personnel)).ToList());
    }

    /// <summary>Bordroyu indirir: sahibi (yalnızca dağıtılmışsa) veya bordro sorumlusu.</summary>
    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> Download(int id, CancellationToken ct)
    {
        var slip = await _db.Payslips.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (slip is null) return NotFound();

        var pid = User.GetPersonnelId();
        var isOwner = pid is not null && slip.PersonnelId == pid && slip.IsDistributed;
        if (!isOwner && !CanDistribute)
        {
            await _audit.LogAsync("payroll.download.denied", User.GetUserId(), $"payslip={id}", Ip(), ct);
            return Deny();
        }

        await _audit.LogAsync("payroll.download", User.GetUserId(), $"payslip={id}", Ip(), ct);
        var (stream, contentType) = _files.Open(slip.StoredPath, slip.ContentType);
        return File(stream, contentType, slip.FileName);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (!CanDistribute) return Deny();
        var slip = await _db.Payslips.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (slip is null) return NotFound();
        _files.Delete(slip.StoredPath);
        _db.Payslips.Remove(slip);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private IActionResult Deny() =>
        StatusCode(StatusCodes.Status403Forbidden, new { message = "Bu işlem için bordro dağıtım yetkiniz yok." });

    private string? Ip() => HttpContext.Connection.RemoteIpAddress?.ToString();

    private static PayslipDto Map(Payslip p, Personnel? person) => new(
        p.Id, p.PersonnelId,
        person is null ? "" : person.FirstName + " " + person.LastName,
        person?.SicilNo ?? "",
        p.Year, p.Month, p.FileName, p.SizeBytes, p.NetAmount, p.Note, p.UploadedAt,
        p.IsDistributed, p.DistributedAt);
}
