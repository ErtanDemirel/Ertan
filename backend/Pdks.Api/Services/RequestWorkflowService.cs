using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Entities;

namespace Pdks.Api.Services;

/// <summary>
/// Onay zinciri kararlarını talebin türüne göre sonuçlandırır:
/// izin bakiyesi hareketi, avans/masraf durum güncellemesi ve bildirimler.
/// </summary>
public class RequestWorkflowService
{
    private readonly AppDbContext _db;
    private readonly LeaveService _leave;
    private readonly NotificationService _notify;

    public RequestWorkflowService(AppDbContext db, LeaveService leave, NotificationService notify)
    {
        _db = db; _leave = leave; _notify = notify;
    }

    /// <summary>Talep + zincir oluşturulduktan sonra: otomatik onaylandıysa sonuçlandır, değilse ilk onaylayanı bilgilendir.</summary>
    public async Task HandleCreatedAsync(ApprovalRequest chain, CancellationToken ct = default)
    {
        if (chain.Status == LeaveStatus.Approved)
            await ApplyApprovedAsync(chain, null, 0, Array.Empty<int>(), ct);
        else
        {
            var cur = ApprovalService.CurrentStep(chain);
            if (cur?.ApproverPersonnelId is int approverId)
                await NotifyApproverAsync(approverId, chain, ct);
        }
    }

    /// <summary>Bir karar sonrası: tamamlandıysa sonuçlandır, değilse sıradaki onaylayanı bilgilendir.</summary>
    public async Task HandleDecidedAsync(ApprovalRequest chain, ApprovalService.DecideResult res,
        int actorPersonnelId, string? comment, CancellationToken ct = default)
    {
        if (!res.Completed)
        {
            if (res.NextApproverPersonnelId is int next) await NotifyApproverAsync(next, chain, ct);
            return;
        }

        if (res.Status == LeaveStatus.Approved)
            await ApplyApprovedAsync(chain, comment, actorPersonnelId, res.InfoRecipientPersonnelIds, ct);
        else
            await ApplyRejectedAsync(chain, comment, actorPersonnelId, ct);

        await NotifyRequesterAsync(chain, res.Status, ct);
    }

    private async Task ApplyApprovedAsync(ApprovalRequest chain, string? comment, int actorPersonnelId,
        IReadOnlyList<int> infoRecipients, CancellationToken ct)
    {
        switch (chain.Kind)
        {
            case RequestKind.Leave:
                var lr = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == chain.RequestId, ct);
                if (lr is { Status: LeaveStatus.Pending })
                    await _leave.DecideAsync(lr, true, comment, actorPersonnelId, ct);
                break;
            case RequestKind.Advance:
                await SetSimpleStatusAsync<AdvanceRequest>(chain.RequestId, LeaveStatus.Approved, comment, ct);
                break;
            case RequestKind.Expense:
                await SetSimpleStatusAsync<ExpenseRequest>(chain.RequestId, LeaveStatus.Approved, comment, ct);
                break;
        }

        // Bilgi adımı olan kişilere (örn. Fabrika Müdürü) "X talebi onaylandı" bildir
        foreach (var pid in infoRecipients)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.PersonnelId == pid, ct);
            if (user is not null)
                await _notify.NotifyAsync(user, "Bilgilendirme",
                    $"{RequesterName(chain)} için {KindLabel(chain.Kind)} talebi onaylandı.", "approval", true, false, ct);
        }
        await _db.SaveChangesAsync(ct);
    }

    private async Task ApplyRejectedAsync(ApprovalRequest chain, string? comment, int actorPersonnelId, CancellationToken ct)
    {
        switch (chain.Kind)
        {
            case RequestKind.Leave:
                var lr = await _db.LeaveRequests.FirstOrDefaultAsync(x => x.Id == chain.RequestId, ct);
                if (lr is { Status: LeaveStatus.Pending })
                    await _leave.DecideAsync(lr, false, comment, actorPersonnelId, ct);
                break;
            case RequestKind.Advance:
                await SetSimpleStatusAsync<AdvanceRequest>(chain.RequestId, LeaveStatus.Rejected, comment, ct);
                break;
            case RequestKind.Expense:
                await SetSimpleStatusAsync<ExpenseRequest>(chain.RequestId, LeaveStatus.Rejected, comment, ct);
                break;
        }
        await _db.SaveChangesAsync(ct);
    }

    private async Task SetSimpleStatusAsync<T>(int id, LeaveStatus status, string? comment, CancellationToken ct)
        where T : class
    {
        var entity = await _db.Set<T>().FindAsync(new object?[] { id }, ct);
        if (entity is AdvanceRequest a) { a.Status = status; a.ManagerComment = comment; a.DecidedAt = DateTime.UtcNow; }
        else if (entity is ExpenseRequest e) { e.Status = status; e.ManagerComment = comment; e.DecidedAt = DateTime.UtcNow; }
    }

    private async Task NotifyApproverAsync(int approverPersonnelId, ApprovalRequest chain, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.PersonnelId == approverPersonnelId, ct);
        if (user is not null)
            await _notify.NotifyAsync(user, "Onayınız bekleniyor",
                $"{RequesterName(chain)} bir {KindLabel(chain.Kind)} talebi için onayınızı bekliyor.", "approval", true, false, ct);
        await _db.SaveChangesAsync(ct);
    }

    private async Task NotifyRequesterAsync(ApprovalRequest chain, LeaveStatus status, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.PersonnelId == chain.RequesterPersonnelId, ct);
        if (user is not null)
        {
            var txt = status == LeaveStatus.Approved ? "onaylandı" : "reddedildi";
            await _notify.NotifyAsync(user, "Talep sonucu",
                $"{KindLabel(chain.Kind)} talebiniz {txt}.", "approval", true, false, ct);
        }
        await _db.SaveChangesAsync(ct);
    }

    private static string RequesterName(ApprovalRequest chain) =>
        chain.Requester is null ? "Personel" : $"{chain.Requester.FirstName} {chain.Requester.LastName}";

    public static string KindLabel(RequestKind kind) => kind switch
    {
        RequestKind.Leave => "İzin",
        RequestKind.Advance => "Avans",
        RequestKind.Expense => "Masraf",
        _ => "Talep"
    };
}
