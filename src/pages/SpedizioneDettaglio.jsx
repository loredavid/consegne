import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

function MapCenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords);
  }, [coords, map]);
  return null;
}

export default function SpedizioneDettaglio() {
  const { id } = useParams();
  const [spedizione, setSpedizione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState([45.4642, 9.19]); // default Milano
  const [userCoords, setUserCoords] = useState(null);
  const [distanza, setDistanza] = useState(null);
  const [posizioni, setPosizioni] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`http://localhost:3001/api/spedizioni`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(s => String(s.id) === String(id));
        setSpedizione(found);
        setForm(found);
        setLoading(false);
        // Geocoding indirizzo destinazione
        if (found?.indirizzo) {
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(found.indirizzo)}`)
            .then(res => res.json())
            .then(geo => {
              if (geo && geo.length > 0) {
                setCoords([parseFloat(geo[0].lat), parseFloat(geo[0].lon)]);
              }
            });
        }
      });
  }, [id]);

  useEffect(() => {
    fetch("http://localhost:3001/api/posizioni")
      .then(res => res.json())
      .then(data => setPosizioni(data));
  }, []);

  // Calcolo distanza haversine
  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
        () => setUserCoords(null)
      );
    }
  }, []);

  useEffect(() => {
    if (userCoords && coords) {
      const dist = getDistanceFromLatLonInKm(userCoords[0], userCoords[1], coords[0], coords[1]);
      setDistanza(dist);
    }
  }, [userCoords, coords]);

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
              <button
                key={stato}
                type="button"
                className={`px-3 py-1 rounded-full text-xs font-semibold border focus:outline-none transition-all duration-100 ${
                  (spedizione.status === stato || (stato==='Completata' && spedizione.status==='Consegnata'))
                    ? (stato==='Fallita' ? 'bg-red-100 text-red-700 border-red-300' : stato==='In consegna' ? 'bg-orange-100 text-orange-700 border-orange-300' : stato==='Consegnata'||stato==='Completata' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300')
                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}
                `}
                onClick={async () => {
                  if (editMode) {
                    setForm(f => ({ ...f, status: stato }));
                  } else {
                    setSaving(true);
                    setError("");
                    try {
                      const updated = { ...spedizione, status: stato };
                      await fetch(`http://localhost:3001/api/spedizioni/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(updated)
                      });
                      setSpedizione(updated);
                    } catch {
                      setError("Errore nel salvataggio stato");
                    } finally {
                      setSaving(false);
                    }
                  }
                }}
                disabled={saving}
              >
                {stato}
              </button>
            ))}
          </div>
          <div className="mt-4 text-lg font-semibold">Richiesta da<br /><span className="text-white font-normal">{spedizione.richiedente?.nome}</span></div>
        </div>
        <button onClick={() => setEditMode(true)} className="bg-white text-blue-700 px-4 py-2 rounded font-semibold shadow hover:bg-blue-50">Modifica</button>
      </div>
      {/* Modal for edit form */}
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow p-6 mb-6 flex flex-col gap-4 max-w-2xl w-full relative">
            <button
              type="button"
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              onClick={() => setEditMode(false)}
              disabled={saving}
              aria-label="Chiudi"
            >
              &times;
            </button>
            <form onSubmit={handleSave}>
              {error && <div className="text-red-600">{error}</div>}
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
                  className="border p-2 rounded w-full mt-1"
                  required
                >
                  <option value="">Seleziona destinazione...</option>
                  {posizioni.map((p, i) => (
                    <option key={i} value={p.indirizzo}>{p.azienda} - {p.indirizzo}</option>
                  ))}
                </select>
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
          </div>
        </div>
      )}
      {!editMode && (
        <>
          <div className="bg-white rounded shadow p-6 mb-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{spedizione.aziendaDestinazione}</h2>
              <div className="mb-2 text-sm text-gray-700 font-semibold flex items-center gap-2">
                <span className="material-icons text-gray-400 align-middle">location_on</span>
                <span><b>Indirizzo</b><br /><span className="text-gray-600 font-normal">{spedizione.indirizzo}</span></span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="material-icons text-gray-400 align-middle">category</span>
                <span>Tipo: <b>{spedizione.tipo}</b></span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="material-icons text-gray-400 align-middle">straighten</span>
                <span>Distanza: <span className="text-gray-500">{distanza !== null ? distanza.toFixed(2) + ' km' : '...'}</span></span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="material-icons text-gray-400 align-middle">event</span>
                <span>Data assegnata: {spedizione.dataPianificata ? new Date(spedizione.dataPianificata).toLocaleString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="material-icons text-gray-400 align-middle">event_available</span>
                <span>Data richiesta: {spedizione.dataRichiesta ? new Date(spedizione.dataRichiesta).toLocaleString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}</span>
              </div>
              <div className="mt-4 bg-gray-50 rounded p-3 flex items-center gap-2">
                <span className="material-icons text-gray-400 align-middle">chat_bubble_outline</span>
                <span>{spedizione.note || "Nessuna nota"}</span>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {/* Mappa con react-leaflet */}
              <div className="w-full h-56 bg-gray-100 rounded flex items-center justify-center">
                <MapContainer center={coords} zoom={13} style={{ height: "220px", width: "100%", borderRadius: "0.5rem" }} scrollWheelZoom={false}>
                  <MapCenter coords={coords} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={coords} icon={L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41] })}>
                    <Popup>
                      {spedizione.aziendaDestinazione}<br />{spedizione.indirizzo}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>
          <div className="bg-white rounded shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-2">Informazioni Veicolo</h3>
            <div>Note<br />{spedizione.note || "-"}</div>
          </div>
          <div className="bg-white rounded shadow p-6 mb-6">
            <h3 className="font-bold text-lg mb-2">Conferma Consegna</h3>
            <div className="mb-2">Foto<br />
              {spedizione.fotoConferma ? (
                <img src={spedizione.fotoConferma} alt="Foto conferma" className="max-w-xs rounded" />
              ) : (
                <img src="https://placehold.co/100x100?text=Foto" alt="Placeholder" className="max-w-xs rounded border" />
              )}
            </div>
            <div className="mb-2">Firma<br /><input type="text" disabled className="border p-2 rounded w-full" /></div>
          </div>
        </>
      )}
    </div>
  );
}
