using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Avans (maaş avansı) talebi. Aynı onay zincirinden geçer.</summary>
public class AdvanceRequest
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public decimal Amount { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }

    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    [MaxLength(500)]
    public string? ManagerComment { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }
}

/// <summary>Masraf / harcırah talebi (fiş/fatura eki ile). Aynı onay zincirinden geçer.</summary>
public class ExpenseRequest
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public decimal Amount { get; set; }

    [MaxLength(150)]
    public string? Title { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    // Belge/fiş eki (opsiyonel)
    [MaxLength(200)]
    public string? FileName { get; set; }
    [MaxLength(300)]
    public string? StoredPath { get; set; }
    [MaxLength(100)]
    public string? ContentType { get; set; }

    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    [MaxLength(500)]
    public string? ManagerComment { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }
}
