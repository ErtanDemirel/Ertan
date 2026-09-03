import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCog, Check, X } from 'lucide-react';
import { contactApi } from '../api/services';
import type { ContactUpdate } from '../api/types';
import { apiError } from '../api/client';
import { Spinner, EmptyState } from '../components/ui';

const FIELDS: { key: keyof ContactUpdate; label: string }[] = [
  { key: 'phoneNumber', label: 'Telefon' },
  { key: 'email', label: 'E-posta' },
  { key: 'address', label: 'Adres' },
  { key: 'emergencyContactName', label: 'Acil durum kişisi' },
  { key: 'emergencyContactPhone', label: 'Acil durum telefonu' },
];

export default function ContactRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('Pending');
  const list = useQuery({ queryKey: ['contact-requests', status], queryFn: () => contactApi.pending(status) });
  const [comments, setComments] = useState<Record<number, string>>({});

  const decide = useMutation({
    mutationFn: ({ id, approve, comment }: { id: number; approve: boolean; comment?: string }) => contactApi.decide(id, approve, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-requests'] }),
    onError: (e) => alert(apiError(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCog className="text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-800">İletişim Güncelleme Talepleri</h2>
        </div>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Pending">Bekleyen</option>
          <option value="Approved">Onaylanan</option>
          <option value="Rejected">Reddedilen</option>
        </select>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? <EmptyState text="Talep yok." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.data!.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-800">{r.personnelName}{r.sicilNo ? ` (${r.sicilNo})` : ''}</div>
                <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {FIELDS.filter((f) => r[f.key]).map((f) => (
                  <div key={String(f.key)} className="flex items-start gap-2 text-sm">
                    <span className="w-36 shrink-0 text-slate-500">{f.label}</span>
                    <span className="font-medium text-slate-800">{String(r[f.key])}</span>
                  </div>
                ))}
                {FIELDS.every((f) => !r[f.key]) && <div className="text-sm text-slate-400">Değişiklik alanı boş.</div>}
              </div>
              {r.status === 'Pending' ? (
                <div className="mt-3 space-y-2">
                  <input className="input" placeholder="Not (opsiyonel)" value={comments[r.id] ?? ''} onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))} />
                  <div className="flex gap-2">
                    <button className="btn-primary flex-1" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, approve: true, comment: comments[r.id] })}><Check size={16} /> Onayla ve uygula</button>
                    <button className="btn-secondary flex-1 !text-red-600" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, approve: false, comment: comments[r.id] })}><X size={16} /> Reddet</button>
                  </div>
                </div>
              ) : (
                <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {r.status === 'Approved' ? 'Onaylandı ve uygulandı' : 'Reddedildi'}{r.handlerComment ? ` — ${r.handlerComment}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
