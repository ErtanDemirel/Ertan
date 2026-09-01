using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/meals")]
[Authorize]
public class MealController : ControllerBase
{
    private readonly AppDbContext _db;
    public MealController(AppDbContext db) => _db = db;

    /// <summary>Tarih aralığındaki yemek listeleri (varsayılan: bu hafta).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MealMenuDto>>> List(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = from ?? today.AddDays(-(int)((today.DayOfWeek + 6) % 7)); // haftanın pazartesisi
        var end = to ?? start.AddDays(13);

        var items = await _db.MealMenus.AsNoTracking()
            .Where(m => m.Date >= start && m.Date <= end)
            .OrderBy(m => m.Date)
            .Select(m => new MealMenuDto(m.Id, m.Date, m.Soup, m.MainCourse, m.SideDish,
                m.Complement, m.Dessert, m.Alternative, m.Calories))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<MealMenuDto>> Create(MealMenuRequest req, CancellationToken ct)
    {
        var existing = await _db.MealMenus.FirstOrDefaultAsync(m => m.Date == req.Date, ct);
        if (existing is not null)
        {
            // Aynı güne tekrar girilirse güncelle (upsert)
            Apply(existing, req);
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            existing = new MealMenu { Date = req.Date, CreatedByUserId = User.GetUserId() };
            Apply(existing, req);
            _db.MealMenus.Add(existing);
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new MealMenuDto(existing.Id, existing.Date, existing.Soup, existing.MainCourse,
            existing.SideDish, existing.Complement, existing.Dessert, existing.Alternative, existing.Calories));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<MealMenuDto>> Update(int id, MealMenuRequest req, CancellationToken ct)
    {
        var m = await _db.MealMenus.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (m is null) return NotFound();
        Apply(m, req);
        m.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new MealMenuDto(m.Id, m.Date, m.Soup, m.MainCourse, m.SideDish,
            m.Complement, m.Dessert, m.Alternative, m.Calories));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var m = await _db.MealMenus.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (m is null) return NotFound();
        _db.MealMenus.Remove(m);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static void Apply(MealMenu m, MealMenuRequest req)
    {
        m.Soup = req.Soup;
        m.MainCourse = req.MainCourse;
        m.SideDish = req.SideDish;
        m.Complement = req.Complement;
        m.Dessert = req.Dessert;
        m.Alternative = req.Alternative;
        m.Calories = req.Calories;
    }
}
