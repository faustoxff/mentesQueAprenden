import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Bot } from 'lucide-react';
import ChatSidebar from '../chat/ChatSidebar';

const TABS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/pacientes', label: 'Pacientes', icon: Users }
];

const tabClass = (active) =>
  `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
    active ? 'text-primary-600' : 'text-gray-500'
  }`;

export default function MainShell({ children }) {
  // En mobile se ve una sola cosa a la vez (contenido o chat); en desktop, las dos.
  const [verChat, setVerChat] = useState(false);
  const { pathname } = useLocation();

  // Navegar (desde la barra o desde un link del chat) vuelve al contenido.
  useEffect(() => { setVerChat(false); }, [pathname]);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-surface overflow-hidden">
      <ChatSidebar className={verChat ? 'flex' : 'hidden md:flex'} />
      <main className={`${verChat ? 'hidden md:block' : 'block'} flex-1 min-h-0 overflow-y-auto`}>
        {children}
      </main>

      <nav className="md:hidden flex flex-shrink-0 bg-white border-t border-gray-200" aria-label="Navegación principal">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClass(isActive && !verChat)}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setVerChat(true)} className={tabClass(verChat)} aria-label="Abrir chat con Menta">
          <Bot size={20} />
          Menta
        </button>
      </nav>
    </div>
  );
}
