using System.Text;
using System.Text.Json;

namespace Pdks.Api.Services;

/// <summary>Mobil cihazlara anlık (push) bildirim gönderen soyutlama.</summary>
public interface IPushSender
{
    /// <summary>Verilen cihaz token'larına push bildirimi gönderir. Hatalar yutulur (bildirim best-effort'tur).</summary>
    Task SendAsync(IEnumerable<string> tokens, string title, string body, string? type, CancellationToken ct = default);
}

/// <summary>Geliştirme için: gerçek gönderim yapmaz, yalnızca log'a yazar.</summary>
public class NullPushSender : IPushSender
{
    private readonly ILogger<NullPushSender> _log;
    public NullPushSender(ILogger<NullPushSender> log) => _log = log;

    public Task SendAsync(IEnumerable<string> tokens, string title, string body, string? type, CancellationToken ct = default)
    {
        foreach (var t in tokens)
            _log.LogInformation("[PUSH:devre dışı] {Token} → {Title}: {Body}", t, title, body);
        return Task.CompletedTask;
    }
}

/// <summary>
/// Expo Push servisi üzerinden gönderim yapar (https://exp.host/--/api/v2/push/send).
/// Expo ile üretilen React Native uygulamaları için ek altyapı gerektirmez.
/// </summary>
public class ExpoPushSender : IPushSender
{
    private const string Endpoint = "https://exp.host/--/api/v2/push/send";
    private readonly IHttpClientFactory _http;
    private readonly ILogger<ExpoPushSender> _log;

    public ExpoPushSender(IHttpClientFactory http, ILogger<ExpoPushSender> log)
    {
        _http = http; _log = log;
    }

    public async Task SendAsync(IEnumerable<string> tokens, string title, string body, string? type, CancellationToken ct = default)
    {
        var list = tokens.Where(t => !string.IsNullOrWhiteSpace(t)).Distinct().ToList();
        if (list.Count == 0) return;

        // Expo tek istekte çoklu mesaj kabul eder.
        var messages = list.Select(t => new
        {
            to = t,
            title,
            body,
            sound = "default",
            data = new { type = type ?? "info" }
        });

        try
        {
            var client = _http.CreateClient("expo-push");
            client.Timeout = TimeSpan.FromSeconds(15);
            var json = JsonSerializer.Serialize(messages);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var resp = await client.PostAsync(Endpoint, content, ct);
            if (!resp.IsSuccessStatusCode)
                _log.LogWarning("Expo push başarısız ({Status}) - {Count} cihaz", (int)resp.StatusCode, list.Count);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Expo push gönderilemedi ({Count} cihaz)", list.Count);
        }
    }
}
