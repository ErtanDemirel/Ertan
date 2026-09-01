using System.ComponentModel.DataAnnotations;

namespace Pdks.Api.Dtos;

public record LoginRequest(
    [property: Required] string Username,
    [property: Required] string Password);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserInfo User);

public record UserInfo(
    int Id,
    string Username,
    string Role,
    int? PersonnelId,
    string? FullName);

public record RefreshRequest([property: Required] string RefreshToken);

public record ForgotPasswordRequest([property: Required] string Username);

public record ResetPasswordRequest(
    [property: Required] string Username,
    [property: Required] string Code,
    [property: Required, MinLength(6)] string NewPassword);

public record ChangePasswordRequest(
    [property: Required] string CurrentPassword,
    [property: Required, MinLength(6)] string NewPassword);
