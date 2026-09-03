using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

public record FeedbackDto(
    int Id,
    string Kind,          // Suggestion / Complaint / NearMiss / Request
    string? Title,
    string Body,
    string? Location,
    bool IsAnonymous,
    string Status,        // New / Reviewing / Resolved / Closed
    string? SubmitterName, // anonimse null
    string? SicilNo,
    string? HandlerComment,
    DateTime CreatedAt,
    DateTime? HandledAt);

public record CreateFeedbackRequest(
    [property: Required] string Kind,
    string? Title,
    [property: Required] string Body,
    string? Location,
    bool IsAnonymous = false);

public record UpdateFeedbackStatusRequest(
    [property: Required] string Status,
    string? Comment);
