import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Trash2, Wallet } from 'lucide-react';
import { payrollApi, personnelApi, downloadFile } from '../api/services';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../auth/AuthContext';

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function PayrollPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    personnelId: '', year: String(now.getFullYear()), month: String(now.getMonth() + 1), netAmount: '', note: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const people = useQuery({ queryKey: ['pay-people'], queryFn: () => personnelApi.list({ pageSize: 200 }) });
  const list = useQuery({ queryKey: ['payroll'], queryFn: () => payrollApi.list() });

  const upload = useMutation({
    mutationFn: () => payrollApi.upload({
      personnelId: Number(form.personnelId), year: Number(form.year), month: Number(form.month),
      netAmount: form.netAmount ? Number(form.netAmount) : undefined, note: form.note || undefined, file: file!,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); setOpen(false); setFile(null); },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => payrollApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
    onError: (e) => alert(apiError(e)),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  function submit() {
    setError('');
    if (!form.personnelId) return setError('Personel seçin.');
    if (!file) return setError('Bordro PDF dosyası seçin.');
    upload.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Bordro Dağıtımı</h2>
        <button className="btn-primary" onClick={() => { setError(''); setOpen(true); }}><Upload size={16} /> Bordro Yükle</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Henüz bordro yüklenmemiş." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="th">Personel</th><th className="th">Sicil</th><th className="th">Dönem</th>
              <th className="th">Net Tutar</th><th className="th">Not</th><th className="th">Yüklenme</th><th className="th text-right">İşlem</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.data!.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{p.personnelName}</td>
                  <td className="td font-mono">{p.sicilNo}</td>
                  <td className="td">{months[p.month - 1]} {p.year}</td>
                  <td className="td">{p.netAmount != null ? `${p.netAmount.toLocaleString('tr-TR')} ₺` : '-'}</td>
                  <td className="td text-slate-400">{p.note || '-'}</td>
                  <td className="td text-slate-400">{new Date(p.uploadedAt).toLocaleDateString('tr-TR')}</td>
                  <td className="td text-right">
                    <button className="btn-ghost !p-1.5" onClick={() => downloadFile(payrollApi.fileUrl(p.id), p.fileName)}><Download size={16} /></button>
                    {user?.role === 'Admin' && (
                      <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Bordro silinsin mi?') && remove.mutate(p.id)}><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Bordro Yükle"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={submit} disabled={upload.isPending}>Yükle</button>
        </>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <Field label="Personel *">
            <select className="input" value={form.personnelId} onChange={(e) => set('personnelId', e.target.value)}>
              <option value="">Seçin</option>
              {people.data?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.sicilNo})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yıl"><input type="number" className="input" value={form.year} onChange={(e) => set('year', e.target.value)} /></Field>
            <Field label="Ay">
              <select className="input" value={form.month} onChange={(e) => set('month', e.target.value)}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Net Tutar (₺)"><input type="number" className="input" value={form.netAmount} onChange={(e) => set('netAmount', e.target.value)} /></Field>
            <Field label="Not"><input className="input" value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
          </div>
          <Field label="Bordro Dosyası (PDF) *" hint="En fazla 10 MB">
            <input type="file" accept=".pdf" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
