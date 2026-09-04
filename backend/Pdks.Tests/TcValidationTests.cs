using Pdks.Api.Services;
using Xunit;

namespace Pdks.Tests;

public class TcValidationTests
{
    // 10000000146 → algoritmik olarak geçerli bir T.C. Kimlik No örneğidir.
    [Theory]
    [InlineData("10000000146", true)]
    [InlineData("12345678901", false)] // checksum tutmaz
    [InlineData("11111111111", false)] // checksum tutmaz
    [InlineData("00000000146", false)] // sıfırla başlayamaz
    [InlineData("1000000014", false)]  // 10 hane
    [InlineData("100000001466", false)] // 12 hane
    [InlineData("1000000014a", false)] // harf içerir
    public void IsValidTc_Works(string tc, bool expected)
    {
        Assert.Equal(expected, PayrollPdfService.IsValidTc(tc));
    }

    [Fact]
    public void DetectTc_ReturnsStandaloneValidTc()
    {
        var text = "COKO BORDRO\nT.C. Kimlik No : 10000000146\nNet: 32.000";
        Assert.Equal("10000000146", PayrollPdfService.DetectTc(text));
    }

    [Fact]
    public void DetectTc_FindsValidTcInsideDigitBlob()
    {
        // PDF metin çıkarımı sayıları yapıştırabilir; blok içinden geçerli TC bulunmalı.
        var text = "Blok: 1000000014699 devam";
        Assert.Equal("10000000146", PayrollPdfService.DetectTc(text));
    }

    [Fact]
    public void DetectTc_FallsBackToFirstElevenDigits_WhenNoValidChecksum()
    {
        var text = "Sicil 12345678901 satırı";
        Assert.Equal("12345678901", PayrollPdfService.DetectTc(text));
    }

    [Fact]
    public void DetectTc_ReturnsNull_WhenNoDigits()
    {
        Assert.Null(PayrollPdfService.DetectTc("hiç rakam yok"));
    }
}
