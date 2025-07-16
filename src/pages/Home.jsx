import { Wrench, Mail, Clock, MapPin, Truck, MessageCircle, Database } from "lucide-react";
import HomeCard from "../components/HomeCard";

export default function Home() {
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <HomeCard title="Pianificazione" desc="Pagina di gestione delle richieste e delle consegne." to="/pianificazione" icon={<Wrench />} />
        <HomeCard title="Richieste" desc="Pagina di gestione delle richieste. Qui è possibile creare le richieste e controllarne lo stato." to="/richieste" icon={<Mail />} />
        <HomeCard title="Stato Consegne" desc="Pagina di visualizzazione dello stato delle consegne." to="/stato-consegne" icon={<Clock />} />
        <HomeCard title="Posizioni" desc="Pagina di gestione delle destinazioni" to="/posizioni" icon={<MapPin />} />
        <HomeCard title="Autista" desc="Pagina di visualizzazione delle consegne per gli autisti" to="/autista" icon={<Truck />} />
        <HomeCard title="Chat" desc="Messaggistica istantanea interna" to="/chat" icon={<MessageCircle />} />
      </div>
      <div className="mt-10 flex justify-center">
        <HomeCard title="Amministratore" desc="Pannello di gestione database" to="/admin" icon={<Database />} />
      </div>
    </div>
  );
}
