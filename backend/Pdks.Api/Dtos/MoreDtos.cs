using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

// ---------------- Bordro ----------------
public record PayslipDto(
    int Id, int PersonnelId, string PersonnelName, string SicilNo,
    int Year, int Month, string FileName, long SizeBytes,
    decimal? NetAmount, string? Note, DateTime UploadedAt);

// ---------------- İş Başvurusu / Aday ----------------
public record JobApplicationRequest(
    [property: Required] string FirstName,
    [property: Required] string LastName,
    string? NationalId,
    string? Phone,
    string? Email,
    DateTime? BirthDate,
    string? Address,
    string? Position,
    string? Education,
    int? ExperienceYears,
    string? PreviousWorkplace,
    string? Notes);

public record JobApplicationDto(
    int Id, string FirstName, string LastName, string FullName,
    string? NationalId, string? Phone, string? Email, DateTime? BirthDate,
    string? Address, string? Position, string? Education, int? ExperienceYears,
    string? PreviousWorkplace, string? Notes, string Status, string? ReviewNote,
    bool HasCv, DateTime CreatedAt,
    PriorEmploymentDto? PriorEmployment);

/// <summary>Adayın geçmiş çalışma bilgisi (TCKN eşleşmesiyle).</summary>
public record PriorEmploymentDto(
    bool WorkedBefore,
    int? PersonnelId,
    string? Name,
    string? SicilNo,
    DateTime? HireDate,
    DateTime? ExitDate,
    bool CurrentlyEmployed,
    int? TotalMonths,
    string? ExitReason);

public record UpdateApplicationStatusRequest(
    [property: Required] string Status,
    string? ReviewNote);

// ---------------- Servis Analizi ----------------
public record ServiceStopStat(string Stop, int PersonnelCount);

public record ServiceRouteAnalytics(
    int RouteId,
    string RouteName,
    int Capacity,
    int PersonnelCount,
    int ServicesNeeded,
    IReadOnlyList<ServiceStopStat> Stops);

public record ServiceAnalyticsResult(
    int? ShiftId,
    string? ShiftName,
    int TotalPersonnel,
    int TotalServicesNeeded,
    IReadOnlyList<ServiceRouteAnalytics> Routes);
