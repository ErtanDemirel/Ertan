using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Vardiya tanımı.</summary>
public class Shift
{
    public int Id { get; set; }

    [MaxLength(60)]
    public string Name { get; set; } = string.Empty;

    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    /// <summary>Gece vardiyası gibi ertesi güne taşan vardiya mı?</summary>
    public bool CrossesMidnight { get; set; }

    /// <summary>UI'da renk kodu (#RRGGBB).</summary>
    [MaxLength(7)]
    public string? Color { get; set; }

    [MaxLength(250)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Personnel> Personnel { get; set; } = new List<Personnel>();
    public ICollection<ShiftAssignment> Assignments { get; set; } = new List<ShiftAssignment>();
}

/// <summary>Belirli bir güne personel-vardiya ataması (vardiya planı).</summary>
public class ShiftAssignment
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public int ShiftId { get; set; }
    public Shift? Shift { get; set; }

    public DateOnly Date { get; set; }

    [MaxLength(250)]
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
