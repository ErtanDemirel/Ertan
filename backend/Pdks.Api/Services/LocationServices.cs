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
/// Zamana bağlı (TOTP benzeri) QR kod üretimi. Kiosk ekranında gösterilen kod
/// her <see cref="StepSeconds"/> saniyede değişir; ekran görüntüsüyle paylaşımı
/// engeller. Konum (geofence) kontrolüyle birlikte "evden giriş" imkânsızdır.
/// </summary>
public class QrTokenService
{
    public const int StepSeconds = 30;
    private const int CodeDigits = 8;

    /// <summary>Verilen lokasyon ve zaman adımı için kod üretir.</summary>
    public string Generate(WorkLocation location, long? step = null)
    {
        step ??= CurrentStep();
        var secret = Encoding.UTF8.GetBytes(location.QrSecret);
        var msg = Encoding.UTF8.GetBytes($"{location.Id}:{step}");
        using var hmac = new HMACSHA256(secret);
        var hash = hmac.ComputeHash(msg);
        // Dinamik truncation (RFC 4226 benzeri)
        int offset = hash[^1] & 0x0F;
        int binary = ((hash[offset] & 0x7F) << 24)
                     | ((hash[offset + 1] & 0xFF) << 16)
                     | ((hash[offset + 2] & 0xFF) << 8)
                     | (hash[offset + 3] & 0xFF);
        int mod = (int)Math.Pow(10, CodeDigits);
        return (binary % mod).ToString().PadLeft(CodeDigits, '0');
    }

    /// <summary>Kodu geçerli zaman penceresi içinde doğrular (saat kaymasına toleranslı).</summary>
    public bool Validate(WorkLocation location, string code, int windowSteps = 1)
    {
        var now = CurrentStep();
        for (long s = now - windowSteps; s <= now + windowSteps; s++)
        {
            var expected = Generate(location, s);
            if (CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(code)))
                return true;
        }
        return false;
    }

    public int SecondsRemaining()
    {
        long unix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return (int)(StepSeconds - unix % StepSeconds);
    }

    private static long CurrentStep() =>
        DateTimeOffset.UtcNow.ToUnixTimeSeconds() / StepSeconds;
}
