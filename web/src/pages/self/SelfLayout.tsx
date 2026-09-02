import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarDays, Megaphone, UtensilsCrossed, Wallet, Bus, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

const tabs = [
  { to: '/me/leave', label: 'İzin Talebim', icon: CalendarDays },
  { to: '/me/announcements', label: 'Duyurular', icon: Megaphone },
  { to: '/me/meals', label: 'Yemek', icon: UtensilsCrossed },
  { to: '/me/payroll', label: 'Bordrom', icon: Wallet },
  { to: '/me/service', label: 'Servisim', icon: Bus },
];

export default function SelfLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-brand-500" />
            <span className="font-bold">COKO-SİS</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{user?.fullName || user?.username}</span>
            <button className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
              onClick={() => { logout(); navigate('/login'); }}>
              <LogOut size={14} className="mr-1 inline" /> Çıkış
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 ${
                  isActive ? 'border-brand-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}>
              <t.icon size={16} /> {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
