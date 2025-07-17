import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNotification } from "../context/NotificationContext";

function MapCenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords);
  }, [coords, map]);
  return null;
}

export default function PosizioneDettaglio() {
  const { id } = useParams();
  const [posizione, setPosizione] = useState(null);
  const [spedizioni, setSpedizioni] = useState([]);
  const [coords, setCoords] = useState([45.4642, 9.19]); // default Milano
  const navigate = useNavigate();
  const { setNotification } = useNotification();

  useEffect(() => {
    fetch(`http://localhost:3001/api/posizioni`)
      .then(res => res.json())
      .then(data => {
        const found = data.find(p => String(p.id) === String(id));
        setPosizione(found);
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
    fetch(`http://localhost:3001/api/spedizioni`)
      .then(res => res.json())
      .then(data => {
        // Associa spedizioni a questa posizione tramite indirizzo
        setSpedizioni(data.filter(s => s.indirizzo === posizione?.indirizzo));
      });
  }, [posizione]);

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

  if (!posizione) return <div className="p-8">Caricamento posizione...</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600">&larr; Indietro</button>
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{posizione.azienda}</h1>
          <div className="mb-2 text-lg text-gray-700">{posizione.indirizzo}</div>
          <div className="mb-2 text-sm text-gray-500">Referente: {posizione.referente}</div>
          <div className="mb-2 text-sm text-gray-500">Telefono: {posizione.telefono}</div>
          <div className="mb-2 text-sm text-gray-500">Email: {posizione.email}</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-56 bg-gray-100 rounded flex items-center justify-center">
            <MapContainer center={coords} zoom={13} style={{ height: "220px", width: "100%", borderRadius: "0.5rem" }} scrollWheelZoom={false}>
              <MapCenter coords={coords} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={coords} icon={L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', shadowSize: [41, 41] })}>
                <Popup>
                  {posizione.azienda}<br />{posizione.indirizzo}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      </div>
      <div className="bg-white rounded shadow p-6 mb-6">
        <h2 className="font-bold text-xl mb-4">Spedizioni associate</h2>
        {spedizioni.length === 0 ? (
          <div className="text-gray-500">Nessuna spedizione associata a questa posizione.</div>
        ) : (
          <table className="w-full border-separate border-spacing-y-2 table-fixed text-base">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="text-left">Tipo</th>
                <th className="text-left">Richiedente</th>
                <th className="text-left">Stato</th>
                <th className="text-left">Data richiesta</th>
              </tr>
            </thead>
            <tbody>
              {spedizioni.map(s => (
                <tr key={s.id} className="bg-gray-50 hover:bg-blue-50 rounded shadow-sm cursor-pointer" onClick={() => navigate(`/spedizioni/${s.id}`)}>
                  <td className="px-2 py-2">{s.tipo}</td>
                  <td className="px-2 py-2">{s.richiedente?.nome || '-'}</td>
                  <td className="px-2 py-2">{s.status}</td>
                  <td className="px-2 py-2">{s.dataRichiesta ? new Date(s.dataRichiesta).toLocaleString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
