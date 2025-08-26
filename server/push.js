import express from 'express';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import vapidKeys from './vapid-keys.js';

const router = express.Router();

// Ottieni __dirname compatibile con ESM
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBSCRIPTIONS_FILE = path.join(__dirname, 'data', 'push_subscriptions.json');

// Configura web-push
let webpushConfigured = false;
try {
  if (vapidKeys && vapidKeys.isValid && vapidKeys.isValid()) {
    webpush.setVapidDetails(
      'mailto:admin@consegne.app',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    webpushConfigured = true;
  } else {
    console.warn('VAPID keys non valide o mancanti. Le funzionalità di invio push saranno disabilitate.');
  }
} catch (err) {
  console.warn('Errore nella configurazione di web-push:', err.message);
}

// Carica le subscription dal file
function loadSubscriptions() {
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE));
  } catch {
    return [];
  }
}

// Salva le subscription nel file
function saveSubscriptions(subs) {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
}

// Endpoint per registrare una subscription
router.post('/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Subscription non valida' });
  }
  const subs = loadSubscriptions();
  const existing = subs.find(s => s.endpoint === subscription.endpoint);
  if (!existing) {
    subs.push(subscription);
    saveSubscriptions(subs);
    console.log(`[PUSH] Saved subscription: ${subscription.endpoint}`);
  } else {
    // If incoming subscription contains a userId, ensure we persist it on the existing record
    if (subscription.userId && (!existing.userId || String(existing.userId) !== String(subscription.userId))) {
      existing.userId = subscription.userId;
      saveSubscriptions(subs);
      console.log(`[PUSH] Updated subscription with userId: ${subscription.endpoint} -> ${subscription.userId}`);
    } else {
      console.log(`[PUSH] Subscription already exists: ${subscription.endpoint}`);
    }
  }
  res.status(201).json({ success: true });
});

// Associate an existing subscription endpoint with a userId
router.post('/associate', (req, res) => {
  const { endpoint, userId } = req.body || {};
  if (!endpoint || !userId) return res.status(400).json({ error: 'endpoint and userId required' });
  const subs = loadSubscriptions();
  const existing = subs.find(s => s.endpoint === endpoint);
  if (!existing) return res.status(404).json({ error: 'Subscription not found' });
  existing.userId = userId;
  saveSubscriptions(subs);
  console.log(`[PUSH] Associated endpoint with user ${userId}: ${endpoint}`);
  res.json({ ok: true });
});

// Debug: lista delle subscription salvate (utile per sviluppo)
router.get('/list', (req, res) => {
  const subs = loadSubscriptions();
  res.json({ count: subs.length, subscriptions: subs });
});

// Endpoint per ricevere diagnostica sulle sottoscrizioni client (es. errori su mobile)
router.post('/log-subscribe', (req, res) => {
  const diag = req.body || {};
  const logFile = path.join(__dirname, 'data', 'push_subscribe_errors.json');
  let list = [];
  try {
    if (fs.existsSync(logFile)) list = JSON.parse(fs.readFileSync(logFile));
  } catch (e) {
    list = [];
  }
  diag.timestamp = new Date().toISOString();
  list.push(diag);
  try {
    fs.writeFileSync(logFile, JSON.stringify(list, null, 2));
  } catch (e) {
    console.warn('Impossibile scrivere log subscribe:', e.message);
  }
  res.json({ ok: true });
});

// Endpoint per recuperare la public VAPID key (utile per il frontend)
router.get('/public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// Endpoint per inviare una notifica di test a tutte le subscription
router.post('/notify-test', async (req, res) => {
  if (!webpushConfigured) {
    return res.status(503).json({ error: 'VAPID keys mancanti o non valide. Configura VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.' });
  }
  const subs = loadSubscriptions();
  const payload = JSON.stringify({
    title: 'Test Push',
    body: 'Questa è una notifica push dal backend!',
    icon: '/icon-192x192.png',
    url: '/'
  });
  let results = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload);
      results.push({ endpoint: sub.endpoint, success: true });
    } catch (err) {
      results.push({ endpoint: sub.endpoint, success: false, error: err.message });
    }
  }
  res.json({ results });
});

// Send payload to subscriptions belonging to a specific userId
async function sendPushToUser(userId, payloadObj) {
  if (!webpushConfigured) throw new Error('webpush not configured');
  const subs = loadSubscriptions();
  const userSubs = subs.filter(s => s.userId && String(s.userId) === String(userId));
  const payload = JSON.stringify(payloadObj || { title: 'Consegne', body: 'Hai una nuova notifica' });
  let results = [];
  for (const sub of userSubs) {
    try {
      await webpush.sendNotification(sub, payload);
      results.push({ endpoint: sub.endpoint, success: true });
    } catch (err) {
      results.push({ endpoint: sub.endpoint, success: false, error: err.message });
    }
  }
  return results;
}

// Expose a test endpoint to send to a user (not authenticated for dev)
router.post('/send-to-user', async (req, res) => {
  const { userId, payload } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const results = await sendPushToUser(userId, payload);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { sendPushToUser };

export default router;
