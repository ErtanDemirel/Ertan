import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogIn, LogOut, MapPin } from 'lucide-react';
import { attendanceApi } from '../api/services';
import { Spinner, EmptyState } from '../components/ui';

export default function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const list = useQuery({
    queryKey: ['attendance', from, to],
    queryFn: () => attendanceApi.list({ from, to }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Mesai Kayıtları</h2>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Başlangıç</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Bitiş</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Bu aralıkta mesai kaydı yok." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="th">Personel</th><th className="th">Sicil</th><th className="th">Hareket</th>
              <th className="th">Zaman</th><th className="th">Lokasyon</th><th className="th">Mesafe</th><th className="th">Konum</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.data!.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="td font-medium">{a.personnelName}</td>
                  <td className="td font-mono">{a.sicilNo}</td>
                  <td className="td">
                    {a.type === 'CheckIn' ? (
                      <span className="badge bg-emerald-100 text-emerald-700"><LogIn size={13} className="mr-1" /> Giriş</span>
                    ) : (
                      <span className="badge bg-orange-100 text-orange-700"><LogOut size={13} className="mr-1" /> Çıkış</span>
                    )}
                  </td>
                  <td className="td">{new Date(a.timestamp).toLocaleString('tr-TR')}</td>
                  <td className="td">{a.locationName || '-'}</td>
                  <td className="td">{Math.round(a.distanceMeters)} m</td>
                  <td className="td">
                    <span className={`badge ${a.isWithinGeofence ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <MapPin size={12} className="mr-1" /> {a.isWithinGeofence ? 'Alan içi' : 'Alan dışı'}
                    </span>
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
