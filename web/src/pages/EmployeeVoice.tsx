import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare } from 'lucide-react';
import { voiceApi } from '../api/services';
import type { Feedback, FeedbackStatus } from '../api/types';
import { apiError } from '../api/client';
import { Spinner, EmptyState, Modal, Field } from '../components/ui';
import { feedbackStatusMeta, kindLabel } from './self/SelfVoice';

const STATUSES: FeedbackStatus[] = ['New', 'Reviewing', 'Resolved', 'Closed'];

export default function EmployeeVoice() {
  const qc = useQueryClient();
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [edit, setEdit] = useState<Feedback | null>(null);

  const list = useQuery({
    queryKey: ['voice', kind, status],
    queryFn: () => voiceApi.list(kind || undefined, status || undefined),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-800">Çalışan Sesi</h2>
        </div>
        <div className="flex gap-2">
          <select className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Tüm türler</option>
            <option value="Suggestion">Öneri</option>
            <option value="Complaint">Şikayet</option>
            <option value="NearMiss">Ramak kala</option>
            <option value="Request">Dilek / İstek</option>
          </select>
          <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tüm durumlar</option>
            {STATUSES.map((s) => <option key={s} value={s}>{feedbackStatusMeta[s].label}</option>)}
          </select>
        </div>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? <EmptyState text="Kayıt yok." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.data!.map((f) => {
            const sm = feedbackStatusMeta[f.status];
            return (
              <button key={f.id} onClick={() => setEdit(f)} className="card p-4 text-left hover:ring-2 hover:ring-brand-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${f.kind === 'NearMiss' ? 'bg-orange-100 text-orange-700' : 'bg-brand-50 text-brand-700'}`}>{kindLabel(f.kind)}</span>
                    {f.isAnonymous && <span className="badge bg-slate-100 text-slate-500">anonim</span>}
                  </div>
                  <span className={`badge ${sm.cls}`}>{sm.label}</span>
                </div>
                {f.title && <div className="mt-2 font-medium text-slate-800">{f.title}</div>}
                <p className="mt-1 line-clamp-3 text-sm text-slate-600">{f.body}</p>
                {f.location && <div className="mt-1 text-xs text-orange-600">📍 {f.location}</div>}
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{f.isAnonymous ? 'Anonim' : `${f.submitterName ?? '—'}${f.sicilNo ? ` (${f.sicilNo})` : ''}`}</span>
                  <span>{new Date(f.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {edit && <DecideModal item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ['voice'] }); }} />}
    </div>
  );
}

function DecideModal({ item, onClose, onSaved }: { item: Feedback; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [comment, setComment] = useState(item.handlerComment ?? '');
  const save = useMutation({
    mutationFn: () => voiceApi.updateStatus(item.id, status, comment || undefined),
    onSuccess: onSaved,
    onError: (e) => alert(apiError(e)),
  });

  return (
    <Modal open title={`${kindLabel(item.kind)} — #${item.id}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3">
          {item.title && <div className="font-medium text-slate-800">{item.title}</div>}
          <p className="mt-1 text-sm text-slate-600">{item.body}</p>
          {item.location && <div className="mt-2 text-xs text-orange-600">📍 {item.location}</div>}
          <div className="mt-2 text-xs text-slate-400">
            {item.isAnonymous ? 'Anonim gönderim' : `${item.submitterName ?? '—'}${item.sicilNo ? ` (${item.sicilNo})` : ''}`} • {new Date(item.createdAt).toLocaleString('tr-TR')}
          </div>
        </div>
        <Field label="Durum">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as FeedbackStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{feedbackStatusMeta[s].label}</option>)}
          </select>
        </Field>
        <Field label="Yanıt / Not"><textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Vazgeç</button>
          <button className="btn-primary flex-1" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </div>
    </Modal>
  );
}
