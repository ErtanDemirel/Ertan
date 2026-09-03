using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>
/// İletişim & acil durum bilgisi: personel günceller (İK/Amir onayına düşer),
/// onaylanınca personel kartına işlenir.
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public class ContactController : ControllerBase
{
    private readonly AppDbContext _db;
    public ContactController(AppDbContext db) => _db = db;

    /// <summary>Aktif kullanıcının güncel iletişim bilgisi + varsa bekleyen talebi.</summary>
    [HttpGet("me/contact")]
    public async Task<ActionResult<ContactInfoDto>> MyContact(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(new ContactInfoDto(null, null, null, null, null, null));

        var p = await _db.Personnel.AsNoTracking().FirstOrDefaultAsync(x => x.Id == pid, ct);
        if (p is null) return Ok(new ContactInfoDto(null, null, null, null, null, null));

        var pending = await _db.ContactUpdateRequests.Include(r => r.Personnel).AsNoTracking()
            .Where(r => r.PersonnelId == pid && r.Status == LeaveStatus.Pending)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);

        return Ok(new ContactInfoDto(
            p.PhoneNumber, p.Email, p.Address, p.EmergencyContactName, p.EmergencyContactPhone,
            pending is null ? null : Map(pending)));
    }

    /// <summary>Yeni güncelleme talebi (boş alan = değişiklik yok).</summary>
    [HttpPost("me/contact-requests")]
    public async Task<ActionResult<ContactUpdateDto>> Create(CreateContactUpdateRequest req, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return BadRequest(new { message = "Bu hesap bir personel kaydına bağlı değil." });

        // Aynı anda tek bekleyen talep
        var existing = await _db.ContactUpdateRequests
            .AnyAsync(r => r.PersonnelId == pid && r.Status == LeaveStatus.Pending, ct);
        if (existing) return BadRequest(new { message = "Zaten onay bekleyen bir güncelleme talebiniz var." });

        var item = new ContactUpdateRequest
        {
            PersonnelId = pid.Value,
            PhoneNumber = Trim(req.PhoneNumber),
            Email = Trim(req.Email),
            Address = Trim(req.Address),
            EmergencyContactName = Trim(req.EmergencyContactName),
            EmergencyContactPhone = Trim(req.EmergencyContactPhone),
            Status = LeaveStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _db.ContactUpdateRequests.Add(item);
        await _db.SaveChangesAsync(ct);

        item = await _db.ContactUpdateRequests.Include(r => r.Personnel).FirstAsync(r => r.Id == item.Id, ct);
        return Ok(Map(item));
    }

    /// <summary>İK/Amir: bekleyen iletişim güncelleme talepleri.</summary>
    [HttpGet("contact-requests")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<ContactUpdateDto>>> Pending(
        [FromQuery] string? status, CancellationToken ct)
    {
        var q = _db.ContactUpdateRequests.Include(r => r.Personnel).AsQueryable();
        q = Enum.TryParse<LeaveStatus>(status, true, out var st)
            ? q.Where(r => r.Status == st)
            : q.Where(r => r.Status == LeaveStatus.Pending);
        var rows = await q.OrderByDescending(r => r.CreatedAt).Take(500).AsNoTracking().ToListAsync(ct);
        return Ok(rows.Select(Map).ToList());
    }

    /// <summary>İK/Amir: talebi onayla/reddet. Onayda değerler personel kartına işlenir.</summary>
    [HttpPost("contact-requests/{id:int}/decide")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ContactUpdateDto>> Decide(int id, DecideContactRequest req, CancellationToken ct)
    {
        var item = await _db.ContactUpdateRequests.Include(r => r.Personnel)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
        if (item is null) return NotFound();
        if (item.Status != LeaveStatus.Pending) return BadRequest(new { message = "Bu talep zaten sonuçlanmış." });

        if (req.Approve && item.Personnel is not null)
        {
            var p = item.Personnel;
            if (!string.IsNullOrWhiteSpace(item.PhoneNumber)) p.PhoneNumber = item.PhoneNumber;
            if (!string.IsNullOrWhiteSpace(item.Email)) p.Email = item.Email;
            if (!string.IsNullOrWhiteSpace(item.Address)) p.Address = item.Address;
            if (!string.IsNullOrWhiteSpace(item.EmergencyContactName)) p.EmergencyContactName = item.EmergencyContactName;
            if (!string.IsNullOrWhiteSpace(item.EmergencyContactPhone)) p.EmergencyContactPhone = item.EmergencyContactPhone;
            p.UpdatedAt = DateTime.UtcNow;
        }

        item.Status = req.Approve ? LeaveStatus.Approved : LeaveStatus.Rejected;
        item.HandlerComment = req.Comment;
        item.HandledByUserId = User.GetUserId();
        item.HandledAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(Map(item));
    }

    private static string? Trim(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static ContactUpdateDto Map(ContactUpdateRequest r) => new(
        r.Id, r.PersonnelId,
        r.Personnel is null ? "" : $"{r.Personnel.FirstName} {r.Personnel.LastName}",
        r.Personnel?.SicilNo,
        r.PhoneNumber, r.Email, r.Address, r.EmergencyContactName, r.EmergencyContactPhone,
        r.Status.ToString(), r.HandlerComment, r.CreatedAt, r.HandledAt);
}
