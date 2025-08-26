import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
// Middleware per loggare ogni richiesta ricevuta e orario
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[REQUEST] ${req.method} ${req.originalUrl} @ ${now}`);
  next();
});
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Route per notifiche push (ESM import)
import pushRouter, { sendPushToUser } from './push.js';
app.use('/api/push', pushRouter);


// --- LOGIN SICURO CON JWT ---
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.post('/api/login', async (req, res) => {
  const { mail, password } = req.body;
  const utenti = readData('users.json');
  const user = utenti.find(u => u.mail === mail);
  if (!user) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }
  const { password: pw, ...userNoPassword } = user;
  const token = jwt.sign(userNoPassword, JWT_SECRET, { expiresIn: '12h' });
  res.json({ ...userNoPassword, token });
});

// Middleware di autenticazione
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  const token = auth.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido' });
  }
}


// Ottieni la directory corrente del file (compatibile con ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve file statici per i loghi SOLO dalla cartella corretta
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Assicura che la cartella uploads esista SOLO in server/uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer per upload immagini SOLO in server/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + Date.now() + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

// Utility per leggere/scrivere file JSON
function readData(file) {
  return JSON.parse(fs.readFileSync(path.join('data', file), 'utf8'));
}
function writeData(file, data) {
  fs.writeFileSync(path.join('data', file), JSON.stringify(data, null, 2));
}

// --- UTENTI ---
app.get('/api/utenti', requireAuth, (req, res) => {
  res.json(readData('users.json').map(({ password, ...rest }) => rest));
});
app.post('/api/utenti', requireAuth, async (req, res) => {
  const utenti = readData('users.json');
  // Hash password
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const nuovo = { ...req.body, password: hashedPassword, id: Date.now() };
  utenti.push(nuovo);
  writeData('users.json', utenti);
  // Non restituire la password
  const { password, ...userNoPassword } = nuovo;
  res.json(userNoPassword);
});
app.put('/api/utenti/:id', requireAuth, async (req, res) => {
  let utenti = readData('users.json');
  utenti = await Promise.all(utenti.map(async u => {
    if (u.id == req.params.id) {
      let updated = { ...u, ...req.body };
      // Se la password è stata aggiornata, hash
      if (req.body.password && req.body.password !== u.password) {
        updated.password = await bcrypt.hash(req.body.password, 10);
      }
      return updated;
    }
    return u;
  }));
  writeData('users.json', utenti);
  res.json({ success: true });
});
app.delete('/api/utenti/:id', requireAuth, (req, res) => {
  let utenti = readData('users.json');
  utenti = utenti.filter(u => u.id != req.params.id);
  writeData('users.json', utenti);
  res.json({ success: true });
});

// --- SPEDIZIONI ---
app.get('/api/spedizioni', requireAuth, (req, res) => {
  let data = [];
  try {
    data = readData('spedizioni.json');
    if (!Array.isArray(data)) data = [];
  } catch (err) {
    data = [];
  }
  res.json(data);
});
app.post('/api/spedizioni', requireAuth, (req, res) => {
  const spedizioni = readData('spedizioni.json');
  const nuova = { ...req.body, id: Date.now() };
  spedizioni.push(nuova);
  writeData('spedizioni.json', spedizioni);
  res.json(nuova);
});
app.put('/api/spedizioni/:id', requireAuth, async (req, res) => {
  let spedizioni = readData('spedizioni.json');
  const id = req.params.id;
  // find old spedizione
  const old = spedizioni.find(s => String(s.id) === String(id));
  spedizioni = spedizioni.map(s => s.id == id ? { ...s, ...req.body } : s);
  writeData('spedizioni.json', spedizioni);

  // if autista assigned and changed, notify the new autista
  try {
    const newSped = spedizioni.find(s => String(s.id) === String(id));
    const newAutista = req.body.autista || newSped.autista;
    const oldAutistaId = old && old.autista ? old.autista.id : null;
    const newAutistaId = newAutista && newAutista.id ? newAutista.id : null;
    if (newAutistaId && String(newAutistaId) !== String(oldAutistaId)) {
      // Prepare payload
      const payload = {
        title: 'Nuova spedizione assegnata',
        body: `Hai una nuova spedizione: #${newSped.id}`,
        url: `/spedizioni-mobile/${newSped.id}`
      };
      try {
        const results = await sendPushToUser(newAutistaId, payload);
        console.log('[PUSH] notify assign results:', results);
      } catch (e) {
        console.warn('[PUSH] errore nell\'invio push assign:', e.message);
      }
    }
  } catch (e) {
    console.warn('Errore nel tentativo di notificare autista:', e.message);
  }

  res.json({ success: true });
});
app.delete('/api/spedizioni/:id', requireAuth, (req, res) => {
  let spedizioni = readData('spedizioni.json');
  spedizioni = spedizioni.filter(s => s.id != req.params.id);
  writeData('spedizioni.json', spedizioni);
  res.json({ success: true });
});

