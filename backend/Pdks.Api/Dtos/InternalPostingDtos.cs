using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

public record InternalPostingDto(
    int Id,
    string Title,
    string? Description,
    string? Department,
    string? Location,
    int? PositionCount,
    DateOnly? Deadline,
    bool IsActive,
    DateTime CreatedAt,
    int ApplicantCount,
    bool AlreadyApplied,
    string? MyStatus);

public record CreatePostingRequest(
    [property: Required] string Title,
    string? Description,
    string? Department,
    string? Location,
    int? PositionCount,
    DateOnly? Deadline,
    bool IsActive = true);

public record ApplyPostingRequest(string? Note);

public record InternalApplicationDto(
    int Id,
    int PostingId,
    string PostingTitle,
    int PersonnelId,
    string PersonnelName,
    string? SicilNo,
    string? Department,
    string? Note,
    string Status,
    string? HandlerComment,
    DateTime CreatedAt,
    DateTime? HandledAt);

public record DecideApplicationRequest(
    [property: Required] string Status,
    string? Comment);
