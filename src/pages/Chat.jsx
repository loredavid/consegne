import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

export default function Chat() {
  const [showScrollButton, setShowScrollButton] = useState(false);
  // Track if initial scroll has been done
  const initialScrollDone = useRef(false);
  const { user, token } = useAuth();
  const { setNotification } = useNotification();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyTo, setReplyTo] = useState(null); // message id to reply to
  const messagesEndRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const messageRefs = useRef({}); // refs for each message

  // Fetch messages on mount and poll every 2s
  useEffect(() => {
    if (user && token) {
      let isMounted = true;
      const fetchMessages = () => {
        fetch("http://localhost:3001/api/messaggi", {
          headers: { Authorization: `Bearer ${token}` }
        })
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
    }
  }, [user, token, messages.length, setNotification]);


  const sendMessage = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      if (!user || !token) throw new Error("Non autenticato");
      const body = {
        sender: { nome: user?.nome || "Anonimo", mail: user?.mail || "" },
        text
      };
      if (replyTo) body.replyTo = replyTo;
      const res = await fetch("http://localhost:3001/api/messaggi", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const msg = await res.json();
      setMessages(prev => [...prev, msg]);
      setText("");
      setReplyTo(null);
      setError("");
      // Recalculate scroll button visibility after sending
      setTimeout(() => {
        const chatDiv = document.getElementById('chat-scrollable');
        if (chatDiv) {
          const atBottom = chatDiv.scrollHeight - chatDiv.scrollTop - chatDiv.clientHeight < 10;
          setShowScrollButton(!atBottom);
        }
      }, 0);
    } catch (err) {
      setError("Errore nell'invio del messaggio");
    }
  };

  // Always scroll to last message after messages are loaded
  // Scroll to last message only on initial page load
  useEffect(() => {
    if (messages.length > 0) {
      // Always scroll to last message when messages update with smooth animation
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // Always recalculate scroll button visibility after messages update
      setTimeout(() => {
        const chatDiv = document.getElementById('chat-scrollable');
        if (chatDiv) {
          const atBottom = chatDiv.scrollHeight - chatDiv.scrollTop - chatDiv.clientHeight < 10;
          setShowScrollButton(!atBottom);
        }
      }, 0);
    }
  }, [messages]);

  // Show scroll button only when not at bottom
  useEffect(() => {
    const chatDiv = document.getElementById('chat-scrollable');
    if (!chatDiv) return;
    const handleScroll = () => {
      const atBottom = chatDiv.scrollHeight - chatDiv.scrollTop - chatDiv.clientHeight < 10;
      setShowScrollButton(!atBottom);
    };
    chatDiv.addEventListener('scroll', handleScroll);
    // Initial check after render
    setTimeout(handleScroll, 0);
    return () => chatDiv.removeEventListener('scroll', handleScroll);
  }, []);
  // ...existing code...

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Chat</h1>
      <div id="chat-scrollable" className="bg-white rounded shadow p-6 mb-6 h-[600px] overflow-y-auto flex flex-col relative">
        {/* Button to scroll to last message */}
        {showScrollButton && (
          <button
            type="button"
            className="absolute right-4 bottom-4 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-all"
            style={{ zIndex: 10 }}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
          >Vai all'ultimo messaggio</button>
        )}
        {loading ? (
          <div className="text-blue-600">Caricamento messaggi...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          messages.map(msg => {
            // Messaggi di sistema
            if (msg.sender?.nome === "Sistema") {
              return (
                <div key={msg.id} className="mb-4 flex justify-center">
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-icons text-gray-400 text-xl">info</span>
                      <span className="font-semibold text-gray-500 text-base">Messaggio di sistema</span>
                    </div>
                    <div className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg mt-2 text-center max-w-2xl shadow" style={{ whiteSpace: 'pre-line' }}>
                      {msg.text}
                      <span className="ml-2 text-xs text-gray-400">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}</span>
                    </div>
                  </div>
                </div>
              );
            }
            // Messaggi utente
            const isMine = msg.sender?.nome?.trim().toLowerCase() === user?.nome?.trim().toLowerCase();
            // Find replied message if exists
            let repliedMsg = null;
            if (msg.replyTo) {
              repliedMsg = messages.find(m => m.id === msg.replyTo);
            }
            // Assign ref for scrolling
            if (!messageRefs.current[msg.id]) {
              messageRefs.current[msg.id] = React.createRef();
            }
            // Handler for quoted message click
            const handleQuotedClick = () => {
              const ref = messageRefs.current[msg.replyTo];
              if (ref && ref.current) {
                ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
                ref.current.classList.add("ring-4", "ring-blue-400");
                setTimeout(() => {
                  ref.current.classList.remove("ring-4", "ring-blue-400");
                }, 1500);
              }
            };
            return (
              <div key={msg.id} ref={messageRefs.current[msg.id]} className={`mb-2 flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className="flex flex-col items-start max-w-xl">
                  <span className={`font-bold mb-1 text-sm ${isMine ? "text-blue-700" : "text-gray-700"}`}>{msg.sender?.nome}</span>
                  {/* Quoted message preview */}
                  {repliedMsg && (
                    <div className="mb-1 px-3 py-2 rounded bg-gray-200 text-xs text-gray-600 border-l-4 border-blue-400 cursor-pointer hover:bg-blue-100" onClick={handleQuotedClick} title="Vai al messaggio originale">
                      <span className="font-semibold">Risposta a {repliedMsg.sender?.nome}:</span> {repliedMsg.text}
                    </div>
                  )}
                  <div className={`px-4 py-3 rounded-lg break-words ${isMine ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-800"}`}>
                    <span>{msg.text}</span>
                    <span className="ml-2 text-xs text-gray-400">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}</span>
                  </div>
                  {/* Reply button */}
                  <button
                    className="mt-1 text-xs text-blue-600 underline cursor-pointer self-end"
                    onClick={() => setReplyTo(msg.id)}
                  >Rispondi</button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 flex-col">
        {replyTo && (
          <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-400 text-sm text-blue-700 flex items-center justify-between">
            <span>
              Rispondendo a: <b>{messages.find(m => m.id === replyTo)?.sender?.nome}</b> — "{messages.find(m => m.id === replyTo)?.text}"
            </span>
            <button type="button" className="ml-4 text-xs text-red-500 underline" onClick={() => setReplyTo(null)}>Annulla</button>
          </div>
        )}
        <div className="flex gap-2">
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
        </div>
      </form>
    </div>
  );
}
