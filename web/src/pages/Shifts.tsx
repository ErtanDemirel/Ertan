import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { shiftApi } from '../api/services';
import type { Shift } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';

const empty = { name: '', startTime: '08:00', endTime: '17:00', crossesMidnight: false, color: '#22c55e', description: '', isActive: true };

export default function ShiftsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState('');

  const list = useQuery({ queryKey: ['shifts'], queryFn: () => shiftApi.list() });
  const save = useMutation({
    mutationFn: (b: any) => (editing ? shiftApi.update(editing.id, b) : shiftApi.create(b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setOpen(false); },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => shiftApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
    onError: (e) => alert(apiError(e)),
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  function openCreate() { setEditing(null); setForm({ ...empty }); setError(''); setOpen(true); }
  function openEdit(s: Shift) {
    setEditing(s); setError('');
    setForm({ name: s.name, startTime: s.startTime, endTime: s.endTime, crossesMidnight: s.crossesMidnight, color: s.color || '#22c55e', description: s.description || '', isActive: s.isActive });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Vardiya Yönetimi</h2>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Yeni Vardiya</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Henüz vardiya tanımlanmamış." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data!.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color || '#94a3b8' }} />
                  <h3 className="font-semibold text-slate-800">{s.name}</h3>
                </div>
                <div>
                  <button className="btn-ghost !p-1.5" onClick={() => openEdit(s)}><Pencil size={15} /></button>
                  <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Vardiya silinsin mi?') && remove.mutate(s.id)}><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock size={15} /> {s.startTime} - {s.endTime}
                {s.crossesMidnight && <span className="badge bg-indigo-100 text-indigo-700">ertesi gün</span>}
              </div>
              {s.description && <p className="mt-2 text-sm text-slate-400">{s.description}</p>}
              <p className="mt-3 text-xs text-slate-400">{s.personnelCount} personel atanmış</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Vardiya Düzenle' : 'Yeni Vardiya'}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={() => save.mutate(form)} disabled={save.isPending}>Kaydet</button>
        </>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-4">
          <Field label="Vardiya Adı *"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Başlangıç"><input type="time" className="input" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field>
            <Field label="Bitiş"><input type="time" className="input" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Renk"><input type="color" className="input h-10 p-1" value={form.color} onChange={(e) => set('color', e.target.value)} /></Field>
            <Field label="Ertesi güne taşar mı?">
              <select className="input" value={form.crossesMidnight ? '1' : '0'} onChange={(e) => set('crossesMidnight', e.target.value === '1')}>
                <option value="0">Hayır</option><option value="1">Evet (gece vardiyası)</option>
              </select>
            </Field>
          </div>
          <Field label="Açıklama"><input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        </div>
      </Modal>
    </div>
  );
}
