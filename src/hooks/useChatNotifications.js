import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { BASE_URL } from '../App';

/**
 * Hook personalizzato per gestire le notifiche push dei messaggi chat
 * Può essere utilizzato in qualsiasi componente per ricevere notifiche dei nuovi messaggi
 */
export const useChatNotifications = (options = {}) => {
  const { user, token } = useAuth();
  const { setNotification, sendPushNotification, pushNotificationsEnabled } = useNotification();
  
  const {
    pollInterval = 3000, // Intervallo di polling in millisecondi
    enableInAppNotifications = true, // Abilita notifiche in-app
    enablePushNotifications = true, // Abilita notifiche push
    onNewMessage = null, // Callback per nuovi messaggi
    maxMessages = 100 // Numero massimo di messaggi da tenere in memoria
  } = options;

  const lastMessageCountRef = useRef(0);
  const lastMessagesRef = useRef([]);

  useEffect(() => {
    if (!user || !token) return;

    let isMounted = true;
    let interval;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/messaggi`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Errore nel caricamento messaggi');
        
        const messages = await response.json();
        if (!isMounted) return;

        // Controlla se ci sono nuovi messaggi
        if (lastMessageCountRef.current > 0 && messages.length > lastMessageCountRef.current) {
          const newMessages = messages.slice(lastMessageCountRef.current);
          
          newMessages.forEach(message => {
            // Solo messaggi da altri utenti
            if (message.sender?.mail !== user?.mail) {
              // Notifica in-app
              if (enableInAppNotifications) {
                setNotification({ 
                  text: `${message.sender?.nome}: ${message.text}` 
                });
              }

              // Notifica push
              if (enablePushNotifications && pushNotificationsEnabled) {
                sendPushNotification(
                  `Nuovo messaggio da ${message.sender?.nome}`,
                  {
                    body: message.text.length > 100 ? 
                      message.text.substring(0, 100) + '...' : 
                      message.text,
                    icon: '💬',
                    tag: 'chat-message',
                    requireInteraction: false,
                    onClick: () => {
                      window.focus();
                      // Se fornito, esegui callback personalizzato
                      if (onNewMessage) {
                        onNewMessage(message);
                      }
                    }
                  }
                );
              }

              // Callback personalizzato per nuovi messaggi
              if (onNewMessage) {
                onNewMessage(message);
              }
            }
          });
        }

        // Aggiorna i riferimenti
        lastMessageCountRef.current = messages.length;
        lastMessagesRef.current = messages.slice(-maxMessages); // Mantieni solo gli ultimi N messaggi

      } catch (error) {
        console.error('Errore nel polling dei messaggi:', error);
      }
    };

    // Primo caricamento
    fetchMessages();

    // Polling periodico
    interval = setInterval(fetchMessages, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    user, 
    token, 
    pollInterval, 
    enableInAppNotifications, 
    enablePushNotifications, 
    pushNotificationsEnabled,
    setNotification, 
    sendPushNotification,
    onNewMessage,
    maxMessages
  ]);

  return {
    lastMessages: lastMessagesRef.current,
    messageCount: lastMessageCountRef.current
  };
};

export default useChatNotifications;
