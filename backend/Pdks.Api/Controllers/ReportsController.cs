using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>
/// Yönetim raporları — Excel'de açılan CSV çıktıları (personel, izin, mesai, bakiye).
/// Tümü Admin/Amir yetkisi ister. Bordro gibi hassas veriler bu raporlara dahil edilmez.
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin,Manager")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReportsController(AppDbContext db) => _db = db;

    private const string Csv = "text/csv";

    /// <summary>Personel listesi (aktif/pasif + servis + vardiya + departman).</summary>
    [HttpGet("personnel.csv")]
    public async Task<IActionResult> Personnel([FromQuery] bool? active, CancellationToken ct)
    {
        IQueryable<Personnel> q = _db.Personnel
            .Include(p => p.ServiceRoute).Include(p => p.Shift).Include(p => p.Dept).Include(p => p.Manager);
        if (active is not null) q = q.Where(p => p.IsActive == active);
        var rows = await q.OrderBy(p => p.SicilNo).AsNoTracking().ToListAsync(ct);

        var csv = new CsvBuilder().Row(
            "Sicil No", "Ad", "Soyad", "TCKN", "Departman", "Ünvan", "Telefon", "E-posta",
            "Servis Güzergahı", "Durak", "Vardiya", "Amir", "İşe Giriş", "Çıkış", "Aktif");
        foreach (var p in rows)
            csv.Row(p.SicilNo, p.FirstName, p.LastName, p.NationalId,
                p.Dept?.Name ?? p.Department, p.Title, p.PhoneNumber, p.Email,
                p.ServiceRoute?.Name, p.ServiceStop, p.Shift?.Name,
                p.Manager is null ? null : $"{p.Manager.FirstName} {p.Manager.LastName}",
                p.HireDate is null ? null : DateOnly.FromDateTime(p.HireDate.Value),
                p.ExitDate is null ? null : DateOnly.FromDateTime(p.ExitDate.Value),
                p.IsActive);

        return File(csv.ToBytes(), Csv, $"personel-{DateTime.Now:yyyyMMdd}.csv");
    }

    /// <summary>İzin talepleri (tarih aralığı + durum filtresiyle).</summary>
    [HttpGet("leaves.csv")]
    public async Task<IActionResult> Leaves(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? status, CancellationToken ct)
    {
        IQueryable<LeaveRequest> q = _db.LeaveRequests
            .Include(r => r.Personnel).Include(r => r.LeaveType).Include(r => r.Approver);
        if (from is not null) q = q.Where(r => r.EndDate >= from);
        if (to is not null) q = q.Where(r => r.StartDate <= to);
        if (Enum.TryParse<LeaveStatus>(status, true, out var st)) q = q.Where(r => r.Status == st);
        var rows = await q.OrderByDescending(r => r.StartDate).AsNoTracking().ToListAsync(ct);

        var csv = new CsvBuilder().Row(
            "Sicil No", "Personel", "İzin Türü", "Başlangıç", "Bitiş", "Gün", "Yarım Gün",
            "Başlık", "Durum", "Onaylayan", "Talep Tarihi", "Karar Tarihi");
        foreach (var r in rows)
            csv.Row(r.Personnel?.SicilNo, r.Personnel is null ? "" : $"{r.Personnel.FirstName} {r.Personnel.LastName}",
                r.LeaveType?.Name, r.StartDate, r.EndDate, r.TotalDays,
                r.HalfDay switch { HalfDayPeriod.Morning => "ÖÖ", HalfDayPeriod.Afternoon => "ÖS", _ => "-" },
                r.Title, TrLeaveStatus(r.Status),
                r.Approver is null ? null : $"{r.Approver.FirstName} {r.Approver.LastName}",
                r.RequestedAt, r.DecidedAt);

        return File(csv.ToBytes(), Csv, $"izinler-{DateTime.Now:yyyyMMdd}.csv");
    }

    /// <summary>Mesai (giriş/çıkış) hareketleri — tarih aralığı zorunlu değil, varsayılan son 30 gün.</summary>
    [HttpGet("attendance.csv")]
    public async Task<IActionResult> Attendance(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var start = (from ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)))
            .ToDateTime(TimeOnly.MinValue);
        var end = (to ?? DateOnly.FromDateTime(DateTime.UtcNow))
            .ToDateTime(TimeOnly.MaxValue);

        var rows = await _db.Attendances
            .Include(a => a.Personnel).Include(a => a.WorkLocation)
            .Where(a => a.Timestamp >= start && a.Timestamp <= end)
            .OrderByDescending(a => a.Timestamp)
            .Take(20000)
            .AsNoTracking().ToListAsync(ct);

        var csv = new CsvBuilder().Row(
            "Sicil No", "Personel", "Hareket", "Zaman", "Lokasyon", "Mesafe (m)", "Alan İçi", "Cihaz");
        foreach (var a in rows)
            csv.Row(a.Personnel?.SicilNo, a.Personnel is null ? "" : $"{a.Personnel.FirstName} {a.Personnel.LastName}",
                a.Type == AttendanceType.CheckIn ? "Giriş" : "Çıkış", a.Timestamp,
                a.WorkLocation?.Name, Math.Round(a.DistanceMeters), a.IsWithinGeofence, a.DeviceInfo);

        return File(csv.ToBytes(), Csv, $"mesai-{DateTime.Now:yyyyMMdd}.csv");
    }

    /// <summary>Yıllık izin bakiyeleri (yıl bazlı).</summary>
    [HttpGet("leave-balances.csv")]
    public async Task<IActionResult> LeaveBalances([FromQuery] int? year, CancellationToken ct)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var rows = await _db.LeaveBalances.Include(b => b.Personnel)
            .Where(b => b.Year == y)
            .OrderBy(b => b.Personnel!.FirstName)
            .AsNoTracking().ToListAsync(ct);

        var csv = new CsvBuilder().Row(
            "Sicil No", "Personel", "Yıl", "Hak Edilen", "Kullanılan", "Bekleyen", "Kalan");
        foreach (var b in rows)
            csv.Row(b.Personnel?.SicilNo, b.Personnel is null ? "" : $"{b.Personnel.FirstName} {b.Personnel.LastName}",
                b.Year, b.EntitledDays, b.UsedDays, b.PendingDays, b.EntitledDays - b.UsedDays - b.PendingDays);

        return File(csv.ToBytes(), Csv, $"izin-bakiyeleri-{y}.csv");
    }

    private static string TrLeaveStatus(LeaveStatus s) => s switch
    {
        LeaveStatus.Pending => "Bekliyor",
        LeaveStatus.Approved => "Onaylandı",
        LeaveStatus.Rejected => "Reddedildi",
        LeaveStatus.Cancelled => "İptal",
        _ => s.ToString()
    };
}
