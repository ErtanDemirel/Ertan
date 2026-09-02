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
        var rows = await _db.Shifts.AsNoTracking()
            .OrderBy(s => s.StartTime)
            .Select(s => new
            {
                s.Id, s.Name, s.StartTime, s.EndTime, s.CrossesMidnight,
                s.Color, s.Description, s.IsActive, Count = s.Personnel.Count
            })
            .ToListAsync(ct);
        var items = rows.Select(s => new ShiftDto(
            s.Id, s.Name, s.StartTime.ToString("HH\\:mm"), s.EndTime.ToString("HH\\:mm"),
            s.CrossesMidnight, s.Color, s.Description, s.IsActive, s.Count)).ToList();
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

    public record BulkAssignRequest(int ShiftId, IReadOnlyList<int> PersonnelIds, IReadOnlyList<DateOnly> Dates, string? Note);

    /// <summary>Toplu vardiya atama: seçili personellerin seçili günlerine tek vardiya atar (upsert).</summary>
    [HttpPost("assignments/bulk")]
    public async Task<IActionResult> BulkAssign(BulkAssignRequest req, CancellationToken ct)
    {
        if (req.PersonnelIds.Count == 0 || req.Dates.Count == 0)
            return BadRequest(new { message = "Personel ve tarih seçin." });
        if (!await _db.Shifts.AnyAsync(s => s.Id == req.ShiftId, ct))
            return BadRequest(new { message = "Vardiya bulunamadı." });

        var pids = req.PersonnelIds.Distinct().ToList();
        var dates = req.Dates.Distinct().ToList();

        // Mevcut atamaları çek (upsert için)
        var existing = await _db.ShiftAssignments
            .Where(a => pids.Contains(a.PersonnelId) && dates.Contains(a.Date))
            .ToListAsync(ct);
        var map = existing.ToDictionary(a => (a.PersonnelId, a.Date));

        int created = 0, updated = 0;
        foreach (var pid in pids)
        {
            foreach (var date in dates)
            {
                if (map.TryGetValue((pid, date), out var a))
                {
                    a.ShiftId = req.ShiftId;
                    a.Note = req.Note;
                    updated++;
                }
                else
                {
                    _db.ShiftAssignments.Add(new ShiftAssignment
                    {
                        PersonnelId = pid, ShiftId = req.ShiftId, Date = date, Note = req.Note
                    });
                    created++;
                }
            }
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { created, updated, total = created + updated });
    }

    /// <summary>Sicil numaralarını (Excel'den yapıştırılan) personel id'lerine çözer.</summary>
    [HttpPost("resolve-sicil")]
    public async Task<ActionResult<object>> ResolveSicil([FromBody] IReadOnlyList<string> sicilNos, CancellationToken ct)
    {
        var wanted = sicilNos.Select(s => s.Trim()).Where(s => s.Length > 0).Distinct().ToList();
        var found = await _db.Personnel.AsNoTracking()
            .Where(p => wanted.Contains(p.SicilNo))
            .Select(p => new { p.Id, p.SicilNo, Name = p.FirstName + " " + p.LastName })
            .ToListAsync(ct);
        var foundSet = found.Select(f => f.SicilNo).ToHashSet();
        var notFound = wanted.Where(s => !foundSet.Contains(s)).ToList();
        return Ok(new { found, notFound });
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
