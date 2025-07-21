import { useEffect, useState } from "react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import { BASE_URL } from "../App";
import { useNavigate } from "react-router-dom";

export default function Autista() {
  const { setNotification } = useNotification();
  const { user, token } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const [spedizioni, setSpedizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (user && token) {
      let isMounted = true;
      const fetchSpedizioni = () => {
        fetch(`${BASE_URL}/api/spedizioni`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => {
            if (!res.ok) throw new Error("Errore nel caricamento delle spedizioni");
            return res.json();
          })
          .then(data => {
            if (!isMounted) return;
            const mieSpedizioni = data.filter(s => 
              s.autista && 
              s.autista.id === user.id && 
              s.status !== "Consegnata"
            );
            const spedizioniOrdinate = mieSpedizioni.sort((a, b) => {
              const statusOrder = { "In consegna": 0, "In attesa": 1, "Fallita": 2 };
              if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
              }
              return new Date(a.dataPianificata) - new Date(b.dataPianificata);
            });
            setSpedizioni(spedizioniOrdinate);
          })
          .catch(() => {
            if (isMounted) setNotification({ text: "Errore nel caricamento delle spedizioni" });
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
      };
      fetchSpedizioni();
      const interval = setInterval(fetchSpedizioni, 5000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    } else {
      setLoading(false);
    }
  }, [user, token, setNotification]);

  const getStatusColor = (status) => {
    switch (status) {
      case "In attesa":
        return "bg-blue-100 text-blue-800";
      case "In consegna":
        return "bg-orange-100 text-orange-800";
      case "Consegnata":
        return "bg-green-100 text-green-800";
      case "Fallita":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case "consegna":
        return "🚚";
      case "ritiro":
        return "📦";
      case "entrambi":
        return "🔄";
      default:
        return "📋";
    }
  };

  const updateStatus = async (spedizioneId, newStatus) => {
    try {
      if (!user || !token) return;
      
      const response = await fetch(`${BASE_URL}/api/spedizioni/${spedizioneId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error();
      
      // Aggiorna la lista locale
      setSpedizioni(prev => 
        prev.map(s => 
          s.id === spedizioneId ? { ...s, status: newStatus } : s
        ).filter(s => s.status !== "Consegnata") // Rimuovi consegnate dalla vista
      );
      
      setNotification({ 
        text: `Spedizione ${newStatus.toLowerCase()} con successo` 
      });
      
    } catch (error) {
      setNotification({ 
        text: "Errore nell'aggiornamento dello stato" 
      });
    }
  };

  const openMapsApp = (indirizzo, azienda) => {
    // Crea l'indirizzo completo per la ricerca
    const destination = encodeURIComponent(`${azienda ? azienda + ', ' : ''}${indirizzo}`);
    
    // Rileva il dispositivo e apri l'app mappe appropriata
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let mapsUrl;
    
    if (isIOS) {
      // Su iOS usa Apple Maps come prima scelta, Google Maps come fallback
      mapsUrl = `maps://maps.apple.com/?q=${destination}`;
    } else if (isAndroid) {
      // Su Android usa Google Maps
      mapsUrl = `geo:0,0?q=${destination}`;
    } else {
      // Su desktop o altri dispositivi usa Google Maps web
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
    }
    
    // Prova ad aprire l'app nativa
    window.location.href = mapsUrl;
    
    // Fallback per Google Maps web dopo un breve delay se l'app non si apre
    setTimeout(() => {
      if (isIOS || isAndroid) {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
        window.open(googleMapsUrl, '_blank');
      }
    }, 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento consegne...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Lista Spedizioni */}
      <div className="p-4">
        {spedizioni.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚚</div>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Nessuna consegna assegnata</h2>
            <p className="text-gray-500">Al momento non ci sono spedizioni da completare</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Le mie consegne</h1>
              <p className="text-gray-600">{spedizioni.length} spedizion{spedizioni.length !== 1 ? 'i' : 'e'} assegnat{spedizioni.length !== 1 ? 'e' : 'a'}</p>
            </div>
            {spedizioni.map((spedizione) => (
              <div
                key={spedizione.id}
                className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/spedizioni-mobile/${spedizione.id}`)}
              >
                {/* Header della card con tipo di spedizione in evidenza */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{getTipoIcon(spedizione.tipo)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow ${
                          spedizione.tipo === "consegna" ? "bg-blue-600 text-white" :
                          spedizione.tipo === "ritiro" ? "bg-green-600 text-white" :
                          spedizione.tipo === "entrambi" ? "bg-purple-600 text-white" : "bg-gray-300 text-gray-800"}`}
                        >
                          {spedizione.tipo ? spedizione.tipo.charAt(0).toUpperCase() + spedizione.tipo.slice(1) : "Tipo"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openMapsApp(spedizione.indirizzo, spedizione.aziendaDestinazione);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded-md font-medium transition-colors flex items-center gap-1"
                        >
                          <span className="material-icons text-xs">navigation</span>
                        </button>
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">
                        {spedizione.aziendaDestinazione}
                      </h3>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(spedizione.status)} mt-1`}>
                        {spedizione.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    <div>#{spedizione.id.toString().slice(-4)}</div>
                  </div>
                </div>

                {/* Indirizzo */}
                <div className="flex items-start mb-3">
                  <span className="material-icons text-gray-400 text-sm mr-2 mt-0.5">place</span>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1">{spedizione.indirizzo}</p>
                </div>

                {/* Date */}
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-400 text-sm mr-1">schedule</span>
                    <div>
                      <div className="text-gray-500">Richiesta</div>
                      <div className="font-medium text-gray-700">{formatDate(spedizione.dataRichiesta)}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-green-500 text-sm mr-1">event</span>
                    <div>
                      <div className="text-gray-500">Pianificata</div>
                      <div className="font-medium text-gray-700">{formatDate(spedizione.dataPianificata)}</div>
                    </div>
                  </div>
                </div>

                {/* Note e Richiedente */}
                <div className="border-t pt-3 mt-3">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {spedizione.richiedente && (
                      <div className="flex items-center">
                        <span className="material-icons text-gray-400 text-sm mr-1">person</span>
                        <span className="text-gray-600">Richiedente: </span>
                        <span className="font-medium text-gray-800">{spedizione.richiedente.nome}</span>
                      </div>
                    )}
                    {spedizione.note && (
                      <div className="flex items-start">
                        <span className="material-icons text-gray-400 text-sm mr-1 mt-0.5">notes</span>
                        <div>
                          <span className="text-gray-600">Note: </span>
                          <span className="text-gray-800">{spedizione.note}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pulsanti azione rapida */}
                  <div className="flex gap-2 mt-3">
                    {spedizione.status === "In attesa" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(spedizione.id, "In consegna");
                        }}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-icons text-sm">local_shipping</span>
                        Inizia consegna
                      </button>
                    )}
                    
                    {spedizione.status === "In consegna" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(spedizione.id, "Consegnata");
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-icons text-sm">check_circle</span>
                        Consegnata
                      </button>
                    )}

                    {(spedizione.status === "In attesa" || spedizione.status === "In consegna") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Sei sicuro di voler segnare questa spedizione come fallita?')) {
                            updateStatus(spedizione.id, "Fallita");
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs py-2 px-3 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-icons text-sm">error</span>
                        Fallita
                      </button>
                    )}
                  </div>
                </div>

                {/* Freccia per indicare che è cliccabile */}
                <div className="flex justify-end mt-2">
                  <span className="material-icons text-gray-300">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer con pulsante Refresh */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-3">
        {/* Pulsante Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          aria-label="Aggiorna"
        >
          <span className="material-icons">refresh</span>
        </button>
      </div>
    </div>
  );
}