// --- POSIZIONI ---
app.get('/api/posizioni', requireAuth, (req, res) => {
  let data = [];
  try {
    data = readData('posizioni.json');
    if (!Array.isArray(data)) data = [];
  } catch (err) {
    data = [];
  }
  res.json(data);
});
app.post('/api/posizioni', requireAuth, upload.single('logo'), (req, res) => {
  const posizioni = readData('posizioni.json');
  // id numerico univoco
  const nuovo = { ...req.body, id: Date.now() };
  if (req.file) {
    nuovo.logo = req.file.filename;
  } else {
    nuovo.logo = '';
  }
  // Assicura che i campi numerici siano numeri
  if (nuovo.lat) nuovo.lat = Number(nuovo.lat);
  if (nuovo.lng) nuovo.lng = Number(nuovo.lng);
  posizioni.push(nuovo);
  writeData('posizioni.json', posizioni);
  res.json(nuovo);
});
app.put('/api/posizioni/:id', requireAuth, upload.single('logo'), (req, res) => {
  let posizioni = readData('posizioni.json');
  posizioni = posizioni.map(p => {
    if (String(p.id) === String(req.params.id)) {
      const updated = { ...p, ...req.body };
      if (req.file) {
        // Elimina il vecchio logo se esiste e diverso
        if (p.logo && p.logo !== req.file.filename) {
          const oldLogoPath = path.join(uploadsDir, p.logo);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }
        updated.logo = req.file.filename;
      } else {
        updated.logo = p.logo || '';
      }
      // Assicura che i campi numerici siano numeri
      if (updated.lat) updated.lat = Number(updated.lat);
      if (updated.lng) updated.lng = Number(updated.lng);
      return updated;
    }
    return p;
  });
  writeData('posizioni.json', posizioni);
  res.json({ success: true });
});
app.delete('/api/posizioni/:id', requireAuth, (req, res) => {
  let posizioni = readData('posizioni.json');
  posizioni = posizioni.filter(p => p.id != req.params.id);
  writeData('posizioni.json', posizioni);
  res.json({ success: true });
});

// --- MESSAGGI CHAT ---
app.get('/api/messaggi', requireAuth, (req, res) => {
  let data = [];
  try {
    data = readData('messages.json');
    if (!Array.isArray(data)) data = [];
  } catch (err) {
    data = [];
  }
  res.json(data);
});

app.post('/api/messaggi', requireAuth, (req, res) => {
  const messages = readData('messages.json');
  const nuovo = {
    ...req.body,
    id: Date.now(),
    timestamp: new Date().toISOString()
  };
  messages.push(nuovo);
  writeData('messages.json', messages);
  res.json(nuovo);
});

app.listen(PORT, () => {
  console.log(`Backend attivo su http://localhost:${PORT}`);
});
