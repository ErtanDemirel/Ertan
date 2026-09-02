import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Pencil, Plus, FileText, Paperclip } from 'lucide-react';
import { leaveApi, personnelApi, downloadFile } from '../api/services';
import type { LeaveRequest, LeaveType } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState, StatusBadge } from '../components/ui';

type Tab = 'pending' | 'all' | 'balances' | 'types';

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

function DecideModal({ request, onClose }: { request: LeaveRequest | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const decide = useMutation({
    mutationFn: (approve: boolean) => leaveApi.decide(request!.id, approve, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-pending'] });
      qc.invalidateQueries({ queryKey: ['leave-all'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      onClose();
    },
    onError: (e) => alert(apiError(e)),
  });
  if (!request) return null;
  return (
    <Modal open onClose={onClose} title="İzin Talebini Değerlendir"
      footer={<>
        <button className="btn-danger" onClick={() => decide.mutate(false)} disabled={decide.isPending}><X size={16} /> Reddet</button>
        <button className="btn-primary !bg-emerald-600 hover:!bg-emerald-700" onClick={() => decide.mutate(true)} disabled={decide.isPending}><Check size={16} /> Onayla</button>
      </>}>
      <div className="space-y-2 text-sm">
        <p><b>Personel:</b> {request.personnelName} ({request.sicilNo})</p>
        {request.title && <p><b>Başlık:</b> {request.title}</p>}
        <p><b>Tür:</b> {request.leaveTypeName} {request.deductsFromAnnual && <span className="badge bg-amber-100 text-amber-700">yıllıktan düşer</span>}</p>
        <p><b>Tarih:</b> {request.startDate} → {request.endDate} ({request.totalDays} gün)</p>
        {request.reason && <p><b>Açıklama:</b> {request.reason}</p>}
        {request.attachments?.length > 0 && (
          <div>
            <b>Ekler:</b>
            <div className="mt-1 flex flex-wrap gap-2">
              {request.attachments.map((at) => (
                <button key={at.id} className="btn-secondary !py-1 !text-xs"
                  onClick={() => downloadFile(leaveApi.attachmentUrl(at.id), at.fileName)}>
                  <Paperclip size={13} /> {at.fileName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4">
        <Field label="Amir Notu (opsiyonel)"><textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function PendingTab() {
  const [selected, setSelected] = useState<LeaveRequest | null>(null);
  const list = useQuery({ queryKey: ['leave-pending'], queryFn: () => leaveApi.pending() });
  if (list.isLoading) return <Spinner />;
  if ((list.data?.length ?? 0) === 0) return <EmptyState text="Onay bekleyen izin talebi yok." />;
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr>
            <th className="th">Personel</th><th className="th">Tür</th><th className="th">Tarih</th>
            <th className="th">Gün</th><th className="th">Talep</th><th className="th text-right">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {list.data!.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td font-medium">{r.personnelName}</td>
                <td className="td">{r.leaveTypeName}</td>
                <td className="td">{r.startDate} → {r.endDate}</td>
                <td className="td">{r.totalDays}</td>
                <td className="td text-slate-400">{new Date(r.requestedAt).toLocaleDateString('tr-TR')}</td>
                <td className="td text-right">
                  <button className="btn-primary !py-1" onClick={() => setSelected(r)}>Değerlendir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DecideModal request={selected} onClose={() => setSelected(null)} />
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
                  <td className="td">{r.totalDays}</td>
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
