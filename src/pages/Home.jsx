import { Wrench, Mail, Clock, MapPin, Truck, MessageCircle, Database, User } from "lucide-react";
import HomeCard from "../components/HomeCard";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { useNotification } from "../context/NotificationContext";

export default function Home() {
  const { user } = useAuth();
  const { setNotification } = useNotification();
  useEffect(() => {
    let isMounted = true;
    let lastCount = 0;
    const fetchMessages = () => {
      fetch("http://localhost:3001/api/messaggi")
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          if (lastCount > 0 && data.length > lastCount) {
            const newMsgs = data.slice(lastCount);
            newMsgs.forEach(msg => {
              setNotification({ text: `${msg.sender?.nome}: ${msg.text}` });
            });
          }
          lastCount = data.length;
        });
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setNotification]);
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
