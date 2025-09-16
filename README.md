Consegne

Consegne è una web app per la gestione delle richieste e delle consegne, pensata per amministratori, autisti, pianificatori e utenti interni. L'app offre funzionalità di pianificazione, monitoraggio dello stato delle consegne, gestione delle destinazioni, messaggistica interna e un pannello di amministrazione con gestione utenti e ruoli.

**Panoramica:**
- Applicazione single-page (SPA) frontend realizzata con React + Vite.
- Backend leggero in Node.js (cartella `server/`) per API, gestione push e dati di esempio.
- Dati d'esempio e upload in `server/data/`.

**Funzionalità principali:**
- Login con email e password
- Gestione utenti e ruoli (Admin, Pianificatore, Richiedente, Autista)
- Pianificazione e assegnazione consegne
- Gestione e visualizzazione posizioni/destinazioni
- Chat interna e notifiche push
- Pannello Admin per dati e utenti

**Tecnologie principali:**
- Frontend: React, React Router, Vite, Tailwind CSS
- Backend: Node.js (express), script per push notifications

**Requisiti:**
- Node.js 16+ e npm

## Avvio rapido (sviluppo)

Segui questi passi per avviare sia il frontend che il server in locale.

1) Clona la repository e entra nella cartella del progetto

```bash
git clone https://github.com/loredavid/consegne.git
cd consegne
```

2) Installa le dipendenze (root contiene il `package.json` del frontend e `server/package.json` per il backend)

```bash
npm install
cd server && npm install
cd ..
```

3) Avvia il server di sviluppo del backend (porta di default: 3001)

```bash
cd server
npm start
# oppure: node index.js
```

4) Avvia il frontend in modalità sviluppo (porta di default: 3000)

```bash
cd ..
npm run dev
```

5) Apri l'app nel browser

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

Nota: se usi un'altra porta, aggiorna le variabili d'ambiente o i file di configurazione del client.

## Struttura del progetto (sintesi)

```
.
├─ public/                 # file statici e service worker
├─ server/                 # backend Node.js (API, push, dati di esempio)
│  ├─ data/                # dati d'esempio e upload
│  ├─ index.js
│  └─ push.js
├─ src/                    # frontend React
│  ├─ components/
│  ├─ context/
│  ├─ hooks/
│  └─ pages/
├─ package.json            # script e dipendenze frontend
└─ README.md
```

## Script utili
- `npm run dev` — avvia il dev server Vite (frontend)
- `npm run build` — builda la versione di produzione del frontend
- `cd server && npm start` — avvia il backend Node.js

## Dati di esempio
- I file di demo si trovano in `server/data/` (utenti, spedizioni, posizioni, sottoscrizioni push).

## Contributi
- Apri una issue per bug o richieste di funzionalità.
- Per contributi: crea una branch, implementa la modifica e invia una pull request.

## Contatti
- Autore: Loredavid

## Licenza
Questo progetto è distribuito con licenza MIT.
