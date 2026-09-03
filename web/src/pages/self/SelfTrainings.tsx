import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, PlayCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { trainingApi } from '../../api/services';
import type { Training } from '../../api/types';
import { Spinner } from '../../components/ui';
import TrainingPlayer from '../../components/TrainingPlayer';

export default function SelfTrainings() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['trainings'], queryFn: () => trainingApi.list() });
  const [active, setActive] = useState<Training | null>(null);

  const items = list.data ?? [];
  const pending = items.filter((t) => !t.completed);
  const done = items.filter((t) => t.completed);

  function reportProgress(id: number, position: number, duration: number) {
    trainingApi.progress(id, position, duration).catch(() => {});
  }
  function onCompleted(id: number) {
    trainingApi.progress(id, 10 ** 7, undefined).catch(() => {});
    qc.invalidateQueries({ queryKey: ['trainings'] });
    setActive(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="text-brand-600" />
        <h2 className="text-lg font-semibold text-slate-800">Eğitimlerim</h2>
      </div>

      {active && (
        <div className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-800">{active.title}</div>
            <button className="text-sm text-slate-500 hover:underline" onClick={() => setActive(null)}>Kapat</button>
          </div>
          <TrainingPlayer
            src={trainingApi.videoUrl(active.id)}
            resumeAt={active.watchedSeconds}
            onProgress={(p, d) => reportProgress(active.id, p, d)}
            onCompleted={() => onCompleted(active.id)}
          />
          {active.description && <p className="text-sm text-slate-600">{active.description}</p>}
        </div>
      )}

      {list.isLoading ? <Spinner /> : (
        <>
          <h3 className="text-sm font-semibold text-slate-600">Bekleyen eğitimler</h3>
          {pending.length === 0 ? <p className="text-sm text-slate-400">Bekleyen eğitiminiz yok. 👏</p> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pending.map((t) => (
                <div key={t.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="badge bg-brand-50 text-brand-700">{t.category}</span>
                        {t.isMandatory && <span className="badge bg-red-100 text-red-700"><ShieldAlert size={11} className="mr-0.5 inline" />Zorunlu</span>}
                      </div>
                      <div className="mt-2 font-medium text-slate-800">{t.title}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${t.progressPercent}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-400">%{t.progressPercent} izlendi</div>
                  <button className="btn-primary mt-3 w-full" onClick={() => setActive(t)}>
                    <PlayCircle size={16} /> {t.watchedSeconds > 0 ? 'Kaldığın yerden devam et' : 'İzlemeye başla'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <h3 className="pt-2 text-sm font-semibold text-slate-600">Aldığım eğitimler</h3>
          {done.length === 0 ? <p className="text-sm text-slate-400">Henüz tamamlanan eğitim yok.</p> : (
            <div className="space-y-2">
              {done.map((t) => (
                <div key={t.id} className="card flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-slate-800">{t.title}</div>
                    <div className="text-xs text-slate-400">{t.category}{t.completedAt ? ` • ${new Date(t.completedAt).toLocaleDateString('tr-TR')}` : ''}</div>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-emerald-600"><CheckCircle2 size={18} /> Tamamlandı</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
