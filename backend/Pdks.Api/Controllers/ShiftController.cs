using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/shifts")]
[Authorize(Roles = "Admin,Manager")]
public class ShiftController : ControllerBase
{
    private readonly AppDbContext _db;
    public ShiftController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShiftDto>>> List(CancellationToken ct)
    {
        var items = await _db.Shifts.AsNoTracking()
            .OrderBy(s => s.StartTime)
            .Select(s => new ShiftDto(
                s.Id, s.Name, s.StartTime.ToString("HH\\:mm"), s.EndTime.ToString("HH\\:mm"),
                s.CrossesMidnight, s.Color, s.Description, s.IsActive, s.Personnel.Count))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<ShiftDto>> Create(ShiftRequest req, CancellationToken ct)
    {
        if (!TimeOnly.TryParse(req.StartTime, CultureInfo.InvariantCulture, out var start) ||
            !TimeOnly.TryParse(req.EndTime, CultureInfo.InvariantCulture, out var end))
            return BadRequest(new { message = "Saat formatı geçersiz (HH:mm)." });

        var s = new Shift
        {
            Name = req.Name.Trim(),
            StartTime = start,
            EndTime = end,
            CrossesMidnight = req.CrossesMidnight || end < start,
            Color = req.Color,
            Description = req.Description,
            IsActive = req.IsActive
        };
        _db.Shifts.Add(s);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(s, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ShiftDto>> Update(int id, ShiftRequest req, CancellationToken ct)
    {
        var s = await _db.Shifts.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s is null) return NotFound();
        if (!TimeOnly.TryParse(req.StartTime, CultureInfo.InvariantCulture, out var start) ||
            !TimeOnly.TryParse(req.EndTime, CultureInfo.InvariantCulture, out var end))
            return BadRequest(new { message = "Saat formatı geçersiz (HH:mm)." });

        s.Name = req.Name.Trim();
        s.StartTime = start;
        s.EndTime = end;
        s.CrossesMidnight = req.CrossesMidnight || end < start;
        s.Color = req.Color;
        s.Description = req.Description;
        s.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        var count = await _db.Personnel.CountAsync(p => p.ShiftId == id, ct);
        return Ok(Map(s, count));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var s = await _db.Shifts.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s is null) return NotFound();
        _db.Shifts.Remove(s);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---- Vardiya planı (atamalar) ----

    /// <summary>Tarih aralığındaki vardiya atamaları. İzinli günler de görülebilsin diye onaylı izinlerle birlikte döner.</summary>
    [HttpGet("assignments")]
    public async Task<ActionResult<object>> Assignments(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct)
    {
        var assignments = await _db.ShiftAssignments
            .Include(a => a.Personnel).Include(a => a.Shift)
            .Where(a => a.Date >= from && a.Date <= to)
            .AsNoTracking()
            .Select(a => new ShiftAssignmentDto(
                a.Id, a.PersonnelId, a.Personnel!.FirstName + " " + a.Personnel.LastName,
                a.Personnel.SicilNo, a.ShiftId, a.Shift!.Name, a.Date, a.Note))
            .ToListAsync(ct);

        // Onaylı izinler (vardiya yönetiminden görünür)
        var leaves = await _db.LeaveRequests
            .Include(l => l.Personnel).Include(l => l.LeaveType)
            .Where(l => l.Status == LeaveStatus.Approved && l.StartDate <= to && l.EndDate >= from)
            .AsNoTracking()
            .Select(l => new
            {
                l.Id, l.PersonnelId,
                PersonnelName = l.Personnel!.FirstName + " " + l.Personnel.LastName,
                l.Personnel.SicilNo,
                LeaveType = l.LeaveType!.Name,
                l.StartDate, l.EndDate
            })
            .ToListAsync(ct);

        return Ok(new { assignments, leaves });
    }

    [HttpPost("assignments")]
    public async Task<ActionResult<ShiftAssignmentDto>> CreateAssignment(ShiftAssignmentRequest req, CancellationToken ct)
    {
        var existing = await _db.ShiftAssignments
            .FirstOrDefaultAsync(a => a.PersonnelId == req.PersonnelId && a.Date == req.Date, ct);
        if (existing is not null)
        {
            existing.ShiftId = req.ShiftId;
            existing.Note = req.Note;
        }
        else
        {
            existing = new ShiftAssignment
            {
                PersonnelId = req.PersonnelId,
                ShiftId = req.ShiftId,
                Date = req.Date,
                Note = req.Note
            };
            _db.ShiftAssignments.Add(existing);
        }
        await _db.SaveChangesAsync(ct);

        var dto = await _db.ShiftAssignments.Include(a => a.Personnel).Include(a => a.Shift)
            .Where(a => a.Id == existing.Id)
            .Select(a => new ShiftAssignmentDto(
                a.Id, a.PersonnelId, a.Personnel!.FirstName + " " + a.Personnel.LastName,
                a.Personnel.SicilNo, a.ShiftId, a.Shift!.Name, a.Date, a.Note))
            .FirstAsync(ct);
        return Ok(dto);
    }

    [HttpDelete("assignments/{id:int}")]
    public async Task<IActionResult> DeleteAssignment(int id, CancellationToken ct)
    {
        var a = await _db.ShiftAssignments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a is null) return NotFound();
        _db.ShiftAssignments.Remove(a);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static ShiftDto Map(Shift s, int count) => new(
        s.Id, s.Name, s.StartTime.ToString("HH\\:mm"), s.EndTime.ToString("HH\\:mm"),
        s.CrossesMidnight, s.Color, s.Description, s.IsActive, count);
}
