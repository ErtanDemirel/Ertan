using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

/// <summary>Sayfalı liste yanıtı.</summary>
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

// ---- Servis Güzergahı ----
public record ServiceRouteDto(
    int Id, string Name, string? Description, string? Stops,
    string? DepartureTime, string? ReturnTime, string? DriverName,
    string? PlateNumber, bool IsActive, int PersonnelCount);

public record ServiceRouteRequest(
    [property: Required] string Name, string? Description, string? Stops,
    string? DepartureTime, string? ReturnTime, string? DriverName,
    string? PlateNumber, bool IsActive);

// ---- Vardiya ----
public record ShiftDto(
    int Id, string Name, string StartTime, string EndTime,
    bool CrossesMidnight, string? Color, string? Description,
    bool IsActive, int PersonnelCount);

public record ShiftRequest(
    [property: Required] string Name,
    [property: Required] string StartTime,
    [property: Required] string EndTime,
    bool CrossesMidnight, string? Color, string? Description, bool IsActive);

public record ShiftAssignmentDto(
    int Id, int PersonnelId, string PersonnelName, string SicilNo,
    int ShiftId, string ShiftName, DateOnly Date, string? Note);

public record ShiftAssignmentRequest(
    [property: Required] int PersonnelId,
    [property: Required] int ShiftId,
    [property: Required] DateOnly Date,
    string? Note);

// ---- Yemek ----
public record MealMenuDto(
    int Id, DateOnly Date, string? Soup, string? MainCourse, string? SideDish,
    string? Complement, string? Dessert, string? Alternative, int? Calories);

public record MealMenuRequest(
    [property: Required] DateOnly Date, string? Soup, string? MainCourse,
    string? SideDish, string? Complement, string? Dessert,
    string? Alternative, int? Calories);
