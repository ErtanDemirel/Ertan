using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Dtos;
using Pdks.Api.Entities;
using Pdks.Api.Services;

namespace Pdks.Api.Controllers;

/// <summary>
/// Onay tarafı (amir/yetkili). İzin, avans ve masraf taleplerinin hepsi tek yerden
/// onaylanır; talep, departmanın onay zincirindeki sıradaki kişiye düşer.
/// </summary>
[ApiController]
[Route("api/approvals")]
[Authorize(Roles = "Admin,Manager")]
public class ApprovalController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ApprovalService _approvals;
    private readonly RequestWorkflowService _workflow;

    public ApprovalController(AppDbContext db, ApprovalService approvals, RequestWorkflowService workflow)
    {
        _db = db; _approvals = approvals; _workflow = workflow;
    }

    /// <summary>Sıradaki onaylayanı ben olan bekleyen talepler (izin/avans/masraf).</summary>
    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<PendingApprovalDto>>> Pending(CancellationToken ct)
    {
        var pid = User.GetPersonnelId() ?? -1;
        var isAdmin = User.GetRole() == "Admin";
        var chains = await _approvals.PendingForApproverAsync(pid, isAdmin, ct);

        var result = new List<PendingApprovalDto>();
        foreach (var chain in chains)
        {
            var cur = ApprovalService.CurrentStep(chain);
            var requester = await _db.Personnel.AsNoTracking().FirstOrDefaultAsync(p => p.Id == chain.RequesterPersonnelId, ct);
            string summary = "", title = "";

            switch (chain.Kind)
            {
                case RequestKind.Leave:
                    var lr = await _db.LeaveRequests.Include(x => x.LeaveType).AsNoTracking().FirstOrDefaultAsync(x => x.Id == chain.RequestId, ct);
                    if (lr is not null) { summary = $"{lr.StartDate:dd.MM.yyyy} → {lr.EndDate:dd.MM.yyyy} ({lr.TotalDays} gün)"; title = lr.Title ?? lr.LeaveType?.Name ?? "İzin"; }
                    break;
                case RequestKind.Advance:
                    var ar = await _db.AdvanceRequests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == chain.RequestId, ct);
                    if (ar is not null) { summary = $"{ar.Amount:N2} ₺"; title = "Avans talebi"; }
                    break;
                case RequestKind.Expense:
                    var er = await _db.ExpenseRequests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == chain.RequestId, ct);
                    if (er is not null) { summary = $"{er.Amount:N2} ₺"; title = er.Title ?? "Masraf talebi"; }
                    break;
            }

            var steps = await StepDtosAsync(chain, ct);
            result.Add(new PendingApprovalDto(
                chain.Id, chain.Kind.ToString(), RequestWorkflowService.KindLabel(chain.Kind),
                requester is null ? "" : $"{requester.FirstName} {requester.LastName}",
                requester?.SicilNo ?? "", summary, title, chain.CreatedAt,
                cur?.Label ?? "-", steps));
        }
        return Ok(result.OrderBy(r => r.CreatedAt).ToList());
    }

    /// <summary>Bir talebin (izin/avans/masraf) mevcut adımını onaylar/reddeder.</summary>
    [HttpPost("{approvalRequestId:int}/decide")]
    public async Task<IActionResult> Decide(int approvalRequestId, DecideApprovalRequest req, CancellationToken ct)
    {
        var chain = await _db.ApprovalRequests.Include(r => r.Steps).Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Id == approvalRequestId, ct);
        if (chain is null) return NotFound();

        var pid = User.GetPersonnelId() ?? -1;
        var isAdmin = User.GetRole() == "Admin";

        try
        {
            var res = await _approvals.DecideAsync(chain, pid, isAdmin, req.Approve, req.Comment, ct);
            await _workflow.HandleDecidedAsync(chain, res, pid, req.Comment, ct);
            var msg = !req.Approve ? "Talep reddedildi."
                : res.Completed ? "Talep onaylandı." : "Onaylandı; sıradaki kişiye iletildi.";
            return Ok(new { message = msg, completed = res.Completed, status = res.Status.ToString() });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private async Task<List<ApprovalStepDto>> StepDtosAsync(ApprovalRequest chain, CancellationToken ct)
    {
        var ids = chain.Steps.Where(s => s.ApproverPersonnelId != null).Select(s => s.ApproverPersonnelId!.Value).Distinct().ToList();
        var names = await _db.Personnel.AsNoTracking().Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.FirstName + " " + p.LastName, ct);
        return chain.Steps.OrderBy(s => s.Order).Select(s => new ApprovalStepDto(
            s.Order, s.Label,
            s.ApproverPersonnelId != null && names.TryGetValue(s.ApproverPersonnelId.Value, out var n) ? n : null,
            s.Status.ToString(), s.InfoOnly, s.Comment)).ToList();
    }
}
