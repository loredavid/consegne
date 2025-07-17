import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Pianificazione from "./pages/Pianificazione";
import Richieste from "./pages/Richieste";
import StatoConsegne from "./pages/StatoConsegne";
import Posizioni from "./pages/Posizioni";
import Autista from "./pages/Autista";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import GestioneUtenti from "./pages/GestioneUtenti";
import SpedizioneDettaglio from "./pages/SpedizioneDettaglio";
import PosizioneDettaglio from "./pages/PosizioneDettaglio";
import { NotificationProvider } from "./context/NotificationContext";
import NotificationBanner from "./components/NotificationBanner";
import { SidebarProvider } from "./context/LayoutContext.jsx";
import { UnreadMessagesProvider } from "./context/UnreadMessagesContext";
import { useAuth } from "./context/AuthContext";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function App() {
  const { user } = useAuth();
  return (
    <Router>
      <NotificationProvider>
        <UnreadMessagesProvider user={user}>
          <NotificationBanner />
          <SidebarProvider>
            <Layout>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="/autista" element={
                  <ProtectedRoute allowedRoles={["admin", "autista"]}>
                    <Autista />
                  </ProtectedRoute>
                } />
                <Route path="/pianificazione" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore"]}>
                    <Pianificazione />
                  </ProtectedRoute>
                } />
                <Route path="/richieste" element={
                  <ProtectedRoute allowedRoles={["admin", "richiedente"]}>
                    <Richieste />
                  </ProtectedRoute>
                } />
                <Route path="/stato-consegne" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore", "richiedente"]}>
                    <StatoConsegne />
                  </ProtectedRoute>
                } />
                <Route path="/posizioni" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore", "richiedente", "autista"]}>
                    <Posizioni />
                  </ProtectedRoute>
                } />
                <Route path="/posizioni/:id" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore", "richiedente", "autista"]}>
                    <PosizioneDettaglio />
                  </ProtectedRoute>
                } />
                <Route path="/chat" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore", "richiedente", "autista"]}>
                    <Chat />
                  </ProtectedRoute>
                } />
                <Route path="/gestione-utenti" element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <GestioneUtenti />
                  </ProtectedRoute>
                } />
                <Route path="/spedizioni/:id" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore", "richiedente", "autista"]}>
                    <SpedizioneDettaglio />
                  </ProtectedRoute>
                } />
                <Route path="/" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore", "richiedente", "autista"]}>
                    <Home />
                  </ProtectedRoute>
                } />
              </Routes>
            </Layout>
          </SidebarProvider>
        </UnreadMessagesProvider>
      </NotificationProvider>
    </Router>
  );
}

export default App;
