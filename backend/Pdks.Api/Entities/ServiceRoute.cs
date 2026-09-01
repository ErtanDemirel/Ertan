using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>Personel servis güzergahı.</summary>
public class ServiceRoute
{
    public int Id { get; set; }

    [MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Description { get; set; }

    /// <summary>Güzergah durakları (virgülle ayrılmış / serbest metin).</summary>
    [MaxLength(1000)]
    public string? Stops { get; set; }

    /// <summary>Sabah kalkış saati.</summary>
    public TimeOnly? DepartureTime { get; set; }

    /// <summary>Akşam dönüş saati.</summary>
    public TimeOnly? ReturnTime { get; set; }

    [MaxLength(80)]
    public string? DriverName { get; set; }

    [MaxLength(20)]
    public string? PlateNumber { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Personnel> Personnel { get; set; } = new List<Personnel>();
}
