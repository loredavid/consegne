import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Nasconde la sidebar per autista/admin nelle pagine /autista, /chat-mobile e per tutti su /login
  const hideSidebarRoutes = ["/autista", "/chat-mobile", "/login", "/spedizioni-mobile/"];
  const shouldHideSidebar = hideSidebarRoutes.some(route => location.pathname.startsWith(route));

  if (shouldHideSidebar) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header solo per autista/admin, non per login */}
        {location.pathname !== "/login" && (
          <div className="bg-white shadow-sm border-b px-4 py-2 fixed top-0 left-0 w-full z-20">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Benvenuto, <span className="font-medium">{user.nome}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Pulsante chat mobile solo per autista e admin */}
                {(user.role === "autista" || user.role === "admin") && (
                  <>
                    <button
                      onClick={() => window.location.href = "/chat-mobile"}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded font-semibold shadow"
                      aria-label="Chat Mobile"
                    >
                      <span className="material-icons text-base align-middle mr-1">chat</span>
                      Chat
                    </button>
                    {/* Pulsante torna alle consegne solo per autista e solo su chat-mobile */}
                    {user.role === "autista" && location.pathname === "/chat-mobile" && (
                      <button
                        onClick={() => window.location.href = "/autista"}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-semibold shadow"
                        aria-label="Torna alle consegne"
                      >
                        <span className="material-icons text-base align-middle mr-1">arrow_back</span>
                        Consegne
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => {
                    if (window.confirm("Vuoi disconnetterti?")) {
                      logout();
                      window.location.href = "/login";
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Disconnetti
                </button>
              </div>
            </div>
          </div>
        )}
        <main className={location.pathname !== "/login" ? "min-h-screen pt-[48px]" : "min-h-screen"}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 ml-[220px] transition-all duration-300">
        {children}
      </main>
    </div>
  );
}