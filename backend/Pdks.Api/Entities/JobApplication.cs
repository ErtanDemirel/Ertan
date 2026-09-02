using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>İş başvurusu / aday kaydı (kamuya açık formdan gelir, İK yönetir).</summary>
public class JobApplication
{
    public int Id { get; set; }

    [MaxLength(60)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(60)]
    public string LastName { get; set; } = string.Empty;

    /// <summary>T.C. Kimlik No — geçmiş çalışan eşleştirmesi bunun üzerinden yapılır.</summary>
    [MaxLength(11)]
    public string? NationalId { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(120)]
    public string? Email { get; set; }

    public DateTime? BirthDate { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    /// <summary>Başvurulan pozisyon.</summary>
    [MaxLength(100)]
    public string? Position { get; set; }

    [MaxLength(150)]
    public string? Education { get; set; }

    public int? ExperienceYears { get; set; }

    [MaxLength(200)]
    public string? PreviousWorkplace { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    // CV dosyası
    [MaxLength(200)]
    public string? CvFileName { get; set; }
    [MaxLength(300)]
    public string? CvStoredPath { get; set; }
    [MaxLength(100)]
    public string? CvContentType { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.New;

    [MaxLength(500)]
    public string? ReviewNote { get; set; }
    public int? ReviewedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
}
