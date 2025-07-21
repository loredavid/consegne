import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

export default function StatoConsegne() {
  const [spedizioni, setSpedizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const navigate = useNavigate();
  const { setNotification } = useNotification();
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      let isMounted = true;
      let lastCount = 0;
      const fetchMessages = () => {
        fetch("http://localhost:3001/api/messaggi", {
          headers: { Authorization: `Bearer ${token}` }
        })
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
    }
  }, [setNotification, user, token]);

  useEffect(() => {
    if (user && token) {
      fetch("http://localhost:3001/api/spedizioni", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setSpedizioni(data);
          setLoading(false);
        })
        .catch(() => {
          setError("Errore nel caricamento delle spedizioni");
          setLoading(false);
        });
    }
  }, []);

  // Filtra le spedizioni
  const spedizioniFiltrate = spedizioni.filter(s => {
    const testo = `${s.aziendaDestinazione || ""} ${s.indirizzo || ""} ${s.autista?.nome || ""} ${s.richiedente?.nome || ""} ${s.note || ""}`.toLowerCase();
    const matchSearch = search === "" || testo.includes(search.toLowerCase());
    const matchStato = filtroStato === "" || s.status === filtroStato;
    const matchTipo = filtroTipo === "" || s.tipo === filtroTipo;
    return matchSearch && matchStato && matchTipo;
  });

  // Raggruppa per stato
  const gruppi = {
    "In attesa": spedizioniFiltrate.filter(s => s.status === "In attesa"),
    "In consegna": spedizioniFiltrate.filter(s => s.status === "In consegna"),
    "Consegnata": spedizioniFiltrate.filter(s => s.status === "Consegnata"),
    "Fallita": spedizioniFiltrate.filter(s => s.status === "Fallita"),
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Stato Consegne</h1>
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per destinazione, indirizzo, autista, richiedente, note..."
          className="border rounded p-2 min-w-[220px]"
        />
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} className="border rounded p-2">
          <option value="">Tutti gli stati</option>
          <option value="In attesa">In attesa</option>
          <option value="In consegna">In consegna</option>
          <option value="Consegnata">Consegnata</option>
          <option value="Fallita">Fallita</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border rounded p-2">
          <option value="">Tutti i tipi</option>
          <option value="consegna">Consegna</option>
          <option value="ritiro">Ritiro</option>
          <option value="entrambi">Entrambi</option>
        </select>
      </div>
      {loading ? (
        <div className="text-blue-600">Caricamento...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        Object.entries(gruppi).map(([stato, lista]) => (
          <div key={stato} className="mb-8">
            <h2 className="text-xl font-bold mb-2">{stato}</h2>
            {lista.length === 0 ? (
              <div className="text-gray-400">Nessuna consegna</div>
            ) : (
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="text-left px-2">Data richiesta</th>
                    <th className="text-left px-2">Destinazione</th>
                    <th className="text-left px-2">Tipo</th>
                    <th className="text-left px-2">Autista</th>
                    <th className="text-left px-2">Richiedente</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(s => (
                    <tr key={s.id} className="bg-white hover:bg-gray-50 rounded shadow-sm cursor-pointer" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                      <td className="px-2 py-2 text-sm">{s.dataRichiesta ? new Date(s.dataRichiesta).toLocaleString() : ""}</td>
                      <td className="px-2 py-2 text-sm">{s.aziendaDestinazione || s.indirizzo}</td>
                      <td className="px-2 py-2 text-sm">{s.tipo}</td>
                      <td className="px-2 py-2 text-sm">{s.autista?.nome || "-"}</td>
                      <td className="px-2 py-2 text-sm">{s.richiedente?.nome || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </div>
  );
}
