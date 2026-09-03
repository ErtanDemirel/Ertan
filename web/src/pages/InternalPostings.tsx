import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus, Users, Lock, Unlock } from 'lucide-react';
import { postingApi } from '../api/services';
import type { AppStatus, InternalPosting } from '../api/types';
import { apiError } from '../api/client';
import { Spinner, EmptyState, Modal, Field } from '../components/ui';
import { appStatusMeta } from './self/SelfPostings';

const STATUSES: AppStatus[] = ['New', 'Reviewing', 'Interview', 'Offered', 'Hired', 'Rejected'];

export default function InternalPostings() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['postings-admin'], queryFn: () => postingApi.list(true) });
  const [showCreate, setShowCreate] = useState(false);
  const [applicantsOf, setApplicantsOf] = useState<InternalPosting | null>(null);

  const toggle = useMutation({
    mutationFn: (p: InternalPosting) => postingApi.update(p.id, {
      title: p.title, description: p.description, department: p.department, location: p.location,
      positionCount: p.positionCount, deadline: p.deadline, isActive: !p.isActive,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['postings-admin'] }),
    onError: (e) => alert(apiError(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Briefcase className="text-brand-600" /><h2 className="text-lg font-semibold text-slate-800">İç İlanlar</h2></div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Yeni İlan</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? <EmptyState text="Henüz ilan yok." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.data!.map((p) => (
            <div key={p.id} className={`card p-4 ${!p.isActive ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{p.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[p.department, p.location, p.positionCount != null ? `${p.positionCount} kişi` : null, p.deadline ? `son ${new Date(p.deadline).toLocaleDateString('tr-TR')}` : null].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <span className={`badge ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{p.isActive ? 'Açık' : 'Kapalı'}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setApplicantsOf(p)}><Users size={15} /> Başvurular ({p.applicantCount})</button>
                <button className="btn-secondary" onClick={() => toggle.mutate(p)}>{p.isActive ? <><Lock size={15} /> Kapat</> : <><Unlock size={15} /> Aç</>}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['postings-admin'] }); }} />}
      {applicantsOf && <ApplicantsModal posting={applicantsOf} onClose={() => setApplicantsOf(null)} />}
    </div>
  );
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', department: '', location: '', positionCount: '', deadline: '' });
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => postingApi.create({
      title: form.title, description: form.description || undefined, department: form.department || undefined,
      location: form.location || undefined, positionCount: form.positionCount ? Number(form.positionCount) : undefined,
      deadline: form.deadline || undefined, isActive: true,
    }),
    onSuccess: onDone,
    onError: (e) => setError(apiError(e)),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open title="Yeni İç İlan" onClose={onClose}>
      <div className="space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <Field label="Başlık *"><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Departman"><input className="input" value={form.department} onChange={(e) => set('department', e.target.value)} /></Field>
          <Field label="Lokasyon"><input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kişi sayısı"><input type="number" className="input" value={form.positionCount} onChange={(e) => set('positionCount', e.target.value)} /></Field>
          <Field label="Son başvuru"><input type="date" className="input" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} /></Field>
        </div>
        <Field label="Açıklama"><textarea className="input" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <button className="btn-primary w-full" disabled={!form.title || save.isPending} onClick={() => { setError(''); save.mutate(); }}>{save.isPending ? 'Kaydediliyor...' : 'İlanı Yayınla'}</button>
      </div>
    </Modal>
  );
}

function ApplicantsModal({ posting, onClose }: { posting: InternalPosting; onClose: () => void }) {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ['posting-apps', posting.id], queryFn: () => postingApi.applications(posting.id) });
  const [comments, setComments] = useState<Record<number, string>>({});
  const decide = useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: string; comment?: string }) => postingApi.decide(id, status, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posting-apps', posting.id] }); qc.invalidateQueries({ queryKey: ['postings-admin'] }); },
    onError: (e) => alert(apiError(e)),
  });

  return (
    <Modal open wide title={`Başvurular — ${posting.title}`} onClose={onClose}>
      {apps.isLoading ? <Spinner /> : (apps.data?.length ?? 0) === 0 ? <EmptyState text="Henüz başvuru yok." /> : (
        <div className="space-y-3">
          {apps.data!.map((a) => {
            const sm = appStatusMeta[a.status];
            return (
              <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-800">{a.personnelName}{a.sicilNo ? ` (${a.sicilNo})` : ''}{a.department ? ` — ${a.department}` : ''}</div>
                  <span className={`badge ${sm?.cls}`}>{sm?.label}</span>
                </div>
                {a.note && <p className="mt-1 text-sm text-slate-600">{a.note}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select className="input !w-auto" value={a.status} onChange={(e) => decide.mutate({ id: a.id, status: e.target.value, comment: comments[a.id] })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{appStatusMeta[s].label}</option>)}
                  </select>
                  <input className="input flex-1" placeholder="Not (opsiyonel)" value={comments[a.id] ?? a.handlerComment ?? ''} onChange={(e) => setComments((c) => ({ ...c, [a.id]: e.target.value }))} />
                  <button className="btn-secondary" onClick={() => decide.mutate({ id: a.id, status: a.status, comment: comments[a.id] })}>Notu kaydet</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
