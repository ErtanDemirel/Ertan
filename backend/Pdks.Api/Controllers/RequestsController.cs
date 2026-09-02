using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>Avans ve masraf talepleri. İzinle aynı departman onay zincirinden geçer.</summary>
[ApiController]
[Route("api/requests")]
[Authorize]
public class RequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ApprovalService _approvals;
    private readonly RequestWorkflowService _workflow;
    private readonly FileStorageService _files;

    public RequestsController(AppDbContext db, ApprovalService approvals,
        RequestWorkflowService workflow, FileStorageService files)
    {
        _db = db; _approvals = approvals; _workflow = workflow; _files = files;
    }

    // ---------------- Avans ----------------
    [HttpPost("advance")]
    public async Task<ActionResult<AdvanceRequestDto>> CreateAdvance(CreateAdvanceRequest req, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return BadRequest(new { message = "Bu hesap bir personel kaydına bağlı değil." });
        if (req.Amount <= 0) return BadRequest(new { message = "Tutar 0'dan büyük olmalı." });

        var a = new AdvanceRequest { PersonnelId = pid.Value, Amount = req.Amount, Reason = req.Reason };
        _db.AdvanceRequests.Add(a);
        await _db.SaveChangesAsync(ct);

        var chain = await _approvals.BuildChainAsync(RequestKind.Advance, a.Id, pid.Value, ct);
        await _workflow.HandleCreatedAsync(chain, ct);
        // otomatik onay durumunda status güncellenmiş olabilir
        await _db.Entry(a).ReloadAsync(ct);

        var person = await _db.Personnel.FindAsync(new object?[] { pid.Value }, ct);
        return Ok(MapAdvance(a, person));
    }

    // ---------------- Masraf ----------------
    [HttpPost("expense")]
    [RequestSizeLimit(15 * 1024 * 1024)]
    public async Task<ActionResult<ExpenseRequestDto>> CreateExpense(
        [FromForm] decimal amount, [FromForm] string? title, [FromForm] string? description,
        IFormFile? file, CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return BadRequest(new { message = "Bu hesap bir personel kaydına bağlı değil." });
        if (amount <= 0) return BadRequest(new { message = "Tutar 0'dan büyük olmalı." });

        var e = new ExpenseRequest { PersonnelId = pid.Value, Amount = amount, Title = title, Description = description };
        if (file is not null)
        {
            try
            {
                var info = await _files.SaveAsync(file, "expense", ct);
                e.FileName = info.FileName; e.StoredPath = info.StoredPath; e.ContentType = info.ContentType;
            }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }
        _db.ExpenseRequests.Add(e);
        await _db.SaveChangesAsync(ct);

        var chain = await _approvals.BuildChainAsync(RequestKind.Expense, e.Id, pid.Value, ct);
        await _workflow.HandleCreatedAsync(chain, ct);
        await _db.Entry(e).ReloadAsync(ct);

        var person = await _db.Personnel.FindAsync(new object?[] { pid.Value }, ct);
        return Ok(MapExpense(e, person));
    }

    /// <summary>Kullanıcının avans + masraf talepleri.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<object>> My(CancellationToken ct)
    {
        var pid = User.GetPersonnelId();
        if (pid is null) return Ok(new { advances = Array.Empty<AdvanceRequestDto>(), expenses = Array.Empty<ExpenseRequestDto>() });

        var person = await _db.Personnel.AsNoTracking().FirstOrDefaultAsync(p => p.Id == pid, ct);
        var advances = (await _db.AdvanceRequests.AsNoTracking().Where(a => a.PersonnelId == pid)
            .OrderByDescending(a => a.RequestedAt).ToListAsync(ct)).Select(a => MapAdvance(a, person)).ToList();
        var expenses = (await _db.ExpenseRequests.AsNoTracking().Where(e => e.PersonnelId == pid)
            .OrderByDescending(e => e.RequestedAt).ToListAsync(ct)).Select(e => MapExpense(e, person)).ToList();
        return Ok(new { advances, expenses });
    }

    [HttpGet("expense/{id:int}/file")]
    public async Task<IActionResult> ExpenseFile(int id, CancellationToken ct)
    {
        var e = await _db.ExpenseRequests.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e?.StoredPath is null) return NotFound();
        var pid = User.GetPersonnelId();
        if (e.PersonnelId != pid && !User.IsManagerOrAdmin()) return Forbid();
        var (stream, contentType) = _files.Open(e.StoredPath, e.ContentType ?? "application/octet-stream");
        return File(stream, contentType, e.FileName ?? "belge");
    }

    private static AdvanceRequestDto MapAdvance(AdvanceRequest a, Personnel? p) => new(
        a.Id, a.PersonnelId, p is null ? "" : p.FirstName + " " + p.LastName, p?.SicilNo ?? "",
        a.Amount, a.Reason, a.Status.ToString(), a.ManagerComment, a.RequestedAt, a.DecidedAt);

    private static ExpenseRequestDto MapExpense(ExpenseRequest e, Personnel? p) => new(
        e.Id, e.PersonnelId, p is null ? "" : p.FirstName + " " + p.LastName, p?.SicilNo ?? "",
        e.Amount, e.Title, e.Description, e.StoredPath != null, e.Status.ToString(),
        e.ManagerComment, e.RequestedAt, e.DecidedAt);
}
