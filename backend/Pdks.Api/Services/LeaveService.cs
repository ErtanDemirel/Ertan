using Microsoft.EntityFrameworkCore;
using Pdks.Api.Data;
using Pdks.Api.Entities;

namespace Pdks.Api.Services;

/// <summary>İzin talebi iş kuralları: gün hesabı, bakiye rezervasyonu, onay/red.</summary>
public class LeaveService
{
    private readonly AppDbContext _db;
    public LeaveService(AppDbContext db) => _db = db;

    /// <summary>Hafta sonlarını (Cmt/Paz) hariç tutarak çalışma günü sayar.</summary>
    public static decimal CalculateWorkingDays(DateOnly start, DateOnly end)
    {
        if (end < start) return 0;
        int days = 0;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            if (d.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                days++;
        }
        return days;
    }

    /// <summary>
    /// İzin gününü hesaplar: hafta sonları VE resmî tatiller yıllık izinden düşülmez.
    /// Yarım gün tatiller 0.5 gün sayılır.
    /// </summary>
    public async Task<decimal> CalculateLeaveDaysAsync(DateOnly start, DateOnly end, CancellationToken ct = default)
    {
        if (end < start) return 0;
        var holidays = await _db.Holidays
            .Where(h => h.Date >= start && h.Date <= end)
            .ToDictionaryAsync(h => h.Date, h => h.IsHalfDay, ct);

        decimal days = 0;
        for (var d = start; d <= end; d = d.AddDays(1))
        {
            if (d.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
            if (holidays.TryGetValue(d, out var isHalf))
            {
                if (isHalf) days += 0.5m; // yarım gün tatil → yarım gün izin sayılır
                continue;                  // tam tatil → izinden düşmez
            }
            days += 1;
        }
        return days;
    }

    /// <summary>Yeni izin talebi oluşturur; yıllık izinse bakiyeden rezerve eder.</summary>
    public async Task<LeaveRequest> CreateAsync(int personnelId, int leaveTypeId,
        DateOnly start, DateOnly end, string? title, string? reason, decimal? days,
        CancellationToken ct = default)
    {
        if (end < start)
            throw new InvalidOperationException("Bitiş tarihi başlangıçtan önce olamaz.");

        var personnel = await _db.Personnel.FirstOrDefaultAsync(p => p.Id == personnelId, ct)
            ?? throw new InvalidOperationException("Personel bulunamadı.");

        var type = await _db.LeaveTypes.FirstOrDefaultAsync(t => t.Id == leaveTypeId && t.IsActive, ct)
            ?? throw new InvalidOperationException("İzin türü geçersiz.");

        // Talep sahibi gün girebilir; aksi halde hafta sonu + resmî tatil hariç hesaplanır.
        var calc = await CalculateLeaveDaysAsync(start, end, ct);
        var totalDays = days is > 0 ? days.Value : calc;
        var span = end.DayNumber - start.DayNumber + 1; // takvim günü üst sınırı
        if (totalDays <= 0 || totalDays > span)
            throw new InvalidOperationException("Gün sayısı geçersiz (0 ile tarih aralığı arasında olmalı).");

        // Çakışan (onaylı/bekleyen) talep kontrolü
        var overlaps = await _db.LeaveRequests.AnyAsync(r =>
            r.PersonnelId == personnelId &&
            (r.Status == LeaveStatus.Pending || r.Status == LeaveStatus.Approved) &&
            r.StartDate <= end && start <= r.EndDate, ct);
        if (overlaps)
            throw new InvalidOperationException("Bu tarihlerle çakışan bir izin talebiniz mevcut.");

        if (type.DeductsFromAnnual)
        {
            var balance = await GetOrCreateBalanceAsync(personnelId, start.Year, ct);
            if (balance.RemainingDays < totalDays)
                throw new InvalidOperationException(
                    $"Yetersiz yıllık izin bakiyesi. Kalan: {balance.RemainingDays} gün, talep: {totalDays} gün.");
            balance.PendingDays += totalDays;
        }

        var request = new LeaveRequest
        {
            PersonnelId = personnelId,
            LeaveTypeId = leaveTypeId,
            StartDate = start,
            EndDate = end,
            TotalDays = totalDays,
            Title = title,
            Reason = reason,
            Status = LeaveStatus.Pending,
            ApproverId = personnel.ManagerId,
            RequestedAt = DateTime.UtcNow
        };
        _db.LeaveRequests.Add(request);
        await _db.SaveChangesAsync(ct);
        return request;
    }

    /// <summary>Amir onayı/reddi. Onayda rezerve gün "kullanılan"a taşınır.</summary>
    public async Task DecideAsync(LeaveRequest request, bool approve, string? comment,
        int approverId, CancellationToken ct = default)
    {
        if (request.Status != LeaveStatus.Pending)
            throw new InvalidOperationException("Bu talep zaten sonuçlanmış.");

        var type = await _db.LeaveTypes.FirstAsync(t => t.Id == request.LeaveTypeId, ct);

        if (type.DeductsFromAnnual)
        {
            var balance = await GetOrCreateBalanceAsync(request.PersonnelId, request.StartDate.Year, ct);
            // Rezervi düş
            balance.PendingDays = Math.Max(0, balance.PendingDays - request.TotalDays);
            if (approve)
                balance.UsedDays += request.TotalDays;
        }

        request.Status = approve ? LeaveStatus.Approved : LeaveStatus.Rejected;
        request.ManagerComment = comment;
        request.ApproverId = approverId;
        request.DecidedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>Personel kendi bekleyen talebini iptal eder; rezerv serbest kalır.</summary>
    public async Task CancelAsync(LeaveRequest request, CancellationToken ct = default)
    {
        if (request.Status != LeaveStatus.Pending)
            throw new InvalidOperationException("Sadece bekleyen talepler iptal edilebilir.");

        var type = await _db.LeaveTypes.FirstAsync(t => t.Id == request.LeaveTypeId, ct);
        if (type.DeductsFromAnnual)
        {
            var balance = await GetOrCreateBalanceAsync(request.PersonnelId, request.StartDate.Year, ct);
            balance.PendingDays = Math.Max(0, balance.PendingDays - request.TotalDays);
        }

        request.Status = LeaveStatus.Cancelled;
        request.DecidedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<LeaveBalance> GetOrCreateBalanceAsync(int personnelId, int year,
        CancellationToken ct = default)
    {
        var balance = await _db.LeaveBalances
            .FirstOrDefaultAsync(b => b.PersonnelId == personnelId && b.Year == year, ct);
        if (balance is null)
        {
            balance = new LeaveBalance
            {
                PersonnelId = personnelId,
                Year = year,
                EntitledDays = 14, // 4857 sayılı Kanun asgari yıllık izin
                UsedDays = 0,
                PendingDays = 0
            };
            _db.LeaveBalances.Add(balance);
        }
        return balance;
    }
}
