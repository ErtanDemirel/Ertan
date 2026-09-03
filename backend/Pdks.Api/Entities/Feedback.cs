using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>
/// Çalışan sesi kaydı: öneri, şikayet, ramak kala (iş güvenliği) veya dilek/istek.
/// İsteğe bağlı anonim gönderilebilir (anonimde PersonnelId boş bırakılır).
/// </summary>
public class FeedbackItem
{
    public int Id { get; set; }

    /// <summary>Gönderen personel (anonimse boş).</summary>
    public int? PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public FeedbackKind Kind { get; set; }

    [MaxLength(150)]
    public string? Title { get; set; }

    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;

    /// <summary>Ramak kala için olayın yeri/lokasyonu.</summary>
    [MaxLength(150)]
    public string? Location { get; set; }

    public bool IsAnonymous { get; set; }

    public FeedbackStatus Status { get; set; } = FeedbackStatus.New;

    [MaxLength(500)]
    public string? HandlerComment { get; set; }

    public int? HandledByUserId { get; set; }
    public User? HandledBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? HandledAt { get; set; }
}
