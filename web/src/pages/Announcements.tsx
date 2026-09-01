import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, Users, Trash2, Eye } from 'lucide-react';
import { announcementApi } from '../api/services';
import type { Announcement } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', isMandatory: true, expiresAt: '' });
  const [error, setError] = useState('');
  const [statsFor, setStatsFor] = useState<Announcement | null>(null);

  const list = useQuery({ queryKey: ['announcements'], queryFn: () => announcementApi.list() });
  const create = useMutation({
    mutationFn: () => announcementApi.create({
      title: form.title, body: form.body, isMandatory: form.isMandatory,
      expiresAt: form.expiresAt || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setOpen(false); setForm({ title: '', body: '', isMandatory: true, expiresAt: '' }); },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => announcementApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Duyurular</h2>
        <button className="btn-primary" onClick={() => { setError(''); setOpen(true); }}><Plus size={16} /> Yeni Duyuru</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Henüz duyuru yok." />
      ) : (
        <div className="space-y-3">
          {list.data!.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="text-brand-600" size={18} />
                  <h3 className="font-semibold text-slate-800">{a.title}</h3>
                  {a.isMandatory && <span className="badge bg-red-100 text-red-700">Zorunlu</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <button className="btn-ghost !p-1.5" title="Kim okudu?" onClick={() => setStatsFor(a)}><Eye size={16} /></button>
                  <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Duyuru arşivlensin mi?') && remove.mutate(a.id)}><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                <span>{new Date(a.publishedAt).toLocaleString('tr-TR')}</span>
                <span className="flex items-center gap-1"><Users size={13} /> {a.readCount} okundu</span>
                <span>Yayınlayan: {a.publishedByName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Yeni Duyuru"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={() => create.mutate()} disabled={create.isPending}>Yayınla</button>
        </>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <Field label="Başlık *"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="İçerik *"><textarea className="input" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <Field label="Son Geçerlilik (opsiyonel)"><input type="datetime-local" className="input" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isMandatory} onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })} />
            Zorunlu — personel okumadan kapatamaz
          </label>
        </div>
      </Modal>

      {statsFor && <ReadStatsModal announcement={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
}

function ReadStatsModal({ announcement, onClose }: { announcement: Announcement; onClose: () => void }) {
  const stats = useQuery({ queryKey: ['read-stats', announcement.id], queryFn: () => announcementApi.readStats(announcement.id) });
  const readCount = stats.data?.filter((s) => s.isRead).length ?? 0;
  return (
    <Modal open onClose={onClose} title={`Okundu Durumu — ${announcement.title}`} wide>
      {stats.isLoading ? <Spinner /> : (
        <>
          <p className="mb-3 text-sm text-slate-500">{readCount} / {stats.data?.length ?? 0} personel okudu.</p>
          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0"><tr>
                <th className="th">Personel</th><th className="th">Sicil</th><th className="th">Durum</th><th className="th">Okuma Zamanı</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {stats.data!.map((s) => (
                  <tr key={s.userId}>
                    <td className="td">{s.name}</td>
                    <td className="td font-mono">{s.sicilNo || '-'}</td>
                    <td className="td">
                      <span className={`badge ${s.isRead ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.isRead ? 'Okudu' : 'Okumadı'}</span>
                    </td>
                    <td className="td text-slate-400">{s.readAt ? new Date(s.readAt).toLocaleString('tr-TR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
