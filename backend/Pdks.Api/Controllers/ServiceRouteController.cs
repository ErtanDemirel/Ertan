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
        var items = await _db.ServiceRoutes
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new ServiceRouteDto(
                r.Id, r.Name, r.Description, r.Stops,
                r.DepartureTime == null ? null : r.DepartureTime.Value.ToString("HH\\:mm"),
                r.ReturnTime == null ? null : r.ReturnTime.Value.ToString("HH\\:mm"),
                r.DriverName, r.PlateNumber, r.IsActive,
                r.Personnel.Count))
            .ToListAsync(ct);
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

    private static ServiceRouteDto Map(ServiceRoute r, int count) => new(
        r.Id, r.Name, r.Description, r.Stops,
        r.DepartureTime?.ToString("HH\\:mm"), r.ReturnTime?.ToString("HH\\:mm"),
        r.DriverName, r.PlateNumber, r.IsActive, count);
}
