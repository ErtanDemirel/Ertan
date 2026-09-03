using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>İzin türü (Yıllık, Mazeret, Ücretsiz, Raporlu vb.).</summary>
public class LeaveType
{
    public int Id { get; set; }

    [MaxLength(60)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Yıllık izin bakiyesinden düşülür mü?</summary>
    public bool DeductsFromAnnual { get; set; }

    /// <summary>Ücretli izin mi?</summary>
    public bool IsPaid { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public ICollection<LeaveRequest> Requests { get; set; } = new List<LeaveRequest>();
}

/// <summary>Personelin yıla ait izin bakiyesi.</summary>
public class LeaveBalance
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public int Year { get; set; }

    /// <summary>Hak edilen yıllık izin gün sayısı.</summary>
    public decimal EntitledDays { get; set; }

    /// <summary>Kullanılan gün sayısı.</summary>
    public decimal UsedDays { get; set; }

    /// <summary>Onay bekleyen (rezerve) gün sayısı.</summary>
    public decimal PendingDays { get; set; }

    public decimal RemainingDays => EntitledDays - UsedDays - PendingDays;
}

/// <summary>İzin talebi - personel oluşturur, amir onaylar/reddeder.</summary>
public class LeaveRequest
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public int LeaveTypeId { get; set; }
    public LeaveType? LeaveType { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }

    /// <summary>Toplam iş günü / gün sayısı (talep sahibi girer, sunucu doğrular). Yarım günde 0.5.</summary>
    public decimal TotalDays { get; set; }

    /// <summary>Yarım gün izin dönemi (Yok=tam gün, ÖÖ/ÖS=0.5 gün). Sadece tek günlük izinlerde geçerli.</summary>
    public HalfDayPeriod HalfDay { get; set; } = HalfDayPeriod.None;

    /// <summary>Talep başlığı.</summary>
    [MaxLength(150)]
    public string? Title { get; set; }

    [MaxLength(1000)]
    public string? Reason { get; set; }

    public ICollection<LeaveAttachment> Attachments { get; set; } = new List<LeaveAttachment>();

    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    /// <summary>Onaylayacak amir (talep anında personelin amiri).</summary>
    public int? ApproverId { get; set; }
    public Personnel? Approver { get; set; }

    [MaxLength(500)]
    public string? ManagerComment { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }
}
