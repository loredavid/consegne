import { useState, useEffect, useRef } from "react";
import { BASE_URL } from "../App";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";

export default function ChatMobile() {
  const { user, token } = useAuth();
  const { setNotification, sendPushNotification, pushNotificationsEnabled, requestNotificationPermission } = useNotification();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const messagesEndRef = useRef(null);

  // Solo autisti e admin possono accedere
  useEffect(() => {
    if (!user || !(user.role === "autista" || user.role === "admin")) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // Controlla se mostrare il banner per i permessi delle notifiche
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      setShowPermissionBanner(true);
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowPermissionBanner(false);
      setNotification({ text: "Notifiche push abilitate!" });
    } else {
      setNotification({ text: "Permessi per le notifiche negati" });
    }
  };

  // Fetch messages on mount and poll every 3s, solo se la tab è attiva
  useEffect(() => {
    if (user && token) {
      let isMounted = true;
      let interval;
      let lastMessageCount = 0;
      
      const fetchMessages = () => {
        if (document.visibilityState === "visible") {
          fetch(`${BASE_URL}/api/messaggi`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(data => {
              if (!isMounted) return;
              
              // Controlla se ci sono nuovi messaggi da altri utenti
              if (lastMessageCount > 0 && data.length > lastMessageCount) {
                const newMessages = data.slice(lastMessageCount);
                newMessages.forEach(msg => {
                  if (msg.sender?.mail !== user?.mail) {
                    // Notifica in-app
                    setNotification({ text: `${msg.sender?.nome}: ${msg.text}` });
                    
                    // Notifica push nativa se abilitata
                    if (pushNotificationsEnabled) {
                      sendPushNotification(
                        `Nuovo messaggio da ${msg.sender?.nome}`,
                        {
                          body: msg.text,
                          icon: '💬',
                          tag: 'chat-message',
                          requireInteraction: false,
                          onClick: () => {
                            window.focus();
                          }
                        }
                      );
                    }
                  }
                });
              }
              lastMessageCount = data.length;
              
              // Carica solo gli ultimi 50 messaggi
              const lastMessages = data.length > 50 ? data.slice(-50) : data;
              setMessages(lastMessages);
              setLoading(false);
            })
            .catch(() => {
              setError("Errore nel caricamento dei messaggi");
              setLoading(false);
            });
        }
      };
      fetchMessages();
      interval = setInterval(fetchMessages, 3000);
      document.addEventListener("visibilitychange", fetchMessages);
      return () => {
        isMounted = false;
        clearInterval(interval);
        document.removeEventListener("visibilitychange", fetchMessages);
      };
    }
  }, [user, token, setNotification, sendPushNotification, pushNotificationsEnabled]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/messaggi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sender: { nome: user.nome, mail: user.mail }, text })
      });
      if (!res.ok) throw new Error();
      setText("");
      setNotification({ text: "Messaggio inviato" });
    } catch {
      setNotification({ text: "Errore nell'invio del messaggio" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Banner per richiedere permessi notifiche */}
      {showPermissionBanner && (
        <div className="bg-blue-600 text-white p-3 mt-[64px]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Abilita le notifiche push</h3>
              <p className="text-xs opacity-90 mt-1">
                Ricevi notifiche per nuovi messaggi anche in background
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

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto p-3 mt-[64px]" style={{ maxHeight: "calc(100vh - 64px - 56px)" }}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">Nessun messaggio</div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col items-${msg.sender?.mail === user.mail ? "end" : "start"}`}
              >
                <div className={`inline-block px-3 py-2 rounded-lg text-sm shadow-sm mb-1 max-w-xs ${msg.sender?.mail === user.mail ? "bg-green-500 text-white" : "bg-white text-gray-800 border"}`}>
                  <span className="font-semibold text-xs block mb-1">{msg.sender?.nome || "Anonimo"}</span>
                  <span>{msg.text}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      {/* Input messaggio */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:border-green-400"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm shadow disabled:opacity-50"
        >
          Invia
        </button>
      </form>
    </div>
  );
}
