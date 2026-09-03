using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

/// <summary>Personelin mevcut iletişim/acil durum bilgisi + varsa bekleyen talep.</summary>
public record ContactInfoDto(
    string? PhoneNumber,
    string? Email,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    ContactUpdateDto? Pending);

public record ContactUpdateDto(
    int Id,
    int PersonnelId,
    string PersonnelName,
    string? SicilNo,
    string? PhoneNumber,
    string? Email,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string Status,
    string? HandlerComment,
    DateTime CreatedAt,
    DateTime? HandledAt);

public record CreateContactUpdateRequest(
    string? PhoneNumber,
    string? Email,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone);

public record DecideContactRequest(
    [property: Required] bool Approve,
    string? Comment);
