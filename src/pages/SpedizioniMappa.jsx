import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../App';
import { useNavigate } from 'react-router-dom';

// default marker fix for leaflet in many bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl
});

export default function SpedizioniMappa() {
  const { user, token } = useAuth();
  const [markers, setMarkers] = useState([]);
  const [center, setCenter] = useState([45.96, 12.67]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isToday = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  useEffect(() => {
    if (!user || !token) return;

    const load = async () => {
      try {
        const [respSped, respPos] = await Promise.all([
          fetch(`${BASE_URL}/api/spedizioni`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BASE_URL}/api/posizioni`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const spedizioni = await respSped.json();
        const posizioni = await respPos.json();

        const mie = spedizioni.filter(s => s.autista && String(s.autista.id) === String(user.id) && s.status !== 'Consegnata' && isToday(s.dataPianificata));

        const resolved = mie.map(s => {
          // try to find posizioni by azienda name match
          const p = posizioni.find(p => p.azienda && s.aziendaDestinazione && p.azienda.toLowerCase().includes(s.aziendaDestinazione.toLowerCase().split(' ')[0]));
          const lat = p && p.lat ? Number(p.lat) : null;
          const lng = p && p.lng ? Number(p.lng) : null;
          return {
            id: s.id,
            azienda: s.aziendaDestinazione,
            indirizzo: s.indirizzo,
            lat,
            lng,
            status: s.status,
            tipo: s.tipo
          };
        }).filter(m => m.lat && m.lng);

        if (resolved.length > 0) {
          setCenter([resolved[0].lat, resolved[0].lng]);
        }
        setMarkers(resolved);
      } catch (e) {
        console.error('Errore caricamento map markers', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, token]);

  if (loading) return <div className="p-4">Caricamento mappa...</div>;
  if (!user) return <div className="p-4 text-red-600">Accesso negato</div>;

  return (
    <div className="min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold mb-2">Mappa spedizioni - Oggi</h1>
          <p className="text-sm text-gray-600 mb-4">Mostra tutte le spedizioni assegnate a te per la giornata odierna.</p>
        </div>
        <div>
          <button
            onClick={() => navigate('/autista')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm"
          >
            ← Torna ad Autista
          </button>
        </div>
      </div>
      <div style={{ height: '70vh' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {markers.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{m.azienda}</div>
                  <div className="text-xs text-gray-600">{m.indirizzo}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="text-xs text-blue-600" onClick={() => navigate(`/spedizioni-mobile/${m.id}`)}>Apri dettaglio</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
