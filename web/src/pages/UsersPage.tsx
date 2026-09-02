import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Wallet, ShieldCheck } from 'lucide-react';
import { usersApi } from '../api/services';
import { apiError } from '../api/client';
import { Spinner, EmptyState } from '../components/ui';

const roleLabels: Record<string, string> = { Admin: 'Yönetici', Manager: 'Amir', Personnel: 'Personel' };

export default function UsersPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() });
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => usersApi.setPayrollPermission(id, enabled),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ['users'] }); alert(r?.message || 'Güncellendi.'); },
    onError: (e) => alert(apiError(e)),
  });

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800"><KeyRound size={20} /> Kullanıcılar & Yetkiler</h2>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <ShieldCheck size={13} className="mr-1 inline" /> <b>Bordro dağıtım yetkisi</b> hassastır: yalnızca bu yetkiye sahip kullanıcı bordroları yükleyip dağıtabilir ve bordro dosyalarına erişebilir. Yetki değiştiğinde kullanıcı yeniden giriş yapmalıdır.
      </p>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Kullanıcı yok." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="th">Kullanıcı</th><th className="th">Ad Soyad</th><th className="th">Rol</th>
              <th className="th">Durum</th><th className="th">Bordro Yetkisi</th><th className="th text-right"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.data!.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{u.username}</td>
                  <td className="td">{u.fullName || '-'}</td>
                  <td className="td">{roleLabels[u.role] ?? u.role}</td>
                  <td className="td"><span className={`badge ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{u.isActive ? 'Aktif' : 'Pasif'}</span></td>
                  <td className="td">
                    {u.canDistributePayroll
                      ? <span className="badge bg-brand-100 text-brand-700"><Wallet size={12} className="mr-1" /> Var</span>
                      : <span className="badge bg-slate-100 text-slate-500">Yok</span>}
                  </td>
                  <td className="td text-right">
                    <button className={u.canDistributePayroll ? 'btn-danger !py-1 !text-xs' : 'btn-primary !py-1 !text-xs'}
                      onClick={() => toggle.mutate({ id: u.id, enabled: !u.canDistributePayroll })}>
                      {u.canDistributePayroll ? 'Yetkiyi Kaldır' : 'Bordro Yetkisi Ver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
