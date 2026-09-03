using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>
/// Eğitim videosu. İK/İSG yükler; personel izler (ileri sarılamaz, kaldığı yerden devam eder).
/// İzlenme tamamlandığında "Aldığım eğitimler"e geçer.
/// </summary>
public class Training
{
    public int Id { get; set; }

    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    /// <summary>İK / İSG (serbest metin kategori).</summary>
    [MaxLength(40)]
    public string Category { get; set; } = "İK";

    /// <summary>Video dosyasının depo yolu.</summary>
    [MaxLength(400)]
    public string VideoPath { get; set; } = string.Empty;

    [MaxLength(120)]
    public string VideoContentType { get; set; } = "video/mp4";

    [MaxLength(200)]
    public string VideoFileName { get; set; } = string.Empty;

    /// <summary>Video süresi (saniye). İlk oynatımda istemciden gelen değerle güncellenir.</summary>
    public int DurationSeconds { get; set; }

    /// <summary>Zorunlu izlenmesi gereken eğitim mi?</summary>
    public bool IsMandatory { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public int? CreatedByUserId { get; set; }
    public User? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TrainingProgress> Progresses { get; set; } = new List<TrainingProgress>();
}

/// <summary>Bir personelin bir eğitimdeki ilerleme durumu (izlenen en ileri konum + tamamlandı).</summary>
public class TrainingProgress
{
    public int Id { get; set; }

    public int TrainingId { get; set; }
    public Training? Training { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    /// <summary>İzlenen en ileri saniye (ileri sarma engeli + kaldığı yerden devam bunun üzerinden çalışır).</summary>
    public int WatchedSeconds { get; set; }

    public bool Completed { get; set; }
    public DateTime? CompletedAt { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
