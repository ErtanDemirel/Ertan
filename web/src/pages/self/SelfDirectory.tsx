import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Phone, Mail, Users } from 'lucide-react';
import { directoryApi } from '../../api/services';
import { Spinner } from '../../components/ui';

/** Şirket rehberi — çalışan dizini (ad, ünvan, departman, iş telefonu). */
export default function SelfDirectory() {
  const [search, setSearch] = useState('');
  const q = useQuery({ queryKey: ['directory', search], queryFn: () => directoryApi.list(search || undefined) });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Şirket Rehberi</h2>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
        <Search size={18} className="text-slate-400" />
        <input className="w-full py-2.5 text-sm outline-none" placeholder="Ad, ünvan veya departman ara"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {q.isLoading ? <Spinner /> : (q.data?.length ?? 0) === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400"><Users className="mx-auto mb-2 text-slate-300" /> Kayıt bulunamadı.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data!.map((p, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-600">
                  {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-800">{p.name}</div>
                  <div className="truncate text-sm text-slate-500">{[p.title, p.department].filter(Boolean).join(' • ') || '—'}</div>
                </div>
              </div>
              {(p.phone || p.email) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.phone && <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"><Phone size={12} /> {p.phone}</a>}
                  {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"><Mail size={12} /> {p.email}</a>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
