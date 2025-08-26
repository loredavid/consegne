import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { BASE_URL } from "../App";

export default function SpedizioneDettaglioMobile() {
  const { id } = useParams();
  const [spedizione, setSpedizione] = useState(null);
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setNotification } = useNotification();
  // ...existing code...

  useEffect(() => {
    if (user && token) {
      fetch(`${BASE_URL}/api/spedizioni`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          const found = data.find(s => String(s.id) === String(id));
          setSpedizione(found);
          setLoading(false);
        });
    }
  }, [id, user, token]);

  const updateStatus = async (newStatus) => {
    setSaving(true);
    setError("");
    try {
      if (!user || !token) throw new Error("Non autenticato");
      const updated = { ...spedizione, status: newStatus };
      await fetch(`${BASE_URL}/api/spedizioni/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated)
      });
      setSpedizione(updated);
      setNotification({ text: `Stato aggiornato a ${newStatus}` });
    } catch {
      setError("Errore nel salvataggio stato");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Caricamento spedizione...</p>
      </div>
    </div>
  );
  if (!spedizione) return <div className="p-8 text-red-600">Spedizione non trovata</div>;

  // Barra superiore stile autista
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b px-4 py-2 fixed top-0 left-0 w-full z-20">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Benvenuto, <span className="font-medium">{user?.nome}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-semibold shadow"
              aria-label="Indietro"
            >
              <span className="material-icons text-base align-middle mr-1">arrow_back</span>
              Indietro
            </button>
            <button
              onClick={() => {
                if (window.confirm("Vuoi disconnetterti?")) {
                  navigate("/login");
                }
              }}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Disconnetti
            </button>
          </div>
        </div>
      </div>
      <main className="pt-[48px] p-4">
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{spedizione.tipo === "consegna" ? "" : spedizione.tipo === "ritiro" ? "" : ""}</span>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 mb-1">{spedizione.aziendaDestinazione}</h1>
              <div className="text-xs text-gray-500 mb-1 font-semibold">
                Tipo: {spedizione.tipo ? spedizione.tipo.charAt(0).toUpperCase() + spedizione.tipo.slice(1) : "-"}
              </div>
              <div className="text-gray-500 text-sm flex items-center gap-2">
                <span>{spedizione.indirizzo}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spedizione.indirizzo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-xs flex items-center gap-1"
                  title="Apri mappa"
                >
                  <span className="material-icons text-xl">location_on</span>
                </a>
              </div>
              {spedizione.telefonoDestinazione && (
                <div className="text-xs text-gray-700 flex items-center gap-1 mt-1">
                  <span className="material-icons text-sm text-gray-400">call</span>
                  <a href={`tel:${spedizione.telefonoDestinazione}`} className="text-blue-600 underline">{spedizione.telefonoDestinazione}</a>
                </div>
              )}
              {spedizione.emailDestinazione && (
                <div className="text-xs text-gray-700 flex items-center gap-1 mt-1">
                  <span className="material-icons text-sm text-gray-400">email</span>
                  <a href={`mailto:${spedizione.emailDestinazione}`} className="text-blue-600 underline">{spedizione.emailDestinazione}</a>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              spedizione.status === "In attesa" ? "bg-blue-100 text-blue-800" :
              spedizione.status === "In consegna" ? "bg-orange-100 text-orange-800" :
              spedizione.status === "Consegnata" ? "bg-green-100 text-green-800" :
              spedizione.status === "Fallita" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}
            >
              {spedizione.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div>
              <span className="material-icons text-gray-400 text-sm mr-1">schedule</span>
              <span className="text-gray-500">Richiesta: </span>
              <span className="font-medium text-gray-700">{spedizione.dataRichiesta ? new Date(spedizione.dataRichiesta).toLocaleString("it-IT") : "-"}</span>
            </div>
            <div>
              <span className="material-icons text-green-500 text-sm mr-1">event</span>
              <span className="text-gray-500">Pianificata: </span>
              <span className="font-medium text-gray-700">{spedizione.dataPianificata ? new Date(spedizione.dataPianificata).toLocaleString("it-IT") : "-"}</span>
            </div>
          </div>
          {spedizione.note && (
            <div className="mb-4 text-base text-gray-700">
              <span className="material-icons text-gray-400 text-lg mr-1 align-top">notes</span>
              <span className="font-semibold">Note:</span>
              <div className="mt-1 whitespace-pre-line bg-gray-100 rounded p-2 text-gray-800 text-sm">{spedizione.note}</div>
            </div>
          )}
          {spedizione.richiedente && (
            <div className="mb-2 text-xs text-gray-700 flex items-center">
              <span className="material-icons text-gray-400 text-sm mr-1">person</span>
              <span className="font-semibold">Richiedente:</span> {spedizione.richiedente.nome}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            {spedizione.status === "In attesa" && (
              <button
                onClick={() => updateStatus("In consegna")}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-icons text-sm">local_shipping</span>
                Inizia consegna
              </button>
            )}
            {spedizione.status === "In consegna" && (
              <button
                onClick={() => updateStatus("Consegnata")}
                disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-icons text-sm">check_circle</span>
                Consegnata
              </button>
            )}
            {(spedizione.status === "In attesa" || spedizione.status === "In consegna") && (
              <button
                onClick={() => {
                  if (window.confirm('Sei sicuro di voler segnare questa spedizione come fallita?')) {
                    updateStatus("Fallita");
                  }
                }}
                disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white text-xs py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-icons text-sm">error</span>
                Fallita
              </button>
            )}
          </div>
          {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
        </div>
      </main>
    </div>
  );
}
