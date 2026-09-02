import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Bus } from 'lucide-react';
import { routeApi } from '../api/services';
import type { ServiceRoute } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';

const empty = { name: '', description: '', stops: '', departureTime: '', returnTime: '', driverName: '', plateNumber: '', capacity: '27', isActive: true };

export default function ServiceRoutesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRoute | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState('');

  const list = useQuery({ queryKey: ['routes'], queryFn: () => routeApi.list() });
  const save = useMutation({
    mutationFn: (b: any) => (editing ? routeApi.update(editing.id, b) : routeApi.create(b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); setOpen(false); },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => routeApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes'] }),
    onError: (e) => alert(apiError(e)),
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  function openCreate() { setEditing(null); setForm({ ...empty }); setError(''); setOpen(true); }
  function openEdit(r: ServiceRoute) {
    setEditing(r); setError('');
    setForm({ name: r.name, description: r.description || '', stops: r.stops || '', departureTime: r.departureTime || '', returnTime: r.returnTime || '', driverName: r.driverName || '', plateNumber: r.plateNumber || '', capacity: String(r.capacity ?? 27), isActive: r.isActive });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Servis Güzergahları</h2>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Yeni Güzergah</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Henüz güzergah tanımlanmamış." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data!.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Bus className="text-brand-600" size={18} />
                  <h3 className="font-semibold text-slate-800">{r.name}</h3>
                </div>
                <div>
                  <button className="btn-ghost !p-1.5" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                  <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Güzergah silinsin mi?') && remove.mutate(r.id)}><Trash2 size={15} /></button>
                </div>
              </div>
              {r.stops && <p className="text-sm text-slate-600">Duraklar: {r.stops}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-slate-500">
                {r.departureTime && <span>Kalkış: {r.departureTime}</span>}
                {r.returnTime && <span>Dönüş: {r.returnTime}</span>}
                {r.plateNumber && <span>Plaka: {r.plateNumber}</span>}
                {r.driverName && <span>Şoför: {r.driverName}</span>}
              </div>
              <p className="mt-3 text-xs text-slate-400">{r.personnelCount} personel</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Güzergah Düzenle' : 'Yeni Güzergah'}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={() => save.mutate({ ...form, capacity: Number(form.capacity) || 27 })} disabled={save.isPending}>Kaydet</button>
        </>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-4">
          <Field label="Güzergah Adı *"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Duraklar" hint="Virgülle ayırın"><input className="input" value={form.stops} onChange={(e) => set('stops', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kalkış Saati"><input type="time" className="input" value={form.departureTime} onChange={(e) => set('departureTime', e.target.value)} /></Field>
            <Field label="Dönüş Saati"><input type="time" className="input" value={form.returnTime} onChange={(e) => set('returnTime', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Şoför"><input className="input" value={form.driverName} onChange={(e) => set('driverName', e.target.value)} /></Field>
            <Field label="Plaka"><input className="input" value={form.plateNumber} onChange={(e) => set('plateNumber', e.target.value)} /></Field>
          </div>
          <Field label="Araç Kapasitesi (kişi)" hint="Gerekli servis sayısı bu kapasiteye göre hesaplanır"><input type="number" className="input" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
          <Field label="Açıklama"><input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        </div>
      </Modal>
    </div>
  );
}
