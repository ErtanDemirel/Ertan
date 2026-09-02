using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

public record PersonnelDto(
    int Id,
    string SicilNo,
    string FirstName,
    string LastName,
    string FullName,
    string? NationalId,
    string? Department,
    string? Title,
    string? PhoneNumber,
    string? Email,
    DateTime? HireDate,
    int? ManagerId,
    string? ManagerName,
    int? ServiceRouteId,
    string? ServiceRouteName,
    string? ServiceStop,
    int? ShiftId,
    string? ShiftName,
    DateTime? ExitDate,
    string? ExitReason,
    bool IsActive);

public record CreatePersonnelRequest(
    [property: Required] string SicilNo,
    [property: Required] string FirstName,
    [property: Required] string LastName,
    string? NationalId,
    string? Department,
    string? Title,
    string? PhoneNumber,
    string? Email,
    DateTime? HireDate,
    int? ManagerId,
    int? ServiceRouteId,
    string? ServiceStop,
    int? ShiftId,
    // Yıllık izin hakkı (gün). Bu yıl için bakiye oluşturulur.
    decimal? AnnualLeaveDays,
    // Personele giriş hesabı oluşturulsun mu?
    bool CreateLoginAccount,
    string? Username,
    string? InitialPassword);

public record UpdatePersonnelRequest(
    [property: Required] string SicilNo,
    [property: Required] string FirstName,
    [property: Required] string LastName,
    string? NationalId,
    string? Department,
    string? Title,
    string? PhoneNumber,
    string? Email,
    DateTime? HireDate,
    int? ManagerId,
    int? ServiceRouteId,
    string? ServiceStop,
    int? ShiftId,
    DateTime? ExitDate,
    string? ExitReason,
    bool IsActive);
