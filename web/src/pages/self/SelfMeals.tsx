import { useQuery } from '@tanstack/react-query';
import { UtensilsCrossed } from 'lucide-react';
import { mealApi } from '../../api/services';
import { Spinner, EmptyState } from '../../components/ui';

export default function SelfMeals() {
  const meals = useQuery({ queryKey: ['meals'], queryFn: () => mealApi.list() });
  if (meals.isLoading) return <Spinner />;
  if ((meals.data?.length ?? 0) === 0) return <EmptyState text="Bu dönem için menü girilmemiş." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {meals.data!.map((m) => (
        <div key={m.id} className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <UtensilsCrossed className="text-brand-600" size={16} />
            <h3 className="font-semibold text-slate-800">
              {new Date(m.date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
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
  );
}
