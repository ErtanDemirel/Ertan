using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/leave")]
[Authorize]
public class LeaveController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly LeaveService _leave;
    private readonly FileStorageService _files;
    private readonly LeaveDocumentService _docs;

    public LeaveController(AppDbContext db, LeaveService leave,
        FileStorageService files, LeaveDocumentService docs)
    {
        _db = db; _leave = leave; _files = files; _docs = docs;
    }

    // ---------- İzin Türleri ----------
    [HttpGet("types")]
    public async Task<ActionResult<IEnumerable<LeaveTypeDto>>> Types(CancellationToken ct) =>
        Ok(await _db.LeaveTypes.AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => new LeaveTypeDto(t.Id, t.Name, t.DeductsFromAnnual, t.IsPaid, t.IsActive))
            .ToListAsync(ct));

    [HttpPost("types")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<LeaveTypeDto>> CreateType(LeaveTypeRequest req, CancellationToken ct)
    {
        var t = new LeaveType
        {
            Name = req.Name.Trim(),
            DeductsFromAnnual = req.DeductsFromAnnual,
            IsPaid = req.IsPaid,
            IsActive = req.IsActive
        };
        _db.LeaveTypes.Add(t);
        await _db.SaveChangesAsync(ct);
        return Ok(new LeaveTypeDto(t.Id, t.Name, t.DeductsFromAnnual, t.IsPaid, t.IsActive));
    }

    [HttpPut("types/{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<LeaveTypeDto>> UpdateType(int id, LeaveTypeRequest req, CancellationToken ct)
    {
        var t = await _db.LeaveTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t is null) return NotFound();
        t.Name = req.Name.Trim();
        t.DeductsFromAnnual = req.DeductsFromAnnual;
        t.IsPaid = req.IsPaid;
        t.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(new LeaveTypeDto(t.Id, t.Name, t.DeductsFromAnnual, t.IsPaid, t.IsActive));
    }

    // ---------- Bakiye ----------
    [HttpGet("balances")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<LeaveBalanceDto>>> Balances(
        [FromQuery] int? year, CancellationToken ct)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var items = await _db.LeaveBalances
            .Include(b => b.Personnel)
            .Where(b => b.Year == y)
            .AsNoTracking()
            .OrderBy(b => b.Personnel!.FirstName)
            .Select(b => new LeaveBalanceDto(
                b.PersonnelId, b.Personnel!.FirstName + " " + b.Personnel.LastName, b.Year,
                b.EntitledDays, b.UsedDays, b.PendingDays,
                b.EntitledDays - b.UsedDays - b.PendingDays))
            .ToListAsync(ct);
        return Ok(items);
    }

    /// <summary>Personel için yıllık izin hakkını tanımlar/günceller.</summary>
    [HttpPost("balances")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<LeaveBalanceDto>> SetBalance(LeaveBalanceRequest req, CancellationToken ct)
    {
        var balance = await _leave.GetOrCreateBalanceAsync(req.PersonnelId, req.Year, ct);
        balance.EntitledDays = req.EntitledDays;
        await _db.SaveChangesAsync(ct);
        var name = await _db.Personnel.Where(p => p.Id == req.PersonnelId)
            .Select(p => p.FirstName + " " + p.LastName).FirstOrDefaultAsync(ct) ?? "";
        return Ok(new LeaveBalanceDto(balance.PersonnelId, name, balance.Year,
            balance.EntitledDays, balance.UsedDays, balance.PendingDays, balance.RemainingDays));
    }

    // ---------- Talepler ----------

    /// <summary>Aktif kullanıcının kendi izin talepleri + bakiyesi.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<object>> My(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(new { requests = Array.Empty<LeaveRequestDto>(), balance = (LeaveBalanceDto?)null });

        var requests = await LoadRequestsAsync(
            _db.LeaveRequests.Where(r => r.PersonnelId == pid).OrderByDescending(r => r.RequestedAt), ct);

        var year = DateTime.UtcNow.Year;
        var b = await _db.LeaveBalances.Include(x => x.Personnel)
            .FirstOrDefaultAsync(x => x.PersonnelId == pid && x.Year == year, ct);
        LeaveBalanceDto? balance = b is null ? null : new(b.PersonnelId,
            b.Personnel!.FirstName + " " + b.Personnel.LastName, b.Year,
            b.EntitledDays, b.UsedDays, b.PendingDays, b.RemainingDays);

        return Ok(new { requests, balance });
    }

    /// <summary>Amir/Admin: tüm talepler (durum filtresiyle).</summary>
    [HttpGet("requests")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<LeaveRequestDto>>> Requests(
        [FromQuery] string? status, CancellationToken ct)
    {
        IQueryable<LeaveRequest> q = _db.LeaveRequests;
        if (Enum.TryParse<LeaveStatus>(status, true, out var st))
            q = q.Where(r => r.Status == st);
        q = q.OrderByDescending(r => r.RequestedAt).Take(500);
        return Ok(await LoadRequestsAsync(q, ct));
    }

    /// <summary>Amir: benim onayımı bekleyen talepler.</summary>
    [HttpGet("pending")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<LeaveRequestDto>>> Pending(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        var isAdmin = User.GetRole() == "Admin";

        var q = _db.LeaveRequests
            .Where(r => r.Status == LeaveStatus.Pending);
        if (!isAdmin && pid is not null)
            q = q.Where(r => r.ApproverId == pid);

        var items = await LoadRequestsAsync(q.OrderBy(r => r.RequestedAt), ct);
        return Ok(items);
    }

    /// <summary>Panel için: bugün izinde olanlar + yaklaşan onaylı izinler.</summary>
    [HttpGet("dashboard")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<object>> Dashboard([FromQuery] int days = 14, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var until = today.AddDays(days);

        var approved = await _db.LeaveRequests
            .Include(r => r.Personnel).Include(r => r.LeaveType)
            .Where(r => r.Status == LeaveStatus.Approved && r.EndDate >= today && r.StartDate <= until)
            .AsNoTracking()
            .ToListAsync(ct);

        var onLeave = approved
            .Where(r => r.StartDate <= today && today <= r.EndDate)
            .OrderBy(r => r.EndDate)
            .Select(r => new
            {
                r.PersonnelId,
                name = r.Personnel!.FirstName + " " + r.Personnel.LastName,
                sicilNo = r.Personnel.SicilNo,
                leaveType = r.LeaveType!.Name,
                r.StartDate, r.EndDate
            }).ToList();

        var upcoming = approved
            .Where(r => r.StartDate > today)
            .OrderBy(r => r.StartDate)
            .Select(r => new
            {
                r.PersonnelId,
                name = r.Personnel!.FirstName + " " + r.Personnel.LastName,
                sicilNo = r.Personnel.SicilNo,
                leaveType = r.LeaveType!.Name,
                r.StartDate, r.EndDate, r.TotalDays
            }).ToList();

        return Ok(new { onLeave, upcoming });
    }

    [HttpPost("requests")]
    public async Task<ActionResult<LeaveRequestDto>> Create(CreateLeaveRequest req, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null)
            return BadRequest(new { message = "Bu hesap bir personel kaydına bağlı değil." });

        try
        {
            var created = await _leave.CreateAsync(pid.Value, req.LeaveTypeId,
                req.StartDate, req.EndDate, req.Title, req.Reason, req.Days, ct);
            var dto = (await LoadRequestsAsync(_db.LeaveRequests.Where(r => r.Id == created.Id), ct))
                .First();
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("requests/{id:int}/decide")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Decide(int id, DecideLeaveRequest req, CancellationToken ct)
    {
        var request = await _db.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (request is null) return NotFound();

        var pid = User.GetPersonnelId();
        var isAdmin = User.GetRole() == "Admin";
        if (!isAdmin && request.ApproverId != pid)
            return Forbid();

        try
        {
            await _leave.DecideAsync(request, req.Approve, req.Comment, pid ?? 0, ct);
            return Ok(new { message = req.Approve ? "İzin onaylandı." : "İzin reddedildi." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("requests/{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, CancellationToken ct)
    {
        var request = await _db.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (request is null) return NotFound();

        var pid = User.GetPersonnelId();
        if (request.PersonnelId != pid && !User.IsManagerOrAdmin())
            return Forbid();

        try
        {
            await _leave.CancelAsync(request, ct);
            return Ok(new { message = "Talep iptal edildi." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ---------- Ek dosyalar (rapor/foto/pdf) ----------

    /// <summary>İzin talebine dosya ekler (talep sahibi veya amir/admin).</summary>
    [HttpPost("requests/{id:int}/attachments")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<IActionResult> Upload(int id, IFormFile file, CancellationToken ct)
    {
        var request = await _db.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (request is null) return NotFound();
        if (!CanAccessRequest(request)) return Forbid();

        try
        {
            var info = await _files.SaveAsync(file, "leave", ct);
            var att = new LeaveAttachment
            {
                LeaveRequestId = id,
                FileName = info.FileName,
                StoredPath = info.StoredPath,
                ContentType = info.ContentType,
                SizeBytes = info.SizeBytes
            };
            _db.LeaveAttachments.Add(att);
            await _db.SaveChangesAsync(ct);
            return Ok(new LeaveAttachmentDto(att.Id, att.FileName, att.ContentType, att.SizeBytes, att.UploadedAt));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Ekli dosyayı indirir (talep sahibi veya amir/admin).</summary>
    [HttpGet("attachments/{attachmentId:int}")]
    public async Task<IActionResult> Download(int attachmentId, CancellationToken ct)
    {
        var att = await _db.LeaveAttachments.Include(a => a.LeaveRequest)
            .FirstOrDefaultAsync(a => a.Id == attachmentId, ct);
        if (att is null || att.LeaveRequest is null) return NotFound();
        if (!CanAccessRequest(att.LeaveRequest)) return Forbid();

        var (stream, contentType) = _files.Open(att.StoredPath, att.ContentType);
        return File(stream, contentType, att.FileName);
    }

    /// <summary>İzin talebinden otomatik doldurulmuş Word izin belgesi üretir (amir/admin).</summary>
    [HttpGet("requests/{id:int}/document")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Document(int id, CancellationToken ct)
    {
        var request = await _db.LeaveRequests
            .Include(r => r.Personnel).Include(r => r.LeaveType).Include(r => r.Approver)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
        if (request?.Personnel is null || request.LeaveType is null) return NotFound();
        if (!_docs.TemplateExists)
            return BadRequest(new { message = "İzin belgesi şablonu sunucuda bulunamadı." });

        var approverName = request.Approver is null ? null
            : $"{request.Approver.FirstName} {request.Approver.LastName}";
        var bytes = _docs.Generate(request, request.Personnel, request.LeaveType, approverName);
        var fileName = $"izin-belgesi-{request.Personnel.SicilNo}-{request.Id}.docx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName);
    }

    // ---- helpers ----
    private bool CanAccessRequest(LeaveRequest r)
    {
        if (User.IsManagerOrAdmin()) return true;
        var pid = User.GetPersonnelId();
        return pid is not null && r.PersonnelId == pid;
    }

    // Not: enum.ToString() SQL'e güvenilir çevrilmediğinden entity'ler belleğe alınıp map'lenir.
    private async Task<List<LeaveRequestDto>> LoadRequestsAsync(IQueryable<LeaveRequest> q, CancellationToken ct)
    {
        var rows = await q
            .Include(r => r.Personnel).Include(r => r.LeaveType).Include(r => r.Approver)
            .Include(r => r.Attachments)
            .AsNoTracking().ToListAsync(ct);
        return rows.Select(MapRequest).ToList();
    }

    private static LeaveRequestDto MapRequest(LeaveRequest r) => new(
        r.Id, r.PersonnelId,
        r.Personnel is null ? "" : r.Personnel.FirstName + " " + r.Personnel.LastName,
        r.Personnel?.SicilNo ?? "",
        r.LeaveTypeId, r.LeaveType?.Name ?? "", r.LeaveType?.DeductsFromAnnual ?? false,
        r.StartDate, r.EndDate, r.TotalDays, r.Title, r.Reason, r.Status.ToString(),
        r.ApproverId,
        r.Approver == null ? null : r.Approver.FirstName + " " + r.Approver.LastName,
        r.ManagerComment, r.RequestedAt, r.DecidedAt,
        r.Attachments.Select(a => new LeaveAttachmentDto(a.Id, a.FileName, a.ContentType, a.SizeBytes, a.UploadedAt))
            .ToList());
}
