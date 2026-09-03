using Microsoft.AspNetCore.StaticFiles;

namespace Pdks.Api.Services;

public class StorageOptions
{
    public const string Section = "Storage";
    /// <summary>Yükleme kök klasörü (ContentRoot'a göreli). Webroot dışında tutulur.</summary>
    public string Root { get; set; } = "App_Data/uploads";
    /// <summary>İzin verilen en büyük dosya boyutu (MB).</summary>
    public int MaxFileSizeMb { get; set; } = 10;
}

public record StoredFileInfo(string FileName, string StoredPath, string ContentType, long SizeBytes);

/// <summary>
/// Güvenli dosya yükleme/okuma. Yüklenen dosyalar webroot DIŞINDA, rastgele adlarla saklanır;
/// yalnızca izin verilen uzantılar ve boyut kabul edilir. Dosyalar doğrudan URL ile değil,
/// yetki kontrollü indirme uçlarından servis edilir.
/// </summary>
public class FileStorageService
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"
    };

    private readonly string _root;
    private readonly long _maxBytes;
    private readonly FileExtensionContentTypeProvider _mime = new();

    public FileStorageService(IHostEnvironment env, Microsoft.Extensions.Options.IOptions<StorageOptions> opt)
    {
        var o = opt.Value;
        _root = Path.IsPathRooted(o.Root) ? o.Root : Path.Combine(env.ContentRootPath, o.Root);
        _maxBytes = (long)o.MaxFileSizeMb * 1024 * 1024;
        Directory.CreateDirectory(_root);
    }

    public bool IsAllowed(string fileName, out string extension)
    {
        extension = Path.GetExtension(fileName).ToLowerInvariant();
        return AllowedExtensions.Contains(extension);
    }

    /// <summary>Dosyayı doğrular ve güvenli şekilde saklar. Hatalıysa InvalidOperationException.</summary>
    public async Task<StoredFileInfo> SaveAsync(IFormFile file, string category, CancellationToken ct = default)
    {
        if (file is null || file.Length == 0)
            throw new InvalidOperationException("Dosya boş.");
        if (file.Length > _maxBytes)
            throw new InvalidOperationException($"Dosya çok büyük (en fazla {_maxBytes / (1024 * 1024)} MB).");
        if (!IsAllowed(file.FileName, out var ext))
            throw new InvalidOperationException("İzin verilmeyen dosya türü. (pdf, jpg, png, docx)");

        var safeCategory = Path.GetFileName(category); // path traversal önle
        var dir = Path.Combine(_root, safeCategory);
        Directory.CreateDirectory(dir);

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, storedName);

        await using (var stream = new FileStream(fullPath, FileMode.CreateNew))
            await file.CopyToAsync(stream, ct);

        if (!_mime.TryGetContentType(file.FileName, out var contentType))
            contentType = "application/octet-stream";

        // Göreli yol saklanır (kök taşınabilir olsun diye)
        var rel = Path.Combine(safeCategory, storedName).Replace('\\', '/');
        return new StoredFileInfo(Path.GetFileName(file.FileName), rel, contentType, file.Length);
    }

    /// <summary>Sunucuda üretilen ham baytları güvenli şekilde saklar (örn. PDF'ten ayrılan tek sayfa).</summary>
    public async Task<StoredFileInfo> SaveBytesAsync(byte[] data, string fileName, string category,
        string contentType, CancellationToken ct = default)
    {
        if (data is null || data.Length == 0)
            throw new InvalidOperationException("Boş içerik.");

        var ext = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(ext)) ext = ".pdf";
        var safeCategory = Path.GetFileName(category);
        var dir = Path.Combine(_root, safeCategory);
        Directory.CreateDirectory(dir);

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(dir, storedName);
        await File.WriteAllBytesAsync(fullPath, data, ct);

        var rel = Path.Combine(safeCategory, storedName).Replace('\\', '/');
        return new StoredFileInfo(fileName, rel, contentType, data.Length);
    }

    /// <summary>Saklanan dosyayı okuma akışı olarak açar. Yol kök dışına çıkamaz.</summary>
    public (Stream stream, string contentType) Open(string storedPath, string contentType)
    {
        var full = Path.GetFullPath(Path.Combine(_root, storedPath));
        var rootFull = Path.GetFullPath(_root);
        if (!full.StartsWith(rootFull, StringComparison.Ordinal) || !File.Exists(full))
            throw new FileNotFoundException("Dosya bulunamadı.");
        return (new FileStream(full, FileMode.Open, FileAccess.Read), contentType);
    }

    public void Delete(string storedPath)
    {
        try
        {
            var full = Path.GetFullPath(Path.Combine(_root, storedPath));
            var rootFull = Path.GetFullPath(_root);
            if (full.StartsWith(rootFull, StringComparison.Ordinal) && File.Exists(full))
                File.Delete(full);
        }
        catch { /* yut */ }
    }
}
