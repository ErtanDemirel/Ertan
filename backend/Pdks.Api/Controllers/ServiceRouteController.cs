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

        var pq = _db.Personnel.AsNoTracking().Where(p => p.IsActive && p.ServiceRouteId != null);
        if (shiftId.HasValue) pq = pq.Where(p => p.ShiftId == shiftId);
        var personnel = await pq
            .Select(p => new { p.ServiceRouteId, p.ServiceStop })
            .ToListAsync(ct);

        var byRoute = personnel.GroupBy(p => p.ServiceRouteId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

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
            personnel.Count,
            routeStats.Sum(s => s.ServicesNeeded),
            routeStats));
    }

    private static ServiceRouteDto Map(ServiceRoute r, int count) => new(
        r.Id, r.Name, r.Description, r.Stops,
        r.DepartureTime?.ToString("HH\\:mm"), r.ReturnTime?.ToString("HH\\:mm"),
        r.DriverName, r.PlateNumber, r.Capacity, r.IsActive, count);
}
