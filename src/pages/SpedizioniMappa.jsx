import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
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
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const [showItinerary, setShowItinerary] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [computingRoute, setComputingRoute] = useState(false);
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

        // Per ogni spedizione, prova a risolvere una coppia lat/lng
        const tryGeocode = async (address) => {
          const key = `geocode:${address}`;
          // Cerca in cache locale
          const cached = localStorage.getItem(key);
          if (cached) return JSON.parse(cached);
          // Usare Nominatim (OpenStreetMap) come fallback
          try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
            const resp = await fetch(url, { headers: { 'Accept-Language': 'it' } });
            if (!resp.ok) return null;
            const data = await resp.json();
            if (Array.isArray(data) && data.length > 0) {
              const { lat, lon } = data[0];
              const result = { lat: Number(lat), lng: Number(lon) };
              try { localStorage.setItem(key, JSON.stringify(result)); } catch (e) { /* ignore */ }
              return result;
            }
          } catch (e) {
            console.warn('Geocoding error', e);
          }
          return null;
        };

        const resolvedList = [];
        for (const s of mie) {
          // try to find posizioni by azienda name match
          let lat = null; let lng = null;
          const p = posizioni.find(p => p.azienda && s.aziendaDestinazione && p.azienda.toLowerCase().includes(s.aziendaDestinazione.toLowerCase().split(' ')[0]));
          if (p && p.lat && p.lng) {
            lat = Number(p.lat); lng = Number(p.lng);
          }

          // se non troviamo coordinate, proviamo a geocodare usando indirizzO
          if ((!lat || !lng) && s.indirizzo) {
            const query = `${s.indirizzo} || ''}`.trim();
            const g = await tryGeocode(query);
            if (g) { lat = g.lat; lng = g.lng; }
          }

          if (lat && lng) {
            resolvedList.push({ id: s.id, azienda: s.aziendaDestinazione, indirizzo: s.indirizzo, lat, lng, status: s.status, tipo: s.tipo, dataPianificata: s.dataPianificata });
          }
        }

        if (resolvedList.length > 0) {
          setCenter([resolvedList[0].lat, resolvedList[0].lng]);
        }
        setMarkers(resolvedList);
      } catch (e) {
        console.error('Errore caricamento map markers', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, token]);

  // Reusable fit function so we can call it manually from a debug button
  const waitForMap = async (timeout = 2000, interval = 100) => {
    const start = Date.now();
    while (!mapRef.current && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, interval));
    }
    return !!mapRef.current;
  };

  const fitToMarkers = async () => {
    console.log('Fitting to markers', markers);
    console.log('mapRef.current (before wait)', mapRef.current);
    if (!mapRef.current) {
      // attempt to wait a short while for the map to initialize
      const ok = await waitForMap(3000, 150);
      console.log('waitForMap result', ok, 'mapRef.current', mapRef.current);
      if (!ok) return;
    }

    if (!markers || markers.length === 0) return;
    try {
      try { mapRef.current.invalidateSize(); } catch (e) { /* ignore */ }

      const latLngs = markers.map(m => [Number(m.lat), Number(m.lng)]);
      const bounds = L.latLngBounds(latLngs);

      if (markers.length === 1) {
        const [lat, lng] = latLngs[0];
        mapRef.current.setView([lat, lng], 14);
      } else {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    } catch (e) {
      console.warn('fitBounds failed', e);
    }
  };

  // Bridge component: ensures we get the Leaflet map instance from React-Leaflet context
  function MapBridge() {
    const map = useMap();
    useEffect(() => {
      if (map && !mapRef.current) {
        mapRef.current = map;
        setMapReady(true);
      }
    }, [map]);
    return null;
  }

  useEffect(() => {
    // Auto-fit when markers change
    fitToMarkers();
  }, [markers]);

  const computeRoute = async () => {
    if (!itinerary || itinerary.length < 2) return;
    setComputingRoute(true);
    try {
      // Build coordinates string in order: lng,lat; OSRM expects lon,lat
      const coords = itinerary.map(s => `${Number(s.lng)},${Number(s.lat)}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Routing service error');
      const data = await resp.json();
      if (data && data.routes && data.routes[0] && data.routes[0].geometry) {
        const geom = data.routes[0].geometry;
        setRouteGeometry(geom);
        // Fit map to route bounds if map ready
        try {
          await waitForMap(3000, 150);
          const g = L.geoJSON(geom);
          const bounds = g.getBounds();
          if (bounds && bounds.isValid && bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [60, 60] });
          }
        } catch (e) {
          // ignore fit errors
        }
      }
    } catch (e) {
      console.error('computeRoute error', e);
      alert('Impossibile calcolare il percorso (servizio routing non disponibile)');
    } finally {
      setComputingRoute(false);
    }
  };

  const itinerary = useMemo(() => {
    if (!markers || markers.length === 0) return [];
    return [...markers]
      .filter(m => m.dataPianificata)
      .map(m => ({ ...m, ts: new Date(m.dataPianificata).getTime() }))
      .sort((a, b) => a.ts - b.ts);
  }, [markers]);

  if (loading) return <div className="p-4">Caricamento mappa...</div>;
  if (!user) return <div className="p-4 text-red-600">Accesso negato</div>;

  return (
    <div className="min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold mb-2">Mappa spedizioni</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/autista')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm"
          >
            ← Torna ad Autista
          </button>
          <button
            onClick={() => fitToMarkers()}
            className={`px-3 py-2 rounded-md text-sm ${mapReady ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            title={mapReady ? 'Adatta mappa ai marker (debug)' : 'La mappa non è ancora pronta'}
            disabled={!mapReady}
          >
            Adatta mappa
          </button>
        </div>
      </div>
    <div style={{ height: '70vh' }}>
  <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapBridge />
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
          {routeGeometry && (
            <GeoJSON data={routeGeometry} style={{ color: 'blue', weight: 5, opacity: 0.7 }} />
          )}
        </MapContainer>
      </div>
      <div className="p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setShowItinerary(s => !s)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm"
          >
            {showItinerary ? 'Nascondi itinerario' : 'Mostra itinerario'}
          </button>
          <button
            onClick={() => computeRoute()}
            disabled={computingRoute || itinerary.length < 2}
            className={`px-3 py-2 rounded-md text-sm ${computingRoute || itinerary.length < 2 ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {computingRoute ? 'Calcolo in corso...' : 'Calcola percorso'}
          </button>
          <button
            onClick={() => setRouteGeometry(null)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm"
          >
            Cancella percorso
          </button>
        </div>

        {showItinerary && (
          <div className="mt-4">
            <h2 className="font-semibold mb-2">Itinerario (ordine per data/ora)</h2>
            <ol className="list-decimal ml-6">
              {itinerary.map(stop => (
                <li key={stop.id} className="mb-2">
                  <div className="font-medium">{stop.azienda}</div>
                  <div className="text-sm text-gray-600">{stop.indirizzo}</div>
                  <div className="text-xs text-gray-500">{new Date(stop.dataPianificata).toLocaleString()}</div>
                  <div className="mt-1">
                    <button className="text-xs text-blue-600" onClick={() => navigate(`/spedizioni-mobile/${stop.id}`)}>Apri dettaglio</button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
