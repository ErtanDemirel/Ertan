import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { selfAttendanceApi, holidayApi, leaveApi } from '../../api/services';

type DayState = 'present' | 'leave' | 'holiday' | 'weekend' | 'absent' | 'future';
const cls: Record<DayState, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  leave: 'bg-brand-50 text-brand-700',
  holiday: 'bg-amber-100 text-amber-700',
  weekend: 'bg-slate-100 text-slate-400',
  absent: 'bg-red-100 text-red-700',
  future: 'bg-white text-slate-400 border border-slate-100',
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function SelfWorkCalendar() {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const att = useQuery({ queryKey: ['self-attendance'], queryFn: () => selfAttendanceApi.my() });
  const hol = useQuery({ queryKey: ['holidays', cur.y], queryFn: () => holidayApi.list(cur.y) });
  const lea = useQuery({ queryKey: ['leave-my'], queryFn: () => leaveApi.my() });

  const present = useMemo(() => {
    const s = new Set<string>();
    (att.data ?? []).forEach((r) => { if (r.type === 'CheckIn') s.add(new Date(r.timestamp).toDateString()); });
    return s;
  }, [att.data]);
  const holidays = useMemo(() => new Set((hol.data ?? []).map((h) => h.date.slice(0, 10))), [hol.data]);
  const leaves = useMemo(() => {
    const s = new Set<string>();
    (lea.data?.requests ?? []).filter((r) => r.status === 'Approved').forEach((r) => {
      for (let d = new Date(r.startDate); iso(d) <= r.endDate; d.setDate(d.getDate() + 1)) s.add(new Date(d).toDateString());
    });
    return s;
  }, [lea.data]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = new Date(cur.y, cur.m, 1);
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;

  function classify(day: number): DayState {
    const d = new Date(cur.y, cur.m, day);
    if (holidays.has(iso(d))) return 'holiday';
    if (d.getDay() === 0 || d.getDay() === 6) return 'weekend';
    if (leaves.has(d.toDateString())) return 'leave';
    if (present.has(d.toDateString())) return 'present';
    if (d < today) return 'absent';
    return 'future';
  }

  let expected = 0, presentN = 0, leaveN = 0, absentN = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(cur.y, cur.m, day);
    if (d > today) continue;
    const st = classify(day);
    if (st === 'weekend' || st === 'holiday') continue;
    expected++;
    if (st === 'present') presentN++; else if (st === 'leave') leaveN++; else if (st === 'absent') absentN++;
  }
  const denom = expected - leaveN;
  const rate = denom > 0 ? Math.round((presentN / denom) * 100) : 100;
  const monthName = first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const shift = (n: number) => setCur((c) => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Çalışma Takvimim</h2>

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        {/* Devamlılık halkası */}
        <div className="card flex flex-col items-center justify-center p-5">
          <Donut percent={rate} />
          <div className="mt-3 text-sm font-medium text-slate-600 capitalize">{monthName}</div>
          <div className="mt-3 grid w-full grid-cols-3 gap-2 text-center">
            <Mini label="Geldi" value={presentN} cls="text-emerald-600" />
            <Mini label="İzinli" value={leaveN} cls="text-brand-600" />
            <Mini label="Gelmedi" value={absentN} cls={absentN > 0 ? 'text-red-600' : 'text-slate-400'} />
          </div>
        </div>

        {/* Takvim ısı haritası */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <button className="rounded-lg bg-brand-50 p-1.5 text-brand-600" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
            <div className="font-semibold capitalize text-slate-800">{monthName}</div>
            <button className="rounded-lg bg-brand-50 p-1.5 text-brand-600" onClick={() => shift(1)}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map((w) => <div key={w} className="pb-1 text-center text-xs font-bold text-slate-400">{w}</div>)}
            {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              return <div key={day} className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold ${cls[classify(day)]}`}>{day}</div>;
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            {([['present', 'Geldi'], ['leave', 'İzinli'], ['absent', 'Gelmedi'], ['holiday', 'Tatil'], ['weekend', 'Hafta sonu']] as [DayState, string][]).map(([s, l]) => (
              <span key={s} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-3 rounded ${cls[s]}`} /> {l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Donut({ percent }: { percent: number }) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - percent / 100);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="#4f46e5" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 70 70)" />
      <text x="70" y="70" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="800" fill="#0f172a">%{percent}</text>
      <text x="70" y="92" textAnchor="middle" fontSize="11" fill="#64748b">devamlılık</text>
    </svg>
  );
}

function Mini({ label, value, cls: c }: { label: string; value: number; cls: string }) {
  return <div className="rounded-lg bg-slate-50 py-2"><div className={`text-lg font-bold ${c}`}>{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}
