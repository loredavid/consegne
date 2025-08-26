import { useState, useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

/**
 * Banner riutilizzabile per richiedere i permessi delle notifiche push
 * Si mostra automaticamente se i permessi non sono stati concessi
 */
export default function NotificationPermissionBanner({ className = "" }) {
  const { pushNotificationsEnabled, requestNotificationPermission } = useNotification();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Mostra il banner solo se le notifiche sono supportate e non sono state abilitate
    if ("Notification" in window && Notification.permission === "default") {
      setShowBanner(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowBanner(false);
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
            className="bg-white text-blue-600 text-xs px-3 py-1 rounded font-medium hover:bg-gray-100 transition-colors"
          >
            Abilita
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
