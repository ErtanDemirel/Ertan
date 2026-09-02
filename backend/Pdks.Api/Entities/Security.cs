using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Şifre sıfırlama için SMS ile gönderilen tek kullanımlık kod (hash'lenmiş).</summary>
public class PasswordResetCode
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Kodun hash'i (düz kod saklanmaz).</summary>
    public string CodeHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public int AttemptCount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Güvenlik/denetim kaydı (kritik işlemler için iz).</summary>
public class AuditLog
{
    public int Id { get; set; }

    public int? UserId { get; set; }

    [MaxLength(80)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(400)]
    public string? Detail { get; set; }

    [MaxLength(60)]
    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Uzun ömürlü oturum için yenileme jetonu.</summary>
public class RefreshToken
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    [MaxLength(200)]
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
