using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;

namespace Pdks.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize(Roles = "Admin,Manager")]
public class DepartmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    public DepartmentsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DepartmentDto>>> List(CancellationToken ct)
    {
        var rows = await _db.Departments.Include(d => d.Manager).AsNoTracking().OrderBy(d => d.Name)
            .Select(d => new
            {
                d.Id, d.Name, d.ManagerPersonnelId, d.IsActive,
                ManagerName = d.Manager != null ? d.Manager.FirstName + " " + d.Manager.LastName : null,
                StepCount = d.Steps.Count
            }).ToListAsync(ct);
        return Ok(rows.Select(d => new DepartmentDto(d.Id, d.Name, d.ManagerPersonnelId, d.ManagerName, d.IsActive, d.StepCount)));
    }

    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> Create(DepartmentRequest req, CancellationToken ct)
    {
        var d = new Department { Name = req.Name.Trim(), ManagerPersonnelId = req.ManagerPersonnelId, IsActive = req.IsActive };
        _db.Departments.Add(d);
        await _db.SaveChangesAsync(ct);
        return Ok(new DepartmentDto(d.Id, d.Name, d.ManagerPersonnelId, null, d.IsActive, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, DepartmentRequest req, CancellationToken ct)
    {
        var d = await _db.Departments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null) return NotFound();
        d.Name = req.Name.Trim();
        d.ManagerPersonnelId = req.ManagerPersonnelId;
        d.IsActive = req.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Departman güncellendi." });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var d = await _db.Departments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null) return NotFound();
        _db.Departments.Remove(d);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ---------------- Onay zinciri şablonu ----------------
    [HttpGet("{id:int}/template")]
    public async Task<ActionResult<IEnumerable<ApprovalTemplateStepDto>>> Template(int id, CancellationToken ct)
    {
        var steps = await _db.ApprovalStepTemplates.Include(s => s.SpecificPerson).AsNoTracking()
            .Where(s => s.DepartmentId == id).OrderBy(s => s.Order)
            .Select(s => new ApprovalTemplateStepDto(
                s.Id, s.Order, s.Kind.ToString(), s.SpecificPersonnelId,
                s.SpecificPerson != null ? s.SpecificPerson.FirstName + " " + s.SpecificPerson.LastName : null,
                s.InfoOnly))
            .ToListAsync(ct);
        return Ok(steps);
    }

    /// <summary>Departmanın onay zincirini baştan yazar (adımları sırayla kaydeder).</summary>
    [HttpPut("{id:int}/template")]
    public async Task<IActionResult> SaveTemplate(int id, SaveApprovalTemplateRequest req, CancellationToken ct)
    {
        if (!await _db.Departments.AnyAsync(d => d.Id == id, ct)) return NotFound();

        var existing = await _db.ApprovalStepTemplates.Where(s => s.DepartmentId == id).ToListAsync(ct);
        _db.ApprovalStepTemplates.RemoveRange(existing);

        int order = 1;
        foreach (var s in req.Steps)
        {
            if (!Enum.TryParse<ApproverKind>(s.Kind, true, out var kind)) continue;
            _db.ApprovalStepTemplates.Add(new ApprovalStepTemplate
            {
                DepartmentId = id,
                Order = order++,
                Kind = kind,
                SpecificPersonnelId = kind == ApproverKind.SpecificPerson ? s.SpecificPersonnelId : null,
                InfoOnly = s.InfoOnly
            });
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Onay zinciri kaydedildi." });
    }
}
