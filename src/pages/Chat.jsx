import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

export default function Chat() {
  const { user } = useAuth();
  const { setNotification } = useNotification();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  // Fetch messages on mount and poll every 2s
  useEffect(() => {
    let isMounted = true;
    const fetchMessages = () => {
      fetch("http://localhost:3001/api/messaggi")
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          // Notifica solo se c'è un nuovo messaggio da altri
          if (messages.length > 0 && data.length > messages.length) {
            const newMsgs = data.slice(messages.length);
            newMsgs.forEach(msg => {
              if (msg.sender?.mail !== user?.mail) {
                setNotification({ text: `${msg.sender?.nome}: ${msg.text}` });
              }
            });
          }
          setMessages(data);
          setLoading(false);
        })
        .catch(() => {
          setError("Errore nel caricamento dei messaggi");
          setLoading(false);
        });
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, messages.length, setNotification]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const res = await fetch("http://localhost:3001/api/messaggi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: { nome: user?.nome || "Anonimo", mail: user?.mail || "" }, text })
      });
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setText("");
      setError("");
    } catch {
      setError("Errore nell'invio del messaggio");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Chat</h1>
      <div className="bg-white rounded shadow p-6 mb-6 h-[600px] overflow-y-auto flex flex-col">
        {loading ? (
          <div className="text-blue-600">Caricamento messaggi...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`mb-2 flex ${msg.sender?.nome?.trim().toLowerCase() === user?.nome?.trim().toLowerCase() ? "justify-end" : "justify-start"}`}>
              <div className="flex flex-col items-start max-w-xl">
                <span className={`font-bold mb-1 text-sm ${msg.sender?.nome?.trim().toLowerCase() === user?.nome?.trim().toLowerCase() ? "text-blue-700" : "text-gray-700"}`}>{msg.sender?.nome}</span>
                <div className={`px-4 py-3 rounded-lg break-words ${msg.sender?.nome?.trim().toLowerCase() === user?.nome?.trim().toLowerCase() ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-800"}`}>
                  <span>{msg.text}</span>
                  <span className="ml-2 text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 border rounded p-3 text-lg"
          placeholder="Scrivi un messaggio..."
          disabled={loading}
        />
        <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded text-lg font-semibold" disabled={loading || !text.trim()}>
          Invia
        </button>
      </form>
    </div>
  );
}
