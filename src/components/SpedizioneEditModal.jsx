import { useState, useEffect } from "react";
import { initialUsers } from "../data/users";

export default function SpedizioneEditModal({ spedizione, onClose, onSave }) {
  const [form, setForm] = useState({ ...spedizione });
  const [posizioni, setPosizioni] = useState([]);
  const [autisti, setAutisti] = useState([]);
  useEffect(() => {
    fetch("http://localhost:3001/api/posizioni")
      .then(res => res.json())
      .then(data => setPosizioni(data));
    setAutisti(initialUsers.filter(u => u.role === "autista"));
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };
  const handleSubmit = e => {
    e.preventDefault();
    onSave(form);
  };
  const mobile = typeof window !== "undefined" && /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className={mobile ? "bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto p-0 relative border border-blue-100" : "bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl relative border border-blue-100"}>
        <div className={mobile ? "sticky top-0 bg-blue-50 rounded-t-2xl px-4 py-4 border-b flex items-center justify-between" : "flex items-center gap-3 mb-4 pb-2 border-b border-gray-200"}>
          <span className="material-icons text-blue-600 text-3xl">event</span>
          <h2 className={mobile ? "text-xl font-bold text-blue-700" : "text-2xl font-bold text-blue-700"}>Pianifica spedizione</h2>
          <button className={mobile ? "ml-auto text-gray-400 hover:text-blue-700 text-2xl font-bold px-2 py-1 rounded transition" : "ml-auto text-gray-400 hover:text-blue-700 text-2xl font-bold px-2 py-1 rounded transition"} onClick={onClose} aria-label="Chiudi">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={mobile ? "flex flex-col gap-4 px-4 py-4" : "flex flex-col gap-5"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="font-semibold">Destinazione
              <select
                name="indirizzo"
                value={form.indirizzo || ""}
                onChange={e => {
                  const selected = posizioni.find(p => p.indirizzo === e.target.value);
                  setForm(f => ({
                    ...f,
                    indirizzo: selected ? selected.indirizzo : e.target.value,
                    aziendaDestinazione: selected ? selected.azienda : f.aziendaDestinazione
                  }));
                }}
                className="border border-blue-200 p-3 rounded-lg w-full mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-300"
                required
              >
                <option value="">Seleziona destinazione...</option>
                {posizioni.map((p, i) => (
                  <option key={i} value={p.indirizzo}>{p.azienda} - {p.indirizzo}</option>
                ))}
              </select>
            </label>
            <label className="font-semibold">Autista assegnato
              <select
                name="autista"
                value={form.autista?.nome || ""}
                onChange={e => setForm(f => ({ ...f, autista: { ...f.autista, nome: e.target.value } }))}
                className="border border-blue-200 p-3 rounded-lg w-full mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-300"
                required
              >
                <option value="">Seleziona autista...</option>
                {autisti.map(a => (
                  <option key={a.id} value={a.nome}>{a.nome}</option>
                ))}
              </select>
            </label>
            <label className="font-semibold">Data e ora richiesta
              <input name="dataRichiesta" type="datetime-local" className="border border-blue-200 p-3 rounded-lg w-full mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-300" value={form.dataRichiesta} onChange={handleChange} required />
            </label>
            <label className="font-semibold">Data e ora pianificata
              <input name="dataPianificata" type="datetime-local" className="border border-blue-200 p-3 rounded-lg w-full mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-300" value={form.dataPianificata} onChange={handleChange} required />
            </label>
            <label className="font-semibold">Tipologia
              <select name="tipo" value={form.tipo} onChange={handleChange} className="border border-blue-200 p-3 rounded-lg w-full mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-300" required>
                <option value="consegna">Consegna</option>
                <option value="ritiro">Ritiro</option>
                <option value="entrambi">Entrambi</option>
              </select>
            </label>
            <label className="font-semibold">Stato
              <select name="status" value={form.status} onChange={handleChange} className="border border-blue-200 p-3 rounded-lg w-full mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-300" required>
                <option value="In attesa">In attesa</option>
                <option value="In consegna">In consegna</option>
                <option value="Completata">Completata</option>
                <option value="Fallita">Fallita</option>
              </select>
            </label>
            <div className="font-semibold flex items-center gap-4 mt-4 text-lg">
              <button
                type="button"
                className={form.daPianificare
                  ? "bg-yellow-100 text-yellow-700 px-6 py-2 rounded-full font-bold border border-yellow-300 shadow transition-all duration-150"
                  : "bg-green-100 text-green-700 px-6 py-2 rounded-full font-bold border border-green-300 shadow transition-all duration-150"}
                onClick={() => setForm(f => ({ ...f, daPianificare: !f.daPianificare }))}
              >
                {form.daPianificare ? "Da pianificare" : "Pianificata"}
              </button>
            </div>
          </div>
          <label className="font-semibold">Note
            <textarea name="note" value={form.note} onChange={handleChange} className="border border-blue-200 p-3 rounded-lg w-full mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-300" rows={3} placeholder="Aggiungi eventuali note..." />
          </label>
          <div className="flex gap-3 mt-6 justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow flex items-center gap-2 transition-all duration-150" >
              <span className="material-icons text-white text-base">check_circle</span> Salva
            </button>
            <button type="button" className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-semibold shadow flex items-center gap-2 transition-all duration-150" onClick={onClose} >
              <span className="material-icons text-gray-500 text-base">close</span> Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
