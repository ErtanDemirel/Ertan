import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Upload, BarChart2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { trainingApi } from '../api/services';
import type { TrainingAdmin } from '../api/types';
import { apiError } from '../api/client';
import { Spinner, EmptyState, Modal, Field } from '../components/ui';

export default function Trainings() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['trainings-admin'], queryFn: () => trainingApi.admin() });
  const [showUpload, setShowUpload] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => trainingApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainings-admin'] }),
    onError: (e) => alert(apiError(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-800">Eğitimler</h2>
        </div>
        <button className="btn-primary" onClick={() => setShowUpload(true)}><Upload size={16} /> Video Yükle</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? <EmptyState text="Henüz eğitim yok." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.data!.map((t) => (
            <div key={t.id} className={`card p-4 ${!t.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-brand-50 text-brand-700">{t.category}</span>
                    {t.isMandatory && <span className="badge bg-red-100 text-red-700">Zorunlu</span>}
                    {!t.isActive && <span className="badge bg-slate-100 text-slate-500">Pasif</span>}
                  </div>
                  <div className="mt-2 font-medium text-slate-800">{t.title}</div>
                  <div className="text-xs text-slate-400">{t.videoFileName}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-brand-600">%{t.completionRate}</div>
                  <div className="text-xs text-slate-400">{t.completedCount}/{t.assignedCount} tamamladı</div>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${t.completionRate}%` }} />
              </div>
              <div className="mt-3 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setReportId(t.id)}><BarChart2 size={15} /> İzlenme raporu</button>
                {t.isActive && <button className="btn-secondary !text-red-600" onClick={() => { if (confirm('Eğitim pasife alınsın mı?')) del.mutate(t.id); }}><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); qc.invalidateQueries({ queryKey: ['trainings-admin'] }); }} />}
      {reportId && <ReportModal id={reportId} onClose={() => setReportId(null)} />}
    </div>
  );
}

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'İK', isMandatory: true });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('isMandatory', String(form.isMandatory));
      fd.append('video', file!);
      return trainingApi.create(fd);
    },
    onSuccess: onDone,
    onError: (e) => setError(apiError(e)),
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open title="Eğitim Videosu Yükle" onClose={onClose}>
      <div className="space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <Field label="Başlık *"><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kategori">
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="İK">İK</option>
              <option value="İSG">İSG (İş Güvenliği)</option>
              <option value="Kalite">Kalite</option>
              <option value="Oryantasyon">Oryantasyon</option>
            </select>
          </Field>
          <Field label="Zorunlu mu?">
            <select className="input" value={String(form.isMandatory)} onChange={(e) => set('isMandatory', e.target.value === 'true')}>
              <option value="true">Zorunlu</option>
              <option value="false">İsteğe bağlı</option>
            </select>
          </Field>
        </div>
        <Field label="Açıklama"><textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Video dosyası * (mp4/webm/mov, en fazla 500 MB)">
          <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <button className="btn-primary w-full" disabled={!form.title || !file || save.isPending} onClick={() => { setError(''); save.mutate(); }}>
          {save.isPending ? 'Yükleniyor... (büyük dosyalarda sürebilir)' : 'Yükle'}
        </button>
      </div>
    </Modal>
  );
}

function ReportModal({ id, onClose }: { id: number; onClose: () => void }) {
  const rep = useQuery({ queryKey: ['training-report', id], queryFn: () => trainingApi.report(id) });
  return (
    <Modal open wide title="İzlenme Raporu" onClose={onClose}>
      {rep.isLoading ? <Spinner /> : !rep.data ? <EmptyState text="Veri yok." /> : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div className="font-medium text-slate-800">{rep.data.training.title}</div>
            <div className="text-sm text-slate-600">{rep.data.completed}/{rep.data.assigned} tamamladı</div>
          </div>
          <div className="max-h-[55vh] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50"><tr>
                <th className="th">Personel</th><th className="th">Sicil</th><th className="th">İzlenme</th><th className="th">Durum</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rep.data.rows.map((r) => (
                  <tr key={r.personnelId}>
                    <td className="td font-medium">{r.personnelName}</td>
                    <td className="td">{r.sicilNo || '-'}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${r.progressPercent}%` }} /></div>
                        <span className="text-xs text-slate-500">%{r.progressPercent}</span>
                      </div>
                    </td>
                    <td className="td">{r.completed
                      ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={16} /> Tamamladı</span>
                      : <span className="flex items-center gap-1 text-slate-400"><Circle size={16} /> {r.progressPercent > 0 ? 'İzliyor' : 'Başlamadı'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
