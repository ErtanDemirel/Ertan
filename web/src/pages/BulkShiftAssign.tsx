import { useMemo, useState, type MouseEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, ClipboardPaste, CalendarPlus, X, Layers, Check } from 'lucide-react';
import { shiftApi, personnelApi } from '../api/services';
import { apiError } from '../api/client';
import { Spinner, Modal, Field } from '../components/ui';

export default function BulkShiftAssignPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteResult, setPasteResult] = useState<{ notFound: string[] } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState('');

  const people = useQuery({ queryKey: ['bulk-people'], queryFn: () => personnelApi.list({ pageSize: 500, isActive: true }) });
  const shifts = useQuery({ queryKey: ['shifts'], queryFn: () => shiftApi.list() });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const items = people.data?.items ?? [];
    if (!s) return items;
    return items.filter((p) => p.fullName.toLowerCase().includes(s) || p.sicilNo.includes(s) || (p.department || '').toLowerCase().includes(s));
  }, [people.data, search]);

  const bulk = useMutation({
    mutationFn: (shiftId: number) => shiftApi.bulkAssign({ shiftId, personnelIds: [...selected], dates }),
    onSuccess: (r) => { setMenu(null); setToast(`${r.total} atama yapıldı (${r.created} yeni, ${r.updated} güncellendi).`); setTimeout(() => setToast(''), 4000); },
    onError: (e) => { setMenu(null); alert(apiError(e)); },
  });

  const resolve = useMutation({
    mutationFn: () => shiftApi.resolveSicil(pasteText.split(/[\s,;]+/).filter(Boolean)),
    onSuccess: (r) => {
      setSelected((s) => { const n = new Set(s); r.found.forEach((f) => n.add(f.id)); return n; });
      setPasteResult({ notFound: r.notFound });
    },
    onError: (e) => alert(apiError(e)),
  });

  function toggle(id: number, e: MouseEvent) {
    setSelected((s) => {
      const n = new Set(s);
      // Ctrl/Cmd veya normal tık: tekli aç/kapat (çoklu seçim)
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function addDate() {
    if (dateInput && !dates.includes(dateInput)) setDates((d) => [...d, dateInput].sort());
    setDateInput('');
  }
  function addRange() {
    if (!rangeFrom || !rangeTo) return;
    const out = new Set(dates);
    let d = new Date(rangeFrom); const end = new Date(rangeTo);
    let guard = 0;
    while (d <= end && guard++ < 400) { out.add(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    setDates([...out].sort());
    setRangeFrom(''); setRangeTo('');
  }

  function openMenu(e: MouseEvent) {
    e.preventDefault();
    if (selected.size === 0 || dates.length === 0) {
      alert('Önce soldan personel, üstten tarih seçin.');
      return;
    }
    setMenu({ x: e.clientX, y: e.clientY });
  }

  return (
    <div className="space-y-4" onClick={() => menu && setMenu(null)}>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800"><Layers size={20} /> Toplu Vardiya Atama</h2>

      {/* Tarih seçimi */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Gün ekle</label>
            <div className="flex gap-2">
              <input type="date" className="input" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
              <button className="btn-secondary" onClick={addDate}><CalendarPlus size={16} /> Ekle</button>
            </div>
          </div>
          <div>
            <label className="label">Tarih aralığı</label>
            <div className="flex gap-2">
              <input type="date" className="input" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
              <input type="date" className="input" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
              <button className="btn-secondary" onClick={addRange}>Aralığı ekle</button>
            </div>
          </div>
          {dates.length > 0 && <button className="btn-ghost text-red-500" onClick={() => setDates([])}>Temizle</button>}
        </div>
        {dates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dates.map((d) => (
              <span key={d} className="badge bg-brand-100 text-brand-700">
                {new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                <button className="ml-1" onClick={() => setDates((x) => x.filter((y) => y !== d))}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Sol: personel listesi */}
        <div className="card flex flex-col" style={{ maxHeight: 560 }}>
          <div className="border-b border-slate-200 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input className="input pl-9" placeholder="Ara (ad, sicil, departman)" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <button className="text-xs text-brand-600 hover:underline" onClick={() => setPasteOpen(true)}>
                <ClipboardPaste size={13} className="mr-1 inline" /> Excel'den sicil yapıştır
              </button>
              <span className="text-xs text-slate-400">{selected.size} seçili</span>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2" onContextMenu={openMenu}>
            {people.isLoading ? <Spinner /> : filtered.map((p) => (
              <div key={p.id}
                onClick={(e) => toggle(p.id, e)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  selected.has(p.id) ? 'bg-brand-600 text-white' : 'hover:bg-slate-100'
                }`}>
                <div>
                  <div className="font-medium">{p.fullName}</div>
                  <div className={`text-xs ${selected.has(p.id) ? 'text-brand-100' : 'text-slate-400'}`}>{p.sicilNo} • {p.department || '-'}</div>
                </div>
                {selected.has(p.id) && <Check size={16} />}
              </div>
            ))}
          </div>
          {selected.size > 0 && (
            <div className="border-t border-slate-200 p-2">
              <button className="btn-ghost w-full text-red-500" onClick={() => setSelected(new Set())}>Seçimi temizle</button>
            </div>
          )}
        </div>

        {/* Sağ: talimat + hızlı butonlar */}
        <div className="card p-6">
          <h3 className="mb-2 font-semibold text-slate-800">Nasıl kullanılır?</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Üstten atama yapılacak <b>tarihleri</b> ekleyin (tek gün veya aralık).</li>
            <li>Soldan <b>personelleri</b> tıklayarak çoklu seçin (veya Excel'den sicil yapıştırın).</li>
            <li>Personel listesine <b>sağ tıklayın</b> ve vardiyayı seçin — ya da aşağıdaki butonları kullanın.</li>
          </ol>
          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold uppercase text-slate-400">Seçilenleri vardiyaya ata</div>
            <div className="flex flex-wrap gap-2">
              {shifts.data?.filter((s) => s.isActive).map((s) => (
                <button key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
                  disabled={selected.size === 0 || dates.length === 0 || bulk.isPending}
                  onClick={() => bulk.mutate(s.id)}>
                  <span className="h-3 w-3 rounded-full" style={{ background: s.color || '#64748b' }} />
                  {s.name} <span className="text-xs text-slate-400">{s.startTime}-{s.endTime}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">{selected.size} personel × {dates.length} gün seçili.</p>
          </div>
        </div>
      </div>

      {/* Sağ tık menüsü */}
      {menu && (
        <div className="fixed z-50 min-w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
          style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-slate-100 px-3 py-1.5 text-xs text-slate-400">{selected.size} kişi • {dates.length} gün</div>
          {shifts.data?.filter((s) => s.isActive).map((s) => (
            <button key={s.id} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => bulk.mutate(s.id)}>
              <span className="h-3 w-3 rounded-full" style={{ background: s.color || '#64748b' }} />
              {s.startTime}-{s.endTime} {s.name} vardiyasına ata
            </button>
          ))}
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg">{toast}</div>}

      {/* Excel yapıştır */}
      <Modal open={pasteOpen} onClose={() => { setPasteOpen(false); setPasteResult(null); }} title="Excel'den Sicil Yapıştır"
        footer={<>
          <button className="btn-secondary" onClick={() => { setPasteOpen(false); setPasteResult(null); }}>Kapat</button>
          <button className="btn-primary" onClick={() => resolve.mutate()} disabled={resolve.isPending}>Listele & Seç</button>
        </>}>
        <Field label="Sicil numaraları" hint="Excel'den bir sütunu kopyalayıp yapıştırın (alt alta ya da virgüllü)">
          <textarea className="input font-mono" rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={'1001\n1002\n1006'} />
        </Field>
        {pasteResult && (
          <div className="mt-3 text-sm">
            <p className="text-emerald-600">Eşleşenler seçime eklendi.</p>
            {pasteResult.notFound.length > 0 && (
              <p className="mt-1 text-amber-600">Bulunamayan siciller: {pasteResult.notFound.join(', ')}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
