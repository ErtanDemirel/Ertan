import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationApi } from '../api/services';

export default function NotificationBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const data = useQuery({ queryKey: ['notifications'], queryFn: () => notificationApi.my(), refetchInterval: 60000 });
  const readAll = useMutation({
    mutationFn: () => notificationApi.readAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const read = useMutation({
    mutationFn: (id: number) => notificationApi.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data.data?.unread ?? 0;

  return (
    <div className="relative">
      <button className="relative rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Bildirimler">
        <Bell size={18} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <span className="text-sm font-semibold">Bildirimler</span>
              {unread > 0 && <button className="text-xs text-brand-600 hover:underline" onClick={() => readAll.mutate()}>Tümünü okundu yap</button>}
            </div>
            <div className="max-h-96 overflow-auto">
              {(data.data?.items.length ?? 0) === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">Bildirim yok.</p>
              ) : (
                data.data!.items.map((n) => (
                  <button key={n.id} onClick={() => !n.isRead && read.mutate(n.id)}
                    className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.isRead ? '' : 'bg-brand-50/40'}`}>
                    <div className="flex items-center gap-2">
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      <span className="text-sm font-medium text-slate-800">{n.title}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString('tr-TR')}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
