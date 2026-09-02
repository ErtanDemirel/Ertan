using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Resmî tatil / idari izin günü. Bu günler yıllık izinden düşülmez.</summary>
public class Holiday
{
    public int Id { get; set; }

    public DateOnly Date { get; set; }

    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Yarım gün tatil (0.5) ise true.</summary>
    public bool IsHalfDay { get; set; }
}

/// <summary>Uygulama içi bildirim.</summary>
public class Notification
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Body { get; set; } = string.Empty;

    /// <summary>payroll, leave, announcement ...</summary>
    [MaxLength(40)]
    public string Type { get; set; } = "info";

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
