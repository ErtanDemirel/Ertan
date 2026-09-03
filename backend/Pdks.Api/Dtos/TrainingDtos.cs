using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

/// <summary>Personel görünümü: eğitim + kendi ilerlemesi.</summary>
public record TrainingDto(
    int Id,
    string Title,
    string? Description,
    string Category,
    int DurationSeconds,
    bool IsMandatory,
    bool IsActive,
    int WatchedSeconds,
    bool Completed,
    DateTime? CompletedAt,
    int ProgressPercent);

/// <summary>Yönetici görünümü: eğitim + izlenme özeti.</summary>
public record TrainingAdminDto(
    int Id,
    string Title,
    string? Description,
    string Category,
    int DurationSeconds,
    bool IsMandatory,
    bool IsActive,
    string VideoFileName,
    DateTime CreatedAt,
    int AssignedCount,
    int CompletedCount,
    int CompletionRate);

public record TrainingProgressRowDto(
    int PersonnelId,
    string PersonnelName,
    string? SicilNo,
    int WatchedSeconds,
    int ProgressPercent,
    bool Completed,
    DateTime? CompletedAt);

public record ReportProgressRequest(
    [property: Required] int Position,
    int? Duration);
