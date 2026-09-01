import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import { mealApi } from '../api/services';
import type { MealMenu } from '../api/types';
import { apiError } from '../api/client';
import { Modal, Field, Spinner, EmptyState } from '../components/ui';

const empty = { date: '', soup: '', mainCourse: '', sideDish: '', complement: '', dessert: '', alternative: '', calories: '' };

export default function MealsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MealMenu | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [error, setError] = useState('');

  const list = useQuery({ queryKey: ['meals'], queryFn: () => mealApi.list() });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, calories: form.calories ? Number(form.calories) : null };
      return editing ? mealApi.update(editing.id, body) : mealApi.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); setOpen(false); },
    onError: (e) => setError(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => mealApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  function openCreate() {
    setEditing(null);
    setForm({ ...empty, date: new Date().toISOString().slice(0, 10) });
    setError(''); setOpen(true);
  }
  function openEdit(m: MealMenu) {
    setEditing(m); setError('');
    setForm({
      date: m.date, soup: m.soup || '', mainCourse: m.mainCourse || '', sideDish: m.sideDish || '',
      complement: m.complement || '', dessert: m.dessert || '', alternative: m.alternative || '',
      calories: m.calories?.toString() || '',
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Yemek Listesi</h2>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} /> Menü Ekle</button>
      </div>

      {list.isLoading ? <Spinner /> : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text="Bu dönem için menü girilmemiş." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.data!.map((m) => (
            <div key={m.id} className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="text-brand-600" size={18} />
                  <h3 className="font-semibold text-slate-800">{new Date(m.date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                </div>
                <div>
                  <button className="btn-ghost !p-1.5" onClick={() => openEdit(m)}><Pencil size={15} /></button>
                  <button className="btn-ghost !p-1.5 text-red-500" onClick={() => confirm('Menü silinsin mi?') && remove.mutate(m.id)}><Trash2 size={15} /></button>
                </div>
              </div>
              <ul className="space-y-1 text-sm text-slate-600">
                {m.soup && <li>🥣 {m.soup}</li>}
                {m.mainCourse && <li>🍲 {m.mainCourse}</li>}
                {m.sideDish && <li>🍚 {m.sideDish}</li>}
                {m.complement && <li>🥗 {m.complement}</li>}
                {m.dessert && <li>🍮 {m.dessert}</li>}
                {m.alternative && <li className="text-slate-400">Alternatif: {m.alternative}</li>}
              </ul>
              {m.calories && <p className="mt-2 text-xs text-slate-400">~{m.calories} kcal</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Menü Düzenle' : 'Yeni Menü'}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Vazgeç</button>
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</button>
        </>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tarih *"><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} disabled={!!editing} /></Field>
          <Field label="Kalori"><input type="number" className="input" value={form.calories} onChange={(e) => set('calories', e.target.value)} /></Field>
          <Field label="Çorba"><input className="input" value={form.soup} onChange={(e) => set('soup', e.target.value)} /></Field>
          <Field label="Ana Yemek"><input className="input" value={form.mainCourse} onChange={(e) => set('mainCourse', e.target.value)} /></Field>
          <Field label="Yan Yemek"><input className="input" value={form.sideDish} onChange={(e) => set('sideDish', e.target.value)} /></Field>
          <Field label="Tamamlayıcı"><input className="input" value={form.complement} onChange={(e) => set('complement', e.target.value)} /></Field>
          <Field label="Tatlı"><input className="input" value={form.dessert} onChange={(e) => set('dessert', e.target.value)} /></Field>
          <Field label="Alternatif (vejetaryen)"><input className="input" value={form.alternative} onChange={(e) => set('alternative', e.target.value)} /></Field>
        </div>
      </Modal>
    </div>
  );
}
