using System.Security.Cryptography;
using System.Text;
using Pdks.Api.Entities;

namespace Pdks.Api.Services;

/// <summary>Coğrafi mesafe hesabı (geofence kontrolü için).</summary>
public static class GeoService
{
    private const double EarthRadiusMeters = 6_371_000d;

    /// <summary>İki koordinat arası mesafeyi metre cinsinden döner (Haversine).</summary>
    public static double DistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        double dLat = ToRad(lat2 - lat1);
        double dLon = ToRad(lon2 - lon1);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                   Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusMeters * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180d;
}

/// <summary>
/// Lokasyona özel SABİT QR kod üretimi. Her lokasyonun gizli anahtarıyla imzalanır;
/// bir kez üretilip yazdırılır/asılır. Güvenlik konumla (geofence) sağlanır:
/// kod paylaşılsa bile iş yeri yarıçapı dışından giriş reddedilir. Sızıntı şüphesinde
/// anahtar yenilenerek (rotate-secret) tüm eski kodlar geçersiz kılınabilir.
/// </summary>
public class QrTokenService
{
    /// <summary>Lokasyon için sabit imzalı kodu üretir (base32-benzeri hex, 16 hane).</summary>
    public string Generate(WorkLocation location)
    {
        var secret = Encoding.UTF8.GetBytes(location.QrSecret);
        var msg = Encoding.UTF8.GetBytes($"COKO-SIS:{location.Id}");
        using var hmac = new HMACSHA256(secret);
        var hash = hmac.ComputeHash(msg);
        // İlk 8 baytı büyük harf hex olarak kullan → 16 karakterlik sabit kod.
        return Convert.ToHexString(hash, 0, 8);
    }

    /// <summary>Okutulan kodun lokasyona ait geçerli imza olup olmadığını doğrular.</summary>
    public bool Validate(WorkLocation location, string code)
    {
        var expected = Generate(location);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(code?.Trim().ToUpperInvariant() ?? string.Empty));
    }
}
