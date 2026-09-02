/* ============================================================
   COKO-SİS (PDKS) - SQL Server Şema Scripti
   Not: Uygulama EF Core ile şemayı otomatik oluşturabilir
   (EnsureCreated). Bu script, veritabanını manuel/SQL-first
   kurmak isteyenler içindir. Alanlar EF entity'leriyle uyumludur.
   ============================================================ */

IF DB_ID('PdksDb') IS NULL
    CREATE DATABASE PdksDb;
GO
USE PdksDb;
GO

/* ---------------- Servis Güzergahı ---------------- */
CREATE TABLE ServiceRoutes (
    Id            INT IDENTITY PRIMARY KEY,
    Name          NVARCHAR(80)  NOT NULL,
    Description   NVARCHAR(250) NULL,
    Stops         NVARCHAR(1000) NULL,
    DepartureTime TIME NULL,
    ReturnTime    TIME NULL,
    DriverName    NVARCHAR(80) NULL,
    PlateNumber   NVARCHAR(20) NULL,
    Capacity      INT NOT NULL DEFAULT 27,
    IsActive      BIT NOT NULL DEFAULT 1
);

/* ---------------- Vardiya ---------------- */
CREATE TABLE Shifts (
    Id             INT IDENTITY PRIMARY KEY,
    Name           NVARCHAR(60) NOT NULL,
    StartTime      TIME NOT NULL,
    EndTime        TIME NOT NULL,
    CrossesMidnight BIT NOT NULL DEFAULT 0,
    Color          NVARCHAR(7) NULL,
    Description    NVARCHAR(250) NULL,
    IsActive       BIT NOT NULL DEFAULT 1
);

/* ---------------- Personel ---------------- */
CREATE TABLE Personnel (
    Id             INT IDENTITY PRIMARY KEY,
    SicilNo        NVARCHAR(30) NOT NULL,
    FirstName      NVARCHAR(60) NOT NULL,
    LastName       NVARCHAR(60) NOT NULL,
    NationalId     NVARCHAR(11) NULL,
    Department     NVARCHAR(80) NULL,
    Title          NVARCHAR(80) NULL,
    PhoneNumber    NVARCHAR(20) NULL,
    Email          NVARCHAR(120) NULL,
    HireDate       DATETIME2 NULL,
    ExitDate       DATETIME2 NULL,
    ExitReason     NVARCHAR(200) NULL,
    ManagerId      INT NULL,
    ServiceRouteId INT NULL,
    ServiceStop    NVARCHAR(80) NULL,
    ShiftId        INT NULL,
    IsActive       BIT NOT NULL DEFAULT 1,
    CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2 NULL,
    CONSTRAINT UQ_Personnel_Sicil UNIQUE (SicilNo),
    CONSTRAINT FK_Personnel_Manager FOREIGN KEY (ManagerId) REFERENCES Personnel(Id),
    CONSTRAINT FK_Personnel_Route  FOREIGN KEY (ServiceRouteId) REFERENCES ServiceRoutes(Id),
    CONSTRAINT FK_Personnel_Shift  FOREIGN KEY (ShiftId) REFERENCES Shifts(Id)
);

/* ---------------- Kullanıcı ---------------- */
CREATE TABLE Users (
    Id           INT IDENTITY PRIMARY KEY,
    Username     NVARCHAR(50) NOT NULL,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    PasswordSalt NVARCHAR(MAX) NOT NULL,
    Role         INT NOT NULL DEFAULT 2,   -- 0=Admin,1=Manager,2=Personnel
    PhoneNumber  NVARCHAR(20) NULL,
    Email        NVARCHAR(120) NULL,
    IsActive     BIT NOT NULL DEFAULT 1,
    FailedLoginCount INT NOT NULL DEFAULT 0,
    LockoutEnd   DATETIME2 NULL,
    PersonnelId  INT NULL,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    LastLoginAt  DATETIME2 NULL,
    CONSTRAINT UQ_Users_Username UNIQUE (Username),
    CONSTRAINT FK_Users_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id)
);

/* ---------------- Vardiya Planı ---------------- */
CREATE TABLE ShiftAssignments (
    Id          INT IDENTITY PRIMARY KEY,
    PersonnelId INT NOT NULL,
    ShiftId     INT NOT NULL,
    [Date]      DATE NOT NULL,
    Note        NVARCHAR(250) NULL,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_SA_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SA_Shift FOREIGN KEY (ShiftId) REFERENCES Shifts(Id)
);
CREATE INDEX IX_SA_Personnel_Date ON ShiftAssignments(PersonnelId, [Date]);

