using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Personel kartı - sicil, servis güzergahı, vardiya ve amir bilgisi.</summary>
public class Personnel
{
    public int Id { get; set; }

    /// <summary>Sicil numarası (benzersiz).</summary>
    [MaxLength(30)]
    public string SicilNo { get; set; } = string.Empty;

    [MaxLength(60)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(60)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>T.C. Kimlik No (opsiyonel).</summary>
    [MaxLength(11)]
    public string? NationalId { get; set; }

    [MaxLength(80)]
    public string? Department { get; set; }

    /// <summary>Onay zinciri için departman kaydı (yeni model).</summary>
    public int? DepartmentId { get; set; }
    public Department? Dept { get; set; }

    /// <summary>Onay zincirinde "İK Yöneticisi" adımı bu kişilere çözülür.</summary>
    public bool IsHrManager { get; set; }

    /// <summary>Onay zincirinde "Fabrika Müdürü" adımı bu kişilere çözülür.</summary>
    public bool IsFactoryManager { get; set; }

    [MaxLength(80)]
    public string? Title { get; set; }

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(120)]
    public string? Email { get; set; }

    [MaxLength(250)]
    public string? Address { get; set; }

    /// <summary>Acil durumda ulaşılacak kişi.</summary>
    [MaxLength(100)]
    public string? EmergencyContactName { get; set; }

    [MaxLength(20)]
    public string? EmergencyContactPhone { get; set; }

    public DateTime? HireDate { get; set; }

    /// <summary>İşten çıkış tarihi (boşsa halen çalışıyor). Aday eşleştirmede kullanılır.</summary>
    public DateTime? ExitDate { get; set; }

    [MaxLength(200)]
    public string? ExitReason { get; set; }

    /// <summary>Bağlı olduğu amir (izin onayı bu kişiye gider).</summary>
    public int? ManagerId { get; set; }
    public Personnel? Manager { get; set; }

    /// <summary>Servis güzergahı.</summary>
    public int? ServiceRouteId { get; set; }
    public ServiceRoute? ServiceRoute { get; set; }

    /// <summary>Bindiği durak (servis analizi için).</summary>
    [MaxLength(80)]
    public string? ServiceStop { get; set; }

    /// <summary>Varsayılan vardiya.</summary>
    public int? ShiftId { get; set; }
    public Shift? Shift { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();

    public ICollection<Personnel> Subordinates { get; set; } = new List<Personnel>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<LeaveBalance> LeaveBalances { get; set; } = new List<LeaveBalance>();
    public ICollection<ShiftAssignment> ShiftAssignments { get; set; } = new List<ShiftAssignment>();
    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
}
