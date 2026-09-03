/* ============================================================
   001 - İzin yarım gün alanı + Mobil push token tablosu
   SQL Server. Mevcut veritabanına güvenli (idempotent) uygular.
   ============================================================ */

/* LeaveRequests.HalfDay: 0=Tam gün, 1=ÖÖ(0.5), 2=ÖS(0.5) */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = N'HalfDay' AND Object_ID = Object_ID(N'LeaveRequests'))
BEGIN
    ALTER TABLE LeaveRequests ADD HalfDay INT NOT NULL DEFAULT 0;
END
GO

/* Mobil push cihaz token'ları */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE Name = N'PushTokens')
BEGIN
    CREATE TABLE PushTokens (
        Id         INT IDENTITY PRIMARY KEY,
        UserId     INT NOT NULL,
        Token      NVARCHAR(200) NOT NULL,
        Platform   NVARCHAR(20) NULL,
        IsActive   BIT NOT NULL DEFAULT 1,
        CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        LastUsedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Push_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IX_Push_Token ON PushTokens(Token);
    CREATE INDEX IX_Push_User ON PushTokens(UserId, IsActive);
END
GO
