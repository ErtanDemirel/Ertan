import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Download, History, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { applicationApi, downloadFile } from '../api/services';
import type { JobApplication } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';

const statusLabels: Record<string, string> = {
  New: 'Yeni', Reviewing: 'İnceleniyor', Interview: 'Mülakat', Offered: 'Teklif', Hired: 'İşe Alındı', Rejected: 'Reddedildi',
};
const statusColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700', Reviewing: 'bg-amber-100 text-amber-700',
  Interview: 'bg-indigo-100 text-indigo-700', Offered: 'bg-purple-100 text-purple-700',
  Hired: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700',
};

export default function CandidatesPage() {
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const list = useQuery({ queryKey: ['applications', status], queryFn: () => applicationApi.list(status || undefined) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Aday Yönetimi</h2>
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Başvuru bulunamadı." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="th">Aday</th><th className="th">Pozisyon</th><th className="th">Telefon</th>
              <th className="th">Deneyim</th><th className="th">Tarih</th><th className="th">Durum</th><th className="th"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.data!.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{a.fullName}</td>
                  <td className="td">{a.position || '-'}</td>
                  <td className="td">{a.phone || '-'}</td>
                  <td className="td">{a.experienceYears != null ? `${a.experienceYears} yıl` : '-'}</td>
                  <td className="td text-slate-400">{new Date(a.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td className="td"><span className={`badge ${statusColors[a.status]}`}>{statusLabels[a.status] ?? a.status}</span></td>
                  <td className="td text-right"><button className="btn-secondary !py-1" onClick={() => setSelectedId(a.id)}>Detay</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && <CandidateDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function CandidateDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ['application', id], queryFn: () => applicationApi.get(id) });
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');

  const save = useMutation({
    mutationFn: () => applicationApi.updateStatus(id, status || detail.data!.status, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application', id] });
      onClose();
    },
    onError: (e) => alert(apiError(e)),
  });

  const a = detail.data;
  const prior = a?.priorEmployment;

  return (
    <Modal open onClose={onClose} title={a ? a.fullName : 'Aday'} wide
      footer={a ? <>
        <select className="input max-w-[170px]" value={status || a.status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Durumu Kaydet</button>
      </> : undefined}>
      {detail.isLoading || !a ? <Spinner /> : (
        <div className="space-y-4">
          {/* Geçmiş çalışma uyarısı */}
          {prior?.workedBefore ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <History size={18} /> Daha önce bünyemizde çalışmış
              </div>
              <div className="mt-2 grid gap-1 text-sm text-amber-800 sm:grid-cols-2">
                <span>Sicil: <b>{prior.sicilNo}</b></span>
                <span>Ad: <b>{prior.name}</b></span>
                <span>Giriş: {prior.hireDate ? new Date(prior.hireDate).toLocaleDateString('tr-TR') : '-'}</span>
                <span>Çıkış: {prior.exitDate ? new Date(prior.exitDate).toLocaleDateString('tr-TR') : (prior.currentlyEmployed ? 'Halen çalışıyor' : '-')}</span>
                <span>Süre: {prior.totalMonths != null ? `${prior.totalMonths} ay` : '-'}</span>
                {prior.exitReason && <span>Çıkış nedeni: {prior.exitReason}</span>}
              </div>
              {prior.currentlyEmployed && (
                <div className="mt-2 flex items-center gap-1 text-sm font-medium text-red-600">
                  <AlertTriangle size={15} /> Bu kişi halen aktif personel!
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> Geçmiş çalışma kaydı bulunamadı (yeni aday).
            </div>
          )}

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="T.C. Kimlik" value={a.nationalId} />
            <Info label="Telefon" value={a.phone} />
            <Info label="E-posta" value={a.email} />
            <Info label="Doğum Tarihi" value={a.birthDate ? new Date(a.birthDate).toLocaleDateString('tr-TR') : null} />
            <Info label="Pozisyon" value={a.position} />
            <Info label="Öğrenim" value={a.education} />
            <Info label="Deneyim" value={a.experienceYears != null ? `${a.experienceYears} yıl` : null} />
            <Info label="Önceki İş Yeri" value={a.previousWorkplace} />
            <div className="sm:col-span-2"><Info label="Adres" value={a.address} /></div>
            <div className="sm:col-span-2"><Info label="Notlar" value={a.notes} /></div>
          </div>

          {a.hasCv && (
            <button className="btn-secondary" onClick={() => downloadFile(applicationApi.cvUrl(a.id), 'cv')}>
              <Download size={16} /> CV'yi indir
            </button>
          )}

          <Field label="İK Notu"><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={a.reviewNote || ''} /></Field>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><span className="text-slate-400">{label}:</span> <span className="font-medium text-slate-700">{value || '-'}</span></div>;
}
