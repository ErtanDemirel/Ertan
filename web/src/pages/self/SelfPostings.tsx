import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, MapPin, Users, CalendarClock, Send } from 'lucide-react';
import { postingApi } from '../../api/services';
import type { InternalPosting } from '../../api/types';
import { apiError } from '../../api/client';
import { Spinner } from '../../components/ui';

export const appStatusMeta: Record<string, { label: string; cls: string }> = {
  New: { label: 'Yeni', cls: 'bg-sky-100 text-sky-700' },
  Reviewing: { label: 'İnceleniyor', cls: 'bg-amber-100 text-amber-700' },
  Interview: { label: 'Görüşme', cls: 'bg-indigo-100 text-indigo-700' },
  Offered: { label: 'Teklif', cls: 'bg-violet-100 text-violet-700' },
  Hired: { label: 'Alındı', cls: 'bg-emerald-100 text-emerald-700' },
  Rejected: { label: 'Reddedildi', cls: 'bg-red-100 text-red-600' },
};

export default function SelfPostings() {
  const qc = useQueryClient();
  const postings = useQuery({ queryKey: ['postings'], queryFn: () => postingApi.list(false) });
  const mine = useQuery({ queryKey: ['postings-mine'], queryFn: () => postingApi.myApplications() });
  const [applyTo, setApplyTo] = useState<InternalPosting | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const apply = useMutation({
    mutationFn: () => postingApi.apply(applyTo!.id, note || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['postings'] }); qc.invalidateQueries({ queryKey: ['postings-mine'] }); setApplyTo(null); setNote(''); },
    onError: (e) => setError(apiError(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="text-brand-600" />
        <h2 className="text-lg font-semibold text-slate-800">İç İlanlar</h2>
      </div>

      {postings.isLoading ? <Spinner /> : (postings.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-slate-400">Şu an açık iç ilan yok.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {postings.data!.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="font-semibold text-slate-800">{p.title}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                {p.department && <span>🏢 {p.department}</span>}
                {p.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{p.location}</span>}
                {p.positionCount != null && <span className="inline-flex items-center gap-1"><Users size={12} />{p.positionCount} kişi</span>}
                {p.deadline && <span className="inline-flex items-center gap-1"><CalendarClock size={12} />son {new Date(p.deadline).toLocaleDateString('tr-TR')}</span>}
              </div>
              {p.description && <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.description}</p>}
              <div className="mt-3">
                {p.alreadyApplied ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">Başvuruldu <span className={`badge ${appStatusMeta[p.myStatus ?? 'New']?.cls}`}>{appStatusMeta[p.myStatus ?? 'New']?.label}</span></div>
                ) : (
                  <button className="btn-primary w-full" onClick={() => { setError(''); setApplyTo(p); }}><Send size={15} /> Başvur</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {applyTo && (
        <div className="card space-y-3 p-5">
          <div className="font-medium text-slate-800">Başvuru — {applyTo.title}</div>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <textarea className="input" rows={3} placeholder="Neden bu pozisyona uygunsunuz? (opsiyonel)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setApplyTo(null)}>Vazgeç</button>
            <button className="btn-primary flex-1" onClick={() => apply.mutate()} disabled={apply.isPending}>{apply.isPending ? 'Gönderiliyor...' : 'Başvuruyu gönder'}</button>
          </div>
        </div>
      )}

      <h3 className="pt-2 text-sm font-semibold text-slate-600">Başvurularım</h3>
      {mine.isLoading ? <Spinner /> : (mine.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-slate-400">Henüz başvurunuz yok.</p>
      ) : (
        <div className="space-y-2">
          {mine.data!.map((a) => {
            const sm = appStatusMeta[a.status];
            return (
              <div key={a.id} className="card flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-slate-800">{a.postingTitle}</div>
                  <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString('tr-TR')}</div>
                  {a.handlerComment && <div className="mt-1 text-xs italic text-slate-500">İK: {a.handlerComment}</div>}
                </div>
                <span className={`badge ${sm?.cls}`}>{sm?.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