/* ---------------- İzin ---------------- */
CREATE TABLE LeaveTypes (
    Id               INT IDENTITY PRIMARY KEY,
    Name             NVARCHAR(60) NOT NULL,
    DeductsFromAnnual BIT NOT NULL DEFAULT 0,
    IsPaid           BIT NOT NULL DEFAULT 1,
    IsActive         BIT NOT NULL DEFAULT 1
);

CREATE TABLE LeaveBalances (
    Id           INT IDENTITY PRIMARY KEY,
    PersonnelId  INT NOT NULL,
    [Year]       INT NOT NULL,
    EntitledDays DECIMAL(6,2) NOT NULL DEFAULT 0,
    UsedDays     DECIMAL(6,2) NOT NULL DEFAULT 0,
    PendingDays  DECIMAL(6,2) NOT NULL DEFAULT 0,
    CONSTRAINT FK_LB_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_LB_Personnel_Year UNIQUE (PersonnelId, [Year])
);

CREATE TABLE LeaveRequests (
    Id             INT IDENTITY PRIMARY KEY,
    PersonnelId    INT NOT NULL,
    LeaveTypeId    INT NOT NULL,
    StartDate      DATE NOT NULL,
    EndDate        DATE NOT NULL,
    TotalDays      DECIMAL(6,2) NOT NULL,
    Title          NVARCHAR(150) NULL,
    Reason         NVARCHAR(1000) NULL,
    Status         INT NOT NULL DEFAULT 0,   -- 0=Pending,1=Approved,2=Rejected,3=Cancelled
    ApproverId     INT NULL,
    ManagerComment NVARCHAR(500) NULL,
    RequestedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DecidedAt      DATETIME2 NULL,
    CONSTRAINT FK_LR_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id) ON DELETE CASCADE,
    CONSTRAINT FK_LR_Type FOREIGN KEY (LeaveTypeId) REFERENCES LeaveTypes(Id),
    CONSTRAINT FK_LR_Approver FOREIGN KEY (ApproverId) REFERENCES Personnel(Id)
);

/* ---------------- Duyuru ---------------- */
CREATE TABLE Announcements (
    Id               INT IDENTITY PRIMARY KEY,
    Title            NVARCHAR(150) NOT NULL,
    Body             NVARCHAR(MAX) NOT NULL,
    IsMandatory      BIT NOT NULL DEFAULT 1,
    IsActive         BIT NOT NULL DEFAULT 1,
    PublishedByUserId INT NOT NULL,
    PublishedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpiresAt        DATETIME2 NULL,
    CONSTRAINT FK_Ann_User FOREIGN KEY (PublishedByUserId) REFERENCES Users(Id)
);

CREATE TABLE AnnouncementReads (
    Id             INT IDENTITY PRIMARY KEY,
    AnnouncementId INT NOT NULL,
    UserId         INT NOT NULL,
    ReadAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_AR_Ann FOREIGN KEY (AnnouncementId) REFERENCES Announcements(Id) ON DELETE CASCADE,
    CONSTRAINT FK_AR_User FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT UQ_AR UNIQUE (AnnouncementId, UserId)
);

/* ---------------- Yemek ---------------- */
CREATE TABLE MealMenus (
    Id            INT IDENTITY PRIMARY KEY,
    [Date]        DATE NOT NULL,
    Soup          NVARCHAR(120) NULL,
    MainCourse    NVARCHAR(120) NULL,
    SideDish      NVARCHAR(120) NULL,
    Complement    NVARCHAR(120) NULL,
    Dessert       NVARCHAR(120) NULL,
    Alternative   NVARCHAR(120) NULL,
    Calories      INT NULL,
    CreatedByUserId INT NOT NULL,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2 NULL,
    CONSTRAINT UQ_Meal_Date UNIQUE ([Date]),
    CONSTRAINT FK_Meal_User FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id)
);

/* ---------------- Mesai / Konum ---------------- */
CREATE TABLE WorkLocations (
    Id           INT IDENTITY PRIMARY KEY,
    Name         NVARCHAR(100) NOT NULL,
    Latitude     FLOAT NOT NULL,
    Longitude    FLOAT NOT NULL,
    RadiusMeters INT NOT NULL DEFAULT 150,
    QrSecret     NVARCHAR(MAX) NOT NULL,
    IsActive     BIT NOT NULL DEFAULT 1
);

