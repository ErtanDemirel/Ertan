import { useQuery } from '@tanstack/react-query';
import { Wallet, Download } from 'lucide-react';
import { payrollApi, downloadFile } from '../../api/services';
import { Spinner, EmptyState } from '../../components/ui';

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function SelfPayroll() {
  const list = useQuery({ queryKey: ['my-payroll'], queryFn: () => payrollApi.my() });
  if (list.isLoading) return <Spinner />;
  if ((list.data?.length ?? 0) === 0) return <EmptyState text="Henüz bordronuz yüklenmemiş." />;

  return (
    <div className="space-y-3">
      {list.data!.map((p) => (
        <div key={p.id} className="card flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-100 p-2 text-brand-700"><Wallet size={20} /></div>
            <div>
              <div className="font-semibold text-slate-800">{months[p.month - 1]} {p.year}</div>
              {p.netAmount != null && <div className="text-sm text-slate-500">Net: {p.netAmount.toLocaleString('tr-TR')} ₺</div>}
              {p.note && <div className="text-xs text-slate-400">{p.note}</div>}
            </div>
          </div>
          <button className="btn-primary !py-1.5" onClick={() => downloadFile(payrollApi.fileUrl(p.id), p.fileName)}>
            <Download size={16} /> İndir
          </button>
        </div>
      ))}
    </div>
  );
}
