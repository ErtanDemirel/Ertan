using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>
/// Personelin iletişim/acil durum bilgisi güncelleme talebi. İK/Amir onaylayınca
/// değerler personel kartına işlenir. Boş bırakılan alan "değişiklik yok" demektir.
/// </summary>
public class ContactUpdateRequest
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(120)]
    public string? Email { get; set; }

    [MaxLength(250)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? EmergencyContactName { get; set; }

    [MaxLength(20)]
    public string? EmergencyContactPhone { get; set; }

    /// <summary>Pending / Approved / Rejected (LeaveStatus yeniden kullanılıyor).</summary>
    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

    [MaxLength(500)]
    public string? HandlerComment { get; set; }

    public int? HandledByUserId { get; set; }
    public User? HandledBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? HandledAt { get; set; }
}
