import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { announcementApi } from '../../api/services';
import { Spinner, EmptyState } from '../../components/ui';

export default function SelfAnnouncements() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['announcements'], queryFn: () => announcementApi.list() });
  const markRead = useMutation({
    mutationFn: (id: number) => announcementApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['unread-mandatory'] });
    },
  });

  if (list.isLoading) return <Spinner />;
  if ((list.data?.length ?? 0) === 0) return <EmptyState text="Duyuru bulunmuyor." />;

  return (
    <div className="space-y-3">
      {list.data!.map((a) => (
        <div key={a.id} className="card p-4">
          <div className="flex items-center gap-2">
            <Megaphone className="text-brand-600" size={16} />
            <h3 className="font-semibold text-slate-800">{a.title}</h3>
            {a.isMandatory && <span className="badge bg-red-100 text-red-700">Zorunlu</span>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">{new Date(a.publishedAt).toLocaleString('tr-TR')}</span>
            {a.isRead ? (
              <span className="text-xs font-medium text-emerald-600">✓ Okundu</span>
            ) : (
              <button className="btn-primary !py-1 !text-xs" onClick={() => markRead.mutate(a.id)}>Okudum</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
