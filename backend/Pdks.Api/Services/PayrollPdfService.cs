using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Writer;

namespace Pdks.Api.Services;

/// <summary>
/// Çok sayfalı tek bordro PDF'ini sayfalara ayırır ve her sayfadaki T.C. Kimlik No'ya göre
/// kişiye ait tek(-veya çok) sayfalık PDF üretir. Böylece herkese yalnızca kendi bordrosu atanır.
/// Sabit tasarımlı bordrolarda TC numarası her sayfada yazılı olduğundan güvenilir çalışır.
/// </summary>
public class PayrollPdfService
{
    // Tekil 11 haneli sayı (TC adayı) ve daha uzun bitişik rakam blokları
    private static readonly Regex ElevenDigits = new(@"(?<!\d)(\d{11})(?!\d)", RegexOptions.Compiled);
    private static readonly Regex LongDigits = new(@"\d{11,}", RegexOptions.Compiled);

    public record ExtractedGroup(string? Tc, int FromPage, int ToPage, byte[] Pdf, string Preview);

    /// <summary>PDF'i kişilere göre gruplara ayırır; her grup için tekil PDF üretir.</summary>
    public List<ExtractedGroup> Extract(byte[] pdfBytes)
    {
        var result = new List<ExtractedGroup>();
        using var doc = PdfDocument.Open(pdfBytes);
        int n = doc.NumberOfPages;
        if (n == 0) return result;

        // Sayfa başına TC tespiti + kısa önizleme metni
        var pageTc = new string?[n + 1];
        var pagePreview = new string[n + 1];
        for (int i = 1; i <= n; i++)
        {
            var text = doc.GetPage(i).Text ?? string.Empty;
            pageTc[i] = DetectTc(text);
            pagePreview[i] = text.Length > 60 ? text[..60].Replace('\n', ' ') : text.Replace('\n', ' ');
        }

        // Gruplama: aynı TC ardışık sayfalar tek gruba; TC'siz sayfa öncekinin devamı sayılır
        var groups = new List<(string? tc, List<int> pages)>();
        foreach (var i in Enumerable.Range(1, n))
        {
            var tc = pageTc[i];
            if (tc is not null)
            {
                if (groups.Count > 0 && groups[^1].tc == tc)
                    groups[^1].pages.Add(i);
                else
                    groups.Add((tc, new List<int> { i }));
            }
            else
            {
                if (groups.Count > 0)
                    groups[^1].pages.Add(i); // devam sayfası
                else
                    groups.Add((null, new List<int> { i }));
            }
        }

        // Her grup için tekil PDF üret (kaynak doküman açıkken)
        foreach (var (tc, pages) in groups)
        {
            var builder = new PdfDocumentBuilder();
            foreach (var p in pages)
                builder.AddPage(doc, p);
            var bytes = builder.Build();
            result.Add(new ExtractedGroup(tc, pages.First(), pages.Last(), bytes, pagePreview[pages.First()]));
        }
        return result;
    }

    /// <summary>
    /// Metindeki en olası T.C. Kimlik No'yu döner. Öncelik sırası:
    /// (1) Metinde tek başına duran ve checksum'ı geçerli 11 haneli sayı,
    /// (2) 11+ haneli bitişik rakam bloklarının içinde kayan pencere ile bulunan geçerli TC
    ///     (PDF metin çıkarımı bazen sayıları yan yana yapıştırır),
    /// (3) hiçbiri yoksa metindeki tek başına duran ilk 11 haneli sayı.
    /// </summary>
    public static string? DetectTc(string text)
    {
        if (string.IsNullOrEmpty(text)) return null;

        // (1) Tek başına duran, checksum'ı geçerli TC — en güvenilir durum.
        string? firstStandalone = null;
        foreach (Match m in ElevenDigits.Matches(text))
        {
            var candidate = m.Groups[1].Value;
            firstStandalone ??= candidate;
            if (IsValidTc(candidate)) return candidate;
        }

        // (2) Bitişik uzun rakam bloklarını kayan pencere ile tara (ör. "22221010110396620590238000").
        //     Blok içinde geçerli checksum veren ilk 11'li dizi TC olarak kabul edilir.
        foreach (Match m in LongDigits.Matches(text))
        {
            var blob = m.Value;
            for (int i = 0; i + 11 <= blob.Length; i++)
            {
                var window = blob.Substring(i, 11);
                if (IsValidTc(window)) return window;
            }
        }

        // (3) Geçerli checksum bulunamadıysa tek başına duran ilk 11 haneli sayı.
        return firstStandalone;
    }

    /// <summary>Türkiye T.C. Kimlik No algoritmik doğrulaması.</summary>
    public static bool IsValidTc(string tc)
    {
        if (tc.Length != 11 || tc[0] == '0' || !tc.All(char.IsDigit)) return false;
        var d = tc.Select(c => c - '0').ToArray();
        int oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
        int evenSum = d[1] + d[3] + d[5] + d[7];
        int digit10 = ((oddSum * 7) - evenSum) % 10;
        if (digit10 < 0) digit10 += 10;
        if (digit10 != d[9]) return false;
        int sumFirst10 = d.Take(10).Sum();
        return sumFirst10 % 10 == d[10];
    }
}
