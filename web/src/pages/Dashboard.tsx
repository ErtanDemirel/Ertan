import { useQuery } from '@tanstack/react-query';
import { Users, CalendarClock, CalendarCheck2, ClipboardCheck, Umbrella } from 'lucide-react';
import { personnelApi, shiftApi, leaveApi, attendanceApi } from '../api/services';
import { Spinner, StatusBadge } from '../components/ui';

function StatCard({ icon: Icon, label, value, tint }: any) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-xl p-3 ${tint}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const personnel = useQuery({ queryKey: ['dash-personnel'], queryFn: () => personnelApi.list({ pageSize: 1 }) });
  const shifts = useQuery({ queryKey: ['dash-shifts'], queryFn: () => shiftApi.list() });
  const pending = useQuery({ queryKey: ['dash-pending'], queryFn: () => leaveApi.pending() });
  const leaveDash = useQuery({ queryKey: ['dash-leave'], queryFn: () => leaveApi.dashboard(14) });
  const todayAtt = useQuery({ queryKey: ['dash-att', today], queryFn: () => attendanceApi.list({ from: today, to: today }) });

  const loading = personnel.isLoading || shifts.isLoading || pending.isLoading;
  if (loading) return <Spinner label="Yükleniyor..." />;

  const checkinsToday = new Set(
    (todayAtt.data || []).filter((a) => a.type === 'CheckIn').map((a) => a.personnelId)
  ).size;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">Genel Bakış</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Toplam Personel" value={personnel.data?.total ?? 0} tint="bg-brand-100 text-brand-700" />
        <StatCard icon={CalendarClock} label="Tanımlı Vardiya" value={shifts.data?.length ?? 0} tint="bg-indigo-100 text-indigo-700" />
        <StatCard icon={CalendarCheck2} label="Bekleyen İzin Talebi" value={pending.data?.length ?? 0} tint="bg-amber-100 text-amber-700" />
        <StatCard icon={ClipboardCheck} label="Bugün Giriş Yapan" value={checkinsToday} tint="bg-emerald-100 text-emerald-700" />
      </div>

      {/* İzindekiler + Yaklaşan izinler */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-700"><Umbrella size={18} className="text-amber-500" /> Bugün İzinde Olanlar</h3>
          {(leaveDash.data?.onLeave.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">Bugün izinli personel yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {leaveDash.data!.onLeave.map((r: any, i: number) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-700">{r.name} <span className="font-mono text-xs text-slate-400">({r.sicilNo})</span></span>
                  <span className="text-xs text-slate-500">{r.leaveType} • dönüş {new Date(r.endDate).toLocaleDateString('tr-TR')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-700"><CalendarCheck2 size={18} className="text-brand-500" /> Yaklaşan İzinler (14 gün)</h3>
          {(leaveDash.data?.upcoming.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">Yaklaşan onaylı izin yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {leaveDash.data!.upcoming.map((r: any, i: number) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-700">{r.name}</span>
                  <span className="text-xs text-slate-500">{new Date(r.startDate).toLocaleDateString('tr-TR')} → {new Date(r.endDate).toLocaleDateString('tr-TR')} ({r.totalDays}g)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-700">Onay Bekleyen İzin Talepleri</h3>
        {(pending.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-400">Bekleyen izin talebi yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="th">Personel</th>
                  <th className="th">Tür</th>
                  <th className="th">Tarih</th>
                  <th className="th">Gün</th>
                  <th className="th">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.data!.map((r) => (
                  <tr key={r.id}>
                    <td className="td font-medium">{r.personnelName}</td>
                    <td className="td">{r.leaveTypeName}</td>
                    <td className="td">{r.startDate} → {r.endDate}</td>
                    <td className="td">{r.totalDays}</td>
                    <td className="td"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
