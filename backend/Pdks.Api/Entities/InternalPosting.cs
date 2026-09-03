using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>
/// İç ilan (şirket içi açık pozisyon). Yetkililer açar; personel uygulamadan başvurur;
/// İK başvuruları değerlendirir.
/// </summary>
public class InternalPosting
{
    public int Id { get; set; }

    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(3000)]
    public string? Description { get; set; }

    [MaxLength(80)]
    public string? Department { get; set; }

    [MaxLength(120)]
    public string? Location { get; set; }

    public int? PositionCount { get; set; }

    /// <summary>Son başvuru tarihi (opsiyonel).</summary>
    public DateOnly? Deadline { get; set; }

    public bool IsActive { get; set; } = true;

    public int? CreatedByUserId { get; set; }
    public User? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<InternalApplication> Applications { get; set; } = new List<InternalApplication>();
}

/// <summary>Bir personelin bir iç ilana başvurusu.</summary>
public class InternalApplication
{
    public int Id { get; set; }

    public int PostingId { get; set; }
    public InternalPosting? Posting { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    [MaxLength(1500)]
    public string? Note { get; set; }

    /// <summary>ApplicationStatus: New/Reviewing/Interview/Offered/Hired/Rejected.</summary>
    public ApplicationStatus Status { get; set; } = ApplicationStatus.New;

    [MaxLength(500)]
    public string? HandlerComment { get; set; }

    public int? HandledByUserId { get; set; }
    public User? HandledBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? HandledAt { get; set; }
}
