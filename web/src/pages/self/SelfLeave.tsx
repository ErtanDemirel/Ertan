import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Paperclip } from 'lucide-react';
import { leaveApi, requestApi, downloadFile } from '../../api/services';
import type { LeaveRequest } from '../../api/types';
import { apiError } from '../../api/client';
import { Field, Spinner, StatusBadge } from '../../components/ui';

type Tab = 'leave' | 'advance' | 'expense';

export default function SelfRequests() {
  const [tab, setTab] = useState<Tab>('leave');
  const tabs: { k: Tab; label: string }[] = [
    { k: 'leave', label: 'İzin' }, { k: 'advance', label: 'Avans' }, { k: 'expense', label: 'Masraf' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Taleplerim</h2>
      <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === t.k ? 'bg-white text-brand-700 shadow' : 'text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'leave' && <LeaveTab />}
      {tab === 'advance' && <AdvanceTab />}
      {tab === 'expense' && <ExpenseTab />}
    </div>
  );
}

// ---------------- İzin ----------------
type HalfDay = 'None' | 'Morning' | 'Afternoon';
const emptyLeave = { leaveTypeId: '', title: '', startDate: '', endDate: '', days: '', reason: '', halfDay: 'None' as HalfDay };
function LeaveTab() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ ...emptyLeave });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const types = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() });
  const mine = useQuery({ queryKey: ['leave-my'], queryFn: () => leaveApi.my() });

  // Yarım gün yalnızca tek günlük izinlerde (başlangıç = bitiş) geçerlidir.
  const singleDay = !!form.startDate && form.startDate === form.endDate;
  const isHalf = singleDay && form.halfDay !== 'None';

  const create = useMutation({
    mutationFn: async () => {
      const created = await leaveApi.create({
        leaveTypeId: Number(form.leaveTypeId), startDate: form.startDate, endDate: form.endDate,
        title: form.title || null, reason: form.reason || null,
        days: isHalf ? null : (form.days ? Number(form.days) : null),
        halfDay: isHalf ? form.halfDay : null,
      });
      if (file) await leaveApi.uploadAttachment(created.id, file);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-my'] }); setShow(false); setForm({ ...emptyLeave }); setFile(null); },
    onError: (e) => setError(apiError(e)),
  });
  const cancel = useMutation({ mutationFn: (id: number) => leaveApi.cancel(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-my'] }), onError: (e) => alert(apiError(e)) });
  const set = (k: string, v: string) => setForm((f) => {
    const next = { ...f, [k]: v };
    // Başlangıç seçilince bitiş boşsa aynı güne çek (tek gün + yarım gün kolaylığı)
    if (k === 'startDate' && !f.endDate) next.endDate = v;
    // Aralık tek gün değilse yarım gün seçimini sıfırla
    const single = !!next.startDate && next.startDate === next.endDate;
    if (!single) next.halfDay = 'None';
    return next;
  });
  const balance = mine.data?.balance;

  return (
    <div className="space-y-4">
      <div className="card bg-brand-600 p-5 text-white">
        <div className="text-sm text-brand-100">Yıllık İzin Bakiyesi</div>
        {balance ? (
          <>
            <div className="text-3xl font-bold">{balance.remainingDays} <span className="text-base font-medium">gün kaldı</span></div>
            <div className="mt-1 text-xs text-brand-100">Hak: {balance.entitledDays} • Kullanılan: {balance.usedDays} • Bekleyen: {balance.pendingDays}</div>
          </>
        ) : <div className="text-sm text-brand-100">Bakiye tanımlı değil.</div>}
      </div>
      <button className="btn-secondary w-full" onClick={() => { setError(''); setShow((s) => !s); }}>{show ? 'Vazgeç' : <><Plus size={16} /> Yeni İzin Talebi</>}</button>
      {show && (
        <div className="card p-5">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <Field label="İzin Türü *">
              <select className="input" value={form.leaveTypeId} onChange={(e) => set('leaveTypeId', e.target.value)}>
                <option value="">Seçin</option>
                {types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}{t.deductsFromAnnual ? ' (yıllıktan düşer)' : ''}</option>)}
              </select>
            </Field>
            <Field label="Talep Başlığı"><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Başlangıç *"><input type="date" className="input" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
              <Field label="Bitiş *"><input type="date" className="input" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
            </div>
            {singleDay && (
              <Field label="Süre" hint="Tek günlük izinde yarım gün seçebilirsiniz (0,5 gün)">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => set('halfDay', 'None')}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${form.halfDay === 'None' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}>Tam gün</button>
                  <button type="button" onClick={() => set('halfDay', 'Morning')}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${form.halfDay === 'Morning' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}>Yarım gün · Öğleden önce</button>
                  <button type="button" onClick={() => set('halfDay', 'Afternoon')}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${form.halfDay === 'Afternoon' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}>Yarım gün · Öğleden sonra</button>
                </div>
              </Field>
            )}
            {isHalf ? (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">Yarım gün izin: <strong>0,5 gün</strong> olarak sayılır.</div>
            ) : (
              <Field label="Kullanılan Gün" hint="Boşsa hafta sonu + resmî tatil hariç otomatik hesaplanır"><input type="number" className="input" value={form.days} onChange={(e) => set('days', e.target.value)} /></Field>
            )}
            <Field label="Açıklama"><textarea className="input" rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} /></Field>
            <Field label="Dosya (rapor/foto/PDF)"><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
            <button className="btn-primary w-full" onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? 'Gönderiliyor...' : 'Gönder'}</button>
          </div>
        </div>
      )}
      {mine.isLoading ? <Spinner /> : (mine.data?.requests.length ?? 0) === 0 ? <p className="text-sm text-slate-400">İzin talebiniz yok.</p> : (
        <div className="space-y-2">
          {mine.data!.requests.map((r: LeaveRequest) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div><div className="font-medium text-slate-800">{r.title || r.leaveTypeName}</div>
                  <div className="text-sm text-slate-500">{r.leaveTypeName} • {r.startDate} → {r.endDate} ({r.totalDays} gün{r.halfDay === 'Morning' ? ' · yarım gün ÖÖ' : r.halfDay === 'Afternoon' ? ' · yarım gün ÖS' : ''})</div></div>
                <StatusBadge status={r.status} />
              </div>
              {r.managerComment && <div className="mt-2 text-xs italic text-slate-400">Not: {r.managerComment}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {r.attachments?.map((at) => (
                  <button key={at.id} className="btn-secondary !py-1 !text-xs" onClick={() => downloadFile(leaveApi.attachmentUrl(at.id), at.fileName)}><Paperclip size={12} /> {at.fileName}</button>
                ))}
                {r.status === 'Pending' && <button className="text-xs text-red-500 hover:underline" onClick={() => cancel.mutate(r.id)}>İptal et</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Avans ----------------
function AdvanceTab() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const mine = useQuery({ queryKey: ['requests-my'], queryFn: () => requestApi.my() });
  const create = useMutation({
    mutationFn: () => requestApi.createAdvance(Number(amount), reason || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests-my'] }); setShow(false); setAmount(''); setReason(''); },
    onError: (e) => alert(apiError(e)),
  });
  return (
    <div className="space-y-4">
      <button className="btn-secondary w-full" onClick={() => setShow((s) => !s)}>{show ? 'Vazgeç' : <><Plus size={16} /> Yeni Avans Talebi</>}</button>
      {show && (
        <div className="card space-y-3 p-5">
          <Field label="Tutar (₺) *"><input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Açıklama"><textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <button className="btn-primary w-full" onClick={() => create.mutate()} disabled={create.isPending || !amount}>Gönder</button>
        </div>
      )}
      {mine.isLoading ? <Spinner /> : (mine.data?.advances.length ?? 0) === 0 ? <p className="text-sm text-slate-400">Avans talebiniz yok.</p> : (
        <div className="space-y-2">
          {mine.data!.advances.map((a) => (
            <div key={a.id} className="card flex items-center justify-between p-4">
              <div><div className="font-semibold text-slate-800">{a.amount.toLocaleString('tr-TR')} ₺</div>
                {a.reason && <div className="text-sm text-slate-500">{a.reason}</div>}
                {a.managerComment && <div className="text-xs italic text-slate-400">Not: {a.managerComment}</div>}</div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Masraf ----------------
function ExpenseTab() {
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ amount: '', title: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const mine = useQuery({ queryKey: ['requests-my'], queryFn: () => requestApi.my() });
  const create = useMutation({
    mutationFn: () => requestApi.createExpense({ amount: Number(form.amount), title: form.title || undefined, description: form.description || undefined, file: file || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests-my'] }); setShow(false); setForm({ amount: '', title: '', description: '' }); setFile(null); },
    onError: (e) => alert(apiError(e)),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <button className="btn-secondary w-full" onClick={() => setShow((s) => !s)}>{show ? 'Vazgeç' : <><Plus size={16} /> Yeni Masraf Talebi</>}</button>
      {show && (
        <div className="card space-y-3 p-5">
          <Field label="Tutar (₺) *"><input type="number" className="input" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
          <Field label="Başlık"><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Açıklama"><textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <Field label="Fiş / Fatura (PDF/foto)"><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
          <button className="btn-primary w-full" onClick={() => create.mutate()} disabled={create.isPending || !form.amount}>Gönder</button>
        </div>
      )}
      {mine.isLoading ? <Spinner /> : (mine.data?.expenses.length ?? 0) === 0 ? <p className="text-sm text-slate-400">Masraf talebiniz yok.</p> : (
        <div className="space-y-2">
          {mine.data!.expenses.map((e) => (
            <div key={e.id} className="card flex items-center justify-between p-4">
              <div><div className="font-semibold text-slate-800">{e.title || 'Masraf'} — {e.amount.toLocaleString('tr-TR')} ₺</div>
                {e.description && <div className="text-sm text-slate-500">{e.description}</div>}
                {e.hasFile && <button className="mt-1 text-xs text-brand-600 hover:underline" onClick={() => downloadFile(requestApi.expenseFileUrl(e.id), 'belge')}>Belgeyi indir</button>}</div>
              <StatusBadge status={e.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
