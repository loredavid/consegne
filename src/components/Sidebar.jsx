import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Wrench, Mail, Clock, MapPin, Truck, MessageCircle, Database, ChevronLeft, ChevronRight } from "lucide-react";
import homeImage from '../assets/Image 30 giu 2025, 08_12_36.png';
import { useAuth } from "../context/AuthContext";
import { useUnreadMessages } from "../context/UnreadMessagesContext";

const menuItems = [
  { to: "/pianificazione", label: "Pianificazione", icon: <Wrench size={20} /> },
  { to: "/richieste", label: "Richieste", icon: <Mail size={20} /> },
  { to: "/stato-consegne", label: "Stato Consegne", icon: <Clock size={20} /> },
  { to: "/posizioni", label: "Posizioni", icon: <MapPin size={20} /> },
  { to: "/autista", label: "Autista", icon: <Truck size={20} /> },
  { to: "/chat", label: "Chat", icon: <MessageCircle size={20} /> },
  { to: "/admin", label: "Amministratore", icon: <Database size={20} /> },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true); // Sidebar collassata di default
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount, markAllRead } = useUnreadMessages();

  return (
    <aside className={`fixed inset-y-0 left-0 bg-white shadow p-4 flex flex-col justify-between transition-all duration-300 ${collapsed ? "min-w-[60px] w-[60px]" : "min-w-[220px] w-[220px]"}`}>
      <div>
        <Link
          to="/"
          className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 font-semibold transition-all duration-200 ${collapsed ? "justify-center" : ""}`}
        >
          <img
            src={homeImage}
            alt="Home"
            className={collapsed ? "w-8 h-8 object-contain" : "w-5 h-5 object-contain"}
            style={collapsed ? { minWidth: '32px', minHeight: '32px' } : {}}
          />
          {!collapsed && <span>Home</span>}
        </Link>
        <button
          className="mt-2 flex items-center justify-center"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Espandi sidebar" : "Collassa sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="flex flex-col gap-4">
        <hr className="my-2" />
        {menuItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-all duration-200 ${collapsed ? "justify-center" : ""}`}
            onClick={() => { if (item.to === "/chat") markAllRead(); }}
          >
            {item.icon}
            {item.to === "/chat" && unreadCount > 0 && (
              <span className="ml-1 bg-red-600 text-white rounded-full px-2 py-0.5 text-xs font-bold animate-bounce">
                {unreadCount}
              </span>
            )}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
        {/* Pulsante gestione utenti visibile solo ad admin */}
        {user?.role === "admin" && (
          <Link
            to="/gestione-utenti"
            className={`flex items-center gap-2 p-2 rounded hover:bg-blue-100 font-semibold transition-all duration-200 ${collapsed ? "justify-center" : ""}`}
          >
            <User size={20} />
            {!collapsed && <span>Gestione Utenti</span>}
          </Link>
        )}
      </nav>
      {/* Sezione info utente loggato in basso */}
      {user && (
        <div className={`mt-6 mb-2 p-3 rounded bg-gray-50 flex items-center gap-2 ${collapsed ? "flex-col items-center" : ""}`} style={{ minHeight: collapsed ? 60 : 80 }}>
          {/* Cerchio con iniziali utente */}
          <div
            className="flex items-center justify-center rounded-full bg-blue-600 text-white font-bold"
            style={{ width: collapsed ? 36 : 40, height: collapsed ? 36 : 40, fontSize: collapsed ? 18 : 20 }}
            aria-label={user.nome}
          >
            {user.nome
              ? user.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
              : ''}
          </div>
          {!collapsed ? (
            <div className="flex flex-col text-xs text-gray-700">
              <span className="font-bold">{user.nome}</span>
              <span className="capitalize">{user.role}</span>
              <span className="text-gray-500">{user.mail}</span>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="mt-2 px-3 py-1 rounded bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 w-fit"
              >
                Logout
              </button>
            </div>
          ) : (
            <span className="sr-only">{user.nome}</span>
          )}
        </div>
      )}
    </aside>
  );
}