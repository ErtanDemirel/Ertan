import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, UserPlus } from 'lucide-react';
import { personnelApi, routeApi, shiftApi, PersonnelFilter } from '../api/services';
import type { Personnel } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';
import { useAuth } from '../auth/AuthContext';

const emptyForm = {
  sicilNo: '', firstName: '', lastName: '', nationalId: '', department: '',
  title: '', phoneNumber: '', email: '', hireDate: '', managerId: '', serviceRouteId: '',
  serviceStop: '', shiftId: '', exitDate: '', exitReason: '', annualLeaveDays: '14', isActive: true,
  createLoginAccount: false, username: '', initialPassword: '',
};

export default function PersonnelPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<PersonnelFilter>({ page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');

  const routes = useQuery({ queryKey: ['routes'], queryFn: () => routeApi.list() });
  const shifts = useQuery({ queryKey: ['shifts'], queryFn: () => shiftApi.list() });
  const managers = useQuery({
    queryKey: ['managers'],
    queryFn: () => personnelApi.list({ pageSize: 200 }),
  });
  const list = useQuery({
    queryKey: ['personnel', filter],
    queryFn: () => personnelApi.list(filter),
  });

  const save = useMutation({
    mutationFn: (body: any) =>
      editing ? personnelApi.update(editing.id, body) : personnelApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personnel'] });
      qc.invalidateQueries({ queryKey: ['managers'] });
      setModalOpen(false);
    },
    onError: (e) => setError(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => personnelApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['personnel'] }),
    onError: (e) => alert(apiError(e)),
  });

  const departments = useMemo(
    () => [...new Set((managers.data?.items || []).map((p) => p.department).filter(Boolean))] as string[],
    [managers.data]
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
    setModalOpen(true);
  }
  function openEdit(p: Personnel) {
    setEditing(p);
    setError('');
    setForm({
      ...emptyForm,
      sicilNo: p.sicilNo, firstName: p.firstName, lastName: p.lastName,
      nationalId: p.nationalId || '', department: p.department || '', title: p.title || '',
      phoneNumber: p.phoneNumber || '', email: p.email || '', hireDate: p.hireDate?.slice(0, 10) || '',
      managerId: p.managerId?.toString() || '', serviceRouteId: p.serviceRouteId?.toString() || '',
      serviceStop: p.serviceStop || '',
      shiftId: p.shiftId?.toString() || '',
      exitDate: p.exitDate?.slice(0, 10) || '', exitReason: p.exitReason || '',
      isActive: p.isActive,
    });
    setModalOpen(true);
  }

  function submit() {
    setError('');
    const base = {
      sicilNo: form.sicilNo, firstName: form.firstName, lastName: form.lastName,
      nationalId: form.nationalId || null, department: form.department || null,
      title: form.title || null, phoneNumber: form.phoneNumber || null, email: form.email || null,
      hireDate: form.hireDate || null,
      managerId: form.managerId ? Number(form.managerId) : null,
      serviceRouteId: form.serviceRouteId ? Number(form.serviceRouteId) : null,
      serviceStop: form.serviceStop || null,
      shiftId: form.shiftId ? Number(form.shiftId) : null,
    };
    if (editing) {
      save.mutate({
        ...base, isActive: form.isActive,
        exitDate: form.exitDate || null, exitReason: form.exitReason || null,
      });
    } else {
      save.mutate({
        ...base,
        annualLeaveDays: form.annualLeaveDays ? Number(form.annualLeaveDays) : null,
        createLoginAccount: form.createLoginAccount,
        username: form.username || null,
        initialPassword: form.initialPassword || null,
      });
    }
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Personel Yönetimi</h2>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Yeni Personel
        </button>
      </div>

      {/* Filtreler */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Ara (ad, soyad, sicil)</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setFilter((f) => ({ ...f, search, page: 1 }))}
              placeholder="Enter ile ara"
            />
          </div>
        </div>
        <div>
          <label className="label">Departman</label>
          <select className="input" value={filter.department || ''} onChange={(e) => setFilter((f) => ({ ...f, department: e.target.value || undefined, page: 1 }))}>
            <option value="">Tümü</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Vardiya</label>
          <select className="input" value={filter.shiftId || ''} onChange={(e) => setFilter((f) => ({ ...f, shiftId: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}>
            <option value="">Tümü</option>
            {shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Güzergah</label>
          <select className="input" value={filter.serviceRouteId || ''} onChange={(e) => setFilter((f) => ({ ...f, serviceRouteId: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}>
            <option value="">Tümü</option>
            {routes.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button className="btn-secondary" onClick={() => setFilter((f) => ({ ...f, search, page: 1 }))}>Filtrele</button>
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        {list.isLoading ? (
          <Spinner />
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState text="Kayıt bulunamadı." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">Sicil</th>
                  <th className="th">Ad Soyad</th>
                  <th className="th">Departman</th>
                  <th className="th">Ünvan</th>
                  <th className="th">Vardiya</th>
                  <th className="th">Güzergah</th>
                  <th className="th">Amir</th>
                  <th className="th">Durum</th>
                  <th className="th text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.data!.items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td font-mono">{p.sicilNo}</td>
                    <td className="td font-medium">{p.fullName}</td>
                    <td className="td">{p.department || '-'}</td>
                    <td className="td">{p.title || '-'}</td>
                    <td className="td">{p.shiftName || '-'}</td>
                    <td className="td">{p.serviceRouteName || '-'}</td>
                    <td className="td">{p.managerName || '-'}</td>
                    <td className="td">
                      <span className={`badge ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="td text-right">
                      <button className="btn-ghost !p-1.5" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                      {user?.role === 'Admin' && (
                        <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm(`${p.fullName} silinsin mi?`) && remove.mutate(p.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Sayfalama */}
        {list.data && list.data.total > list.data.pageSize && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">Toplam {list.data.total} kayıt</span>
            <div className="flex gap-2">
              <button className="btn-secondary" disabled={filter.page === 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) - 1 }))}>Önceki</button>
              <span className="px-2 py-2">Sayfa {list.data.page}</span>
              <button className="btn-secondary" disabled={(list.data.page * list.data.pageSize) >= list.data.total} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) + 1 }))}>Sonraki</button>
            </div>
          </div>
        )}
      </div>

      {/* Ekle/Düzenle Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Personel Düzenle' : 'Yeni Personel'}
        wide
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Vazgeç</button>
            <button className="btn-primary" onClick={submit} disabled={save.isPending}>Kaydet</button>
          </>
        }
      >
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sicil No *"><input className="input" value={form.sicilNo} onChange={(e) => set('sicilNo', e.target.value)} /></Field>
          <Field label="T.C. Kimlik No"><input className="input" value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} /></Field>
          <Field label="Ad *"><input className="input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Soyad *"><input className="input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
          <Field label="Departman"><input className="input" value={form.department} onChange={(e) => set('department', e.target.value)} /></Field>
          <Field label="Ünvan"><input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Telefon"><input className="input" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} /></Field>
          <Field label="E-posta"><input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="İşe Giriş Tarihi"><input type="date" className="input" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} /></Field>
          <Field label="Amir">
            <select className="input" value={form.managerId} onChange={(e) => set('managerId', e.target.value)}>
              <option value="">- Yok -</option>
              {managers.data?.items.filter((m) => m.id !== editing?.id).map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
          </Field>
          <Field label="Vardiya">
            <select className="input" value={form.shiftId} onChange={(e) => set('shiftId', e.target.value)}>
              <option value="">- Yok -</option>
              {shifts.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Servis Güzergahı">
            <select className="input" value={form.serviceRouteId} onChange={(e) => set('serviceRouteId', e.target.value)}>
              <option value="">- Yok -</option>
              {routes.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Bindiği Durak" hint="Servis analizi için"><input className="input" value={form.serviceStop} onChange={(e) => set('serviceStop', e.target.value)} /></Field>

          {editing && (
            <>
              <Field label="İşten Çıkış Tarihi" hint="Boşsa halen çalışıyor"><input type="date" className="input" value={form.exitDate} onChange={(e) => set('exitDate', e.target.value)} /></Field>
              <Field label="Çıkış Nedeni"><input className="input" value={form.exitReason} onChange={(e) => set('exitReason', e.target.value)} /></Field>
            </>
          )}

          {!editing && (
            <Field label="Yıllık İzin Hakkı (gün)"><input type="number" className="input" value={form.annualLeaveDays} onChange={(e) => set('annualLeaveDays', e.target.value)} /></Field>
          )}
          {editing && (
            <Field label="Durum">
              <select className="input" value={form.isActive ? '1' : '0'} onChange={(e) => set('isActive', e.target.value === '1')}>
                <option value="1">Aktif</option>
                <option value="0">Pasif</option>
              </select>
            </Field>
          )}
        </div>

        {!editing && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.createLoginAccount} onChange={(e) => set('createLoginAccount', e.target.checked)} />
              <UserPlus size={16} /> Mobil uygulama için giriş hesabı oluştur
            </label>
            {form.createLoginAccount && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Kullanıcı Adı"><input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} /></Field>
                <Field label="Geçici Şifre"><input className="input" value={form.initialPassword} onChange={(e) => set('initialPassword', e.target.value)} /></Field>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
