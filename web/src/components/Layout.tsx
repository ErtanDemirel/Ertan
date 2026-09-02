import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarClock, CalendarDays, Megaphone,
  UtensilsCrossed, Bus, MapPin, LogOut, ClipboardCheck, ShieldCheck,
  Wallet, UserPlus, BarChart3,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const nav = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/personnel', label: 'Personel', icon: Users },
  { to: '/shifts', label: 'Vardiya', icon: CalendarClock },
  { to: '/leave', label: 'İzin Yönetimi', icon: CalendarDays },
  { to: '/payroll', label: 'Bordro', icon: Wallet },
  { to: '/candidates', label: 'Aday Yönetimi', icon: UserPlus },
  { to: '/announcements', label: 'Duyurular', icon: Megaphone },
  { to: '/meals', label: 'Yemek Listesi', icon: UtensilsCrossed },
  { to: '/routes', label: 'Servis Güzergahları', icon: Bus },
  { to: '/service-analytics', label: 'Servis Analizi', icon: BarChart3 },
  { to: '/locations', label: 'Lokasyon & QR', icon: MapPin },
  { to: '/attendance', label: 'Mesai Kayıtları', icon: ClipboardCheck },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col bg-slate-900 text-slate-300">
        <div className="flex items-center gap-2 px-5 py-4 text-white">
          <ShieldCheck className="text-brand-500" />
          <span className="text-lg font-bold tracking-tight">COKO-SİS</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
          <div className="font-medium text-slate-200">{user?.fullName || user?.username}</div>
          <div className="capitalize">{user?.role === 'Admin' ? 'Yönetici' : 'Amir'}</div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <h1 className="text-sm font-medium text-slate-500">COKO-SİS — Personel Devam Kontrol Sistemi</h1>
          <button
            className="btn-secondary"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={16} /> Çıkış
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
