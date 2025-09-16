import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
import SpedizioneDettaglioMobile from "./pages/SpedizioneDettaglioMobile";
import PosizioneDettaglio from "./pages/PosizioneDettaglio";
import ChatMobile from "./pages/ChatMobile";
import PreparazioneMagazzino from "./pages/PreparazioneMagazzino";
import PushDebug from "./components/PushDebug";
import SpedizioniMappa from "./pages/SpedizioniMappa";
import SpedizioniMappaAdmin from "./pages/SpedizioniMappaAdmin";
import { NotificationProvider } from "./context/NotificationContext";
import NotificationBanner from "./components/NotificationBanner";
import { SidebarProvider } from "./context/LayoutContext.jsx";
import { UnreadMessagesProvider } from "./context/UnreadMessagesContext";
import { useAuth } from "./context/AuthContext";
import { useEffect } from "react";

export const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://ideal-space-carnival-p4g9q6q659c7w7q-3001.app.github.dev';

function ProtectedRoute({ allowedRoles, children }) {
  const { user, error } = useAuth();
  
  // Se c'è un errore di sessione scaduta, reindirizza al login
  if (error === "Sessione scaduta") {
    return <Navigate to="/login" replace />;
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
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
                <Route path="/autista/mappa" element={
                  <ProtectedRoute allowedRoles={["admin", "autista"]}>
                    <SpedizioniMappa />
                  </ProtectedRoute>
                } />
                <Route path="/spedizioni/mappa" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore", "richiedente"]}>
                    <SpedizioniMappaAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/pianificazione" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore"]}>
                    <Pianificazione />
                  </ProtectedRoute>
                } />
                <Route path="/preparazione-magazzino" element={
                  <ProtectedRoute allowedRoles={["admin", "pianificatore"]}>
                    <PreparazioneMagazzino />
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
                <Route path="/chat-mobile" element={
                  <ProtectedRoute allowedRoles={["admin", "autista"]}>
                    <ChatMobile />
                  </ProtectedRoute>
                } />
                <Route path="/spedizioni-mobile/:id" element={
                  <ProtectedRoute allowedRoles={["autista"]}>
                    <SpedizioneDettaglioMobile />
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
                <Route path="/push-debug" element={<PushDebug />} />
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
