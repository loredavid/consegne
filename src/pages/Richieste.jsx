import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FaRegClock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { useContext } from "react";
import { SidebarContext } from "../context/LayoutContext.jsx";

export default function Richieste() {
  const { user } = useAuth();
  const { sidebarOpen } = useContext(SidebarContext);
  const [form, setForm] = useState({ destinazione: "", dataRichiesta: "", tipo: "consegna", status: "In attesa", note: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [destinazioni, setDestinazioni] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [spedizioni, setSpedizioni] = useState([]);
  const [filtroDestinazione, setFiltroDestinazione] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:3001/api/posizioni")
      .then(res => res.json())
      .then(data => setDestinazioni(data));
    fetch("http://localhost:3001/api/spedizioni")
      .then(res => res.json())
      .then(data => setSpedizioni(data));
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const refreshSpedizioni = () => {
    fetch("http://localhost:3001/api/spedizioni")
      .then(res => res.json())
      .then(data => setSpedizioni(data));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Trova la destinazione selezionata
      const dest = destinazioni.find(d => String(d.id) === String(form.destinazione));
      const payload = {
        aziendaDestinazione: dest?.azienda || "",
        indirizzo: dest?.indirizzo || "",
        dataRichiesta: form.dataRichiesta,
        tipo: form.tipo,
        status: form.status,
        daPianificare: true,
        richiedente: user ? { nome: user.nome, mail: user.mail, role: user.role } : null,
        note: form.note
      };
      const res = await fetch("http://localhost:3001/api/spedizioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      setSuccess("Richiesta di spedizione inviata!");
      setForm({ destinazione: "", dataRichiesta: "", tipo: "consegna", status: "In attesa", note: "" });
      setShowModal(false);
      refreshSpedizioni();
    } catch {
      setError("Errore nell'invio della richiesta");
    } finally {
      setSaving(false);
    }
  };

  // Raggruppa richieste per utente e pianificazione
  const isCompletata = s => s.status && s.status.toLowerCase().includes("completata");
  const mie = spedizioni.filter(s => s.richiedente && user && s.richiedente.mail === user.mail && !isCompletata(s));
  const altre = spedizioni.filter(s => (!s.richiedente || (user && s.richiedente.mail !== user.mail)) && !isCompletata(s));
  const daPianificare = lista => lista.filter(s => !(s.pianificata));
  const pianificate = lista => lista.filter(s => s.pianificata);

  // Funzione filtro
  const filtra = lista => {
    return lista.filter(s => {
      let matchDest = true;
      let matchData = true;
      if (filtroDestinazione) {
        matchDest = (s.aziendaDestinazione || "").toLowerCase().includes(filtroDestinazione.toLowerCase());
      }
      if (filtroData) {
        if (s.dataRichiesta) {
          const dataRichiesta = new Date(s.dataRichiesta);
          const dataFiltro = new Date(filtroData);
          matchData = dataRichiesta.toLocaleDateString() === dataFiltro.toLocaleDateString();
        } else {
          matchData = false;
        }
      }
      return matchDest && matchData;
    });
  };

  // Funzione per eliminare una spedizione
  const eliminaSpedizione = async id => {
    if (!window.confirm("Sei sicuro di voler eliminare questa richiesta di spedizione?")) return;
    try {
      const res = await fetch(`http://localhost:3001/api/spedizioni/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSuccess("Richiesta eliminata");
      refreshSpedizioni();
    } catch {
      setError("Errore nell'eliminazione della richiesta");
    }
  };

  return (
    <div className={`p-8 w-full transition-all duration-300 ${sidebarOpen ? "max-w-[1800px]" : "max-w-full"}`}> 
      <h1 className="text-2xl font-bold mb-4">Richieste di Spedizione</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mb-4" onClick={() => setShowModal(true)}>Nuova richiesta</button>
      {success && <div className="text-green-600 mb-2">{success}</div>}
      {/* Visualizzazione tabellare divisa */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-8">Le mie richieste</h2>
        <div className="flex flex-wrap gap-4 mb-8 items-center">
          <input
            type="text"
            placeholder="Filtra per destinazione..."
            className="border rounded p-2 min-w-[220px]"
            value={filtroDestinazione}
            onChange={e => setFiltroDestinazione(e.target.value)}
          />
          <input
            type="date"
            className="border rounded p-2 min-w-[160px]"
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
          />
          <button className="border rounded p-2 text-gray-500" onClick={() => { setFiltroDestinazione(""); setFiltroData(""); }}>Reset</button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setShowModal(true)}>+ Nuova</button>
        </div>
        <h3 className="text-xl font-bold mb-4">Da pianificare</h3>
        <div className="w-full">
          <table className="w-full border-separate border-spacing-y-2 table-fixed text-base">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="text-left w-[5%]"> </th>
                <th className="text-left w-[13%]">DATA</th>
                <th className="text-left w-[10%]">ORA</th>
                <th className="text-left w-[22%]">DESTINAZIONE</th>
                <th className="text-left w-[13%]">STATO</th>
                <th className="text-left w-[13%]">TIPO</th>
                <th className="text-left w-[12%]">AUTISTA</th>
              </tr>
            </thead>
            <tbody>
              {filtra(daPianificare(mie)).map(s => {
                const dt = s.dataRichiesta ? new Date(s.dataRichiesta) : null;
                return (
                  <tr key={s.id} className="bg-white hover:bg-blue-50 rounded shadow-lg text-base cursor-pointer group" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                    <td className="px-2 py-3"><FaRegClock className="inline text-gray-400" /></td>
                    <td className="px-2 py-3"><span className="bg-red-100 text-red-600 rounded px-2 py-1 text-xs font-semibold">{dt ? dt.toLocaleDateString() : "-"}</span></td>
                    <td className="px-2 py-3">{dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                    <td className="px-2 py-3 truncate">{s.aziendaDestinazione || "-"}</td>
                    <td className="px-2 py-3">{s.status || "-"}</td>
                    <td className="px-2 py-3">{s.tipo}</td>
                    <td className="px-2 py-3 truncate">{s.autista?.nome || "-"}</td>
                    <td className="px-2 py-3 text-right">
                      <button className="text-red-500 hover:text-red-700 px-2 py-1 border rounded" onClick={e => { e.stopPropagation(); eliminaSpedizione(s.id); }}>Elimina</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-8">Altre richieste</h2>
        <div className="flex flex-wrap gap-4 mb-8 items-center">
          <input
            type="text"
            placeholder="Filtra per destinazione..."
            className="border rounded p-2 min-w-[220px]"
            value={filtroDestinazione}
            onChange={e => setFiltroDestinazione(e.target.value)}
          />
          <input
            type="date"
            className="border rounded p-2 min-w-[160px]"
            value={filtroData}
            onChange={e => setFiltroData(e.target.value)}
          />
          <button className="border rounded p-2 text-gray-500" onClick={() => { setFiltroDestinazione(""); setFiltroData(""); }}>Reset</button>
        </div>
        <h3 className="text-xl font-bold mb-4">Da pianificare</h3>
        <div className="w-full">
          <table className="w-full border-separate border-spacing-y-2 table-fixed text-base">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="text-left w-[5%]"> </th>
                <th className="text-left w-[13%]">DATA</th>
                <th className="text-left w-[10%]">ORA</th>
                <th className="text-left w-[22%]">DESTINAZIONE</th>
                <th className="text-left w-[13%]">STATO</th>
                <th className="text-left w-[13%]">TIPO</th>
                <th className="text-left w-[12%]">AUTISTA</th>
                <th className="text-left w-[10%]">RICHIESTA DA</th>
              </tr>
            </thead>
            <tbody>
              {filtra(daPianificare(altre)).map(s => {
                const dt = s.dataRichiesta ? new Date(s.dataRichiesta) : null;
                return (
                  <tr key={s.id} className="bg-white hover:bg-gray-50 rounded shadow-lg text-base cursor-pointer" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                    <td className="px-2 py-3"><FaRegClock className="inline text-gray-400" /></td>
                    <td className="px-2 py-3"><span className="bg-red-100 text-red-600 rounded px-2 py-1 text-xs font-semibold">{dt ? dt.toLocaleDateString() : "-"}</span></td>
                    <td className="px-2 py-3">{dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</td>
                    <td className="px-2 py-3 truncate">{s.aziendaDestinazione || "-"}</td>
                    <td className="px-2 py-3">{s.status || "-"}</td>
                    <td className="px-2 py-3">{s.tipo}</td>
                    <td className="px-2 py-3 truncate">{s.autista?.nome || "-"}</td>
                    <td className="px-2 py-3 truncate">{s.richiedente?.nome || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl" onClick={() => setShowModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Nuova richiesta di spedizione</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label className="font-semibold">Destinazione
                <select name="destinazione" value={form.destinazione} onChange={handleChange} className="border p-2 rounded w-full mt-1" required>
                  <option value="">Seleziona destinazione...</option>
                  {destinazioni.map(d => (
                    <option key={d.id} value={d.id}>{d.azienda} - {d.indirizzo}</option>
                  ))}
                </select>
              </label>
              <label className="font-semibold">Data e ora richiesta
                <input name="dataRichiesta" type="datetime-local" className="border p-2 rounded w-full mt-1" value={form.dataRichiesta} onChange={handleChange} required />
              </label>
              <label className="font-semibold">Tipologia
                <select name="tipo" value={form.tipo} onChange={handleChange} className="border p-2 rounded w-full mt-1" required>
                  <option value="consegna">Consegna</option>
                  <option value="ritiro">Ritiro</option>
                  <option value="entrambi">Entrambi</option>
                </select>
              </label>
              <label className="font-semibold">Stato
                <select name="status" value={form.status} onChange={handleChange} className="border p-2 rounded w-full mt-1" required>
                  <option value="In attesa">In attesa</option>
                  <option value="In consegna">In consegna</option>
                </select>
              </label>
              <label className="font-semibold">Note
                <textarea name="note" value={form.note} onChange={handleChange} className="border p-2 rounded w-full mt-1" rows={3} placeholder="Aggiungi eventuali note..." />
              </label>
              {error && <div className="text-red-600">{error}</div>}
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={saving}>Invia Richiesta</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
