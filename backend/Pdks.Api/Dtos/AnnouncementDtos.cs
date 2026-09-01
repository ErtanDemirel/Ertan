using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

public record AnnouncementDto(
    int Id,
    string Title,
    string Body,
    bool IsMandatory,
    bool IsActive,
    string PublishedByName,
    DateTime PublishedAt,
    DateTime? ExpiresAt,
    bool IsRead,
    int ReadCount);

public record AnnouncementRequest(
    [property: Required] string Title,
    [property: Required] string Body,
    bool IsMandatory,
    DateTime? ExpiresAt);

public record AnnouncementReadStatDto(
    int UserId, string Name, string? SicilNo, bool IsRead, DateTime? ReadAt);
