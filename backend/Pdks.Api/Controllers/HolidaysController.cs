using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Entities;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/holidays")]
[Authorize]
public class HolidaysController : ControllerBase
{
    private readonly AppDbContext _db;
    public HolidaysController(AppDbContext db) => _db = db;

    public record HolidayDto(int Id, DateOnly Date, string Name, bool IsHalfDay);
    public record HolidayRequest([property: Required] DateOnly Date, [property: Required] string Name, bool IsHalfDay);

    /// <summary>Tatilleri listeler (opsiyonel yıl filtresi). Herkes okuyabilir.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<HolidayDto>>> List([FromQuery] int? year, CancellationToken ct)
    {
        var q = _db.Holidays.AsNoTracking().AsQueryable();
        var rows = await q.OrderBy(h => h.Date).ToListAsync(ct);
        var items = rows.Where(h => year is null || h.Date.Year == year)
            .Select(h => new HolidayDto(h.Id, h.Date, h.Name, h.IsHalfDay));
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<HolidayDto>> Create(HolidayRequest req, CancellationToken ct)
    {
        if (await _db.Holidays.AnyAsync(h => h.Date == req.Date, ct))
            return Conflict(new { message = "Bu tarihte zaten bir tatil kayıtlı." });
        var h = new Holiday { Date = req.Date, Name = req.Name.Trim(), IsHalfDay = req.IsHalfDay };
        _db.Holidays.Add(h);
        await _db.SaveChangesAsync(ct);
        return Ok(new HolidayDto(h.Id, h.Date, h.Name, h.IsHalfDay));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var h = await _db.Holidays.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (h is null) return NotFound();
        _db.Holidays.Remove(h);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
