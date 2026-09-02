using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>İzin talebine eklenen dosya (rapor/fotoğraf/PDF).</summary>
public class LeaveAttachment
{
    public int Id { get; set; }

    public int LeaveRequestId { get; set; }
    public LeaveRequest? LeaveRequest { get; set; }

    [MaxLength(200)]
    public string FileName { get; set; } = string.Empty;

    /// <summary>Sunucudaki güvenli saklama yolu (webroot dışında).</summary>
    [MaxLength(300)]
    public string StoredPath { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Bordro (İK tarafından yüklenen PDF), personel/döneme göre.</summary>
public class Payslip
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public int Year { get; set; }
    public int Month { get; set; }

    [MaxLength(200)]
    public string FileName { get; set; } = string.Empty;

    [MaxLength(300)]
    public string StoredPath { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = "application/pdf";

    public long SizeBytes { get; set; }

    /// <summary>Opsiyonel net tutar (özet için).</summary>
    public decimal? NetAmount { get; set; }

    [MaxLength(250)]
    public string? Note { get; set; }

    public int UploadedByUserId { get; set; }
    public User? UploadedBy { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
