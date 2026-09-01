using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/work-locations")]
[Authorize(Roles = "Admin,Manager")]
public class WorkLocationController : ControllerBase
{
    private readonly AppDbContext _db;
    public WorkLocationController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WorkLocationDto>>> List(CancellationToken ct) =>
        Ok(await _db.WorkLocations.AsNoTracking().OrderBy(l => l.Name)
            .Select(l => new WorkLocationDto(l.Id, l.Name, l.Latitude, l.Longitude, l.RadiusMeters, l.IsActive))
            .ToListAsync(ct));

    [HttpPost]
    public async Task<ActionResult<WorkLocationDto>> Create(WorkLocationRequest req, CancellationToken ct)
    {
        var l = new WorkLocation
        {
            Name = req.Name.Trim(),
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            RadiusMeters = req.RadiusMeters <= 0 ? 150 : req.RadiusMeters,
            IsActive = req.IsActive,
            QrSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
        };
        _db.WorkLocations.Add(l);
        await _db.SaveChangesAsync(ct);
        return Ok(new WorkLocationDto(l.Id, l.Name, l.Latitude, l.Longitude, l.RadiusMeters, l.IsActive));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<WorkLocationDto>> Update(int id, WorkLocationRequest req, CancellationToken ct)
    {
        var l = await _db.WorkLocations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (l is null) return NotFound();
        l.Name = req.Name.Trim();
        l.Latitude = req.Latitude;
        l.Longitude = req.Longitude;
        l.RadiusMeters = req.RadiusMeters <= 0 ? 150 : req.RadiusMeters;
        l.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(new WorkLocationDto(l.Id, l.Name, l.Latitude, l.Longitude, l.RadiusMeters, l.IsActive));
    }

    /// <summary>QR gizli anahtarını yeniler (sızıntı şüphesinde).</summary>
    [HttpPost("{id:int}/rotate-secret")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RotateSecret(int id, CancellationToken ct)
    {
        var l = await _db.WorkLocations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (l is null) return NotFound();
        l.QrSecret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "QR anahtarı yenilendi." });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var l = await _db.WorkLocations.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (l is null) return NotFound();
        _db.WorkLocations.Remove(l);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
