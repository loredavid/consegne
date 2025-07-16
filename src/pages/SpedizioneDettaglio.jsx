import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function SpedizioneDettaglio() {
  const { id } = useParams();
  const [spedizione, setSpedizione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:3001/api/spedizioni`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(s => String(s.id) === String(id));
        setSpedizione(found);
        setForm(found);
        setLoading(false);
      });
  }, [id]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await fetch(`http://localhost:3001/api/spedizioni/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setSpedizione(form);
      setEditMode(false);
    } catch {
      setError("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Caricamento...</div>;
  if (!spedizione) return <div className="p-8 text-red-600">Spedizione non trovata</div>;

  return (
    <div className="p-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600">&larr; Indietro</button>
      <div className="flex justify-between items-center bg-blue-700 text-white rounded-t-lg p-6 mb-6">
        <div>
          <div className="text-xs uppercase font-bold mb-2">{spedizione.tipo?.split(",").map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}</div>
          <h1 className="text-3xl font-bold mb-1">{spedizione.aziendaDestinazione}</h1>
          <div className="text-lg mb-2">{spedizione.aziendaDestinazione}</div>
          <div className="mb-2 flex gap-2 items-center">
            {['In attesa','In consegna','Fallita','Consegnata','Completata'].map(stato => (
              <span key={stato} className={`px-3 py-1 rounded-full text-xs font-semibold border ${spedizione.status === stato || (stato==='Completata' && spedizione.status==='Consegnata') ? (stato==='Fallita' ? 'bg-red-100 text-red-700 border-red-300' : stato==='In consegna' ? 'bg-orange-100 text-orange-700 border-orange-300' : stato==='Consegnata'||stato==='Completata' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300') : 'bg-white text-gray-400 border-gray-200'}`}>{stato}</span>
            ))}
          </div>
          <div className="mt-4 text-lg font-semibold">Richiesta da<br /><span className="text-white font-normal">{spedizione.richiedente?.nome}</span></div>
        </div>
        <button onClick={() => setEditMode(true)} className="bg-white text-blue-700 px-4 py-2 rounded font-semibold shadow hover:bg-blue-50">Modifica</button>
      </div>
      {editMode ? (
        <form onSubmit={handleSave} className="bg-white rounded shadow p-6 mb-6 flex flex-col gap-4 max-w-2xl">
          {error && <div className="text-red-600">{error}</div>}
          <label className="font-semibold">Azienda Destinazione
            <input name="aziendaDestinazione" value={form.aziendaDestinazione || ""} onChange={handleChange} className="border p-2 rounded w-full mt-1" required />
          </label>
          <label className="font-semibold">Indirizzo
            <input name="indirizzo" value={form.indirizzo || ""} onChange={handleChange} className="border p-2 rounded w-full mt-1" required />
          </label>
          <label className="font-semibold">Tipo
            <select name="tipo" value={form.tipo || ""} onChange={handleChange} className="border p-2 rounded w-full mt-1">
              <option value="consegna">Consegna</option>
              <option value="ritiro">Ritiro</option>
              <option value="entrambi">Entrambi</option>
            </select>
          </label>
          <label className="font-semibold">Status
            <select name="status" value={form.status || ""} onChange={handleChange} className="border p-2 rounded w-full mt-1">
              <option value="In attesa">In attesa</option>
              <option value="In consegna">In consegna</option>
              <option value="Consegnata">Consegnata</option>
              <option value="Fallita">Fallita</option>
            </select>
          </label>
          <label className="font-semibold">Data richiesta
            <input name="dataRichiesta" type="datetime-local" value={form.dataRichiesta ? form.dataRichiesta.slice(0,16) : ""} onChange={handleChange} className="border p-2 rounded w-full mt-1" />
          </label>
          <label className="font-semibold">Data pianificata
            <input name="dataPianificata" type="datetime-local" value={form.dataPianificata ? form.dataPianificata.slice(0,16) : ""} onChange={handleChange} className="border p-2 rounded w-full mt-1" />
          </label>
          <label className="font-semibold">Note
            <input name="note" value={form.note || ""} onChange={handleChange} className="border p-2 rounded w-full mt-1" />
          </label>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={saving}>Salva</button>
            <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setEditMode(false)} disabled={saving}>Annulla</button>
          </div>
        </form>
      ) : (
        <>
          <div className="bg-white rounded shadow p-6 mb-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{spedizione.aziendaDestinazione}</h2>
              <div className="mb-2"><b>Indirizzo</b><br />{spedizione.indirizzo}</div>
              <div className="mb-2">Tipo: <b>{spedizione.tipo}</b></div>
              <div className="mb-2">Distanza: <span className="text-gray-500">30,56 km</span></div>
              <div className="mb-2">Data assegnata: {spedizione.dataPianificata ? new Date(spedizione.dataPianificata).toLocaleString() : "-"}</div>
              <div className="mb-2">Data richiesta: {spedizione.dataRichiesta ? new Date(spedizione.dataRichiesta).toLocaleString() : "-"}</div>
              <div className="mb-2 flex items-center gap-2"><span className="inline-block"><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" /><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#888">💬</text></svg></span> {spedizione.note || "-"}</div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {/* Mappa placeholder */}
              <div className="w-full h-56 bg-gray-100 rounded flex items-center justify-center">MAPPA</div>
            </div>
          </div>
          <div className="bg-white rounded shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-2">Informazioni Veicolo</h3>
            <div>Note<br />{spedizione.note || "-"}</div>
          </div>
          <div className="bg-white rounded shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-2">Conferma Consegna</h3>
            <div className="mb-2">Foto<br />{spedizione.fotoConferma ? <img src={spedizione.fotoConferma} alt="Foto conferma" className="max-w-xs rounded" /> : <input type="file" disabled className="border p-2 rounded w-full" />}</div>
            <div className="mb-2">Firma<br /><input type="text" disabled className="border p-2 rounded w-full" /></div>
          </div>
        </>
      )}
    </div>
  );
}
