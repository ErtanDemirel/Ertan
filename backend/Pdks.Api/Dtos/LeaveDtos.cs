using System.ComponentModel.DataAnnotations;
using Pdks.Api.Entities;

namespace Pdks.Api.Dtos;

public record LeaveTypeDto(int Id, string Name, bool DeductsFromAnnual, bool IsPaid, bool IsActive);

public record LeaveTypeRequest(
    [property: Required] string Name, bool DeductsFromAnnual, bool IsPaid, bool IsActive);

public record LeaveBalanceDto(
    int PersonnelId, string PersonnelName, int Year,
    decimal EntitledDays, decimal UsedDays, decimal PendingDays, decimal RemainingDays);

public record LeaveBalanceRequest(
    [property: Required] int PersonnelId,
    [property: Required] int Year,
    [property: Required] decimal EntitledDays);

public record LeaveAttachmentDto(int Id, string FileName, string ContentType, long SizeBytes, DateTime UploadedAt);

public record LeaveRequestDto(
    int Id,
    int PersonnelId,
    string PersonnelName,
    string SicilNo,
    int LeaveTypeId,
    string LeaveTypeName,
    bool DeductsFromAnnual,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal TotalDays,
    // Yarım gün dönemi: "None" (tam gün), "Morning" (ÖÖ) veya "Afternoon" (ÖS).
    string HalfDay,
    string? Title,
    string? Reason,
    string Status,
    int? ApproverId,
    string? ApproverName,
    string? ManagerComment,
    DateTime RequestedAt,
    DateTime? DecidedAt,
    IReadOnlyList<LeaveAttachmentDto> Attachments);

public record CreateLeaveRequest(
    [property: Required] int LeaveTypeId,
    [property: Required] DateOnly StartDate,
    [property: Required] DateOnly EndDate,
    string? Title,
    string? Reason,
    // Talep sahibinin girdiği gün sayısı (boşsa hafta sonları hariç otomatik hesaplanır).
    decimal? Days,
    // Yarım gün izin dönemi: null/None=tam gün, Morning=ÖÖ, Afternoon=ÖS. Seçilirse tek günlük olmalı, 0.5 gün sayılır.
    HalfDayPeriod? HalfDay = null);

public record DecideLeaveRequest(
    [property: Required] bool Approve,
    string? Comment);
