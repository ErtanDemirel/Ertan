using Microsoft.EntityFrameworkCore;

namespace Pdks.Api.Data;

/// <summary>
/// Hafif, idempotent şema uyumlayıcı. `EnsureCreated()` yalnızca veritabanı YOKKEN
/// şemayı kurar; sonradan modele eklenen kolon/tabloları mevcut (dev) veritabanına eklemez.
/// Bu yardımcı, üretime uygun EF migration'a geçilene kadar mevcut veritabanının
/// veri kaybı olmadan güncel kalmasını sağlar. Her adım güvenli (varsa atlar) ve
/// hata durumunda uygulamayı düşürmez.
///
/// Üretimde tercih edilen yol EF Core migration'dır:
///   dotnet ef migrations add &lt;Ad&gt;   &amp;&amp;   dotnet ef database update
/// Migration mevcutsa Program.cs bu uyumlayıcıyı çalıştırmaz, Migrate() kullanır.
/// </summary>
public static class DbMaintenance
{
    public static async Task ReconcileAsync(AppDbContext db, ILogger logger, CancellationToken ct = default)
    {
        var sqlite = db.Database.IsSqlite();
        var sqlserver = db.Database.IsSqlServer();
        if (!sqlite && !sqlserver) return; // InMemory vb. — uyumlama gerekmez

        // Sonradan var olan tablolara eklenen kolonlar:
        await EnsureColumnAsync(db, logger, "LeaveRequests", "HalfDay", "INTEGER", "int", "0", ct);
        await EnsureColumnAsync(db, logger, "Personnel", "ServiceStop", "TEXT", "nvarchar(80)", null, ct);
        await EnsureColumnAsync(db, logger, "Personnel", "ExitDate", "TEXT", "datetime2", null, ct);
        await EnsureColumnAsync(db, logger, "Personnel", "ExitReason", "TEXT", "nvarchar(200)", null, ct);

        // Sonradan eklenen tablo(lar):
        await EnsurePushTokensTableAsync(db, logger, ct);
        await EnsureFeedbackTableAsync(db, logger, ct);
    }

    private static async Task<bool> ColumnExistsAsync(AppDbContext db, string table, string column, CancellationToken ct)
    {
        var sql = db.Database.IsSqlite()
            ? $"SELECT COUNT(*) AS Value FROM pragma_table_info('{table}') WHERE name = '{column}'"
            : $"SELECT COUNT(*) AS Value FROM sys.columns WHERE Name = N'{column}' AND Object_ID = Object_ID(N'{table}')";
        var count = await db.Database.SqlQueryRaw<int>(sql).FirstAsync(ct);
        return count > 0;
    }

    private static async Task<bool> TableExistsAsync(AppDbContext db, string table, CancellationToken ct)
    {
        var sql = db.Database.IsSqlite()
            ? $"SELECT COUNT(*) AS Value FROM sqlite_master WHERE type='table' AND name='{table}'"
            : $"SELECT COUNT(*) AS Value FROM sys.tables WHERE Name = N'{table}'";
        var count = await db.Database.SqlQueryRaw<int>(sql).FirstAsync(ct);
        return count > 0;
    }

    private static async Task EnsureColumnAsync(AppDbContext db, ILogger logger,
        string table, string column, string sqliteType, string sqlServerType, string? defaultValue, CancellationToken ct)
    {
        try
        {
            if (!await TableExistsAsync(db, table, ct)) return; // tablo yoksa EnsureCreated zaten kuracak
            if (await ColumnExistsAsync(db, table, column, ct)) return;

            var type = db.Database.IsSqlite() ? sqliteType : sqlServerType;
            // Default verilen kolonu NOT NULL yaparız → mevcut satırlar default değeri alır
            // (aksi halde SQL Server'da eski satırlar NULL kalır ve non-nullable alanı bozar).
            var suffix = defaultValue is null ? "" : $" NOT NULL DEFAULT {defaultValue}";
            await db.Database.ExecuteSqlRawAsync($"ALTER TABLE {table} ADD {column} {type}{suffix}", ct);
            logger.LogInformation("Şema uyumlandı: {Table}.{Column} kolonu eklendi.", table, column);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Şema uyumlama atlandı: {Table}.{Column}", table, column);
        }
    }

