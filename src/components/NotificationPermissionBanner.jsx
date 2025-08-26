import { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

/**
 * Banner riutilizzabile per richiedere i permessi delle notifiche push
 * Si mostra automaticamente se i permessi non sono stati concessi
 */
export default function NotificationPermissionBanner({ className = "" }) {
  const { pushNotificationsEnabled, requestNotificationPermission, subscribeForPush, setNotification } = useNotification();
  const [showBanner, setShowBanner] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // Mostra il banner solo se le notifiche sono supportate e non sono state abilitate
    if ("Notification" in window && Notification.permission === "default") {
      setShowBanner(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      try {
        setIsSubscribing(true);
        // Registra la subscription push con il backend
        const sub = await subscribeForPush();
        setShowBanner(false);
        if (sub) {
          setNotification({ text: 'Notifiche push abilitate e sottoscritte', type: 'success' });
        } else {
          const msg = 'Notifiche abilitate ma la sottoscrizione non è stata completata (Push API non disponibile o restrizioni del browser)';
          setNotification({ text: msg, type: 'warning' });
          // Invia diagnostica per capire perché il browser non ha restituito una subscription
          try {
            await fetch(`${process.env.REACT_APP_BASE_URL || ''}/api/push/log-subscribe`, {
              method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ note: 'subscription-null-after-grant', message: msg, userAgent: navigator.userAgent })
            });
          } catch(e){}
        }
      } finally {
        setIsSubscribing(false);
      }
    }
  };

  if (!showBanner || pushNotificationsEnabled) {
    return null;
  }

  return (
    <div className={`bg-blue-600 text-white p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">🔔 Abilita le notifiche push</h3>
          <p className="text-xs opacity-90 mt-1">
            Ricevi notifiche per nuovi messaggi e aggiornamenti anche quando l'app è in background
          </p>
        </div>
        <div className="flex gap-2 ml-3">
          <button
            onClick={handleRequestPermission}
            className="bg-white text-blue-600 text-xs px-3 py-1 rounded font-medium hover:bg-gray-100 transition-colors disabled:opacity-60"
            disabled={isSubscribing}
          >
            {isSubscribing ? 'Abilitazione...' : 'Abilita'}
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="text-white text-xs px-2 py-1 rounded hover:bg-blue-700 transition-colors"
            title="Chiudi banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
