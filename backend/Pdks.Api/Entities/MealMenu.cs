using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Günlük yemek listesi. Yetkililer girer, personel görüntüler.</summary>
public class MealMenu
{
    public int Id { get; set; }

    public DateOnly Date { get; set; }

    [MaxLength(120)]
    public string? Soup { get; set; }

    [MaxLength(120)]
    public string? MainCourse { get; set; }

    [MaxLength(120)]
    public string? SideDish { get; set; }

    [MaxLength(120)]
    public string? Complement { get; set; }

    [MaxLength(120)]
    public string? Dessert { get; set; }

    /// <summary>Vejetaryen / alternatif menü.</summary>
    [MaxLength(120)]
    public string? Alternative { get; set; }

    /// <summary>Toplam kalori (opsiyonel).</summary>
    public int? Calories { get; set; }

    public int CreatedByUserId { get; set; }
    public User? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
