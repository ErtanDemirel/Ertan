using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/service-routes")]
[Authorize(Roles = "Admin,Manager")]
public class ServiceRouteController : ControllerBase
{
    private readonly AppDbContext _db;
    public ServiceRouteController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServiceRouteDto>>> List(CancellationToken ct)
    {
        var rows = await _db.ServiceRoutes
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new
            {
                r.Id, r.Name, r.Description, r.Stops, r.DepartureTime, r.ReturnTime,
                r.DriverName, r.PlateNumber, r.Capacity, r.IsActive, Count = r.Personnel.Count
            })
            .ToListAsync(ct);
        var items = rows.Select(r => new ServiceRouteDto(
            r.Id, r.Name, r.Description, r.Stops,
            r.DepartureTime?.ToString("HH\\:mm"), r.ReturnTime?.ToString("HH\\:mm"),
            r.DriverName, r.PlateNumber, r.Capacity, r.IsActive, r.Count)).ToList();
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<ServiceRouteDto>> Create(ServiceRouteRequest req, CancellationToken ct)
    {
        var r = new ServiceRoute
        {
            Name = req.Name.Trim(),
            Description = req.Description,
            Stops = req.Stops,
            DepartureTime = ParseTime(req.DepartureTime),
            ReturnTime = ParseTime(req.ReturnTime),
            DriverName = req.DriverName,
            PlateNumber = req.PlateNumber,
            Capacity = req.Capacity <= 0 ? 27 : req.Capacity,
            IsActive = req.IsActive
        };
        _db.ServiceRoutes.Add(r);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(r, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ServiceRouteDto>> Update(int id, ServiceRouteRequest req, CancellationToken ct)
    {
        var r = await _db.ServiceRoutes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (r is null) return NotFound();
        r.Name = req.Name.Trim();
        r.Description = req.Description;
        r.Stops = req.Stops;
        r.DepartureTime = ParseTime(req.DepartureTime);
        r.ReturnTime = ParseTime(req.ReturnTime);
        r.DriverName = req.DriverName;
        r.PlateNumber = req.PlateNumber;
        r.Capacity = req.Capacity <= 0 ? 27 : req.Capacity;
        r.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        var count = await _db.Personnel.CountAsync(p => p.ServiceRouteId == id, ct);
        return Ok(Map(r, count));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var r = await _db.ServiceRoutes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (r is null) return NotFound();
        _db.ServiceRoutes.Remove(r);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static TimeOnly? ParseTime(string? s) =>
        TimeOnly.TryParse(s, CultureInfo.InvariantCulture, out var t) ? t : null;

    /// <summary>
    /// Servis analizi: her hat için kişi sayısı, gerekli servis sayısı (kapasiteye göre)
    /// ve durak bazında kişi dağılımı. Vardiya filtresiyle o vardiyaya göre hesaplanır.
    /// </summary>
    [HttpGet("analytics")]
    public async Task<ActionResult<ServiceAnalyticsResult>> Analytics(
        [FromQuery] int? shiftId, CancellationToken ct)
    {
        var routes = await _db.ServiceRoutes.AsNoTracking()
            .Where(r => r.IsActive).OrderBy(r => r.Name).ToListAsync(ct);
        var capOf = routes.ToDictionary(r => r.Id, r => r.Capacity <= 0 ? 27 : r.Capacity);

        // Tüm servis kullanan aktif personel (vardiya bilgisiyle)
        var all = await _db.Personnel.AsNoTracking()
            .Where(p => p.IsActive && p.ServiceRouteId != null)
            .Select(p => new { RouteId = p.ServiceRouteId!.Value, p.ServiceStop, p.ShiftId })
            .ToListAsync(ct);

        // Seçili vardiyaya göre (filtre yoksa hepsi) hat istatistikleri
        var filtered = shiftId.HasValue ? all.Where(p => p.ShiftId == shiftId).ToList() : all;
        var byRoute = filtered.GroupBy(p => p.RouteId).ToDictionary(g => g.Key, g => g.ToList());

        // Vardiya kırılımı: her aktif vardiya için gerekli servis sayısı
        var shifts = await _db.Shifts.AsNoTracking().Where(s => s.IsActive).OrderBy(s => s.StartTime).ToListAsync(ct);
        var byShift = shifts.Select(s =>
        {
            var inShift = all.Where(p => p.ShiftId == s.Id).ToList();
            var needed = inShift.GroupBy(p => p.RouteId)
                .Sum(g => (int)Math.Ceiling(g.Count() / (double)(capOf.TryGetValue(g.Key, out var c) ? c : 27)));
            return new ShiftServiceSummary(s.Id, s.Name, inShift.Count, needed);
        }).ToList();

        var routeStats = new List<ServiceRouteAnalytics>();
        foreach (var r in routes)
        {
            byRoute.TryGetValue(r.Id, out var list);
            var count = list?.Count ?? 0;
            var cap = r.Capacity <= 0 ? 27 : r.Capacity;
            var needed = count == 0 ? 0 : (int)Math.Ceiling(count / (double)cap);
            var stops = (list ?? new())
                .GroupBy(p => string.IsNullOrWhiteSpace(p.ServiceStop) ? "Belirtilmemiş" : p.ServiceStop!)
                .Select(g => new ServiceStopStat(g.Key, g.Count()))
                .OrderByDescending(s => s.PersonnelCount)
                .ToList();
            routeStats.Add(new ServiceRouteAnalytics(r.Id, r.Name, cap, count, needed, stops));
        }

        var shiftName = shiftId.HasValue
            ? await _db.Shifts.Where(s => s.Id == shiftId).Select(s => s.Name).FirstOrDefaultAsync(ct)
            : null;

        return Ok(new ServiceAnalyticsResult(
            shiftId, shiftName,
            filtered.Count,
            routeStats.Sum(s => s.ServicesNeeded),
            routeStats,
            byShift));
    }

    private static ServiceRouteDto Map(ServiceRoute r, int count) => new(
        r.Id, r.Name, r.Description, r.Stops,
        r.DepartureTime?.ToString("HH\\:mm"), r.ReturnTime?.ToString("HH\\:mm"),
        r.DriverName, r.PlateNumber, r.Capacity, r.IsActive, count);
}
