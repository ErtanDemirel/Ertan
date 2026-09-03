import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { Field } from '../../components/ui';

const num = (s: string) => { const v = parseFloat((s || '').replace(/\s/g, '').replace(',', '.')); return isNaN(v) ? 0 : v; };
const money = (v: number) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

export default function SelfCalculators() {
  const [tab, setTab] = useState<'ot' | 'sev'>('ot');
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="text-brand-600" />
        <h2 className="text-lg font-semibold text-slate-800">Hesaplama</h2>
      </div>
      <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
        {([['ot', 'Fazla Mesai'], ['sev', 'Kıdem / İhbar']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${tab === k ? 'bg-white text-brand-700 shadow' : 'text-slate-500'}`}>{l}</button>
        ))}
      </div>
      {tab === 'ot' ? <Overtime /> : <Severance />}
      <p className="text-xs text-slate-400">Bu araç yalnızca <strong>brüt tahmini</strong> verir; resmî hesap için İK/muhasebeye danışın.</p>
    </div>
  );
}

const OT_TYPES = [
  { key: 'fazla', label: 'Fazla çalışma (%50)', mult: 1.5, desc: 'Haftalık 45 saati aşan' },
  { key: 'sure', label: 'Fazla sürelerle (%25)', mult: 1.25, desc: '45 saat altı, sözleşme üstü' },
  { key: 'tatil', label: 'Tatil çalışması (%100)', mult: 2.0, desc: 'Hafta/genel tatil' },
];
function Overtime() {
  const [wageType, setWageType] = useState<'hour' | 'month'>('month');
  const [wage, setWage] = useState('');
  const [hours, setHours] = useState('');
  const [ot, setOt] = useState(OT_TYPES[0]);
  const hourly = wageType === 'hour' ? num(wage) : num(wage) / 225;
  const paid = hourly * num(hours) * ot.mult;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card space-y-3 p-5">
        <div>
          <div className="mb-1 text-sm text-slate-500">Ücret girişi</div>
          <div className="flex gap-2">
            {([['month', 'Aylık brüt'], ['hour', 'Saatlik brüt']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setWageType(k)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${wageType === k ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}>{l}</button>
            ))}
          </div>
        </div>
        <Field label={wageType === 'hour' ? 'Saatlik brüt ücret (₺)' : 'Aylık brüt ücret (₺)'}>
          <input className="input" inputMode="decimal" value={wage} onChange={(e) => setWage(e.target.value)} placeholder="örn. 30000" />
        </Field>
        <Field label="Fazla mesai saati"><input className="input" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="örn. 12" /></Field>
        <div>
          <div className="mb-1 text-sm text-slate-500">Zam türü</div>
          <div className="space-y-2">
            {OT_TYPES.map((t) => (
              <button key={t.key} onClick={() => setOt(t)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left ${ot.key === t.key ? 'border-brand-600 bg-brand-50' : 'border-slate-200'}`}>
                <span className={`h-3.5 w-3.5 rounded-full border-2 ${ot.key === t.key ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`} />
                <span><span className="text-sm font-medium text-slate-800">{t.label}</span> <span className="text-xs text-slate-500">— {t.desc}</span></span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="card space-y-2 p-5">
        <Row k="Saatlik ücret" v={money(hourly)} />
        <Row k={`Zamlı saatlik (${ot.mult}×)`} v={money(hourly * ot.mult)} />
        <hr className="my-2 border-slate-200" />
        <Row k="Toplam fazla mesai" v={money(paid)} big />
      </div>
    </div>
  );
}

function noticeWeeks(days: number): number {
  const y = days / 365;
  if (y < 0.5) return 2; if (y < 1.5) return 4; if (y < 3) return 6; return 8;
}
function Severance() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState(today);
  const [wage, setWage] = useState('');
  const [ceil, setCeil] = useState('');
  const s = Date.parse(start), e = Date.parse(end);
  const days = (!isNaN(s) && !isNaN(e) && e > s) ? Math.floor((e - s) / 864e5) : 0;
  const years = days / 365;
  const monthly = num(wage);
  const capped = num(ceil) > 0 ? Math.min(monthly, num(ceil)) : monthly;
  const kidem = years >= 1 ? capped * (days / 365) : 0;
  const weeks = noticeWeeks(days);
  const ihbar = (monthly / 30) * (weeks * 7);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card space-y-3 p-5">
        <Field label="İşe giriş tarihi"><input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="İşten çıkış tarihi"><input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        <Field label="Aylık giydirilmiş brüt ücret (₺)"><input className="input" inputMode="decimal" value={wage} onChange={(e) => setWage(e.target.value)} placeholder="örn. 35000" /></Field>
        <Field label="Kıdem tavanı (₺)" hint="Opsiyonel — boş bırakılabilir"><input className="input" inputMode="decimal" value={ceil} onChange={(e) => setCeil(e.target.value)} /></Field>
      </div>
      <div className="card space-y-2 p-5">
        <Row k="Toplam kıdem süresi" v={days > 0 ? `${Math.floor(years)} yıl ${Math.floor((days % 365) / 30)} ay` : '—'} />
        <Row k="İhbar süresi" v={days > 0 ? `${weeks} hafta` : '—'} />
        <hr className="my-2 border-slate-200" />
        <Row k="Kıdem tazminatı (brüt)" v={money(kidem)} big />
        {years < 1 && days > 0 && <p className="text-xs text-amber-600">1 yıldan az kıdemde kıdem tazminatı doğmaz.</p>}
        <Row k="İhbar tazminatı (brüt)" v={money(ihbar)} big />
      </div>
    </div>
  );
}

function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={big ? 'font-semibold text-slate-800' : 'text-sm text-slate-600'}>{k}</span>
      <span className={big ? 'text-lg font-bold text-brand-600' : 'font-medium text-slate-800'}>{v}</span>
    </div>
  );
}
