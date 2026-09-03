import { useState } from 'react';
import { Download, FileSpreadsheet, Users, CalendarDays, Clock, Wallet } from 'lucide-react';
import { downloadFile, reportApi } from '../api/services';
import { Field } from '../components/ui';

/**
 * Yönetim raporları — Excel'de açılan CSV çıktıları.
 * Bordro gibi hassas veriler burada YER ALMAZ (yalnızca bordro sorumlusu erişir).
 */
export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState('');

  async function dl(key: string, url: string, name: string) {
    try { setBusy(key); await downloadFile(url, name); }
    finally { setBusy(''); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Raporlar</h2>
        <p className="text-sm text-slate-500">Çıktılar <strong>Excel'de açılan CSV</strong> biçimindedir (UTF-8, noktalı virgül ayıraç).</p>
      </div>

      {/* Tarih aralığı filtresi (izin & mesai raporları için) */}
      <div className="card p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Başlangıç"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Bitiş"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="İzin Durumu">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tümü</option>
              <option value="Pending">Bekleyen</option>
              <option value="Approved">Onaylı</option>
              <option value="Rejected">Reddedilen</option>
              <option value="Cancelled">İptal</option>
            </select>
          </Field>
          <Field label="Bakiye Yılı"><input type="number" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ReportCard
          icon={<Users size={20} />} title="Personel Listesi"
          desc="Tüm personel: sicil, TCKN, departman, servis, vardiya, amir, giriş/çıkış."
          busy={busy === 'personnel'}
          onClick={() => dl('personnel', reportApi.personnelUrl(), 'personel.csv')}
        />
        <ReportCard
          icon={<CalendarDays size={20} />} title="İzin Talepleri"
          desc="Seçili tarih aralığı ve duruma göre izinler (yarım gün dahil)."
          busy={busy === 'leaves'}
          onClick={() => dl('leaves', reportApi.leavesUrl({ from, to, status: status || undefined }), 'izinler.csv')}
        />
        <ReportCard
          icon={<Clock size={20} />} title="Mesai (Giriş/Çıkış)"
          desc="Seçili tarih aralığındaki QR mesai hareketleri, konum ve alan-içi bilgisi."
          busy={busy === 'attendance'}
          onClick={() => dl('attendance', reportApi.attendanceUrl({ from, to }), 'mesai.csv')}
        />
        <ReportCard
          icon={<Wallet size={20} />} title="Yıllık İzin Bakiyeleri"
          desc="Seçili yıl için hak edilen / kullanılan / bekleyen / kalan gün."
          busy={busy === 'balances'}
          onClick={() => dl('balances', reportApi.leaveBalancesUrl(year), `izin-bakiyeleri-${year}.csv`)}
        />
      </div>
    </div>
  );
}

function ReportCard({ icon, title, desc, onClick, busy }: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void; busy: boolean;
}) {
  return (
    <div className="card flex flex-col justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-50 p-2 text-brand-600">{icon}</div>
        <div>
          <div className="flex items-center gap-2 font-medium text-slate-800"><FileSpreadsheet size={15} className="text-emerald-600" /> {title}</div>
          <p className="mt-1 text-sm text-slate-500">{desc}</p>
        </div>
      </div>
      <button className="btn-primary self-start" onClick={onClick} disabled={busy}>
        <Download size={16} /> {busy ? 'İndiriliyor...' : 'CSV indir'}
      </button>
    </div>
  );
}
