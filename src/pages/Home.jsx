import { Wrench, Mail, Clock, MapPin, Truck, MessageCircle, Database, User } from "lucide-react";
import HomeCard from "../components/HomeCard";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  return (
    <main className="flex-1 p-6">
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <HomeCard title="Pianificazione" desc="Pagina di gestione delle richieste e delle consegne." to="/pianificazione" icon={<Wrench />} />
        <HomeCard title="Richieste" desc="Pagina di gestione delle richieste. Qui è possibile creare le richieste e controllarne lo stato." to="/richieste" icon={<Mail />} />
        <HomeCard title="Stato Consegne" desc="Pagina di visualizzazione dello stato delle consegne." to="/stato-consegne" icon={<Clock />} />
        <HomeCard title="Posizioni" desc="Pagina di gestione delle destinazioni" to="/posizioni" icon={<MapPin />} />
        <HomeCard title="Autista" desc="Pagina di visualizzazione delle consegne per gli autisti" to="/autista" icon={<Truck />} />
        <HomeCard title="Chat" desc="Messaggistica istantanea interna" to="/chat" icon={<MessageCircle />} />
        {/* Card Gestione Utenti solo per admin */}
        {user?.role === "admin" && (
          <HomeCard title="Gestione Utenti" desc="Gestisci utenti e ruoli" to="/gestione-utenti" icon={<User />} />
        )}
        <HomeCard title="Amministratore" desc="Pannello di gestione database" to="/admin" icon={<Database />} />
      </div>
    </main>
  );
}