CREATE TABLE Attendances (
    Id              INT IDENTITY PRIMARY KEY,
    PersonnelId     INT NOT NULL,
    WorkLocationId  INT NULL,
    [Type]          INT NOT NULL,   -- 0=CheckIn,1=CheckOut
    [Timestamp]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Latitude        FLOAT NOT NULL,
    Longitude       FLOAT NOT NULL,
    DistanceMeters  FLOAT NOT NULL,
    IsWithinGeofence BIT NOT NULL,
    DeviceInfo      NVARCHAR(120) NULL,
    CONSTRAINT FK_Att_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Att_Location FOREIGN KEY (WorkLocationId) REFERENCES WorkLocations(Id)
);
CREATE INDEX IX_Att_Personnel_Time ON Attendances(PersonnelId, [Timestamp]);

/* ---------------- Güvenlik ---------------- */
CREATE TABLE PasswordResetCodes (
    Id           INT IDENTITY PRIMARY KEY,
    UserId       INT NOT NULL,
    CodeHash     NVARCHAR(MAX) NOT NULL,
    ExpiresAt    DATETIME2 NOT NULL,
    IsUsed       BIT NOT NULL DEFAULT 0,
    AttemptCount INT NOT NULL DEFAULT 0,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PRC_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

CREATE TABLE RefreshTokens (
    Id        INT IDENTITY PRIMARY KEY,
    UserId    INT NOT NULL,
    Token     NVARCHAR(200) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    IsRevoked BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_RT_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);
CREATE INDEX IX_RT_Token ON RefreshTokens(Token);

/* ---------------- İzin Ek Dosyaları ---------------- */
CREATE TABLE LeaveAttachments (
    Id            INT IDENTITY PRIMARY KEY,
    LeaveRequestId INT NOT NULL,
    FileName      NVARCHAR(200) NOT NULL,
    StoredPath    NVARCHAR(300) NOT NULL,
    ContentType   NVARCHAR(100) NOT NULL,
    SizeBytes     BIGINT NOT NULL,
    UploadedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_LA_Request FOREIGN KEY (LeaveRequestId) REFERENCES LeaveRequests(Id) ON DELETE CASCADE
);

/* ---------------- Bordro ---------------- */
CREATE TABLE Payslips (
    Id            INT IDENTITY PRIMARY KEY,
    PersonnelId   INT NOT NULL,
    [Year]        INT NOT NULL,
    [Month]       INT NOT NULL,
    FileName      NVARCHAR(200) NOT NULL,
    StoredPath    NVARCHAR(300) NOT NULL,
    ContentType   NVARCHAR(100) NOT NULL,
    SizeBytes     BIGINT NOT NULL,
    NetAmount     DECIMAL(12,2) NULL,
    Note          NVARCHAR(250) NULL,
    UploadedByUserId INT NOT NULL,
    UploadedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PS_Personnel FOREIGN KEY (PersonnelId) REFERENCES Personnel(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PS_User FOREIGN KEY (UploadedByUserId) REFERENCES Users(Id)
);
CREATE INDEX IX_PS_Personnel_Period ON Payslips(PersonnelId, [Year], [Month]);

/* ---------------- İş Başvuruları / Adaylar ---------------- */
CREATE TABLE JobApplications (
    Id             INT IDENTITY PRIMARY KEY,
    FirstName      NVARCHAR(60) NOT NULL,
    LastName       NVARCHAR(60) NOT NULL,
    NationalId     NVARCHAR(11) NULL,
    Phone          NVARCHAR(20) NULL,
    Email          NVARCHAR(120) NULL,
    BirthDate      DATETIME2 NULL,
    [Address]      NVARCHAR(300) NULL,
    Position       NVARCHAR(100) NULL,
    Education      NVARCHAR(150) NULL,
    ExperienceYears INT NULL,
    PreviousWorkplace NVARCHAR(200) NULL,
    Notes          NVARCHAR(1000) NULL,
    CvFileName     NVARCHAR(200) NULL,
    CvStoredPath   NVARCHAR(300) NULL,
    CvContentType  NVARCHAR(100) NULL,
    Status         INT NOT NULL DEFAULT 0,   -- 0=New,1=Reviewing,2=Interview,3=Offered,4=Hired,5=Rejected
    ReviewNote     NVARCHAR(500) NULL,
    ReviewedByUserId INT NULL,
    CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2 NULL
);
CREATE INDEX IX_JA_NationalId ON JobApplications(NationalId);

/* ---------------- Denetim Kaydı ---------------- */
CREATE TABLE AuditLogs (
    Id         INT IDENTITY PRIMARY KEY,
    UserId     INT NULL,
    Action     NVARCHAR(80) NOT NULL,
    Detail     NVARCHAR(400) NULL,
    IpAddress  NVARCHAR(60) NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Audit_CreatedAt ON AuditLogs(CreatedAt);
GO
