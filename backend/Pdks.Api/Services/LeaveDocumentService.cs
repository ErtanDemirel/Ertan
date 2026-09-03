using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Pdks.Api.Entities;

namespace Pdks.Api.Services;

/// <summary>
/// İzin talebinden, yer tutuculu bir Word şablonunu doldurarak izin belgesi (.docx) üretir.
/// Şablon: ContentRoot/Templates/izin_belgesi_template.docx
/// Yer tutucular: {{AdSoyad}}, {{SicilNo}}, {{Departman}}, {{Unvan}}, {{IzinTuru}},
/// {{BaslangicTarihi}}, {{BitisTarihi}}, {{GunSayisi}}, {{YarimGun}}, {{TalepBasligi}}, {{Aciklama}},
/// {{TalepTarihi}}, {{AmirAdi}}, {{BelgeTarihi}}
/// Kendi belgenizi aynı yer tutucularla bu dosyanın yerine koyabilirsiniz.
/// </summary>
public class LeaveDocumentService
{
    private readonly string _templatePath;

    public LeaveDocumentService(IHostEnvironment env, IConfiguration cfg)
    {
        var configured = cfg["Leave:DocumentTemplate"];
        _templatePath = !string.IsNullOrWhiteSpace(configured)
            ? (Path.IsPathRooted(configured) ? configured : Path.Combine(env.ContentRootPath, configured))
            : Path.Combine(env.ContentRootPath, "Templates", "izin_belgesi_template.docx");
    }

    public bool TemplateExists => File.Exists(_templatePath);

    public byte[] Generate(LeaveRequest req, Personnel personnel, LeaveType type, string? approverName)
    {
        if (!TemplateExists)
            throw new FileNotFoundException("İzin belgesi şablonu bulunamadı.", _templatePath);

        var values = new Dictionary<string, string>
        {
            ["AdSoyad"] = $"{personnel.FirstName} {personnel.LastName}",
            ["SicilNo"] = personnel.SicilNo,
            ["Departman"] = personnel.Department ?? "-",
            ["Unvan"] = personnel.Title ?? "-",
            ["IzinTuru"] = type.Name,
            ["BaslangicTarihi"] = req.StartDate.ToString("dd.MM.yyyy"),
            ["BitisTarihi"] = req.EndDate.ToString("dd.MM.yyyy"),
            ["GunSayisi"] = req.HalfDay switch
            {
                HalfDayPeriod.Morning => "0,5 (Yarım gün - Öğleden önce)",
                HalfDayPeriod.Afternoon => "0,5 (Yarım gün - Öğleden sonra)",
                _ => req.TotalDays.ToString("0.##")
            },
            ["YarimGun"] = req.HalfDay switch
            {
                HalfDayPeriod.Morning => "Öğleden önce",
                HalfDayPeriod.Afternoon => "Öğleden sonra",
                _ => "-"
            },
            ["TalepBasligi"] = req.Title ?? "-",
            ["Aciklama"] = req.Reason ?? "-",
            ["TalepTarihi"] = req.RequestedAt.ToString("dd.MM.yyyy"),
            ["AmirAdi"] = approverName ?? "-",
            ["BelgeTarihi"] = DateTime.Now.ToString("dd.MM.yyyy"),
        };

        using var ms = new MemoryStream();
        using (var fs = new FileStream(_templatePath, FileMode.Open, FileAccess.Read))
            fs.CopyTo(ms);
        ms.Position = 0;

        using (var doc = WordprocessingDocument.Open(ms, true))
        {
            var body = doc.MainDocumentPart?.Document?.Body;
            if (body != null)
            {
                foreach (var para in body.Descendants<Paragraph>())
                    ReplaceInParagraph(para, values);
            }
            doc.MainDocumentPart?.Document?.Save();
        }
        return ms.ToArray();
    }

    /// <summary>
    /// Yer tutucular birden fazla "run"a bölünebildiği için paragraf metnini birleştirip
    /// değiştiriyoruz; sonucu ilk run'a yazıp diğerlerini temizliyoruz.
    /// </summary>
    private static void ReplaceInParagraph(Paragraph para, IReadOnlyDictionary<string, string> values)
    {
        var runs = para.Elements<Run>().ToList();
        if (runs.Count == 0) return;

        var fullText = string.Concat(runs.SelectMany(r => r.Elements<Text>()).Select(t => t.Text));
        if (!fullText.Contains("{{")) return;

        foreach (var kv in values)
            fullText = fullText.Replace("{{" + kv.Key + "}}", kv.Value);

        // İlk run'daki ilk Text'e tüm metni yaz, kalan Text'leri temizle
        bool first = true;
        foreach (var run in runs)
        {
            var texts = run.Elements<Text>().ToList();
            foreach (var t in texts)
            {
                if (first)
                {
                    t.Text = fullText;
                    t.Space = SpaceProcessingModeValues.Preserve;
                    first = false;
                }
                else
                {
                    t.Text = string.Empty;
                }
            }
        }
    }
}
