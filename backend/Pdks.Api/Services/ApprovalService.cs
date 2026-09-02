using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Entities;

namespace Pdks.Api.Services;

/// <summary>
/// Departman bazlı, çok adımlı onay zinciri motoru. İzin/avans/masraf taleplerinin
/// hepsi bu motoru kullanır. Bir kişi izin isteyince kendi departmanının şablonundan
/// (örn. Bölüm Yöneticisi → İK → bilgi: Fabrika Müdürü) somut onay adımları üretilir.
/// </summary>
public class ApprovalService
{
    private readonly AppDbContext _db;
    public ApprovalService(AppDbContext db) => _db = db;

    public record DecideResult(bool Completed, LeaveStatus Status, int? NextApproverPersonnelId, IReadOnlyList<int> InfoRecipientPersonnelIds);

    /// <summary>Talep için onay zincirini kurar ve kaydeder. Onaylayan yoksa otomatik onaylanır.</summary>
    public async Task<ApprovalRequest> BuildChainAsync(RequestKind kind, int requestId, int requesterPersonnelId, CancellationToken ct = default)
    {
        var requester = await _db.Personnel.FirstOrDefaultAsync(p => p.Id == requesterPersonnelId, ct)
            ?? throw new InvalidOperationException("Personel bulunamadı.");

        // Rolleri çöz
        var hr = await _db.Personnel.Where(p => p.IsHrManager && p.IsActive).Select(p => (int?)p.Id).FirstOrDefaultAsync(ct);
        var factory = await _db.Personnel.Where(p => p.IsFactoryManager && p.IsActive).Select(p => (int?)p.Id).FirstOrDefaultAsync(ct);
        int? depManager = requester.DepartmentId is int depId
            ? await _db.Departments.Where(d => d.Id == depId).Select(d => d.ManagerPersonnelId).FirstOrDefaultAsync(ct)
            : null;

        var planned = new List<(int? approverId, string label, bool infoOnly)>();

        var templates = requester.DepartmentId is int dep
            ? await _db.ApprovalStepTemplates.Where(t => t.DepartmentId == dep).OrderBy(t => t.Order).ToListAsync(ct)
            : new List<ApprovalStepTemplate>();

        if (templates.Count > 0)
        {
            foreach (var t in templates)
            {
                int? approverId = t.Kind switch
                {
                    ApproverKind.DepartmentManager => depManager,
                    ApproverKind.HrManager => hr,
                    ApproverKind.FactoryManager => factory,
                    ApproverKind.SpecificPerson => t.SpecificPersonnelId,
                    _ => null
                };
                string label = t.Kind switch
                {
                    ApproverKind.DepartmentManager => "Bölüm Yöneticisi",
                    ApproverKind.HrManager => "İK Yöneticisi",
                    ApproverKind.FactoryManager => "Fabrika Müdürü",
                    _ => "Yetkili"
                };
                planned.Add((approverId, label, t.InfoOnly));
            }
        }
        else
        {
            // Şablon yoksa: Amir → İK
            if (requester.ManagerId is int m) planned.Add((m, "Amir", false));
            if (hr is not null) planned.Add((hr, "İK Yöneticisi", false));
        }

        // Temizle: boş onaylayan / kendi kendini onaylama / ardışık aynı kişi tekrarını at
        var cleaned = new List<(int approverId, string label, bool infoOnly)>();
        foreach (var p in planned)
        {
            if (p.approverId is null || p.approverId == requesterPersonnelId) continue;
            if (cleaned.Count > 0 && cleaned[^1].approverId == p.approverId.Value && cleaned[^1].infoOnly == p.infoOnly) continue;
            cleaned.Add((p.approverId.Value, p.label, p.infoOnly));
        }

        var req = new ApprovalRequest
        {
            Kind = kind, RequestId = requestId, RequesterPersonnelId = requesterPersonnelId, Status = LeaveStatus.Pending
        };
        int order = 1;
        foreach (var c in cleaned)
            req.Steps.Add(new ApprovalStep
            {
                Order = order++, ApproverPersonnelId = c.approverId, Label = c.label,
                InfoOnly = c.infoOnly, Status = StepStatus.Pending
            });

        if (!req.Steps.Any(s => !s.InfoOnly))
            req.Status = LeaveStatus.Approved; // onaylayan yok → otomatik onay

        _db.ApprovalRequests.Add(req);
        await _db.SaveChangesAsync(ct);
        return req;
    }

    public static ApprovalStep? CurrentStep(ApprovalRequest req) =>
        req.Steps.Where(s => !s.InfoOnly && s.Status == StepStatus.Pending).OrderBy(s => s.Order).FirstOrDefault();

    /// <summary>Mevcut adımı onaylar/reddeder ve zinciri ilerletir.</summary>
    public async Task<DecideResult> DecideAsync(ApprovalRequest req, int approverPersonnelId, bool isAdmin,
        bool approve, string? comment, CancellationToken ct = default)
    {
        if (req.Status != LeaveStatus.Pending)
            throw new InvalidOperationException("Bu talep zaten sonuçlanmış.");
        var step = CurrentStep(req) ?? throw new InvalidOperationException("Bekleyen onay adımı bulunamadı.");
        if (!isAdmin && step.ApproverPersonnelId != approverPersonnelId)
            throw new UnauthorizedAccessException("Bu adımın onaylayanı siz değilsiniz.");

        step.Comment = comment;
        step.DecidedAt = DateTime.UtcNow;

        if (!approve)
        {
            step.Status = StepStatus.Rejected;
            req.Status = LeaveStatus.Rejected;
            req.DecidedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return new DecideResult(true, LeaveStatus.Rejected, null, Array.Empty<int>());
        }

        step.Status = StepStatus.Approved;
        var next = CurrentStep(req);
        if (next is null)
        {
            req.Status = LeaveStatus.Approved;
            req.DecidedAt = DateTime.UtcNow;
            var info = req.Steps.Where(s => s.InfoOnly && s.ApproverPersonnelId != null)
                .Select(s => s.ApproverPersonnelId!.Value).Distinct().ToList();
            await _db.SaveChangesAsync(ct);
            return new DecideResult(true, LeaveStatus.Approved, null, info);
        }

        await _db.SaveChangesAsync(ct);
        return new DecideResult(false, LeaveStatus.Pending, next.ApproverPersonnelId, Array.Empty<int>());
    }

    public async Task CancelAsync(ApprovalRequest req, CancellationToken ct = default)
    {
        if (req.Status != LeaveStatus.Pending) return;
        req.Status = LeaveStatus.Cancelled;
        req.DecidedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Bir onaylayanın bekleyen tüm onayları (tüm talep türleri).</summary>
    public async Task<List<ApprovalRequest>> PendingForApproverAsync(int approverPersonnelId, bool isAdmin, CancellationToken ct = default)
    {
        var all = await _db.ApprovalRequests.Include(r => r.Steps).Include(r => r.Requester)
            .Where(r => r.Status == LeaveStatus.Pending).ToListAsync(ct);
        return all.Where(r =>
        {
            var cur = CurrentStep(r);
            return cur != null && (isAdmin || cur.ApproverPersonnelId == approverPersonnelId);
        }).ToList();
    }

    public Task<ApprovalRequest?> GetForRequestAsync(RequestKind kind, int requestId, CancellationToken ct = default) =>
        _db.ApprovalRequests.Include(r => r.Steps).ThenInclude(s => s.Approver)
            .Include(r => r.Requester)
            .FirstOrDefaultAsync(r => r.Kind == kind && r.RequestId == requestId, ct);
}
