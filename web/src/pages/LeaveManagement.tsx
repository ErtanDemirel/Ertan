import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Pencil, Plus, FileText } from 'lucide-react';
import { leaveApi, personnelApi, downloadFile, approvalApi } from '../api/services';
import type { LeaveType, PendingApproval } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState, StatusBadge } from '../components/ui';

type Tab = 'pending' | 'all' | 'balances' | 'types';

const stepStatusColor: Record<string, string> = {
  Approved: 'text-emerald-600', Rejected: 'text-red-600', Pending: 'text-amber-600', Skipped: 'text-slate-400',
};

export default function LeaveManagement() {
  const [tab, setTab] = useState<Tab>('pending');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'pending', label: 'Onay Bekleyenler' },
    { key: 'all', label: 'Tüm Talepler' },
    { key: 'balances', label: 'İzin Bakiyeleri' },
    { key: 'types', label: 'İzin Türleri' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">İzin Yönetimi</h2>
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingTab />}
      {tab === 'all' && <AllTab />}
      {tab === 'balances' && <BalancesTab />}
      {tab === 'types' && <TypesTab />}
    </div>
  );
}

function DecideModal({ item, onClose }: { item: PendingApproval | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const decide = useMutation({
    mutationFn: (approve: boolean) => approvalApi.decide(item!.approvalRequestId, approve, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals-pending'] });
      qc.invalidateQueries({ queryKey: ['leave-all'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      qc.invalidateQueries({ queryKey: ['dash-pending'] });
      onClose();
    },
    onError: (e) => alert(apiError(e)),
  });
  if (!item) return null;
  return (
    <Modal open onClose={onClose} title={`${item.kindLabel} Talebini Değerlendir`} wide
      footer={<>
        <button className="btn-danger" onClick={() => decide.mutate(false)} disabled={decide.isPending}><X size={16} /> Reddet</button>
        <button className="btn-primary !bg-emerald-600 hover:!bg-emerald-700" onClick={() => decide.mutate(true)} disabled={decide.isPending}><Check size={16} /> Onayla</button>
      </>}>
      <div className="space-y-2 text-sm">
        <p><b>Personel:</b> {item.requesterName} ({item.sicilNo})</p>
        <p><b>Tür:</b> <span className="badge bg-slate-100 text-slate-600">{item.kindLabel}</span></p>
        {item.title && <p><b>Başlık:</b> {item.title}</p>}
        <p><b>Özet:</b> {item.summary}</p>
      </div>

      {/* Onay zinciri road-map */}
      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Onay Zinciri</div>
        <ol className="space-y-1.5">
          {item.steps.map((s) => (
            <li key={s.order} className="flex items-center gap-2 text-sm">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                s.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : s.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
              }`}>{s.order}</span>
              <span className="font-medium text-slate-700">{s.label}</span>
              <span className="text-slate-400">{s.approverName || '-'}</span>
              {s.infoOnly && <span className="badge bg-blue-100 text-blue-700">bilgi</span>}
              <span className={`ml-auto text-xs font-medium ${stepStatusColor[s.status] ?? ''}`}>
                {s.status === 'Approved' ? '✓ onayladı' : s.status === 'Rejected' ? '✕ reddetti' : s.status === 'Pending' ? 'bekliyor' : 'atlandı'}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4">
        <Field label="Not (opsiyonel)"><textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function PendingTab() {
  const [selected, setSelected] = useState<PendingApproval | null>(null);
  const list = useQuery({ queryKey: ['approvals-pending'], queryFn: () => approvalApi.pending() });
  if (list.isLoading) return <Spinner />;
  if ((list.data?.length ?? 0) === 0) return <EmptyState text="Onayınızı bekleyen talep yok." />;
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr>
            <th className="th">Personel</th><th className="th">Tür</th><th className="th">Özet</th>
            <th className="th">Adım</th><th className="th">Tarih</th><th className="th text-right">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.data!.map((r) => (
              <tr key={r.approvalRequestId} className="hover:bg-slate-50">
                <td className="td font-medium">{r.requesterName}</td>
                <td className="td"><span className="badge bg-slate-100 text-slate-600">{r.kindLabel}</span></td>
                <td className="td">{r.title ? `${r.title} — ` : ''}{r.summary}</td>
                <td className="td text-slate-500">{r.currentStepLabel}</td>
                <td className="td text-slate-400">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</td>
                <td className="td text-right">
                  <button className="btn-primary !py-1" onClick={() => setSelected(r)}>Değerlendir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DecideModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function AllTab() {
  const [status, setStatus] = useState('');
  const list = useQuery({ queryKey: ['leave-all', status], queryFn: () => leaveApi.requests(status || undefined) });
  return (
    <div className="space-y-3">
      <select className="input max-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Tüm Durumlar</option>
        <option value="Pending">Bekleyen</option>
        <option value="Approved">Onaylanan</option>
        <option value="Rejected">Reddedilen</option>
        <option value="Cancelled">İptal</option>
      </select>
      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? <EmptyState text="Kayıt yok." /> : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="th">Personel</th><th className="th">Tür</th><th className="th">Tarih</th>
              <th className="th">Gün</th><th className="th">Durum</th><th className="th">Amir</th><th className="th text-right">Belge</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.data!.map((r) => (
                <tr key={r.id}>
                  <td className="td font-medium">{r.personnelName}</td>
                  <td className="td">{r.leaveTypeName}</td>
                  <td className="td">{r.startDate} → {r.endDate}</td>
                  <td className="td">{r.totalDays}{r.halfDay === 'Morning' ? ' (½ ÖÖ)' : r.halfDay === 'Afternoon' ? ' (½ ÖS)' : ''}</td>
                  <td className="td"><StatusBadge status={r.status} /></td>
                  <td className="td">{r.approverName || '-'}</td>
                  <td className="td text-right">
                    {r.status === 'Approved' && (
                      <button className="btn-secondary !py-1 !text-xs" title="İzin belgesi (Word)"
                        onClick={() => downloadFile(leaveApi.documentUrl(r.id), `izin-belgesi-${r.id}.docx`)}>
                        <FileText size={14} /> Word
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BalancesTab() {
  const qc = useQueryClient();
  const year = new Date().getFullYear();
  const list = useQuery({ queryKey: ['leave-balances', year], queryFn: () => leaveApi.balances(year) });
  const people = useQuery({ queryKey: ['bal-people'], queryFn: () => personnelApi.list({ pageSize: 200 }) });
  const [edit, setEdit] = useState<{ personnelId: number; name: string; days: string } | null>(null);
  const save = useMutation({
    mutationFn: () => leaveApi.setBalance({ personnelId: edit!.personnelId, year, entitledDays: Number(edit!.days) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-balances'] }); setEdit(null); },
    onError: (e) => alert(apiError(e)),
  });

  if (list.isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <select
          className="input max-w-[260px]"
          onChange={(e) => {
            const p = people.data?.items.find((x) => x.id === Number(e.target.value));
            if (p) setEdit({ personnelId: p.id, name: p.fullName, days: '14' });
          }}
          value=""
        >
          <option value="">+ Personele bakiye tanımla</option>
          {people.data?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr>
            <th className="th">Personel</th><th className="th">Yıl</th><th className="th">Hak</th>
            <th className="th">Kullanılan</th><th className="th">Bekleyen</th><th className="th">Kalan</th><th className="th text-right"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(list.data ?? []).map((b) => (
              <tr key={b.personnelId}>
                <td className="td font-medium">{b.personnelName}</td>
                <td className="td">{b.year}</td>
                <td className="td">{b.entitledDays}</td>
                <td className="td">{b.usedDays}</td>
                <td className="td">{b.pendingDays}</td>
                <td className="td font-semibold text-emerald-700">{b.remainingDays}</td>
                <td className="td text-right">
                  <button className="btn-ghost !p-1.5" onClick={() => setEdit({ personnelId: b.personnelId, name: b.personnelName, days: String(b.entitledDays) })}><Pencil size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={`Bakiye - ${edit.name}`}
          footer={<>
            <button className="btn-secondary" onClick={() => setEdit(null)}>Vazgeç</button>
            <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</button>
          </>}>
          <Field label={`${year} yılı yıllık izin hakkı (gün)`}>
            <input type="number" className="input" value={edit.days} onChange={(e) => setEdit({ ...edit, days: e.target.value })} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

function TypesTab() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['leave-types'], queryFn: () => leaveApi.types() });
  const [edit, setEdit] = useState<Partial<LeaveType> | null>(null);
  const save = useMutation({
    mutationFn: () => edit?.id ? leaveApi.updateType(edit.id, edit) : leaveApi.createType(edit),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); setEdit(null); },
    onError: (e) => alert(apiError(e)),
  });

  if (list.isLoading) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEdit({ name: '', deductsFromAnnual: false, isPaid: true, isActive: true })}><Plus size={16} /> Yeni Tür</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr>
            <th className="th">Tür</th><th className="th">Yıllıktan Düşer</th><th className="th">Ücretli</th><th className="th">Durum</th><th className="th text-right"></th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.data!.map((t) => (
              <tr key={t.id}>
                <td className="td font-medium">{t.name}</td>
                <td className="td">{t.deductsFromAnnual ? 'Evet' : 'Hayır'}</td>
                <td className="td">{t.isPaid ? 'Evet' : 'Hayır'}</td>
                <td className="td"><span className={`badge ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t.isActive ? 'Aktif' : 'Pasif'}</span></td>
                <td className="td text-right"><button className="btn-ghost !p-1.5" onClick={() => setEdit(t)}><Pencil size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? 'İzin Türü Düzenle' : 'Yeni İzin Türü'}
          footer={<>
            <button className="btn-secondary" onClick={() => setEdit(null)}>Vazgeç</button>
            <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</button>
          </>}>
          <div className="space-y-3">
            <Field label="Tür Adı *"><input className="input" value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.deductsFromAnnual} onChange={(e) => setEdit({ ...edit, deductsFromAnnual: e.target.checked })} /> Yıllık izin bakiyesinden düşülsün</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.isPaid ?? true} onChange={(e) => setEdit({ ...edit, isPaid: e.target.checked })} /> Ücretli izin</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Aktif</label>
          </div>
        </Modal>
      )}
    </div>
  );
}
