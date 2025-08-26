import { createContext, useContext, useState, useEffect } from "react";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);

  // Controlla e richiede i permessi per le notifiche push
  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    if (!("Notification" in window)) {
      console.log("Le notifiche push non sono supportate dal browser");
      return false;
    }

    if (Notification.permission === "granted") {
      setPushNotificationsEnabled(true);
      return true;
    } else if (Notification.permission === "default") {
      // Richiedi il permesso
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushNotificationsEnabled(true);
        return true;
      }
    }
    
    setPushNotificationsEnabled(false);
    return false;
  };

  const requestNotificationPermission = async () => {
    return await checkNotificationPermission();
  };

  // Funzione per inviare notifiche push native
  const sendPushNotification = (title, options = {}) => {
    if (!pushNotificationsEnabled) {
      console.log("Notifiche push non abilitate");
      return;
    }

    const defaultOptions = {
      icon: '/src/assets/Image 30 giu 2025, 08_12_36.png',
      badge: '/src/assets/Image 30 giu 2025, 08_12_36.png',
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
      tag: 'consegne-app',
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);
      
      // Gestisce il click sulla notifica
      notification.onclick = function() {
        window.focus();
        this.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      // Auto-chiudi dopo 5 secondi se non è requireInteraction
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error("Errore nell'invio della notifica push:", error);
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <NotificationContext.Provider value={{ 
      notification, 
      setNotification,
      pushNotificationsEnabled,
      requestNotificationPermission,
      sendPushNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
