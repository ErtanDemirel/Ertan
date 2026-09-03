import { useQuery } from '@tanstack/react-query';
import { LogIn, LogOut, Clock } from 'lucide-react';
import { selfAttendanceApi } from '../../api/services';
import type { Attendance } from '../../api/types';
import { Spinner } from '../../components/ui';

/** Personelin kendi mesai giriş/çıkış geçmişi + aylık özet. */
export default function SelfAttendance() {
  const q = useQuery({ queryKey: ['self-attendance'], queryFn: () => selfAttendanceApi.my() });
  const rows = q.data ?? [];

  const now = new Date();
  const thisMonth = rows.filter((r) => {
    const d = new Date(r.timestamp);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const checkIns = thisMonth.filter((r) => r.type === 'CheckIn').length;
  const daysWorked = new Set(thisMonth.map((r) => new Date(r.timestamp).toDateString())).size;
  const outside = thisMonth.filter((r) => !r.isWithinGeofence).length;

  const byDay = new Map<string, Attendance[]>();
  for (const r of rows) {
    const key = new Date(r.timestamp).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long' });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Mesai Geçmişim</h2>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Bu ay giriş" value={checkIns} cls="text-brand-600" />
        <Stat label="Çalışılan gün" value={daysWorked} cls="text-emerald-600" />
        <Stat label="Alan dışı" value={outside} cls={outside > 0 ? 'text-red-600' : 'text-slate-500'} />
      </div>

      {q.isLoading ? <Spinner /> : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400"><Clock className="mx-auto mb-2 text-slate-300" /> Mesai kaydınız yok.</div>
      ) : (
        <div className="space-y-3">
          {[...byDay.entries()].map(([day, recs]) => (
            <div key={day} className="card p-4">
              <div className="mb-2 text-sm font-semibold capitalize text-slate-600">{day}</div>
              <div className="divide-y divide-slate-100">
                {recs.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-2">
                    <div className={`rounded-lg p-2 ${r.type === 'CheckIn' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>
                      {r.type === 'CheckIn' ? <LogIn size={16} /> : <LogOut size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{r.type === 'CheckIn' ? 'Giriş' : 'Çıkış'}</div>
                      <div className="text-xs text-slate-500">{r.locationName || 'Lokasyon yok'} • {Math.round(r.distanceMeters)} m</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-800">{new Date(r.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                      {!r.isWithinGeofence && <div className="text-xs text-red-500">alan dışı</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="card p-3 text-center">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
