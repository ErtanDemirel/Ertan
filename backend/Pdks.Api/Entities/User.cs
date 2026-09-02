using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>
/// Uygulamaya giriş yapan hesap. Şifreler asla düz metin saklanmaz;
/// PBKDF2 (HMAC-SHA256) ile hash + salt olarak tutulur.
/// </summary>
public class User
{
    public int Id { get; set; }

    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    /// <summary>PBKDF2 türetilmiş hash (base64).</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Rastgele salt (base64).</summary>
    public string PasswordSalt { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Personnel;

    /// <summary>SMS ile tek kullanımlık kod göndermek için telefon.</summary>
    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(120)]
    public string? Email { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Ardışık hatalı giriş sayısı (hesap kilidi için).</summary>
    public int FailedLoginCount { get; set; }

    /// <summary>Bu tarihe kadar hesap kilitli (brute-force koruması).</summary>
    public DateTime? LockoutEnd { get; set; }

    /// <summary>İlişkili personel kaydı (varsa).</summary>
    public int? PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    public ICollection<PasswordResetCode> ResetCodes { get; set; } = new List<PasswordResetCode>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
