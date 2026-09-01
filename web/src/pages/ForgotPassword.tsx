import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { authApi } from '../api/services';
import { apiError } from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const r: any = await authApi.forgot(username.trim());
      setMessage(r?.message || 'Telefonunuza kod gönderildi.');
      setStep(2);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      await authApi.reset(username.trim(), code.trim(), newPassword);
      setMessage('Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-brand-900 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 rounded-2xl bg-brand-600 p-3 text-white">
            <KeyRound size={26} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Şifre Sıfırlama</h1>
          <p className="text-sm text-slate-500">
            {step === 1 ? 'Kullanıcı adınızı girin, SMS ile kod gönderelim.' : 'SMS ile gelen kodu ve yeni şifrenizi girin.'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={requestCode} className="space-y-4">
            <div>
              <label className="label">Kullanıcı Adı</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" size={16} />} Kod Gönder
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <div>
              <label className="label">SMS Kodu</label>
              <input className="input tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Yeni Şifre</label>
              <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" size={16} />} Şifreyi Güncelle
            </button>
          </form>
        )}

        {message && <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-brand-600 hover:underline">Girişe dön</Link>
        </div>
      </div>
    </div>
  );
}
