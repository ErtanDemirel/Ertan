import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { applicationApi } from '../api/services';
import { apiError } from '../api/client';
import { Field } from '../components/ui';

const empty = {
  firstName: '', lastName: '', nationalId: '', phone: '', email: '', birthDate: '',
  address: '', position: '', education: '', experienceYears: '', previousWorkplace: '', notes: '',
};

export default function JobApplicationForm() {
  const [form, setForm] = useState({ ...empty });
  const [cv, setCv] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Ad ve soyad zorunludur.');
      return;
    }
    setLoading(true);
    try {
      const res = await applicationApi.submit({
        ...form,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        birthDate: form.birthDate || null,
      });
      if (cv) await applicationApi.uploadCv(res.id, cv);
      setDone(true);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="card max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={48} />
          <h1 className="text-xl font-bold text-slate-800">Başvurunuz Alındı</h1>
          <p className="mt-2 text-sm text-slate-500">İlginiz için teşekkür ederiz. İnsan Kaynakları ekibimiz sizinle iletişime geçecektir.</p>
          <Link to="/login" className="btn-primary mt-6 inline-flex">Girişe dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-800">COKO-SİS</h1>
          <p className="text-slate-500">İş Başvuru Formu</p>
        </div>

        <div className="card p-6">
          {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad *"><input className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
            <Field label="Soyad *"><input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
            <Field label="T.C. Kimlik No"><input className="input" value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} maxLength={11} /></Field>
            <Field label="Doğum Tarihi"><input type="date" className="input" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></Field>
            <Field label="Telefon"><input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="E-posta"><input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <Field label="Adres"><input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
            </div>
            <Field label="Başvurulan Pozisyon"><input className="input" value={form.position} onChange={(e) => set('position', e.target.value)} /></Field>
            <Field label="Öğrenim Durumu"><input className="input" value={form.education} onChange={(e) => set('education', e.target.value)} /></Field>
            <Field label="Deneyim (yıl)"><input type="number" className="input" value={form.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} /></Field>
            <Field label="Önceki İş Yeri"><input className="input" value={form.previousWorkplace} onChange={(e) => set('previousWorkplace', e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <Field label="Notlar"><textarea className="input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="CV (PDF / Word)" hint="En fazla 10 MB">
                <input type="file" accept=".pdf,.doc,.docx" className="input" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
              </Field>
            </div>
          </div>

          <button className="btn-primary mt-6 w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Başvuruyu Gönder
          </button>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-brand-600 hover:underline">Girişe dön</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
