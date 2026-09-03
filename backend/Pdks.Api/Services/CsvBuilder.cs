using System.Globalization;
using System.Text;

namespace Pdks.Api.Services;

/// <summary>
/// Excel'de sorunsuz açılan CSV üretir: UTF-8 BOM + noktalı virgül ayıracı
/// (Türkçe Excel varsayılanı) + alan kaçışlama. Ek bağımlılık gerektirmez.
/// </summary>
public class CsvBuilder
{
    private readonly StringBuilder _sb = new();
    private readonly char _sep;

    public CsvBuilder(char separator = ';') => _sep = separator;

    public CsvBuilder Row(params object?[] cells)
    {
        for (int i = 0; i < cells.Length; i++)
        {
            if (i > 0) _sb.Append(_sep);
            _sb.Append(Escape(cells[i]));
        }
        _sb.Append("\r\n");
        return this;
    }

    private string Escape(object? cell)
    {
        var s = cell switch
        {
            null => "",
            bool b => b ? "Evet" : "Hayır",
            DateTime dt => dt.ToString("dd.MM.yyyy HH:mm", CultureInfo.GetCultureInfo("tr-TR")),
            DateOnly d => d.ToString("dd.MM.yyyy", CultureInfo.GetCultureInfo("tr-TR")),
            decimal m => m.ToString("0.##", CultureInfo.GetCultureInfo("tr-TR")),
            double db => db.ToString("0.##", CultureInfo.GetCultureInfo("tr-TR")),
            _ => cell.ToString() ?? ""
        };
        if (s.Contains(_sep) || s.Contains('"') || s.Contains('\n') || s.Contains('\r'))
            s = "\"" + s.Replace("\"", "\"\"") + "\"";
        return s;
    }

    /// <summary>UTF-8 BOM'lu bayt dizisi (Excel'in Türkçe karakterleri doğru göstermesi için).</summary>
    public byte[] ToBytes()
    {
        var preamble = Encoding.UTF8.GetPreamble();
        var body = Encoding.UTF8.GetBytes(_sb.ToString());
        var buf = new byte[preamble.Length + body.Length];
        Buffer.BlockCopy(preamble, 0, buf, 0, preamble.Length);
        Buffer.BlockCopy(body, 0, buf, preamble.Length, body.Length);
        return buf;
    }
}
