import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Pencil, Trash2, MapPin, QrCode, LocateFixed } from 'lucide-react';
import { attendanceApi, locationApi } from '../api/services';
import type { WorkLocation } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';

const empty = { name: '', latitude: '', longitude: '', radiusMeters: '150', isActive: true };

export default function WorkLocationsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkLocation | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState('');
  const [qrFor, setQrFor] = useState<WorkLocation | null>(null);

  const list = useQuery({ queryKey: ['locations'], queryFn: () => locationApi.list() });
  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name, latitude: Number(form.latitude), longitude: Number(form.longitude), radiusMeters: Number(form.radiusMeters), isActive: form.isActive };
      return editing ? locationApi.update(editing.id, body) : locationApi.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['locations'] }); setOpen(false); },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => locationApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
    onError: (e) => alert(apiError(e)),
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  function openCreate() { setEditing(null); setForm({ ...empty }); setError(''); setOpen(true); }
  function openEdit(l: WorkLocation) {
    setEditing(l); setError('');
    setForm({ name: l.name, latitude: String(l.latitude), longitude: String(l.longitude), radiusMeters: String(l.radiusMeters), isActive: l.isActive });
    setOpen(true);
  }
  function useMyLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => alert('Konum alınamadı. Tarayıcı izni gerekebilir.')
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Lokasyon & QR Yönetimi</h2>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Yeni Lokasyon</button>
      </div>

      <p className="text-sm text-slate-500">
        Mesai girişleri yalnızca tanımlı lokasyonun yarıçapı içinden yapılabilir. Kiosk ekranında gösterilen QR kod her 30 saniyede yenilenir.
      </p>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Henüz lokasyon tanımlanmamış." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data!.map((l) => (
            <div key={l.id} className="card p-5">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="text-brand-600" size={18} />
                  <h3 className="font-semibold text-slate-800">{l.name}</h3>
                </div>
                <div>
                  <button className="btn-ghost !p-1.5" onClick={() => openEdit(l)}><Pencil size={15} /></button>
                  <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Lokasyon silinsin mi?') && remove.mutate(l.id)}><Trash2 size={15} /></button>
                </div>
              </div>
              <p className="text-xs text-slate-500">Enlem: {l.latitude}, Boylam: {l.longitude}</p>
              <p className="text-xs text-slate-500">Yarıçap: {l.radiusMeters} m</p>
              <button className="btn-secondary mt-3 w-full" onClick={() => setQrFor(l)}><QrCode size={16} /> Kiosk QR Göster</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Lokasyon Düzenle' : 'Yeni Lokasyon'}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</button>
        </>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <Field label="Lokasyon Adı *"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Enlem (latitude) *"><input className="input" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} /></Field>
            <Field label="Boylam (longitude) *"><input className="input" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} /></Field>
          </div>
          <button className="btn-secondary" onClick={useMyLocation} type="button"><LocateFixed size={16} /> Mevcut konumumu kullan</button>
          <Field label="İzin Yarıçapı (metre)" hint="Bu mesafe dışından giriş reddedilir."><input type="number" className="input" value={form.radiusMeters} onChange={(e) => set('radiusMeters', e.target.value)} /></Field>
        </div>
      </Modal>

      {qrFor && <KioskQr location={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}

function KioskQr({ location, onClose }: { location: WorkLocation; onClose: () => void }) {
  const qr = useQuery({
    queryKey: ['qr', location.id],
    queryFn: () => attendanceApi.qr(location.id),
  });

  return (
    <Modal open onClose={onClose} title={`Kiosk QR — ${location.name}`}>
      <div className="flex flex-col items-center gap-4 py-4">
        {qr.isLoading || !qr.data ? <Spinner /> : (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
              <QRCodeSVG value={qr.data.qrContent} size={240} level="M" />
            </div>
            <p className="text-sm text-slate-500">Bu QR sabittir; bir kez yazdırıp iş yerine asabilirsiniz. Personel mobil uygulamadan okutarak giriş/çıkış yapar (konum doğrulamalı).</p>
            <p className="text-xs text-slate-400">Sızıntı şüphesinde "QR anahtarını yenile" ile kodu geçersiz kılabilirsiniz.</p>
          </>
        )}
      </div>
    </Modal>
  );
}
