using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>
/// Mobil cihazın push bildirim adresi (Expo Push Token). Bir kullanıcının birden çok
/// cihazı olabilir. Bildirim gönderilirken kullanıcının tüm aktif token'larına iletilir.
/// </summary>
public class PushToken
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Expo push token (ör. "ExponentPushToken[xxxx]").</summary>
    [MaxLength(200)]
    public string Token { get; set; } = string.Empty;

    /// <summary>ios / android / web.</summary>
    [MaxLength(20)]
    public string? Platform { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;
}
