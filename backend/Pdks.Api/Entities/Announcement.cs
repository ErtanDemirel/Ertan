using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Duyuru. Zorunlu duyurular personel tarafından okunmadan kapatılamaz.</summary>
public class Announcement
{
    public int Id { get; set; }

    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    /// <summary>Zorunlu ise personel "Okudum" onayı vermeden geçemez.</summary>
    public bool IsMandatory { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public int PublishedByUserId { get; set; }
    public User? PublishedBy { get; set; }

    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    public ICollection<AnnouncementRead> Reads { get; set; } = new List<AnnouncementRead>();
}

/// <summary>Bir kullanıcının duyuruyu okuduğu kaydı.</summary>
public class AnnouncementRead
{
    public int Id { get; set; }

    public int AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}
