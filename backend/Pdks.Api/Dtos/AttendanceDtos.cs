using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

// ---- İş Yeri Lokasyonu ----
public record WorkLocationDto(
    int Id, string Name, double Latitude, double Longitude,
    int RadiusMeters, bool IsActive);

public record WorkLocationRequest(
    [property: Required] string Name,
    [property: Required] double Latitude,
    [property: Required] double Longitude,
    int RadiusMeters, bool IsActive);

/// <summary>Kiosk ekranında gösterilecek SABİT QR kod içeriği.</summary>
public record QrPayloadDto(int LocationId, string LocationName, string Code, string QrContent);

/// <summary>Mobil uygulamanın QR okuttuktan sonra gönderdiği mesai kaydı.</summary>
public record CheckInRequest(
    [property: Required] string QrContent,
    [property: Required] double Latitude,
    [property: Required] double Longitude,
    string? DeviceInfo);

public record AttendanceResultDto(
    bool Success,
    string Type,
    DateTime Timestamp,
    string LocationName,
    double DistanceMeters,
    string Message);

public record AttendanceDto(
    int Id,
    int PersonnelId,
    string PersonnelName,
    string SicilNo,
    string Type,
    DateTime Timestamp,
    string? LocationName,
    double DistanceMeters,
    bool IsWithinGeofence);
