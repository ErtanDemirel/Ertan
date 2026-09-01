using System.Security.Cryptography;

namespace Pdks.Api.Services;

/// <summary>
/// PBKDF2 (HMAC-SHA256) tabanlı şifre hash'leme. Harici bağımlılık gerektirmez.
/// Her şifre için rastgele 128-bit salt üretilir, 210.000 iterasyon uygulanır.
/// </summary>
public class PasswordHasher
{
    private const int SaltSize = 16;      // 128 bit
    private const int KeySize = 32;       // 256 bit
    private const int Iterations = 210_000;
    private static readonly HashAlgorithmName Algo = HashAlgorithmName.SHA256;

    public (string hash, string salt) Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algo, KeySize);
        return (Convert.ToBase64String(hash), Convert.ToBase64String(salt));
    }

    public bool Verify(string password, string storedHash, string storedSalt)
    {
        if (string.IsNullOrEmpty(storedHash) || string.IsNullOrEmpty(storedSalt))
            return false;

        var salt = Convert.FromBase64String(storedSalt);
        var expected = Convert.FromBase64String(storedHash);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algo, expected.Length);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
