import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bus, Users, MapPin } from 'lucide-react';
import { routeApi, shiftApi } from '../api/services';
import { Spinner, EmptyState } from '../components/ui';

export default function ServiceAnalyticsPage() {
  const [shiftId, setShiftId] = useState<number | undefined>(undefined);
  const shifts = useQuery({ queryKey: ['shifts'], queryFn: () => shiftApi.list() });
  const data = useQuery({ queryKey: ['svc-analytics', shiftId], queryFn: () => routeApi.analytics(shiftId) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Servis Analizi</h2>
        <select className="input max-w-[220px]" value={shiftId ?? ''} onChange={(e) => setShiftId(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">Tüm Vardiyalar</option>
          {shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {data.isLoading ? <Spinner /> : !data.data ? <EmptyState text="Veri yok." /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card flex items-center gap-4 p-5">
              <div className="rounded-xl bg-brand-100 p-3 text-brand-700"><Users size={22} /></div>
              <div><div className="text-2xl font-bold">{data.data.totalPersonnel}</div><div className="text-sm text-slate-500">Servis Kullanan Personel</div></div>
            </div>
            <div className="card flex items-center gap-4 p-5">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><Bus size={22} /></div>
              <div><div className="text-2xl font-bold">{data.data.totalServicesNeeded}</div><div className="text-sm text-slate-500">Gerekli Toplam Servis</div></div>
            </div>
            <div className="card flex items-center gap-4 p-5">
              <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700"><MapPin size={22} /></div>
              <div><div className="text-2xl font-bold">{data.data.routes.length}</div><div className="text-sm text-slate-500">Aktif Güzergah</div></div>
            </div>
          </div>

          {/* Vardiya bazlı gerekli servis */}
          {data.data.byShift.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 text-base font-semibold text-slate-700">Vardiya Bazında Gerekli Servis</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {data.data.byShift.map((s) => (
                  <div key={s.shiftId} className="rounded-lg border border-slate-200 p-3">
                    <div className="font-medium text-slate-800">{s.shiftName}</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-brand-700">{s.servicesNeeded}</span>
                      <span className="text-xs text-slate-500">servis / {s.totalPersonnel} kişi</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {data.data.routes.map((r) => (
              <div key={r.routeId} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bus className="text-brand-600" size={18} />
                    <h3 className="font-semibold text-slate-800">{r.routeName}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">{r.personnelCount} kişi</span>
                    <span className="text-slate-400">Kapasite: {r.capacity}</span>
                    <span className="badge bg-emerald-100 text-emerald-700">{r.servicesNeeded} servis gerekli</span>
                  </div>
                </div>
                {r.stops.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Durak Bazında Kişi Sayısı</div>
                    <div className="space-y-2">
                      {r.stops.map((s) => {
                        const pct = r.personnelCount > 0 ? Math.round((s.personnelCount / r.personnelCount) * 100) : 0;
                        return (
                          <div key={s.stop} className="flex items-center gap-3">
                            <span className="w-40 shrink-0 text-sm text-slate-600">{s.stop}</span>
                            <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                              <div className="h-full rounded bg-brand-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-10 text-right text-sm font-medium text-slate-700">{s.personnelCount}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
