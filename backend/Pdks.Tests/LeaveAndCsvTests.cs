using System.Text;
using Pdks.Api.Services;
using Xunit;

namespace Pdks.Tests;

public class LeaveCalculationTests
{
    [Fact]
    public void CalculateWorkingDays_ExcludesWeekend()
    {
        // 2026-01-05 Pazartesi ... 2026-01-11 Pazar → 5 iş günü (Cmt/Paz hariç)
        var start = new DateOnly(2026, 1, 5);
        var end = new DateOnly(2026, 1, 11);
        Assert.Equal(5m, LeaveService.CalculateWorkingDays(start, end));
    }

    [Fact]
    public void CalculateWorkingDays_SingleWeekday_IsOne()
    {
        var d = new DateOnly(2026, 1, 6); // Salı
        Assert.Equal(1m, LeaveService.CalculateWorkingDays(d, d));
    }

    [Fact]
    public void CalculateWorkingDays_WeekendOnly_IsZero()
    {
        var sat = new DateOnly(2026, 1, 10);
        var sun = new DateOnly(2026, 1, 11);
        Assert.Equal(0m, LeaveService.CalculateWorkingDays(sat, sun));
    }

    [Fact]
    public void CalculateWorkingDays_EndBeforeStart_IsZero()
    {
        Assert.Equal(0m, LeaveService.CalculateWorkingDays(new DateOnly(2026, 1, 10), new DateOnly(2026, 1, 5)));
    }
}

public class CsvBuilderTests
{
    [Fact]
    public void ToBytes_StartsWithUtf8Bom()
    {
        var bytes = new CsvBuilder().Row("a", "b").ToBytes();
        Assert.True(bytes.Length >= 3);
        Assert.Equal(0xEF, bytes[0]);
        Assert.Equal(0xBB, bytes[1]);
        Assert.Equal(0xBF, bytes[2]);
    }

    [Fact]
    public void Row_UsesSemicolonAndCrlf()
    {
        var text = Body(new CsvBuilder().Row("x", "y").ToBytes());
        Assert.Equal("x;y\r\n", text);
    }

    [Fact]
    public void Row_QuotesFieldContainingSeparator()
    {
        var text = Body(new CsvBuilder().Row("a;b").ToBytes());
        Assert.Equal("\"a;b\"\r\n", text);
    }

    [Fact]
    public void Row_EscapesQuotesByDoubling()
    {
        var text = Body(new CsvBuilder().Row("de\"mo").ToBytes());
        Assert.Equal("\"de\"\"mo\"\r\n", text);
    }

    [Fact]
    public void Row_FormatsBoolAsTurkish()
    {
        var text = Body(new CsvBuilder().Row(true, false).ToBytes());
        Assert.Equal("Evet;Hayır\r\n", text);
    }

    // BOM'u atlayıp gövdeyi UTF-8 metne çevirir
    private static string Body(byte[] bytes) => Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3);
}
