import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Utility per leggere/scrivere file JSON
function readData(file) {
  return JSON.parse(fs.readFileSync(path.join('data', file), 'utf8'));
}
function writeData(file, data) {
  fs.writeFileSync(path.join('data', file), JSON.stringify(data, null, 2));
}

// --- UTENTI ---
app.get('/api/utenti', (req, res) => {
  res.json(readData('users.json'));
});
app.post('/api/utenti', (req, res) => {
  const utenti = readData('users.json');
  const nuovo = { ...req.body, id: Date.now() };
  utenti.push(nuovo);
  writeData('users.json', utenti);
  res.json(nuovo);
});
app.put('/api/utenti/:id', (req, res) => {
  let utenti = readData('users.json');
  utenti = utenti.map(u => u.id == req.params.id ? { ...u, ...req.body } : u);
  writeData('users.json', utenti);
  res.json({ success: true });
});
app.delete('/api/utenti/:id', (req, res) => {
  let utenti = readData('users.json');
  utenti = utenti.filter(u => u.id != req.params.id);
  writeData('users.json', utenti);
  res.json({ success: true });
});

// --- SPEDIZIONI ---
app.get('/api/spedizioni', (req, res) => {
  res.json(readData('spedizioni.json'));
});
app.post('/api/spedizioni', (req, res) => {
  const spedizioni = readData('spedizioni.json');
  const nuova = { ...req.body, id: Date.now() };
  spedizioni.push(nuova);
  writeData('spedizioni.json', spedizioni);
  res.json(nuova);
});
app.put('/api/spedizioni/:id', (req, res) => {
  let spedizioni = readData('spedizioni.json');
  spedizioni = spedizioni.map(s => s.id == req.params.id ? { ...s, ...req.body } : s);
  writeData('spedizioni.json', spedizioni);
  res.json({ success: true });
});
app.delete('/api/spedizioni/:id', (req, res) => {
  let spedizioni = readData('spedizioni.json');
  spedizioni = spedizioni.filter(s => s.id != req.params.id);
  writeData('spedizioni.json', spedizioni);
  res.json({ success: true });
});

// --- POSIZIONI ---
app.get('/api/posizioni', (req, res) => {
  res.json(readData('posizioni.json'));
});
app.post('/api/posizioni', (req, res) => {
  const posizioni = readData('posizioni.json');
  const nuova = { ...req.body, id: Date.now() };
  posizioni.push(nuova);
  writeData('posizioni.json', posizioni);
  res.json(nuova);
});
app.put('/api/posizioni/:id', (req, res) => {
  let posizioni = readData('posizioni.json');
  posizioni = posizioni.map(p => p.id == req.params.id ? { ...p, ...req.body } : p);
  writeData('posizioni.json', posizioni);
  res.json({ success: true });
});
app.delete('/api/posizioni/:id', (req, res) => {
  let posizioni = readData('posizioni.json');
  posizioni = posizioni.filter(p => p.id != req.params.id);
  writeData('posizioni.json', posizioni);
  res.json({ success: true });
});

// --- MESSAGGI CHAT ---
app.get('/api/messaggi', (req, res) => {
  res.json(readData('messages.json'));
});

app.post('/api/messaggi', (req, res) => {
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
