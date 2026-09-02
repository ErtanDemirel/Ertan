using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Departman. Onay zinciri şablonu departman bazında tanımlanır.</summary>
public class Department
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Departman yöneticisi (bölüm yöneticisi adımı buna çözülür).</summary>
    public int? ManagerPersonnelId { get; set; }
    public Personnel? Manager { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<ApprovalStepTemplate> Steps { get; set; } = new List<ApprovalStepTemplate>();
}

/// <summary>
/// Departmanın onay zinciri şablonundaki bir adım (sıralı road-map).
/// Örn: 1) Bölüm Yöneticisi 2) İK Yöneticisi 3) (bilgi) Fabrika Müdürü
/// </summary>
public class ApprovalStepTemplate
{
    public int Id { get; set; }

    public int DepartmentId { get; set; }
    public Department? Department { get; set; }

    public int Order { get; set; }

    public ApproverKind Kind { get; set; }

    /// <summary>Kind = SpecificPerson ise onaylayacak kişi.</summary>
    public int? SpecificPersonnelId { get; set; }
    public Personnel? SpecificPerson { get; set; }

    /// <summary>Sadece bilgilendirme adımı mı? (Onaylamaz, zinciri bloklamaz; sonda haber alır.)</summary>
    public bool InfoOnly { get; set; }
}

/// <summary>Bir talebe (izin/avans/masraf) ait çalışan onay zinciri örneği.</summary>
public class ApprovalRequest
{
    public int Id { get; set; }

    public RequestKind Kind { get; set; }

    /// <summary>İlgili talebin id'si (LeaveRequest / AdvanceRequest / ExpenseRequest).</summary>
    public int RequestId { get; set; }

    public int RequesterPersonnelId { get; set; }
    public Personnel? Requester { get; set; }

    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DecidedAt { get; set; }

    public ICollection<ApprovalStep> Steps { get; set; } = new List<ApprovalStep>();
}

/// <summary>Onay zincirinin çalışan tekil adımı (kime, hangi sırada, ne durumda).</summary>
public class ApprovalStep
{
    public int Id { get; set; }

    public int ApprovalRequestId { get; set; }
    public ApprovalRequest? ApprovalRequest { get; set; }

    public int Order { get; set; }

    /// <summary>Bu adımı onaylayacak kişi (çözülmüş).</summary>
    public int? ApproverPersonnelId { get; set; }
    public Personnel? Approver { get; set; }

    [MaxLength(60)]
    public string Label { get; set; } = string.Empty;

    public bool InfoOnly { get; set; }

    public StepStatus Status { get; set; } = StepStatus.Pending;

    [MaxLength(500)]
    public string? Comment { get; set; }

    public DateTime? DecidedAt { get; set; }
}
