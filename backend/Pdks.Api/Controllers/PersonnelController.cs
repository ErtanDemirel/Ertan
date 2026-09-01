using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager")]
public class PersonnelController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher _hasher;

    public PersonnelController(AppDbContext db, PasswordHasher hasher)
    {
        _db = db; _hasher = hasher;
    }

    /// <summary>Personel listesi - arama (ad/sicil), departman/vardiya/güzergah filtresi, sayfalama.</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<PersonnelDto>>> List(
        [FromQuery] string? search,
        [FromQuery] string? department,
        [FromQuery] int? shiftId,
        [FromQuery] int? serviceRouteId,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var q = _db.Personnel
            .Include(p => p.Manager)
            .Include(p => p.ServiceRoute)
            .Include(p => p.Shift)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(p =>
                p.FirstName.Contains(s) || p.LastName.Contains(s) ||
                p.SicilNo.Contains(s) ||
                (p.Department != null && p.Department.Contains(s)));
        }
        if (!string.IsNullOrWhiteSpace(department))
            q = q.Where(p => p.Department == department);
        if (shiftId.HasValue) q = q.Where(p => p.ShiftId == shiftId);
        if (serviceRouteId.HasValue) q = q.Where(p => p.ServiceRouteId == serviceRouteId);
        if (isActive.HasValue) q = q.Where(p => p.IsActive == isActive);

        var total = await q.CountAsync(ct);
        var rows = await q
            .OrderBy(p => p.FirstName).ThenBy(p => p.LastName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync(ct);
        var items = rows.Select(ToDto).ToList();

        return Ok(new PagedResult<PersonnelDto>(items, total, page, pageSize));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PersonnelDto>> Get(int id, CancellationToken ct)
    {
        var p = await _db.Personnel
            .Include(x => x.Manager).Include(x => x.ServiceRoute).Include(x => x.Shift)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return p is null ? NotFound() : Ok(ToDto(p));
    }

    [HttpPost]
    public async Task<ActionResult<PersonnelDto>> Create(CreatePersonnelRequest req, CancellationToken ct)
    {
        if (await _db.Personnel.AnyAsync(p => p.SicilNo == req.SicilNo, ct))
            return Conflict(new { message = "Bu sicil numarası zaten kayıtlı." });

        var p = new Personnel
        {
            SicilNo = req.SicilNo.Trim(),
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            NationalId = req.NationalId,
            Department = req.Department,
            Title = req.Title,
            PhoneNumber = req.PhoneNumber,
            Email = req.Email,
            HireDate = req.HireDate,
            ManagerId = req.ManagerId,
            ServiceRouteId = req.ServiceRouteId,
            ShiftId = req.ShiftId,
            IsActive = true
        };
        _db.Personnel.Add(p);
        await _db.SaveChangesAsync(ct);

        // Yıllık izin bakiyesi
        if (req.AnnualLeaveDays is > 0)
        {
            _db.LeaveBalances.Add(new LeaveBalance
            {
                PersonnelId = p.Id,
                Year = DateTime.UtcNow.Year,
                EntitledDays = req.AnnualLeaveDays.Value
            });
        }

        // Giriş hesabı
        if (req.CreateLoginAccount && !string.IsNullOrWhiteSpace(req.Username)
            && !string.IsNullOrWhiteSpace(req.InitialPassword))
        {
            if (await _db.Users.AnyAsync(u => u.Username == req.Username, ct))
                return Conflict(new { message = "Bu kullanıcı adı zaten kullanılıyor." });

            var (hash, salt) = _hasher.Hash(req.InitialPassword);
            _db.Users.Add(new User
            {
                Username = req.Username.Trim(),
                PasswordHash = hash,
                PasswordSalt = salt,
                Role = UserRole.Personnel,
                PhoneNumber = req.PhoneNumber,
                Email = req.Email,
                PersonnelId = p.Id
            });
        }

        await _db.SaveChangesAsync(ct);
        return await Get(p.Id, ct);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PersonnelDto>> Update(int id, UpdatePersonnelRequest req, CancellationToken ct)
    {
        var p = await _db.Personnel.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return NotFound();

        if (p.SicilNo != req.SicilNo &&
            await _db.Personnel.AnyAsync(x => x.SicilNo == req.SicilNo && x.Id != id, ct))
            return Conflict(new { message = "Bu sicil numarası başka personelde kayıtlı." });

        if (req.ManagerId == id)
            return BadRequest(new { message = "Personel kendi amiri olamaz." });

        p.SicilNo = req.SicilNo.Trim();
        p.FirstName = req.FirstName.Trim();
        p.LastName = req.LastName.Trim();
        p.NationalId = req.NationalId;
        p.Department = req.Department;
        p.Title = req.Title;
        p.PhoneNumber = req.PhoneNumber;
        p.Email = req.Email;
        p.HireDate = req.HireDate;
        p.ManagerId = req.ManagerId;
        p.ServiceRouteId = req.ServiceRouteId;
        p.ShiftId = req.ShiftId;
        p.IsActive = req.IsActive;
        p.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return await Get(p.Id, ct);
    }

    /// <summary>Personeli siler; bağlı kayıt varsa pasife alınması önerilir.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var p = await _db.Personnel.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p is null) return NotFound();

        var hasSubordinates = await _db.Personnel.AnyAsync(x => x.ManagerId == id, ct);
        if (hasSubordinates)
            return BadRequest(new { message = "Bu personel başka personelin amiri. Önce amir bağlantılarını değiştirin." });

        _db.Personnel.Remove(p);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // İlişkili kayıt varsa silmek yerine pasife al
            p.IsActive = false;
            await _db.SaveChangesAsync(ct);
            return Ok(new { message = "Personelin geçmiş kayıtları olduğundan pasife alındı." });
        }
        return NoContent();
    }

    private static PersonnelDto ToDto(Personnel p) => new(
        p.Id, p.SicilNo, p.FirstName, p.LastName, $"{p.FirstName} {p.LastName}",
        p.NationalId, p.Department, p.Title, p.PhoneNumber, p.Email, p.HireDate,
        p.ManagerId, p.Manager is null ? null : $"{p.Manager.FirstName} {p.Manager.LastName}",
        p.ServiceRouteId, p.ServiceRoute?.Name,
        p.ShiftId, p.Shift?.Name, p.IsActive);
}
