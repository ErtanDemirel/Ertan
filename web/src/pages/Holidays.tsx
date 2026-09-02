import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CalendarX } from 'lucide-react';
import { holidayApi } from '../api/services';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState, Toggle } from '../components/ui';

export default function HolidaysPage() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: '', name: '', isHalfDay: false });
  const [error, setError] = useState('');

  const list = useQuery({ queryKey: ['holidays', year], queryFn: () => holidayApi.list(year) });
  const create = useMutation({
    mutationFn: () => holidayApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); setOpen(false); setForm({ date: '', name: '', isHalfDay: false }); },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => holidayApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800"><CalendarX size={20} /> Resmî Tatiller ({year})</h2>
        <button className="btn-primary" onClick={() => { setError(''); setOpen(true); }}><Plus size={16} /> Tatil Ekle</button>
      </div>
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        Buradaki günler izin talebinde <b>yıllık izinden düşülmez</b>. Dinî bayramlar (Ramazan/Kurban) her yıl değiştiği için buradan eklenir.
      </p>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Bu yıl için tatil tanımlı değil." />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr><th className="th">Tarih</th><th className="th">Gün</th><th className="th">Tatil</th><th className="th">Tür</th><th className="th text-right"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.data!.map((h) => (
                <tr key={h.id}>
                  <td className="td font-medium">{new Date(h.date).toLocaleDateString('tr-TR')}</td>
                  <td className="td">{new Date(h.date).toLocaleDateString('tr-TR', { weekday: 'long' })}</td>
                  <td className="td">{h.name}</td>
                  <td className="td">{h.isHalfDay ? <span className="badge bg-amber-100 text-amber-700">Yarım gün</span> : <span className="badge bg-emerald-100 text-emerald-700">Tam gün</span>}</td>
                  <td className="td text-right"><button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Tatil silinsin mi?') && remove.mutate(h.id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Tatil Ekle"
        footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button><button className="btn-primary" onClick={() => create.mutate()} disabled={create.isPending}>Kaydet</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <Field label="Tarih *"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Tatil Adı *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="örn. Ramazan Bayramı 1. Gün" /></Field>
          <Toggle checked={form.isHalfDay} onChange={(v) => setForm({ ...form, isHalfDay: v })} label="Yarım gün tatil (0,5 gün sayılır)" />
        </div>
      </Modal>
    </div>
  );
}
