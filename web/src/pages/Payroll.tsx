import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Trash2, ShieldAlert, Send, FileStack, CheckCircle2, AlertTriangle } from 'lucide-react';
import { payrollApi, personnelApi, downloadFile } from '../api/services';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState, Toggle } from '../components/ui';
import { useAuth } from '../auth/AuthContext';

const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function PayrollPage() {
  const qc = useQueryClient();
  const { user, canPayroll } = useAuth();
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState({ year: String(now.getFullYear()), month: String(now.getMonth() + 1) });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [form, setForm] = useState({
    personnelId: '', year: String(now.getFullYear()), month: String(now.getMonth() + 1), netAmount: '', note: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const people = useQuery({ queryKey: ['pay-people'], queryFn: () => personnelApi.list({ pageSize: 500 }), enabled: canPayroll });
  const list = useQuery({ queryKey: ['payroll'], queryFn: () => payrollApi.list(), enabled: canPayroll });

  const upload = useMutation({
    mutationFn: () => payrollApi.upload({
      personnelId: Number(form.personnelId), year: Number(form.year), month: Number(form.month),
      netAmount: form.netAmount ? Number(form.netAmount) : undefined, note: form.note || undefined, file: file!,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); setOpen(false); setFile(null); },
    onError: (e) => setError(apiError(e)),
  });
  const distribute = useMutation({
    mutationFn: () => payrollApi.distribute([...selected], notifyInApp, notifySms),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ['payroll'] }); setDistOpen(false); setSelected(new Set()); alert(r?.message || 'Dağıtıldı.'); },
    onError: (e) => alert(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => payrollApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
    onError: (e) => alert(apiError(e)),
  });
  const importPdf = useMutation({
    mutationFn: () => payrollApi.importPdf(Number(importForm.year), Number(importForm.month), importFile!),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['payroll'] }); setImportResult({ matched: r.matched.length, unmatched: r.unmatched }); setImportFile(null); },
    onError: (e) => alert(apiError(e)),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  function submit() {
    setError('');
    if (!form.personnelId) return setError('Personel seçin.');
    if (!file) return setError('Bordro PDF dosyası seçin.');
    upload.mutate();
  }
  function toggle(id: number) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (!canPayroll) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 text-amber-500" size={40} />
        <h2 className="text-lg font-semibold text-slate-800">Bordro Erişimi Kısıtlı</h2>
        <p className="mt-2 text-sm text-slate-500">
          Bu bölüme yalnızca <b>bordro dağıtım yetkisi</b> olan kullanıcılar erişebilir. Yetki için bir yöneticiye başvurun.
        </p>
      </div>
    );
  }

  const undistributed = (list.data ?? []).filter((p) => !p.isDistributed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-slate-800">Bordro Dağıtımı</h2>
        <div className="flex gap-2">
          <button className="btn-primary !bg-emerald-600 hover:!bg-emerald-700" disabled={selected.size === 0} onClick={() => setDistOpen(true)}>
            <Send size={16} /> Dağıt ({selected.size})
          </button>
          <button className="btn-secondary" onClick={() => { setImportResult(null); setImportOpen(true); }}><FileStack size={16} /> PDF'ten Ayır</button>
          <button className="btn-primary" onClick={() => { setError(''); setOpen(true); }}><Upload size={16} /> Bordro Yükle</button>
        </div>
      </div>

      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        <b>PDF'ten Ayır:</b> Çok sayfalı tek bordro PDF'ini yükleyin; sistem her sayfadaki T.C. Kimlik No'ya göre kişiye ait bordroyu otomatik ayırır. Eşleşmeyen sayfalar listelenir; onları tek tek yükleyebilirsiniz. Ardından seçip <b>Dağıt</b> ile bildirim gönderin. Her personel yalnızca kendi bordrosunu görür.
      </p>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Henüz bordro yüklenmemiş." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50"><tr>
              <th className="th w-8">
                <input type="checkbox"
                  checked={undistributed.length > 0 && undistributed.every((p) => selected.has(p.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(undistributed.map((p) => p.id)) : new Set())} />
              </th>
              <th className="th">Personel</th><th className="th">Sicil</th><th className="th">Dönem</th>
              <th className="th">Net</th><th className="th">Durum</th><th className="th text-right">İşlem</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.data!.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="td">{!p.isDistributed && <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />}</td>
                  <td className="td font-medium">{p.personnelName}</td>
                  <td className="td font-mono">{p.sicilNo}</td>
                  <td className="td">{months[p.month - 1]} {p.year}</td>
                  <td className="td">{p.netAmount != null ? `${p.netAmount.toLocaleString('tr-TR')} ₺` : '-'}</td>
                  <td className="td">
                    <span className={`badge ${p.isDistributed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.isDistributed ? 'Dağıtıldı' : 'Bekliyor'}
                    </span>
                  </td>
                  <td className="td text-right">
                    <button className="btn-ghost !p-1.5" onClick={() => downloadFile(payrollApi.fileUrl(p.id), p.fileName)}><Download size={16} /></button>
                    <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Bordro silinsin mi?') && remove.mutate(p.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Yükleme */}
      <Modal open={open} onClose={() => setOpen(false)} title="Bordro Yükle"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={submit} disabled={upload.isPending}>Yükle</button>
        </>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <Field label="Personel *">
            <select className="input" value={form.personnelId} onChange={(e) => set('personnelId', e.target.value)}>
              <option value="">Seçin</option>
              {people.data?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.sicilNo})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Yıl"><input type="number" className="input" value={form.year} onChange={(e) => set('year', e.target.value)} /></Field>
            <Field label="Ay">
              <select className="input" value={form.month} onChange={(e) => set('month', e.target.value)}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Net Tutar (₺)"><input type="number" className="input" value={form.netAmount} onChange={(e) => set('netAmount', e.target.value)} /></Field>
            <Field label="Not"><input className="input" value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
          </div>
          <Field label="Bordro Dosyası (PDF) *" hint="En fazla 10 MB">
            <input type="file" accept=".pdf" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
      </Modal>

      {/* Dağıt + bildirim seçimi */}
      <Modal open={distOpen} onClose={() => setDistOpen(false)} title={`${selected.size} bordroyu dağıt`}
        footer={<>
          <button className="btn-secondary" onClick={() => setDistOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={() => distribute.mutate()} disabled={distribute.isPending}>Onayla ve Dağıt</button>
        </>}>
        <p className="mb-3 text-sm text-slate-600">Seçili bordrolar personele açılacak. Bildirim kanalını seçin:</p>
        <div className="space-y-2">
          <Toggle checked={notifyInApp} onChange={setNotifyInApp} label="Uygulama içi bildirim gönder" />
          <Toggle checked={notifySms} onChange={setNotifySms} label="SMS gönder (telefonu olanlara)" />
        </div>
      </Modal>

      {/* PDF'ten otomatik ayır */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="PDF'ten Otomatik Ayır" wide
        footer={importResult ? (
          <button className="btn-primary" onClick={() => setImportOpen(false)}>Kapat</button>
        ) : (
          <>
            <button className="btn-secondary" onClick={() => setImportOpen(false)}>Vazgeç</button>
            <button className="btn-primary" onClick={() => importPdf.mutate()} disabled={!importFile || importPdf.isPending}>
              {importPdf.isPending ? 'İşleniyor...' : 'Yükle ve Ayır'}
            </button>
          </>
        )}>
        {importResult ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 size={16} /> {importResult.matched} bordro kişilere eşleştirildi (dağıtılmayı bekliyor).
            </div>
            {importResult.unmatched.length > 0 ? (
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-700">
                  <AlertTriangle size={16} /> Eşleşmeyen sayfalar ({importResult.unmatched.length}) — bunları tek tek yükleyin:
                </div>
                <ul className="max-h-56 overflow-auto rounded-lg border border-slate-200 p-2 text-sm text-slate-600">
                  {importResult.unmatched.map((u, i) => <li key={i} className="border-b border-slate-50 py-1">{u}</li>)}
                </ul>
              </div>
            ) : <p className="text-sm text-slate-500">Tüm sayfalar eşleşti. 🎉</p>}
            <p className="text-xs text-slate-400">Şimdi listeden bordroları seçip "Dağıt" ile bildirim gönderebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <p className="text-sm text-slate-500">Çok sayfalı tek bordro PDF'ini yükleyin. Her sayfadaki TC'ye göre kişilere otomatik atanır.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Yıl"><input type="number" className="input" value={importForm.year} onChange={(e) => setImportForm({ ...importForm, year: e.target.value })} /></Field>
              <Field label="Ay">
                <select className="input" value={importForm.month} onChange={(e) => setImportForm({ ...importForm, month: e.target.value })}>
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Bordro PDF (çok sayfalı) *"><input type="file" accept=".pdf" className="input" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
