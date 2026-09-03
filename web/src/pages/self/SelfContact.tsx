import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Send } from 'lucide-react';
import { contactApi } from '../../api/services';
import { apiError } from '../../api/client';
import { Field, Spinner } from '../../components/ui';

export default function SelfContact() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-contact'], queryFn: () => contactApi.mine() });
  const [form, setForm] = useState({ phoneNumber: '', email: '', address: '', emergencyContactName: '', emergencyContactPhone: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.data) setForm({
      phoneNumber: q.data.phoneNumber ?? '', email: q.data.email ?? '', address: q.data.address ?? '',
      emergencyContactName: q.data.emergencyContactName ?? '', emergencyContactPhone: q.data.emergencyContactPhone ?? '',
    });
  }, [q.data]);

  const create = useMutation({
    mutationFn: () => contactApi.createRequest(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-contact'] }),
    onError: (e) => setError(apiError(e)),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const pending = q.data?.pending;

  if (q.isLoading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">İletişim Bilgilerim</h2>
        <p className="text-sm text-slate-500">Değişiklik yaptığınız alanlar <strong>İK/amir onayından</strong> sonra kartınıza işlenir.</p>
      </div>

      {pending && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <Clock size={16} /> Onay bekleyen bir güncelleme talebiniz var.
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="card space-y-3 p-5">
        <h3 className="text-sm font-semibold text-slate-600">İletişim</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefon"><input className="input" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} /></Field>
          <Field label="E-posta"><input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        </div>
        <Field label="Adres"><textarea className="input" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>

      <div className="card space-y-3 p-5">
        <h3 className="text-sm font-semibold text-slate-600">Acil Durum Kişisi</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ad Soyad"><input className="input" value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} /></Field>
          <Field label="Telefon"><input className="input" value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} /></Field>
        </div>
      </div>

      <button className="btn-primary w-full" disabled={!!pending || create.isPending} onClick={() => { setError(''); create.mutate(); }}>
        <Send size={16} /> {pending ? 'Bekleyen talep var' : create.isPending ? 'Gönderiliyor...' : 'İK onayına gönder'}
      </button>
    </div>
  );
}
