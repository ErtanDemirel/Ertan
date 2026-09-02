import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { shiftApi, personnelApi } from '../api/services';
import { apiError } from '../api/client';
import { Modal, Spinner } from '../components/ui';

interface Assignment { id: number; personnelId: number; shiftId: number; shiftName: string; date: string; note?: string | null; }
interface Leave { id: number; personnelId: number; leaveType: string; startDate: string; endDate: string; }

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Pazartesi=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const weekdays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function ShiftPlanPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [cell, setCell] = useState<{ personnelId: number; name: string; date: string } | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }),
    [weekStart]
  );
  const from = iso(days[0]);
  const to = iso(days[6]);

  const shifts = useQuery({ queryKey: ['shifts'], queryFn: () => shiftApi.list() });
  const people = useQuery({ queryKey: ['plan-people'], queryFn: () => personnelApi.list({ pageSize: 200, isActive: true }) });
  const plan = useQuery({ queryKey: ['assignments', from, to], queryFn: () => shiftApi.assignments(from, to) });

  const assign = useMutation({
    mutationFn: (b: { personnelId: number; shiftId: number; date: string }) => shiftApi.assign(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setCell(null); },
    onError: (e) => alert(apiError(e)),
  });
  const unassign = useMutation({
    mutationFn: (id: number) => shiftApi.unassign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setCell(null); },
    onError: (e) => alert(apiError(e)),
  });

  const shiftColor = (id: number) => shifts.data?.find((s) => s.id === id)?.color || '#64748b';

  const assignments: Assignment[] = plan.data?.assignments ?? [];
  const leaves: Leave[] = plan.data?.leaves ?? [];

  function cellFor(personnelId: number, date: string) {
    const a = assignments.find((x) => x.personnelId === personnelId && x.date === date);
    const l = leaves.find((x) => x.personnelId === personnelId && x.startDate <= date && date <= x.endDate);
    return { a, l };
  }

  const shifting = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <CalendarRange size={20} /> Vardiya Planı
        </h2>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => shifting(-1)}><ChevronLeft size={16} /> Önceki</button>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium">
            {days[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </span>
          <button className="btn-secondary" onClick={() => shifting(1)}>Sonraki <ChevronRight size={16} /></button>
          <button className="btn-ghost" onClick={() => setWeekStart(mondayOf(new Date()))}>Bu hafta</button>
        </div>
      </div>

      {/* Vardiya renk açıklaması */}
      <div className="flex flex-wrap gap-3 text-xs">
        {shifts.data?.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: s.color || '#64748b' }} /> {s.name} ({s.startTime}-{s.endTime})
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-400" /> İzinli</span>
      </div>

      {plan.isLoading || people.isLoading ? <Spinner /> : (
        <div className="card overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Personel</th>
                {days.map((d, i) => {
                  const isToday = iso(d) === iso(new Date());
                  return (
                    <th key={i} className={`px-2 py-3 text-center text-xs font-semibold ${isToday ? 'text-brand-700' : 'text-slate-500'}`}>
                      <div>{weekdays[i]}</div>
                      <div className="text-[11px] font-normal">{d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' })}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.data?.items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm">
                    <div className="font-medium text-slate-800">{p.fullName}</div>
                    <div className="font-mono text-[11px] text-slate-400">{p.sicilNo}</div>
                  </td>
                  {days.map((d, i) => {
                    const date = iso(d);
                    const { a, l } = cellFor(p.id, date);
                    return (
                      <td key={i} className="px-1.5 py-1.5 text-center">
                        {l ? (
                          <span className="inline-block w-full rounded-md bg-amber-100 px-1 py-1.5 text-[11px] font-medium text-amber-700" title={l.leaveType}>İzinli</span>
                        ) : a ? (
                          <button
                            className="inline-block w-full rounded-md px-1 py-1.5 text-[11px] font-semibold text-white"
                            style={{ background: shiftColor(a.shiftId) }}
                            onClick={() => setCell({ personnelId: p.id, name: p.fullName, date })}
                            title="Değiştir/Kaldır"
                          >
                            {a.shiftName}
                          </button>
                        ) : (
                          <button
                            className="inline-block w-full rounded-md border border-dashed border-slate-200 px-1 py-1.5 text-[11px] text-slate-300 hover:border-brand-400 hover:text-brand-500"
                            onClick={() => setCell({ personnelId: p.id, name: p.fullName, date })}
                          >+</button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Atama modalı */}
      {cell && (() => {
        const existing = assignments.find((x) => x.personnelId === cell.personnelId && x.date === cell.date);
        return (
          <Modal open onClose={() => setCell(null)}
            title={`${cell.name} — ${new Date(cell.date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}`}>
            <p className="mb-3 text-sm text-slate-500">Vardiya seçin:</p>
            <div className="grid grid-cols-2 gap-2">
              {shifts.data?.filter((s) => s.isActive).map((s) => (
                <button key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => assign.mutate({ personnelId: cell.personnelId, shiftId: s.id, date: cell.date })}>
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color || '#64748b' }} />
                  {s.name} <span className="text-xs text-slate-400">{s.startTime}-{s.endTime}</span>
                </button>
              ))}
            </div>
            {existing && (
              <button className="btn-danger mt-4 w-full" onClick={() => unassign.mutate(existing.id)}>
                Bu günkü vardiyayı kaldır
              </button>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}
