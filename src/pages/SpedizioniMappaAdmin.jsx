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

export default function SpedizioniMappaAdmin() {
  const { user, token } = useAuth();
  const [spedizioni, setSpedizioni] = useState([]);
  const [posizioni, setPosizioni] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [center, setCenter] = useState([45.96, 12.67]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const [showItinerary, setShowItinerary] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0,10));
  const [selectedDriver, setSelectedDriver] = useState('');
  const [departureTime, setDepartureTime] = useState(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [computingRoute, setComputingRoute] = useState(false);
  const [homeCoords, setHomeCoords] = useState(null);
  const [routeLegs, setRouteLegs] = useState(null);
  const [stopEtas, setStopEtas] = useState([]);
  const navigate = useNavigate();

  const tryGeocode = async (address) => {
    const key = `geocode:${address}`;
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'it' } });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        const result = { lat: Number(lat), lng: Number(lon) };
        try { localStorage.setItem(key, JSON.stringify(result)); } catch (e) { }
        return result;
      }
    } catch (e) {
      console.warn('Geocoding error', e);
    }
    return null;
  };

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [respSped, respPos] = await Promise.all([
          fetch(`${BASE_URL}/api/spedizioni`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BASE_URL}/api/posizioni`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const s = await respSped.json();
        const p = await respPos.json();
        setSpedizioni(s);
        setPosizioni(p);
        // try to locate ELTEK as home
        try {
          const home = p.find(x => x.azienda && x.azienda.toLowerCase().includes('eltek'));
          if (home && home.lat && home.lng) setHomeCoords({ lat: Number(home.lat), lng: Number(home.lng) });
        } catch (e) { /* ignore */ }
      } catch (e) {
        console.error('load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const drivers = useMemo(() => {
    const map = new Map();
    for (const s of spedizioni) if (s.autista) map.set(String(s.autista.id), s.autista.nome);
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [spedizioni]);

  const filteredSpedizioni = useMemo(() => {
    if (!spedizioni) return [];
    return spedizioni.filter(s => {
  const date = s.dataPianificata ? s.dataPianificata.slice(0,10) : null;
  if (selectedDate && date !== selectedDate) return false;
  // must be assigned to an autista
  if (!s.autista || !s.autista.id) return false;
  // exclude completed or failed deliveries
  if (s.status === 'Consegnata' || s.status === 'Fallita') return false;
  if (selectedDriver && String(s.autista.id) !== String(selectedDriver)) return false;
  return true;
    });
  }, [spedizioni, selectedDate, selectedDriver]);

  useEffect(() => {
    // build markers from filteredSpedizioni
    const loadMarkers = async () => {
      const resolved = [];
      for (const s of filteredSpedizioni) {
        let lat = null; let lng = null;
        const p = posizioni.find(p => p.azienda && s.aziendaDestinazione && p.azienda.toLowerCase().includes(s.aziendaDestinazione.toLowerCase().split(' ')[0]));
        if (p && p.lat && p.lng) { lat = Number(p.lat); lng = Number(p.lng); }
        if ((!lat || !lng) && s.indirizzo) {
          const g = await tryGeocode(s.indirizzo || '');
          if (g) { lat = g.lat; lng = g.lng; }
        }
  if (lat && lng) resolved.push({ id: s.id, azienda: s.aziendaDestinazione, indirizzo: s.indirizzo, lat, lng, dataPianificata: s.dataPianificata, tipo: s.tipo, note: s.note });
      }
      setMarkers(resolved);
      if (resolved.length > 0) setCenter([resolved[0].lat, resolved[0].lng]);
    };
    loadMarkers();
  }, [filteredSpedizioni, posizioni]);

  const waitForMap = async (timeout = 2000, interval = 100) => {
    const start = Date.now();
    while (!mapRef.current && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, interval));
    }
    return !!mapRef.current;
  };

  const fitToMarkers = async () => {
    if (!mapRef.current) await waitForMap(3000, 150);
    if (!mapRef.current || !markers || markers.length === 0) return;
    try { mapRef.current.invalidateSize(); } catch (e) {}
    const latLngs = markers.map(m => [Number(m.lat), Number(m.lng)]);
    const bounds = L.latLngBounds(latLngs);
    if (markers.length === 1) mapRef.current.setView([latLngs[0][0], latLngs[0][1]], 14);
    else mapRef.current.fitBounds(bounds, { padding: [60,60] });
  };

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

  useEffect(() => { fitToMarkers(); }, [markers]);

  const itinerary = useMemo(() => {
    if (!markers || markers.length === 0) return [];
    return [...markers].filter(m => m.dataPianificata).map(m => ({ ...m, ts: new Date(m.dataPianificata).getTime() })).sort((a,b)=>a.ts-b.ts);
  }, [markers]);

  const computeRoute = async () => {
    if (!itinerary || itinerary.length < 1) return;
    if (!homeCoords) {
      alert('Home (ELTEK) non trovata nelle posizioni; assicurati che esista in posizioni.json');
      return;
    }
    setComputingRoute(true);
    try {
      // Build list: home -> stops... -> home
      const points = [{ lat: homeCoords.lat, lng: homeCoords.lng }, ...itinerary.map(s => ({ lat: s.lat, lng: s.lng })), { lat: homeCoords.lat, lng: homeCoords.lng }];
      const coords = points.map(p => `${Number(p.lng)},${Number(p.lat)}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Routing service error');
      const data = await resp.json();
      if (data && data.routes && data.routes[0]) {
        const route = data.routes[0];
        if (route.geometry) setRouteGeometry(route.geometry);
        if (route.legs) {
          setRouteLegs(route.legs);
          // compute ETAs: base departure on selectedDate + departureTime if valid, otherwise now
            // show itinerary panel when a route was successfully computed
            setShowItinerary(true);
            
          let start = new Date();
          try {
            if (selectedDate && departureTime) {
              const dt = new Date(`${selectedDate}T${departureTime}`);
              if (!isNaN(dt.getTime())) start = dt;
            }
          } catch (e) { /* ignore and use now */ }
          const etas = [];
          let cum = 0;
          // legs[i] is between point i and i+1; stops are itinerary entries at index 1..n
          for (let i = 0; i < route.legs.length; i++) {
            const leg = route.legs[i];
            cum += (leg.duration || 0);
            // if i corresponds to arrival at a stop (i >=1 and i <= itinerary.length)
            if (i >= 0 && i < route.legs.length) {
              // arrival index in points is i+1
              const arrivalIdx = i + 1;
              // stops are at points[1..itinerary.length]
              if (arrivalIdx >=1 && arrivalIdx <= itinerary.length) {
                const stopIndex = arrivalIdx - 1; // 0-based in itinerary
                const eta = new Date(start.getTime() + cum * 1000);
                etas[stopIndex] = { eta, durationFromPrev: leg.duration, distance: leg.distance };
              }
            }
          }
          setStopEtas(etas);
        }
        try { await waitForMap(3000,150); const g=L.geoJSON(route.geometry); const bounds=g.getBounds(); if (bounds && bounds.isValid && bounds.isValid() && mapRef.current) mapRef.current.fitBounds(bounds, { padding: [60,60] }); } catch(e){}
      }
    } catch(e) { console.error('computeRoute error', e); alert('Impossibile calcolare il percorso'); }
    finally { setComputingRoute(false); }
  };

  return (
    <div className="min-h-screen">
      <div className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold mb-2">Mappa spedizioni - Tutti</h1>
          <p className="text-sm text-gray-600 mb-4">Filtra per data e autista assegnato.</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={selectedDate} onChange={(e)=>setSelectedDate(e.target.value)} className="border px-2 py-1 rounded" />
          <input type="time" value={departureTime} onChange={(e)=>setDepartureTime(e.target.value)} className="border px-2 py-1 rounded" />
          <select value={selectedDriver} onChange={(e)=>setSelectedDriver(e.target.value)} className="border px-2 py-1 rounded">
            <option value="">Tutti gli autisti</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
      </div>
      <div style={{ height: '70vh' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapBridge />
          {markers.map(m=> (
            <Marker key={m.id} position={[m.lat, m.lng]}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{m.azienda}</div>
                    <div className="text-xs text-gray-600">{m.indirizzo}</div>
                    <div className="text-xs text-gray-500 mt-1">Tipo: <b>{m.tipo || '-'}</b></div>
                    {m.note && <div className="text-xs text-gray-500 mt-1">Note: <span className="whitespace-pre-wrap">{m.note}</span></div>}
                    <div className="mt-2">
                      <button onClick={() => navigate(`/spedizioni/${m.id}`)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm">Mostra dettaglio</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
          ))}
          {routeGeometry && <GeoJSON data={routeGeometry} style={{ color: 'blue', weight: 5, opacity: 0.7 }} />}
        </MapContainer>
      </div>
      <div className="p-4 flex gap-2">
        <div className="flex gap-2">
          <button onClick={()=>fitToMarkers()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded">Adatta mappa</button>
          {/* itinerario shown automatically after route calculation */}
          <button onClick={()=>computeRoute()} disabled={computingRoute || itinerary.length<1 || !homeCoords} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded">{computingRoute? 'Calcolo...' : 'Calcola percorso da home'}</button>
          <button onClick={()=>setRouteGeometry(null)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">Cancella percorso</button>
        </div>
        <div className="ml-4 text-sm text-gray-600">{homeCoords ? `Home: ELTEK (${homeCoords.lat.toFixed(4)}, ${homeCoords.lng.toFixed(4)})` : 'Home non impostata'}</div>
      </div>
      {showItinerary && (
        <div className="p-4">
          <h2 className="font-semibold mb-2">Itinerario</h2>
            <ol className="list-decimal ml-6">
            {itinerary.map((stop, idx) => (
              <li key={stop.id} className="mb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{stop.azienda}</div>
                    <div className="text-sm text-gray-600">{stop.indirizzo}</div>
                    <div className="text-xs text-gray-500">{stop.dataPianificata && new Date(stop.dataPianificata).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">Tipo: <b>{(stop.tipo || '-').toString()}</b></div>
                    {stop.note && <div className="text-xs text-gray-500 mt-1">Note: <span className="whitespace-pre-wrap">{stop.note}</span></div>}
                    {stopEtas[idx] && (
                      <div className="text-xs text-gray-500 mt-1">Arrivo stimato: {new Date(stopEtas[idx].eta).toLocaleTimeString()} — Durata tappa: {Math.round(stopEtas[idx].durationFromPrev/60)} min — Distanza: {Math.round(stopEtas[idx].distance/1000*10)/10} km</div>
                    )}
                  </div>
                  <div className="ml-4">
                    <button onClick={() => navigate(`/spedizioni/${stop.id}`)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm">Dettaglio</button>
                  </div>
                </div>
              </li>
            ))}
            {/* show return to home ETA as final item if available */}
            {routeLegs && routeLegs.length > 0 && (
              <li className="mt-3">
                <div className="font-medium">Ritorno a ELTEK</div>
                <div className="text-xs text-gray-500">{routeLegs[routeLegs.length-1] && `Durata: ${Math.round(routeLegs[routeLegs.length-1].duration/60)} min — Distanza: ${Math.round(routeLegs[routeLegs.length-1].distance/1000*10)/10} km`}</div>
              </li>
            )}
            </ol>
        </div>
      )}
    </div>
  );
}
