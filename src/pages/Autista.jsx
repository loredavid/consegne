import { useEffect } from "react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

export default function Autista() {
  const { setNotification } = useNotification();
  const { user, token } = useAuth();
  useEffect(() => {
    if (user && token) {
      let isMounted = true;
      let lastCount = 0;
      const fetchMessages = () => {
        fetch("http://localhost:3001/api/messaggi", {
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Autista</h1>
      <p className="text-gray-600">Contenuto della pagina Autista...</p>
    </div>
  );
}
