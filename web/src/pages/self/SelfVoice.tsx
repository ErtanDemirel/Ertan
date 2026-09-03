import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, AlertCircle, TriangleAlert, MessageSquare, Send } from 'lucide-react';
import { voiceApi } from '../../api/services';
import type { Feedback, FeedbackKind } from '../../api/types';
import { apiError } from '../../api/client';
import { Field, Spinner } from '../../components/ui';

const KINDS: { key: FeedbackKind; label: string; icon: any; desc: string; cls: string }[] = [
  { key: 'Suggestion', label: 'Öneri', icon: Lightbulb, desc: 'İyileştirme fikri', cls: 'text-amber-600 bg-amber-50' },
  { key: 'Complaint', label: 'Şikayet', icon: AlertCircle, desc: 'Sorun bildir', cls: 'text-red-600 bg-red-50' },
  { key: 'NearMiss', label: 'Ramak kala', icon: TriangleAlert, desc: 'İş güvenliği', cls: 'text-orange-600 bg-orange-50' },
  { key: 'Request', label: 'Dilek / İstek', icon: MessageSquare, desc: 'Talebini ilet', cls: 'text-brand-600 bg-brand-50' },
];

export const feedbackStatusMeta: Record<string, { label: string; cls: string }> = {
  New: { label: 'Yeni', cls: 'bg-sky-100 text-sky-700' },
  Reviewing: { label: 'İnceleniyor', cls: 'bg-amber-100 text-amber-700' },
  Resolved: { label: 'Çözüldü', cls: 'bg-emerald-100 text-emerald-700' },
  Closed: { label: 'Kapatıldı', cls: 'bg-slate-100 text-slate-500' },
};

export function kindLabel(k: FeedbackKind) { return KINDS.find((x) => x.key === k)?.label ?? k; }

export default function SelfVoice() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [form, setForm] = useState({ title: '', body: '', location: '' });
  const [anon, setAnon] = useState(false);
  const [error, setError] = useState('');

  const mine = useQuery({ queryKey: ['voice-my'], queryFn: () => voiceApi.my() });
  const create = useMutation({
    mutationFn: () => voiceApi.create({ kind: kind!, title: form.title || undefined, body: form.body, location: form.location || undefined, isAnonymous: anon }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['voice-my'] }); setKind(null); setForm({ title: '', body: '', location: '' }); setAnon(false); },
    onError: (e) => setError(apiError(e)),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Çalışan Sesi</h2>
        <p className="text-sm text-slate-500">Fikrini, sorununu veya iş güvenliği gözlemini paylaş. İstersen anonim gönder.</p>
      </div>

      {!kind ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {KINDS.map((k) => (
            <button key={k.key} onClick={() => { setError(''); setKind(k.key); }} className="card flex items-center gap-3 p-4 text-left hover:ring-2 hover:ring-brand-200">
              <div className={`rounded-lg p-2.5 ${k.cls}`}><k.icon size={22} /></div>
              <div><div className="font-semibold text-slate-800">{k.label}</div><div className="text-sm text-slate-500">{k.desc}</div></div>
            </button>
          ))}
        </div>
      ) : (
        <div className="card space-y-3 p-5">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <button className="text-sm font-medium text-brand-600" onClick={() => setKind(null)}>← {kindLabel(kind)}</button>
          <Field label="Başlık"><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
          {kind === 'NearMiss' && (
            <Field label="Olay yeri"><input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Örn. 2. hat pres bölgesi" /></Field>
          )}
          <Field label="Açıklama *"><textarea className="input" rows={4} value={form.body} onChange={(e) => set('body', e.target.value)} /></Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 rounded" />
            Anonim gönder (adım kayda geçmesin)
          </label>
          <button className="btn-primary w-full" onClick={() => create.mutate()} disabled={!form.body.trim() || create.isPending}>
            <Send size={16} /> {create.isPending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </div>
      )}

      <h3 className="pt-2 text-sm font-semibold text-slate-600">Gönderdiklerim</h3>
      {mine.isLoading ? <Spinner /> : (mine.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-slate-400">Henüz kaydınız yok.</p>
      ) : (
        <div className="space-y-2">
          {mine.data!.map((f: Feedback) => {
            const sm = feedbackStatusMeta[f.status];
            return (
              <div key={f.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-brand-50 text-brand-700">{kindLabel(f.kind)}</span>
                    {f.isAnonymous && <span className="badge bg-slate-100 text-slate-500">anonim</span>}
                  </div>
                  <span className={`badge ${sm.cls}`}>{sm.label}</span>
                </div>
                {f.title && <div className="mt-2 font-medium text-slate-800">{f.title}</div>}
                <p className="mt-1 text-sm text-slate-600">{f.body}</p>
                {f.handlerComment && <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Yanıt: {f.handlerComment}</div>}
                <div className="mt-2 text-xs text-slate-400">{new Date(f.createdAt).toLocaleDateString('tr-TR')}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
