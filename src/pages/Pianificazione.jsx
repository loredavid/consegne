import { useEffect, useState } from "react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../App";
import SpedizioneEditModal from "../components/SpedizioneEditModal";
import useChatNotifications from "../hooks/useChatNotifications";
import SpedizioniCalendar from "../components/SpedizioniCalendar";
function isMobile() {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent);
}

export default function Pianificazione() {
  const { notification, setNotification } = useNotification();
  const { user, token } = useAuth();
  const [mobile, setMobile] = useState(false);

  // Abilita notifiche chat in background
  useChatNotifications({
    pollInterval: 5000,
    enablePushNotifications: true
  });
  const [spedizioni, setSpedizioni] = useState([]);
  const [editSpedizione, setEditSpedizione] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  useEffect(() => {
    if (user && token) {
      // Se c'è una notifica di nuova richiesta, rimuovila entrando in questa pagina
      if (notification?.type === "spedizione") setNotification(null);
      const fetchSpedizioni = () => {
        fetch(`${BASE_URL}/api/spedizioni`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setSpedizioni(data));
      };
      fetchSpedizioni();
      const interval = setInterval(fetchSpedizioni, 2000);
      return () => clearInterval(interval);
    }
  }, [user, token, notification, setNotification]);

  useEffect(() => {
    if (user && token) {
      let isMounted = true;
      let lastCount = 0;
      const fetchMessages = () => {
        fetch(`${BASE_URL}/api/messaggi`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((res) => res.json())
          .then((data) => {
            if (!isMounted) return;
            if (lastCount > 0 && data.length > lastCount) {
              const newMsgs = data.slice(lastCount);
              newMsgs.forEach((msg) => {
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

  // Filtri
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [autista, setAutista] = useState("");

  // Da pianificare: flag daPianificare true
  const daPianificare = spedizioni.filter(s =>
    s.daPianificare === true &&
    s.status !== "Consegnata" &&
    (search === "" || (s.aziendaDestinazione?.toLowerCase().includes(search.toLowerCase()) || s.status?.toLowerCase().includes(search.toLowerCase()))) &&
    (tipo === "" || s.tipo === tipo) &&
    (autista === "" || (s.autista?.nome === autista))
  );
  // Pianificate: flag daPianificare false
  const pianificate = spedizioni.filter(s =>
    s.daPianificare === false &&
    s.status !== "Consegnata" &&
    (search === "" || (s.aziendaDestinazione?.toLowerCase().includes(search.toLowerCase()) || s.status?.toLowerCase().includes(search.toLowerCase()))) &&
    (tipo === "" || s.tipo === tipo) &&
    (autista === "" || (s.autista?.nome === autista))
  );

  const handleEdit = spedizione => setEditSpedizione(spedizione);
  const handleCloseModal = () => setEditSpedizione(null);
  const handleSave = async (form) => {
    try {
      if (!user || !token) throw new Error("Non autenticato");
      const res = await fetch(`${BASE_URL}/api/spedizioni/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error();
      setSuccess("Spedizione aggiornata!");
      setEditSpedizione(null);
      // Aggiorna lista
      fetch(`${BASE_URL}/api/spedizioni`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setSpedizioni(data));

      // Invia messaggio in chat se la spedizione è stata pianificata (daPianificare diventa false)
      if (form.daPianificare === false && user && token) {
        const msg = {
          sender: { nome: "Sistema" },
          text:
            `Spedizione pianificata:\n` +
            `Destinazione: ${form.aziendaDestinazione || "-"}\n` +
            `Indirizzo: ${form.indirizzo || "-"}\n` +
            `Data: ${form.dataPianificata ? new Date(form.dataPianificata).toLocaleString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}\n` +
            `Autista: ${form.autista?.nome || "-"}\n` +
            `Tipo: ${form.tipo || "-"}\n` +
            `Richiedente: ${form.richiedente?.nome || form.richiedente || "-"}`,
          spedizioneId: form.id
        };
        await fetch(`${BASE_URL}/api/messaggi`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(msg)
        });
      }
    } catch {
      setError("Errore nell'aggiornamento della spedizione");
    }
  };

  return (
    <div className={mobile ? "w-full min-h-screen flex flex-col bg-gray-50" : "px-0 w-full"}>
      <div className={mobile ? "sticky top-0 bg-white z-10 px-4 py-3 border-b flex items-center justify-between" : "mb-6"}>
        <h1 className={mobile ? "text-xl font-bold" : "text-2xl font-bold"}>Pianificazione</h1>
      </div>
      {success && <div className={mobile ? "text-green-600 mb-2 px-4" : "text-green-600 mb-2 px-2"}>{success}</div>}
      {error && <div className={mobile ? "text-red-600 mb-2 px-4" : "text-red-600 mb-2 px-2"}>{error}</div>}
      <div className={mobile ? "mb-8 w-full px-0" : "mb-8"}>
        {/* Filtri Da pianificare */}
        <div className={mobile ? "flex flex-col gap-2 px-4 mb-4" : "flex gap-4 mb-4 items-center"}>
          <input
            type="text"
            placeholder="Cerca destinazione o stato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-base w-48"
          />
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="border rounded px-3 py-2 text-base w-40">
            <option value="">Tutti i tipi</option>
            <option value="Ritiro">Ritiro</option>
            <option value="Consegna">Consegna</option>
            <option value="Altro">Altro</option>
          </select>
          <select value={autista} onChange={e => setAutista(e.target.value)} className="border rounded px-3 py-2 text-base w-40">
            <option value="">Tutti gli autisti</option>
            {spedizioni.map(s => s.autista?.nome).filter((v, i, arr) => v && arr.indexOf(v) === i).map(nome => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
        <h2 className={mobile ? "text-lg font-bold mb-2 px-4" : "text-2xl font-bold mb-4"}>Da pianificare</h2>
        {mobile ? (
          <div className="flex flex-col gap-3 px-2">
            {daPianificare.map(s => {
              const dt = s.dataPianificata ? new Date(s.dataPianificata) : null;
              const now = new Date();
              const isCompletata = s.status && (s.status.toLowerCase().includes("completata") || s.status.toLowerCase().includes("consegnata"));
              const isLate = dt && dt < now && !isCompletata;
              return (
                <div key={s.id} className="bg-white rounded-xl shadow p-3 flex flex-col gap-1 cursor-pointer" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg">🕒</span>
                    <button className="text-blue-600 hover:text-blue-800 px-2 py-1 border rounded text-sm" onClick={e => { e.stopPropagation(); handleEdit(s); }}>Pianifica</button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm mt-1">
                    <span className={isLate ? "bg-red-100 text-red-600 rounded px-2 py-1 font-semibold" : "bg-green-100 text-green-600 rounded px-2 py-1 font-semibold"}>{dt ? dt.toLocaleDateString() : "-"}</span>
                    <span>{dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                    <span className="truncate">{s.aziendaDestinazione || "-"}</span>
                    <span>{s.status || "-"}</span>
                    <span>{s.tipo}</span>
                    <span className="truncate">{s.autista?.nome || "-"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="min-w-[1200px] border-separate border-spacing-y-2 table-fixed text-base" style={{ minWidth: "1200px" }}>
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="w-[40px]"> </th>
                  <th className="w-[140px]">DATA</th>
                  <th className="w-[100px]">ORA</th>
                  <th className="w-[250px]">DESTINAZIONE</th>
                  <th className="w-[140px]">STATO</th>
                  <th className="w-[100px]">TIPO</th>
                  <th className="w-[180px]">AUTISTA</th>
                  <th className="w-[180px]">RICHIEDENTE</th>
                  <th className="w-[60px]">PIANIFICA</th>
                </tr>
              </thead>
              <tbody>
                {daPianificare.map(s => {
                  const dt = s.dataPianificata ? new Date(s.dataPianificata) : null;
                  const now = new Date();
                  const isCompletata = s.status && (s.status.toLowerCase().includes("completata") || s.status.toLowerCase().includes("consegnata"));
                  const isLate = dt && dt < now && !isCompletata;
                  return (
                    <tr key={s.id} className="bg-white hover:bg-blue-50 rounded shadow-lg text-base cursor-pointer group" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                      <td className="px-2 py-3">🕒</td>
                      <td className="px-2 py-3">
                        <span className={isLate ? "bg-red-100 text-red-600 rounded px-2 py-1 text-xs font-semibold" : "bg-green-100 text-green-600 rounded px-2 py-1 text-xs font-semibold"}>{dt ? dt.toLocaleDateString() : "-"}</span>
                      </td>
                      <td className="px-2 py-3">{dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                      <td className="px-2 py-3 truncate">{s.aziendaDestinazione || "-"}</td>
                      <td className="px-2 py-3">{s.status || "-"}</td>
                      <td className="px-2 py-3">{s.tipo}</td>
                      <td className="px-2 py-3 truncate">{s.autista?.nome || "-"}</td>
                      <td className="px-2 py-3 truncate">{s.richiedente?.nome || s.richiedente || "-"}</td>
                      <td className="px-2 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 px-2 py-1 border rounded" onClick={e => { e.stopPropagation(); handleEdit(s); }}>Pianifica</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className={mobile ? "mb-8 w-full px-0" : "mb-8"}>
        {/* Filtri Pianificate */}
        <div className={mobile ? "flex flex-col gap-2 px-4 mb-4" : "flex gap-4 mb-4 items-center"}>
          <input
            type="text"
            placeholder="Cerca destinazione o stato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-base w-48"
          />
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="border rounded px-3 py-2 text-base w-40">
            <option value="">Tutti i tipi</option>
            <option value="Ritiro">Ritiro</option>
            <option value="Consegna">Consegna</option>
            <option value="Altro">Altro</option>
          </select>
          <select value={autista} onChange={e => setAutista(e.target.value)} className="border rounded px-3 py-2 text-base w-40">
            <option value="">Tutti gli autisti</option>
            {spedizioni.map(s => s.autista?.nome).filter((v, i, arr) => v && arr.indexOf(v) === i).map(nome => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        </div>
        <h2 className={mobile ? "text-lg font-bold mb-2 px-4" : "text-2xl font-bold mb-4"}>Pianificate</h2>
        {mobile ? (
          <div className="flex flex-col gap-3 px-2">
            {pianificate.map(s => {
              const dt = s.dataPianificata ? new Date(s.dataPianificata) : null;
              const now = new Date();
              const isCompletata = s.status && (s.status.toLowerCase().includes("completata") || s.status.toLowerCase().includes("consegnata"));
              const isLate = dt && dt < now && !isCompletata;
              return (
                <div key={s.id} className="bg-white rounded-xl shadow p-3 flex flex-col gap-1 cursor-pointer" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg">✅</span>
                    <button className="text-blue-600 hover:text-blue-800 px-2 py-1 border rounded text-sm" onClick={e => { e.stopPropagation(); handleEdit(s); }}>Pianifica</button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm mt-1">
                    <span className={isLate ? "bg-red-100 text-red-600 rounded px-2 py-1 font-semibold" : "bg-green-100 text-green-600 rounded px-2 py-1 font-semibold"}>{dt ? dt.toLocaleDateString() : "-"}</span>
                    <span>{dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                    <span className="truncate">{s.aziendaDestinazione || "-"}</span>
                    <span>{s.status || "-"}</span>
                    <span>{s.tipo}</span>
                    <span className="truncate">{s.autista?.nome || "-"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="min-w-[1200px] border-separate border-spacing-y-2 table-fixed text-base" style={{ minWidth: "1200px" }}>
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="w-[40px]"> </th>
                  <th className="w-[140px]">DATA</th>
                  <th className="w-[100px]">ORA</th>
                  <th className="w-[250px]">DESTINAZIONE</th>
                  <th className="w-[140px]">STATO</th>
                  <th className="w-[100px]">TIPO</th>
                  <th className="w-[180px]">AUTISTA</th>
                  <th className="w-[180px]">RICHIEDENTE</th>
                  <th className="w-[60px]">PIANIFICA</th>
                </tr>
              </thead>
              <tbody>
                {pianificate.map(s => {
                  const dt = s.dataPianificata ? new Date(s.dataPianificata) : null;
                  const now = new Date();
                  const isCompletata = s.status && (s.status.toLowerCase().includes("completata") || s.status.toLowerCase().includes("consegnata"));
                  const isLate = dt && dt < now && !isCompletata;
                  return (
                    <tr key={s.id} className="bg-white hover:bg-blue-50 rounded shadow-lg text-base cursor-pointer group" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                      <td className="px-2 py-3">✅</td>
                      <td className="px-2 py-3">
                        <span className={isLate ? "bg-red-100 text-red-600 rounded px-2 py-1 text-xs font-semibold" : "bg-green-100 text-green-600 rounded px-2 py-1 text-xs font-semibold"}>{dt ? dt.toLocaleDateString() : "-"}</span>
                      </td>
                      <td className="px-2 py-3">{dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                      <td className="px-2 py-3 truncate">{s.aziendaDestinazione || "-"}</td>
                      <td className="px-2 py-3">{s.status || "-"}</td>
                      <td className="px-2 py-3">{s.tipo}</td>
                      <td className="px-2 py-3 truncate">{s.autista?.nome || "-"}</td>
                      <td className="px-2 py-3 truncate">{s.richiedente?.nome || s.richiedente || "-"}</td>
                      <td className="px-2 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 px-2 py-1 border rounded" onClick={e => { e.stopPropagation(); handleEdit(s); }}>Pianifica</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editSpedizione && (
        <SpedizioneEditModal spedizione={editSpedizione} onClose={handleCloseModal} onSave={handleSave} />
      )}
      {/* Visualizzazione calendario settimanale */}
      <SpedizioniCalendar spedizioni={spedizioni}/>
    </div>
  );
}
