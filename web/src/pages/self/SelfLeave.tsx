import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Paperclip } from 'lucide-react';
import { leaveApi, downloadFile } from '../../api/services';
import type { LeaveRequest } from '../../api/types';
import { apiError } from '../../api/client';
import { Field, Spinner, StatusBadge } from '../../components/ui';

const emptyForm = { leaveTypeId: '', title: '', startDate: '', endDate: '', days: '', reason: '' };

export default function SelfLeave() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const types = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() });
  const mine = useQuery({ queryKey: ['leave-my'], queryFn: () => leaveApi.my() });

  const create = useMutation({
    mutationFn: async () => {
      const created = await leaveApi.create({
        leaveTypeId: Number(form.leaveTypeId),
        startDate: form.startDate,
        endDate: form.endDate,
        title: form.title || null,
        reason: form.reason || null,
        days: form.days ? Number(form.days) : null,
      });
      if (file) await leaveApi.uploadAttachment(created.id, file);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-my'] });
      setShowForm(false); setForm({ ...emptyForm }); setFile(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => leaveApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-my'] }),
    onError: (e) => alert(apiError(e)),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  function submit() {
    setError('');
    if (!form.leaveTypeId) return setError('İzin türü seçin.');
    if (!form.startDate || !form.endDate) return setError('Tarihleri seçin.');
    create.mutate();
  }

  const balance = mine.data?.balance;

  return (
    <div className="space-y-4">
      {/* Bakiye */}
      <div className="card bg-brand-600 p-5 text-white">
        <div className="text-sm text-brand-100">Yıllık İzin Bakiyesi</div>
        {balance ? (
          <>
            <div className="text-3xl font-bold">{balance.remainingDays} <span className="text-base font-medium">gün kaldı</span></div>
            <div className="mt-1 text-xs text-brand-100">Hak: {balance.entitledDays} • Kullanılan: {balance.usedDays} • Bekleyen: {balance.pendingDays}</div>
          </>
        ) : <div className="text-sm text-brand-100">Bakiye tanımlı değil.</div>}
      </div>

      <button className="btn-secondary w-full" onClick={() => { setError(''); setShowForm((s) => !s); }}>
        {showForm ? 'Vazgeç' : <><Plus size={16} /> Yeni İzin Talebi</>}
      </button>

      {showForm && (
        <div className="card p-5">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <Field label="İzin Türü *">
              <select className="input" value={form.leaveTypeId} onChange={(e) => set('leaveTypeId', e.target.value)}>
                <option value="">Seçin</option>
                {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}{t.deductsFromAnnual ? ' (yıllıktan düşer)' : ''}</option>)}
              </select>
            </Field>
            <Field label="Talep Başlığı"><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="örn. Yıllık izin talebi" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Başlangıç *"><input type="date" className="input" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
              <Field label="Bitiş *"><input type="date" className="input" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
            </div>
            <Field label="Kullanılan Gün" hint="Boş bırakırsanız hafta sonları hariç otomatik hesaplanır"><input type="number" className="input" value={form.days} onChange={(e) => set('days', e.target.value)} /></Field>
            <Field label="Açıklama"><textarea className="input" rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} /></Field>
            <Field label="Dosya (rapor/foto/PDF)" hint="En fazla 10 MB">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <button className="btn-primary w-full" onClick={submit} disabled={create.isPending}>
              {create.isPending ? 'Gönderiliyor...' : 'Talebi Gönder'}
            </button>
          </div>
        </div>
      )}

      <h3 className="pt-2 text-base font-semibold text-slate-700">Taleplerim</h3>
      {mine.isLoading ? <Spinner /> : (mine.data?.requests.length ?? 0) === 0 ? (
        <p className="text-sm text-slate-400">Henüz izin talebiniz yok.</p>
      ) : (
        <div className="space-y-2">
          {mine.data!.requests.map((r: LeaveRequest) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-800">{r.title || r.leaveTypeName}</div>
                  <div className="text-sm text-slate-500">{r.leaveTypeName} • {r.startDate} → {r.endDate} ({r.totalDays} gün)</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              {r.managerComment && <div className="mt-2 text-xs italic text-slate-400">Amir: {r.managerComment}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {r.attachments?.map((at) => (
                  <button key={at.id} className="btn-secondary !py-1 !text-xs" onClick={() => downloadFile(leaveApi.attachmentUrl(at.id), at.fileName)}>
                    <Paperclip size={12} /> {at.fileName}
                  </button>
                ))}
                {r.status === 'Pending' && (
                  <button className="text-xs text-red-500 hover:underline" onClick={() => cancel.mutate(r.id)}>İptal et</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
