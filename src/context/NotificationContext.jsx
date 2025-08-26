import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BASE_URL } from "../App";

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

  // Convert VAPID public key (URL-safe base64) to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Register push subscription with service worker and send to backend
  const subscribeForPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push non supportato in questo browser');
  setNotification && setNotification({ text: 'Push non supportato da questo browser', type: 'error' });
  return null;
    }

    try {
      // get public key from backend
      const res = await fetch(`${BASE_URL}/api/push/public-key`);
      if (!res.ok) throw new Error('Impossibile ottenere public key');
      const { publicKey } = await res.json();

      const registration = await navigator.serviceWorker.ready;

      // evita doppia subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      // invia la subscription al backend
      // serializziamo la subscription in plain object (alcuni browser forniscono toJSON)
      let subscriptionToSend = (subscription && typeof subscription.toJSON === 'function') ? subscription.toJSON() : subscription;
      try {
        const saved = localStorage.getItem('user');
        if (saved) {
          const user = JSON.parse(saved);
          if (user && user.id) subscriptionToSend = { ...subscriptionToSend, userId: user.id };
        }
      } catch (e) { /* ignore */ }

      try {
        const bodyStr = JSON.stringify(subscriptionToSend);
        console.log('[PUSH] sending subscription to backend:', subscriptionToSend && subscriptionToSend.endpoint);
        const saveRes = await fetch(`${BASE_URL}/api/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr
        });

        if (saveRes.ok) {
          setPushNotificationsEnabled(true);
          setNotification && setNotification({ text: 'Notifiche push abilitate e sottoscritte', type: 'success' });
          return subscription;
        }

        const errText = await saveRes.text().catch(() => 'Errore server');
        // Post diagnostics to backend for easier remote debugging
        try {
          await fetch(`${BASE_URL}/api/push/log-subscribe`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ note: 'subscribe-failed', status: saveRes.status, statusText: saveRes.statusText, requestBody: subscriptionToSend, responseBody: errText, ua: navigator.userAgent })
          });
        } catch (e) { console.warn('Failed to post subscribe diagnostic', e.message); }

        setNotification && setNotification({ text: 'Sottoscrizione inviata ma server ha risposto con errore: ' + errText, type: 'error' });
        return null;
      } catch (e) {
        // Network or unexpected error
        try { await fetch(`${BASE_URL}/api/push/log-subscribe`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ error: e.message, ua: navigator.userAgent }) }); } catch(_){}
        throw e;
      }
    } catch (err) {
      console.error('Errore nella registrazione per push:', err);
  setNotification && setNotification({ text: 'Errore nella registrazione per push: ' + err.message, type: 'error' });
  // invia diagnostica al backend
  try { await fetch(`${BASE_URL}/api/push/log-subscribe`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ error: err.message, stack: err.stack }) }); } catch(e){}
  return null;
    }
  }, []);

  const unsubscribePush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      return true;
    } catch (err) {
      console.error('Errore nell\'unsubscribing push:', err);
      return false;
    }
  }, []);

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
  sendPushNotification,
  subscribeForPush,
  unsubscribePush
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
