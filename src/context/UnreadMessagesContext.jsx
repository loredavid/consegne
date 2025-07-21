import { createContext, useContext, useState, useEffect } from "react";
import { BASE_URL } from "../App";

const UnreadMessagesContext = createContext();

export function UnreadMessagesProvider({ children, user }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(Date.now());

  useEffect(() => {
    let isMounted = true;
    const fetchMessages = () => {
      if (!user?.token) return;
      fetch(`${BASE_URL}/api/messaggi`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          // Conta solo i messaggi successivi all'ultimo visto e non inviati dall'utente
          const newMsgs = Array.isArray(data)
            ? data.filter(msg => msg.sender?.mail !== user?.mail && new Date(msg.timestamp).getTime() > lastSeen)
            : [];
          setUnreadCount(newMsgs.length);
        });
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, lastSeen]);

  const markAllRead = () => setLastSeen(Date.now());

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, markAllRead }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext);
}
