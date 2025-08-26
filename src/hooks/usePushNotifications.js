import { useState, useEffect, useCallback } from 'react';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Controlla se le notifiche sono supportate
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsEnabled(result === 'granted');
      return result === 'granted';
    } catch (error) {
      console.error('Errore nella richiesta del permesso per le notifiche:', error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback((title, options = {}) => {
    if (!isEnabled) {
      console.warn('Le notifiche non sono abilitate');
      return null;
    }

    try {
      const defaultOptions = {
        icon: '/src/assets/Image 30 giu 2025, 08_12_36.png',
        badge: '/src/assets/Image 30 giu 2025, 08_12_36.png',
        vibrate: [200, 100, 200],
        tag: 'consegne-app',
        renotify: true,
        requireInteraction: false,
        silent: false,
        ...options
      };

      const notification = new Notification(title, defaultOptions);

      // Gestisce il click sulla notifica
      notification.onclick = function(event) {
        event.preventDefault();
        window.focus();
        this.close();
        
        if (options.onClick) {
          options.onClick();
        }
      };

      // Auto-chiudi dopo un tempo specificato
      const timeout = options.timeout || 5000;
      if (timeout > 0 && !defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, timeout);
      }

      return notification;
    } catch (error) {
      console.error('Errore nell\'invio della notifica:', error);
      return null;
    }
  }, [isEnabled]);

  // Funzioni di convenienza per tipi specifici di notifiche
  const sendMessageNotification = useCallback((senderName, messageText, onClick) => {
    return sendNotification(`Nuovo messaggio da ${senderName}`, {
      body: messageText,
      icon: '💬',
      tag: 'message',
      requireInteraction: true,
      onClick
    });
  }, [sendNotification]);

  const sendDeliveryNotification = useCallback((companyName, address, deliveryType, onClick) => {
    const typeMessages = {
      'consegna': 'Nuova consegna assegnata!',
      'ritiro': 'Nuovo ritiro assegnato!',
      'entrambi': 'Nuovo servizio (consegna + ritiro) assegnato!'
    };

    const typeIcons = {
      'consegna': '🚚',
      'ritiro': '📦',
      'entrambi': '🔄'
    };

    const title = typeMessages[deliveryType] || 'Nuova spedizione assegnata!';
    const icon = typeIcons[deliveryType] || '🚛';

    return sendNotification(title, {
      body: `${companyName} - ${address}`,
      icon: icon,
      tag: 'delivery-assignment',
      requireInteraction: true,
      onClick
    });
  }, [sendNotification]);

  const sendStatusNotification = useCallback((status, companyName) => {
    const statusMessages = {
      'In consegna': { title: 'Consegna iniziata', icon: '🚛' },
      'Consegnata': { title: 'Consegna completata', icon: '✅' },
      'Fallita': { title: 'Consegna fallita', icon: '❌' }
    };

    const config = statusMessages[status] || { title: 'Stato aggiornato', icon: '📦' };

    return sendNotification(config.title, {
      body: `${companyName} - ${status}`,
      icon: config.icon,
      tag: 'status',
      timeout: 3000
    });
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    isEnabled,
    requestPermission,
    sendNotification,
    sendMessageNotification,
    sendDeliveryNotification,
    sendStatusNotification
  };
};

export default usePushNotifications;
