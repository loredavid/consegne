import { useEffect, useState } from "react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useUnreadMessages } from "../context/UnreadMessagesContext";
import { BASE_URL } from "../App";
import { useNavigate } from "react-router-dom";

export default function Autista() {
  const { setNotification, sendPushNotification, pushNotificationsEnabled, requestNotificationPermission, subscribeForPush } = useNotification();
  const { user, token, logout } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const [spedizioni, setSpedizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  
  const navigate = useNavigate();

  // Controlla se mostrare il banner per i permessi delle notifiche
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      setShowPermissionBanner(true);
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      // Dopo che i permessi sono stati concessi, crea la subscription e inviala al backend
      const sub = await subscribeForPush();
      if (sub) {
        setShowPermissionBanner(false);
        setNotification({ text: "Notifiche push abilitate e sottoscritte", type: 'success' });
      } else {
        setNotification({ text: "Notifiche abilitate ma la sottoscrizione non è stata completata", type: 'warning' });
      }
    } else {
      setNotification({ text: "Permessi per le notifiche negati" });
    }
  };

  useEffect(() => {
    if (user && token) {
      let isMounted = true;
  // Traccia gli ID delle spedizioni precedenti per rilevare nuove assegnazioni
  let previousSpedizioniIds = new Set();
  // Traccia gli ultimi stati conosciuti delle spedizioni per evitare notifiche duplicate
  let lastKnownStates = new Map();
      
      const isToday = (dateString) => {
        if (!dateString) return false;
        const d = new Date(dateString);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      };

      const fetchSpedizioni = () => {
        fetch(`${BASE_URL}/api/spedizioni`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => {
            if (res.status === 401 || res.status === 403) {
              // Token non valido o scaduto, logout e reindirizza al login
              logout();
              navigate('/login');
              setNotification({ text: "Sessione scaduta. Effettua nuovamente il login.", type: 'error' });
              return;
            }
            if (!res.ok) throw new Error("Errore nel caricamento delle spedizioni");
            return res.json();
          })
          .then(data => {
            if (!isMounted || !data) return;
            
            // Filtra solo le spedizioni assegnate a questo autista e programmate per oggi
            const mieSpedizioni = data.filter(s => 
              s.autista && 
              s.autista.id === user.id && 
              s.status !== "Consegnata" &&
              isToday(s.dataPianificata) &&
              s.daPianificare === false
            );
            
            // Controlla se ci sono nuove spedizioni assegnate a questo autista
            const currentSpedizioniIds = new Set(mieSpedizioni.map(s => s.id));
            
            // Solo dopo il primo caricamento, controlla per nuove assegnazioni
            if (previousSpedizioniIds.size > 0) {
              // Trova le spedizioni che sono state assegnate dall'ultimo controllo
              const nuoveSpedizioniIds = [...currentSpedizioniIds].filter(id => 
                !previousSpedizioniIds.has(id)
              );
              
              // Invia notifiche SOLO per le spedizioni effettivamente assegnate a questo autista
              if (nuoveSpedizioniIds.length > 0) {
                const nuoveSpedizioni = mieSpedizioni.filter(s => 
                  nuoveSpedizioniIds.includes(s.id) && s.daPianificare === false
                );
                
                nuoveSpedizioni.forEach((spedizione) => {
                  // Notifica in-app
                  setNotification({ 
                    text: `Nuova spedizione assegnata: ${spedizione.aziendaDestinazione} ${note}` 
                  });
                  
                  // Notifica push nativa con tipo specifico
                  if (pushNotificationsEnabled) {
                    const tipoMessages = {
                      'consegna': 'Nuova consegna assegnata!',
                      'ritiro': 'Nuovo ritiro assegnato!',
                      'entrambi': 'Nuova spedizione assegnata!'
                    };

                    const tipoIcons = {
                      'consegna': '🚚',
                      'ritiro': '📦', 
                      'entrambi': '🔄'
                    };

                    const title = tipoMessages[spedizione.tipo] || 'Nuova spedizione assegnata!';
                    const icon = tipoIcons[spedizione.tipo] || '🚛';

                    sendPushNotification(title, {
                      body: `${spedizione.aziendaDestinazione} - ${spedizione.indirizzo}`,
                      icon: icon,
                      tag: 'delivery-assignment',
                      requireInteraction: true,
                      onClick: () => {
                        navigate(`/spedizioni-mobile/${spedizione.id}`);
                      }
                    });
                    // Salva lo stato iniziale per evitare che un cambio immediato causi duplicati
                    lastKnownStates.set(spedizione.id, spedizione.status);
                  }
                });
              }
              // Controlla anche per cambi di stato delle spedizioni già assegnate a questo autista
              mieSpedizioni.forEach((s) => {
                const prevState = lastKnownStates.get(s.id);
                if (prevState && prevState !== s.status) {
                  // Lo stato è cambiato rispetto all'ultimo noto: invia notifica
                  setNotification({ text: `Aggiornamento spedizione #${s.id}: ${s.status}` });
                  if (pushNotificationsEnabled) {
                    const statusMessages = {
                      "In consegna": "Consegna iniziata",
                      "Consegnata": "Consegna completata",
                      "Fallita": "Consegna fallita"
                    };
                    sendPushNotification(
                      statusMessages[s.status] || `Stato aggiornato`,
                      {
                        body: `${s.aziendaDestinazione} - ${s.status}`,
                        icon: s.status === "Consegnata" ? '✅' : s.status === "Fallita" ? '❌' : '🚚'
                      }
                    );
                  }
                }
                // Aggiorna l'ultimo stato conosciuto
                lastKnownStates.set(s.id, s.status);
              });
            }
            
            // Aggiorna il set degli ID per il prossimo controllo
            previousSpedizioniIds = currentSpedizioniIds;
            
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
  }, [user, token, setNotification, sendPushNotification, pushNotificationsEnabled, navigate]);

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
        return "";
      case "ritiro":
        return "";
      case "entrambi":
        return "";
      default:
        return "";
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
      
      if (response.status === 401 || response.status === 403) {
        // Token non valido o scaduto, logout e reindirizza al login
        logout();
        navigate('/login');
        setNotification({ text: "Sessione scaduta. Effettua nuovamente il login.", type: 'error' });
        return;
      }
      
      if (!response.ok) throw new Error();
      
      // Trova la spedizione per ottenere i dettagli
      const spedizione = spedizioni.find(s => s.id === spedizioneId);
      
      // Aggiorna la lista locale
      setSpedizioni(prev => 
        prev.map(s => 
          s.id === spedizioneId ? { ...s, status: newStatus } : s
        ).filter(s => s.status !== "Consegnata") // Rimuovi consegnate dalla vista
      );
      
      const message = `Spedizione ${newStatus.toLowerCase()} con successo`;
      setNotification({ text: message });

      // Se la spedizione è stata marcata come Consegnata, invia automaticamente
      // un messaggio di chat che notifica la consegna.
      if (newStatus === 'Consegnata') {
        try {
          const text = `Ho consegnato la spedizione #${spedizioneId}${spedizione && spedizione.aziendaDestinazione ? ' - ' + spedizione.aziendaDestinazione : ''}`;
          const body = { text, spedizioneId };
          // Includiamo i dati mittente dal client (nome, mail) per compatibilità col formato messages.json
          if (user) {
            body.sender = { nome: user.nome || user.name || (user.mail ? user.mail.split('@')[0] : 'Autista'), mail: user.mail };
          }
          const messageResponse = await fetch(`${BASE_URL}/api/messaggi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
          });
          
          if (messageResponse.status === 401 || messageResponse.status === 403) {
            // Token non valido o scaduto, logout e reindirizza al login
            logout();
            navigate('/login');
            setNotification({ text: "Sessione scaduta. Effettua nuovamente il login.", type: 'error' });
            return;
          }
        } catch (err) {
          // Non bloccare l'utente: loggare errore e mostrare notifica leggera
          console.warn('Errore nell\'invio del messaggio di consegna:', err);
          setNotification({ text: 'Consegna registrata ma impossibile inviare messaggio di notifica', type: 'warning' });
        }
      }
      
      // Invia notifica push per conferma dell'azione
      if (pushNotificationsEnabled && spedizione) {
        const statusMessages = {
          "In consegna": "Consegna iniziata",
          "Consegnata": "Consegna completata",
          "Fallita": "Consegna fallita"
        };
        
        sendPushNotification(
          statusMessages[newStatus] || `Stato aggiornato`,
          {
            body: `${spedizione.aziendaDestinazione} - ${newStatus}`,
            icon: newStatus === "Consegnata" ? '✅' : newStatus === "Fallita" ? '❌' : '🚚'
          }
        );
      }
      
    } catch (error) {
      setNotification({ 
        text: "Errore nell'aggiornamento dello stato" 
      });
    }
  };

  const openMapsApp = (indirizzo, azienda) => {
    // Apri l'app di navigazione usando solo l'indirizzo di destinazione (senza il nome dell'azienda)
    const destination = encodeURIComponent(`${indirizzo}`);
    
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
  {/* Banner per richiedere permessi notifiche */}
      {showPermissionBanner && (
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Abilita le notifiche push</h3>
              <p className="text-xs opacity-90 mt-1">
                Ricevi notifiche per nuove spedizioni e messaggi anche quando l'app è in background
              </p>
            </div>
            <div className="flex gap-2 ml-3">
              <button
                onClick={handleRequestNotificationPermission}
                className="bg-white text-blue-600 text-xs px-3 py-1 rounded font-medium hover:bg-gray-100 transition-colors"
              >
                Abilita
              </button>
              <button
                onClick={() => setShowPermissionBanner(false)}
                className="text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      

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
                        <span className="text-gray-600">Richiesta da: </span>
                        <span className="font-medium text-gray-800">{spedizione.richiedente.nome}</span>
                      </div>
                    )}
                    {spedizione.note && (
                      <div className="flex items-start">
                        <span className="material-icons text-gray-400 text-sm mr-1 mt-0.5">notes</span>
                        <div>
                          <span className="text-gray-600">Note: </span>
                          <div className="text-gray-800 whitespace-pre-wrap break-words">{spedizione.note}</div>
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
                          if (window.confirm('Sei sicuro di voler segnare questa spedizione come consegnata?')) {
                            updateStatus(spedizione.id, "Consegnata");
                          }
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

      {/* Footer con pulsanti */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-3">
        {/* Pulsante Test Notifica (solo in development) */}
        {process.env.NODE_ENV === 'development' && pushNotificationsEnabled && (
          <button
            onClick={() => {
              sendPushNotification(
                "Test Notifica Push",
                {
                  body: "Questa è una notifica di test dal centro notifiche!",
                  requireInteraction: true,
                  onClick: () => console.log("Notifica cliccata!")
                }
              );
            }}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors"
            aria-label="Test Notifica"
          >
            <span className="material-icons">notifications</span>
          </button>
        )}
        {/* Pulsante Mappa odierna */}
        <button
          onClick={() => navigate('/autista/mappa')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-colors"
          aria-label="Mappa odierna"
        >
          <span className="material-icons">map</span>
        </button>
        
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
