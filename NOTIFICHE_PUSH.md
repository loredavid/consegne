# Notifiche Push - Pagina Autisti

# Notifiche Push - App Consegne

## Funzionalità Implementate

### 1. **Notifiche Push Native**
- Le notifiche appaiono nel centro notifiche del telefono
- Funzionano anche quando l'app è in background
- Richiedono il permesso dell'utente al primo utilizzo
- Disponibili per **tutti i tipi di utenti** (non solo autisti)

### 2. **Tipi di Notifiche**

#### **Nuovi Messaggi Chat** 💬
- Vengono inviate quando arriva un nuovo messaggio nella chat
- Formato: "Nuovo messaggio da [Nome]"
- Corpo: testo del messaggio (troncato a 100 caratteri se troppo lungo)
- Click sulla notifica: porta il focus alla finestra dell'app
- **Disponibile in tutte le pagine principali**
- **Tag**: 'chat-message' per raggruppamento

#### **Nuove Spedizioni Assegnate** (Solo Autisti)
- Vengono inviate SOLO quando viene assegnata una nuova spedizione specificamente all'autista corrente
- Non vengono inviate per spedizioni assegnate ad altri autisti
- Formato personalizzato in base al tipo:
  - "Nuova consegna assegnata!" (🚚)
  - "Nuovo ritiro assegnato!" (📦)
  - "Nuovo servizio completo assegnato!" (🔄)
- Corpo: "[Azienda] - [Indirizzo]"
- Click sulla notifica: reindirizza ai dettagli della spedizione
- **Tag**: 'delivery-assignment' per raggruppamento

#### **Cambi di Stato Spedizione** (Solo Autisti)
- Vengono inviate quando l'autista cambia lo stato di una spedizione
- Formato basato sullo stato:
  - "Consegna iniziata" (🚛)
  - "Consegna completata" (✅)
  - "Consegna fallita" (❌)

### **Copertura Notifiche Chat:**

#### **Pagine con Notifiche Chat Attive:**
- ✅ **Home** - Polling ogni 5 secondi
- ✅ **Chat Desktop** - Polling ogni 2 secondi
- ✅ **Chat Mobile** - Polling ogni 3 secondi  
- ✅ **Autista** - Polling ogni 2 secondi
- ✅ **Pianificazione** - Polling ogni 5 secondi
- ✅ **Richieste** - Polling ogni 6 secondi

#### **Hook Personalizzato:**
- `useChatNotifications()` - Hook riutilizzabile per notifiche chat
- Configurabile per intervallo di polling, tipi di notifiche, callback
- Gestisce automaticamente cleanup e ottimizzazioni

### 3. **Banner di Richiesta Permessi**
- `useChatNotifications()` - Hook riutilizzabile per notifiche chat
- Configurabile per intervallo di polling, tipi di notifiche, callback
- Gestisce automaticamente cleanup e ottimizzazioni
- Appare automaticamente se i permessi non sono stati concessi
- Pulsante per abilitare le notifiche
- Può essere chiuso dall'utente

### 4. **Pulsante di Test** (solo in development)
- Visibile solo durante lo sviluppo
- Permette di testare le notifiche push
- Icona: 🔔 (verde)

## Come Testare

### Su Mobile:
1. Apri l'app nel browser del telefono
2. Vai alla pagina Autisti
3. Accetta i permessi per le notifiche quando richiesto
4. Lascia l'app in background
5. Le notifiche appariranno nel centro notifiche

### Durante lo Sviluppo:
1. Vai alla pagina Autisti
2. Abilita le notifiche
3. Clicca il pulsante verde di test
4. Vedrai una notifica di test

## Configurazione Tecnica

### File Modificati:
- `src/context/NotificationContext.jsx` - Gestione permessi e invio notifiche
- `src/pages/Autista.jsx` - Integrazione notifiche nella pagina
- `src/hooks/usePushNotifications.js` - Hook personalizzato per notifiche
- `public/service-worker.js` - Gestione eventi notifiche

### Caratteristiche Tecniche:
- **Vibrazione**: Pattern personalizzato (200ms-100ms-200ms)
- **Icona**: Logo dell'app
- **Tag**: Raggruppamento per tipo
- **Auto-chiusura**: 5 secondi (configurabile)
- **Richiesta interazione**: Per notifiche importanti

## Logica di Tracciamento Assegnazioni

### **Sistema di Rilevamento Preciso**
Il sistema utilizza un approccio basato su ID per tracciare le assegnazioni:

1. **Set di ID Precedenti**: Mantiene un Set degli ID delle spedizioni dell'autista dal controllo precedente
2. **Confronto Differenziale**: Confronta gli ID attuali con quelli precedenti
3. **Rilevamento Nuove Assegnazioni**: Identifica solo le spedizioni effettivamente nuove per quell'autista
4. **Filtro Specifico**: Le notifiche vengono inviate SOLO per spedizioni assegnate al profilo dell'autista corrente

### **Prevenzione Falsi Positivi**
- ❌ Non invia notifiche al primo caricamento della pagina
- ❌ Non invia notifiche per spedizioni di altri autisti
- ❌ Non invia notifiche per spedizioni già esistenti
- ✅ Invia notifiche SOLO per nuove assegnazioni specifiche

## Browser Supportati
- ❌ Non invia notifiche al primo caricamento della pagina
- ❌ Non invia notifiche per spedizioni di altri autisti
- ❌ Non invia notifiche per spedizioni già esistenti
- ✅ Invia notifiche SOLO per nuove assegnazioni specifiche
- ✅ Chrome Mobile (Android)
- ✅ Firefox Mobile (Android)
- ✅ Safari Mobile (iOS 16.4+)
- ✅ Chrome Desktop
- ✅ Firefox Desktop
- ✅ Safari Desktop (macOS 13+)

## Note Importanti
- Le notifiche richiedono HTTPS in produzione
- L'utente deve dare il permesso esplicitamente
- Funzionano solo se l'app è stata visitata almeno una volta
- Su iOS, l'app deve essere aggiunta alla home screen per le notifiche in background

## Personalizzazione
Puoi modificare i tipi di notifiche e le loro configurazioni nel file `usePushNotifications.js`.
