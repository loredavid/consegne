import { createContext, useContext, useState, useEffect } from "react";

const UnreadMessagesContext = createContext();

export function UnreadMessagesProvider({ children, user }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(Date.now());

  useEffect(() => {
    let isMounted = true;
    const fetchMessages = () => {
      fetch("http://localhost:3001/api/messaggi")
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          // Conta solo i messaggi successivi all'ultimo visto e non inviati dall'utente
          const newMsgs = data.filter(msg => msg.sender?.mail !== user?.mail && new Date(msg.timestamp).getTime() > lastSeen);
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
