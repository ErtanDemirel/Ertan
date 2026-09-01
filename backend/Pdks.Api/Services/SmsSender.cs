using Microsoft.Extensions.Options;

namespace Pdks.Api.Services;

public interface ISmsSender
{
    Task SendAsync(string phoneNumber, string message, CancellationToken ct = default);
}

/// <summary>
/// Geliştirme ortamı için: SMS'i loglar (gerçek gönderim yapmaz).
/// OTP kodu konsolda/log'da görünür.
/// </summary>
public class ConsoleSmsSender : ISmsSender
{
    private readonly ILogger<ConsoleSmsSender> _log;
    public ConsoleSmsSender(ILogger<ConsoleSmsSender> log) => _log = log;

    public Task SendAsync(string phoneNumber, string message, CancellationToken ct = default)
    {
        _log.LogWarning("📱 [SMS -> {Phone}] {Message}", phoneNumber, message);
        return Task.CompletedTask;
    }
}

/// <summary>
/// Netgsm HTTP API örnek entegrasyonu. appsettings 'Sms' bölümünü doldurun,
/// Provider = "Netgsm" yapın. (Gerçek uçları kendi hesabınıza göre uyarlayın.)
/// </summary>
public class NetgsmSmsSender : ISmsSender
{
    private readonly HttpClient _http;
    private readonly SmsOptions _opt;
    private readonly ILogger<NetgsmSmsSender> _log;

    public NetgsmSmsSender(HttpClient http, IOptions<SmsOptions> opt, ILogger<NetgsmSmsSender> log)
    {
        _http = http;
        _opt = opt.Value;
        _log = log;
    }

    public async Task SendAsync(string phoneNumber, string message, CancellationToken ct = default)
    {
        var url = string.IsNullOrWhiteSpace(_opt.ApiUrl)
            ? "https://api.netgsm.com.tr/sms/send/get"
            : _opt.ApiUrl;

        var query = $"{url}?usercode={Uri.EscapeDataString(_opt.Username)}" +
                    $"&password={Uri.EscapeDataString(_opt.Password)}" +
                    $"&gsmno={Uri.EscapeDataString(phoneNumber)}" +
                    $"&message={Uri.EscapeDataString(message)}" +
                    $"&msgheader={Uri.EscapeDataString(_opt.Sender)}";

        try
        {
            var resp = await _http.GetAsync(query, ct);
            var body = await resp.Content.ReadAsStringAsync(ct);
            _log.LogInformation("Netgsm yanıtı: {Status} {Body}", resp.StatusCode, body);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "SMS gönderilemedi ({Phone})", phoneNumber);
            throw;
        }
    }
}
