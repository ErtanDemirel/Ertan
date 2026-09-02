using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

// ---------------- Onay Zinciri ----------------
public record ApprovalStepDto(int Order, string Label, string? ApproverName, string Status, bool InfoOnly, string? Comment);

public record PendingApprovalDto(
    int ApprovalRequestId,
    string Kind,            // Leave / Advance / Expense
    string KindLabel,       // İzin / Avans / Masraf
    string RequesterName,
    string SicilNo,
    string Summary,         // tarih aralığı / tutar vb.
    string? Title,
    DateTime CreatedAt,
    string CurrentStepLabel,
    IReadOnlyList<ApprovalStepDto> Steps);

public record DecideApprovalRequest([property: Required] bool Approve, string? Comment);

// Departman + onay zinciri şablonu
public record DepartmentDto(int Id, string Name, int? ManagerPersonnelId, string? ManagerName, bool IsActive, int StepCount);
public record DepartmentRequest([property: Required] string Name, int? ManagerPersonnelId, bool IsActive);

public record ApprovalTemplateStepDto(int Id, int Order, string Kind, int? SpecificPersonnelId, string? SpecificPersonName, bool InfoOnly);
public record SaveApprovalTemplateRequest(IReadOnlyList<TemplateStepInput> Steps);
public record TemplateStepInput([property: Required] string Kind, int? SpecificPersonnelId, bool InfoOnly);

// ---------------- Avans / Masraf ----------------
public record AdvanceRequestDto(
    int Id, int PersonnelId, string PersonnelName, string SicilNo,
    decimal Amount, string? Reason, string Status, string? ManagerComment,
    DateTime RequestedAt, DateTime? DecidedAt);

public record CreateAdvanceRequest([property: Required] decimal Amount, string? Reason);

public record ExpenseRequestDto(
    int Id, int PersonnelId, string PersonnelName, string SicilNo,
    decimal Amount, string? Title, string? Description, bool HasFile,
    string Status, string? ManagerComment, DateTime RequestedAt, DateTime? DecidedAt);
