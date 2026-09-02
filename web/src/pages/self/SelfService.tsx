import { useQuery } from '@tanstack/react-query';
import { Bus, MapPin } from 'lucide-react';
import { selfApi } from '../../api/services';
import { Spinner } from '../../components/ui';

export default function SelfService() {
  const data = useQuery({ queryKey: ['my-service'], queryFn: () => selfApi.service() });
  if (data.isLoading) return <Spinner />;

  const mine = data.data?.mine;
  const routes = data.data?.routes ?? [];

  return (
    <div className="space-y-4">
      {mine ? (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bus className="text-brand-600" size={18} />
            <h3 className="font-semibold text-slate-800">Servisim</h3>
          </div>
          {mine.routeName ? (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div><span className="text-slate-400">Güzergah:</span> <b>{mine.routeName}</b></div>
              <div><span className="text-slate-400">Durağım:</span> <b>{mine.stop || 'Belirtilmemiş'}</b></div>
              {mine.departure && <div><span className="text-slate-400">Kalkış:</span> {mine.departure}</div>}
              {mine.ret && <div><span className="text-slate-400">Dönüş:</span> {mine.ret}</div>}
              {mine.driver && <div><span className="text-slate-400">Şoför:</span> {mine.driver}</div>}
              {mine.plate && <div><span className="text-slate-400">Plaka:</span> {mine.plate}</div>}
            </div>
          ) : <p className="text-sm text-slate-400">Size atanmış bir servis bulunmuyor.</p>}
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-base font-semibold text-slate-700">Tüm Güzergahlar</h3>
        <div className="space-y-2">
          {routes.map((r: any, i: number) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <MapPin size={15} className="text-brand-600" /> {r.name}
              </div>
              {r.stops && <p className="mt-1 text-sm text-slate-500">Duraklar: {r.stops}</p>}
              <div className="mt-1 flex gap-4 text-xs text-slate-400">
                {r.departure && <span>Kalkış: {r.departure}</span>}
                {r.ret && <span>Dönüş: {r.ret}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
