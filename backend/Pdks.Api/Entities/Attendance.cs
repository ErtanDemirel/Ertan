using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Entities;

/// <summary>
/// İş yeri / mesai lokasyonu. QR koddaki imza bu lokasyonun gizli anahtarıyla
/// üretilir; giriş sadece bu koordinatların yarıçapı içinden yapılabilir.
/// </summary>
public class WorkLocation
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    /// <summary>İzin verilen yarıçap (metre). Bu alan dışından giriş reddedilir.</summary>
    public int RadiusMeters { get; set; } = 150;

    /// <summary>Zamana bağlı (TOTP benzeri) QR üretimi için gizli anahtar (base32/hex).</summary>
    public string QrSecret { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
}

/// <summary>Mesai giriş/çıkış hareketi (QR + konum doğrulamalı).</summary>
public class Attendance
{
    public int Id { get; set; }

    public int PersonnelId { get; set; }
    public Personnel? Personnel { get; set; }

    public int? WorkLocationId { get; set; }
    public WorkLocation? WorkLocation { get; set; }

    public AttendanceType Type { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    /// <summary>Lokasyona uzaklık (metre).</summary>
    public double DistanceMeters { get; set; }

    /// <summary>Geofence içinde mi? (Evden giriş engeli.)</summary>
    public bool IsWithinGeofence { get; set; }

    [MaxLength(120)]
    public string? DeviceInfo { get; set; }
}
