namespace Pdks.Api.Services;

/// <summary>Basit şifre güç politikası.</summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;

    public static bool IsValid(string password, out string error)
    {
        error = string.Empty;
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinLength)
        {
            error = $"Şifre en az {MinLength} karakter olmalı.";
            return false;
        }
        bool hasLetter = password.Any(char.IsLetter);
        bool hasDigit = password.Any(char.IsDigit);
        if (!hasLetter || !hasDigit)
        {
            error = "Şifre en az bir harf ve bir rakam içermeli.";
            return false;
        }
        return true;
    }
}