    private static async Task EnsureFeedbackTableAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        try
        {
            if (await TableExistsAsync(db, "FeedbackItems", ct)) return;

            var sql = db.Database.IsSqlite()
                ? @"CREATE TABLE IF NOT EXISTS FeedbackItems (
                        Id INTEGER NOT NULL CONSTRAINT PK_FeedbackItems PRIMARY KEY AUTOINCREMENT,
                        PersonnelId INTEGER NULL,
                        Kind INTEGER NOT NULL,
                        Title TEXT NULL,
                        Body TEXT NOT NULL,
                        Location TEXT NULL,
                        IsAnonymous INTEGER NOT NULL DEFAULT 0,
                        Status INTEGER NOT NULL DEFAULT 0,
                        HandlerComment TEXT NULL,
                        HandledByUserId INTEGER NULL,
                        CreatedAt TEXT NOT NULL,
                        HandledAt TEXT NULL,
                        CONSTRAINT FK_FB_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id) ON DELETE SET NULL,
                        CONSTRAINT FK_FB_Handler FOREIGN KEY (HandledByUserId) REFERENCES Users(Id)
                    );"
                : @"CREATE TABLE FeedbackItems (
                        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FeedbackItems PRIMARY KEY,
                        PersonnelId INT NULL,
                        Kind INT NOT NULL,
                        Title NVARCHAR(150) NULL,
                        Body NVARCHAR(2000) NOT NULL,
                        Location NVARCHAR(150) NULL,
                        IsAnonymous BIT NOT NULL DEFAULT 0,
                        Status INT NOT NULL DEFAULT 0,
                        HandlerComment NVARCHAR(500) NULL,
                        HandledByUserId INT NULL,
                        CreatedAt DATETIME2 NOT NULL,
                        HandledAt DATETIME2 NULL,
                        CONSTRAINT FK_FB_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id) ON DELETE SET NULL,
                        CONSTRAINT FK_FB_Handler FOREIGN KEY (HandledByUserId) REFERENCES Users(Id)
                    );";
            await db.Database.ExecuteSqlRawAsync(sql, ct);
            await db.Database.ExecuteSqlRawAsync("CREATE INDEX IX_FB_KindStatus ON FeedbackItems(Kind, Status);", ct);
            logger.LogInformation("Şema uyumlandı: FeedbackItems tablosu oluşturuldu.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Şema uyumlama atlandı: FeedbackItems tablosu");
        }
    }

    private static async Task EnsurePushTokensTableAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        try
        {
            if (await TableExistsAsync(db, "PushTokens", ct)) return;

            var sql = db.Database.IsSqlite()
                ? @"CREATE TABLE IF NOT EXISTS PushTokens (
                        Id INTEGER NOT NULL CONSTRAINT PK_PushTokens PRIMARY KEY AUTOINCREMENT,
                        UserId INTEGER NOT NULL,
                        Token TEXT NOT NULL,
                        Platform TEXT NULL,
                        IsActive INTEGER NOT NULL DEFAULT 1,
                        CreatedAt TEXT NOT NULL,
                        LastUsedAt TEXT NOT NULL,
                        CONSTRAINT FK_PushTokens_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                    );"
                : @"CREATE TABLE PushTokens (
                        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_PushTokens PRIMARY KEY,
                        UserId INT NOT NULL,
                        Token NVARCHAR(200) NOT NULL,
                        Platform NVARCHAR(20) NULL,
                        IsActive BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME2 NOT NULL,
                        LastUsedAt DATETIME2 NOT NULL,
                        CONSTRAINT FK_PushTokens_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                    );";
            await db.Database.ExecuteSqlRawAsync(sql, ct);
            // Benzersiz token indeksi
            await db.Database.ExecuteSqlRawAsync(
                "CREATE UNIQUE INDEX IX_PushTokens_Token ON PushTokens(Token);", ct);
            logger.LogInformation("Şema uyumlandı: PushTokens tablosu oluşturuldu.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Şema uyumlama atlandı: PushTokens tablosu");
        }
    }
}
