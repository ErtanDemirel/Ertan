namespace Pdks.Api.Services;

public class JwtOptions
{
    public const string Section = "Jwt";
    public string Issuer { get; set; } = "PdksApi";
    public string Audience { get; set; } = "PdksClients";
    /// <summary>En az 32 karakter. Üretimde secret manager / env değişkeninden verin.</summary>
    public string Key { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 14;
}

public class SmsOptions
{
    public const string Section = "Sms";
    /// <summary>"Console" (geliştirme), "Netgsm", "Twilio" ...</summary>
    public string Provider { get; set; } = "Console";
    public string ApiUrl { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Sender { get; set; } = "PDKS";
}

public class OtpOptions
{
    public const string Section = "Otp";
    public int Length { get; set; } = 6;
    public int ExpiryMinutes { get; set; } = 5;
    public int MaxAttempts { get; set; } = 5;
}
