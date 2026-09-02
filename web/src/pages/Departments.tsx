import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GitBranch, Building2, ArrowDown, Save } from 'lucide-react';
import { departmentApi, personnelApi } from '../api/services';
import type { Department } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState, Toggle } from '../components/ui';

const kindLabels: Record<string, string> = {
  DepartmentManager: 'Bölüm Yöneticisi',
  HrManager: 'İK Yöneticisi',
  FactoryManager: 'Fabrika Müdürü',
  SpecificPerson: 'Belirli Kişi',
};

interface Step { kind: string; specificPersonnelId?: number | null; infoOnly: boolean; }

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Department | null>(null);
  const [deptModal, setDeptModal] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', managerPersonnelId: '', isActive: true });

  const depts = useQuery({ queryKey: ['departments'], queryFn: () => departmentApi.list() });
  const people = useQuery({ queryKey: ['dept-people'], queryFn: () => personnelApi.list({ pageSize: 500 }) });

  const saveDept = useMutation({
    mutationFn: () => {
      const body = { name: form.name, managerPersonnelId: form.managerPersonnelId ? Number(form.managerPersonnelId) : null, isActive: form.isActive };
      return editDept ? departmentApi.update(editDept.id, body) : departmentApi.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setDeptModal(false); },
    onError: (e) => alert(apiError(e)),
  });
  const removeDept = useMutation({
    mutationFn: (id: number) => departmentApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); setSelected(null); },
    onError: (e) => alert(apiError(e)),
  });

  function openCreate() { setEditDept(null); setForm({ name: '', managerPersonnelId: '', isActive: true }); setDeptModal(true); }
  function openEdit(d: Department) { setEditDept(d); setForm({ name: d.name, managerPersonnelId: d.managerPersonnelId?.toString() || '', isActive: d.isActive }); setDeptModal(true); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800"><GitBranch size={20} /> Departmanlar & Onay Zinciri</h2>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Departman</button>
      </div>
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        Onay zinciri departman bazında tanımlanır; o departmandaki herkes (mavi yaka dahil) bu zinciri kullanır. Bir kişi izin/avans/masraf istediğinde talep, zincirdeki sıradaki kişiye düşer. "Bilgi" adımları onaylamaz, süreç bitince haber alır (örn. Fabrika Müdürü).
      </p>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="card overflow-hidden">
          {depts.isLoading ? <Spinner /> : (depts.data?.length ?? 0) === 0 ? (
            <EmptyState text="Departman yok." />
          ) : (
            <div className="divide-y divide-slate-100">
              {depts.data!.map((d) => (
                <div key={d.id} className={`flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-50 ${selected?.id === d.id ? 'bg-brand-50' : ''}`}
                  onClick={() => setSelected(d)}>
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-800">{d.name}</div>
                      <div className="text-xs text-slate-400">{d.managerName || 'yönetici yok'} • {d.stepCount} adım</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost !p-1 text-xs" onClick={(e) => { e.stopPropagation(); openEdit(d); }}>düzenle</button>
                    <button className="btn-ghost !p-1 text-red-500" onClick={(e) => { e.stopPropagation(); confirm('Departman silinsin mi?') && removeDept.mutate(d.id); }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          {selected ? (
            <ChainBuilder dept={selected} people={people.data?.items ?? []} />
          ) : (
            <div className="flex h-full min-h-40 items-center justify-center text-sm text-slate-400">Zinciri düzenlemek için soldan bir departman seçin.</div>
          )}
        </div>
      </div>

      <Modal open={deptModal} onClose={() => setDeptModal(false)} title={editDept ? 'Departman Düzenle' : 'Yeni Departman'}
        footer={<><button className="btn-secondary" onClick={() => setDeptModal(false)}>Vazgeç</button><button className="btn-primary" onClick={() => saveDept.mutate()} disabled={saveDept.isPending}>Kaydet</button></>}>
        <div className="space-y-3">
          <Field label="Departman Adı *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Departman Yöneticisi (Bölüm Yöneticisi)">
            <select className="input" value={form.managerPersonnelId} onChange={(e) => setForm({ ...form, managerPersonnelId: e.target.value })}>
              <option value="">- Yok -</option>
              {people.data?.items.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.sicilNo})</option>)}
            </select>
          </Field>
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Aktif" />
        </div>
      </Modal>
    </div>
  );
}

function ChainBuilder({ dept, people }: { dept: Department; people: { id: number; fullName: string; sicilNo: string }[] }) {
  const qc = useQueryClient();
  const tpl = useQuery({ queryKey: ['dept-template', dept.id], queryFn: () => departmentApi.template(dept.id) });
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (tpl.data) setSteps(tpl.data.map((s) => ({ kind: s.kind, specificPersonnelId: s.specificPersonnelId ?? null, infoOnly: s.infoOnly })));
  }, [tpl.data]);

  const save = useMutation({
    mutationFn: () => departmentApi.saveTemplate(dept.id, steps.map((s) => ({ kind: s.kind, specificPersonnelId: s.kind === 'SpecificPerson' ? s.specificPersonnelId ?? null : null, infoOnly: s.infoOnly }))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); qc.invalidateQueries({ queryKey: ['dept-template', dept.id] }); alert('Onay zinciri kaydedildi.'); },
    onError: (e) => alert(apiError(e)),
  });

  const addStep = () => setSteps((s) => [...s, { kind: 'DepartmentManager', infoOnly: false }]);
  const update = (i: number, patch: Partial<Step>) => setSteps((s) => s.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const remove = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const move = (i: number, dir: number) => setSteps((s) => {
    const n = [...s]; const j = i + dir; if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  if (tpl.isLoading) return <Spinner />;

  return (
    <div>
      <h3 className="mb-1 font-semibold text-slate-800">{dept.name} — Onay Zinciri</h3>
      <p className="mb-4 text-xs text-slate-400">Adımlar yukarıdan aşağıya sırayla onaylanır.</p>

      {steps.length === 0 && <p className="mb-3 text-sm text-slate-400">Henüz adım yok. Aşağıdan ekleyin. (Zincir boşsa talep otomatik onaylanır.)</p>}

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i}>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
              <select className="input max-w-[190px]" value={s.kind} onChange={(e) => update(i, { kind: e.target.value })}>
                {Object.entries(kindLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {s.kind === 'SpecificPerson' && (
                <select className="input max-w-[220px]" value={s.specificPersonnelId ?? ''} onChange={(e) => update(i, { specificPersonnelId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Kişi seç</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              )}
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input type="checkbox" checked={s.infoOnly} onChange={(e) => update(i, { infoOnly: e.target.checked })} /> Sadece bilgi
              </label>
              <div className="ml-auto flex gap-1">
                <button className="btn-ghost !p-1 text-xs" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                <button className="btn-ghost !p-1 text-xs" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>↓</button>
                <button className="btn-ghost !p-1 text-red-500" onClick={() => remove(i)}><Trash2 size={14} /></button>
              </div>
            </div>
            {i < steps.length - 1 && <div className="flex justify-center py-0.5 text-slate-300"><ArrowDown size={14} /></div>}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn-secondary" onClick={addStep}><Plus size={16} /> Adım Ekle</button>
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}><Save size={16} /> Zinciri Kaydet</button>
      </div>
    </div>
  );
}
