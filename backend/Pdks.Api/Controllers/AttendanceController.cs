using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly QrTokenService _qr;
    private readonly ILogger<AttendanceController> _log;

    public AttendanceController(AppDbContext db, QrTokenService qr, ILogger<AttendanceController> log)
    {
        _db = db; _qr = qr; _log = log;
    }

    /// <summary>Kiosk ekranı için dönen QR kodu (her 30 sn'de yenilenir).</summary>
    [HttpGet("qr/{locationId:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<QrPayloadDto>> GetQr(int locationId, CancellationToken ct)
    {
        var loc = await _db.WorkLocations.FirstOrDefaultAsync(l => l.Id == locationId && l.IsActive, ct);
        if (loc is null) return NotFound(new { message = "Lokasyon bulunamadı." });

        var code = _qr.Generate(loc);
        var content = $"PDKS|{loc.Id}|{code}";
        return Ok(new QrPayloadDto(loc.Id, loc.Name, code, content, _qr.SecondsRemaining()));
    }

    /// <summary>
    /// Mobil uygulamadan QR + konum ile mesai giriş/çıkış.
    /// Konum, lokasyon yarıçapı dışındaysa (örn. evden) kayıt REDDEDİLİR.
    /// </summary>
    [HttpPost("check")]
    public async Task<ActionResult<AttendanceResultDto>> Check(CheckInRequest req, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null)
            return BadRequest(new { message = "Bu hesap bir personel kaydına bağlı değil." });

        // QR içeriği: PDKS|{locationId}|{code}
        var parts = req.QrContent.Split('|');
        if (parts.Length != 3 || parts[0] != "PDKS" || !int.TryParse(parts[1], out var locId))
            return BadRequest(new { message = "Geçersiz QR kod." });

        var loc = await _db.WorkLocations.FirstOrDefaultAsync(l => l.Id == locId && l.IsActive, ct);
        if (loc is null) return BadRequest(new { message = "QR koda ait lokasyon bulunamadı." });

        // 1) QR kod zaman doğrulaması (ekran görüntüsü paylaşımını engeller)
        if (!_qr.Validate(loc, parts[2]))
            return BadRequest(new { message = "QR kodun süresi doldu. Ekrandaki güncel kodu okutun." });

        // 2) Geofence (konum) doğrulaması
        var distance = GeoService.DistanceMeters(req.Latitude, req.Longitude, loc.Latitude, loc.Longitude);
        var within = distance <= loc.RadiusMeters;
        if (!within)
        {
            _log.LogWarning("Geofence dışı deneme: personel {Pid}, {Dist}m", pid, (int)distance);
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = $"İş yeri konumunda değilsiniz ({(int)distance} m uzakta). Mesai kaydı yapılamaz.",
                distanceMeters = (int)distance
            });
        }

        // 3) Giriş mi çıkış mı? Bugünkü son harekete göre belirle
        var todayStart = DateTime.UtcNow.Date;
        var last = await _db.Attendances
            .Where(a => a.PersonnelId == pid && a.Timestamp >= todayStart)
            .OrderByDescending(a => a.Timestamp)
            .FirstOrDefaultAsync(ct);

        var type = (last is null || last.Type == AttendanceType.CheckOut)
            ? AttendanceType.CheckIn
            : AttendanceType.CheckOut;

        var record = new Attendance
        {
            PersonnelId = pid.Value,
            WorkLocationId = loc.Id,
            Type = type,
            Timestamp = DateTime.UtcNow,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            DistanceMeters = Math.Round(distance, 1),
            IsWithinGeofence = true,
            DeviceInfo = req.DeviceInfo
        };
        _db.Attendances.Add(record);
        await _db.SaveChangesAsync(ct);

        var msg = type == AttendanceType.CheckIn ? "Mesai girişiniz alındı." : "Mesai çıkışınız alındı.";
        return Ok(new AttendanceResultDto(true, type.ToString(), record.Timestamp,
            loc.Name, record.DistanceMeters, msg));
    }

    /// <summary>Aktif kullanıcının kendi mesai kayıtları.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> My(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(Array.Empty<AttendanceDto>());
        return Ok(await QueryAttendance(pid, from, to).Take(200).ToListAsync(ct));
    }

    /// <summary>Amir/Admin: tüm mesai kayıtları (personel/tarih filtresi).</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> List(
        [FromQuery] int? personnelId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        CancellationToken ct)
        => Ok(await QueryAttendance(personnelId, from, to).Take(1000).ToListAsync(ct));

    private IQueryable<AttendanceDto> QueryAttendance(int? personnelId, DateOnly? from, DateOnly? to)
    {
        var q = _db.Attendances.Include(a => a.Personnel).Include(a => a.WorkLocation)
            .AsNoTracking().AsQueryable();
        if (personnelId.HasValue) q = q.Where(a => a.PersonnelId == personnelId);
        if (from.HasValue) q = q.Where(a => a.Timestamp >= from.Value.ToDateTime(TimeOnly.MinValue));
        if (to.HasValue) q = q.Where(a => a.Timestamp <= to.Value.ToDateTime(TimeOnly.MaxValue));
        return q.OrderByDescending(a => a.Timestamp)
            .Select(a => new AttendanceDto(
                a.Id, a.PersonnelId, a.Personnel!.FirstName + " " + a.Personnel.LastName,
                a.Personnel.SicilNo, a.Type.ToString(), a.Timestamp,
                a.WorkLocation != null ? a.WorkLocation.Name : null,
                a.DistanceMeters, a.IsWithinGeofence));
    }
}
