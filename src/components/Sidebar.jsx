import { useState } from "react";
import { Link } from "react-router-dom";
import { Home as HomeIcon, Wrench, Mail, Clock, MapPin, Truck, MessageCircle, Database, ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <aside className={`fixed inset-y-0 left-0 bg-white shadow p-4 transition-all duration-300 ${collapsed ? "min-w-[60px] w-[60px]" : "min-w-[220px] w-[220px]"}`}>
      <button
        className="mb-4 flex items-center justify-end w-full"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Espandi sidebar" : "Collassa sidebar"}
      >
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      <nav className="flex flex-col gap-4">
        <Link
          to="/"
          className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 font-semibold transition-all duration-200 ${collapsed ? "justify-center" : ""}`}
        >
          <HomeIcon size={20} />
          {!collapsed && <span>Home</span>}
        </Link>
        <hr className="my-2" />
        {menuItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-all duration-200 ${collapsed ? "justify-center" : ""}`}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}