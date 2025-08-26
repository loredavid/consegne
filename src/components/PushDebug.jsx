import { useState } from 'react';
import { BASE_URL } from '../App';

export default function PushDebug() {
  const [log, setLog] = useState([]);
  const append = (t) => setLog(l => [...l, typeof t === 'string' ? t : JSON.stringify(t)]);

  const run = async () => {
    append('Starting push debug...');
    if (!('serviceWorker' in navigator)) {
      append('serviceWorker not supported in this browser');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      append('Service worker ready: ' + (registration.scope || 'no-scope'));

      // Some browsers (older iOS Safari or when not installed as PWA) do not expose pushManager.
      if (!registration.pushManager) {
        const msg = 'registration.pushManager is undefined in this browser (Push API not supported or restricted)';
        append(msg);
        try {
          await fetch(`${BASE_URL}/api/push/log-subscribe`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ error: msg, ua: navigator.userAgent }) });
          append('Posted diagnostic to server');
        } catch(e) {
          append('Failed to post diagnostic: ' + e.message);
        }
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      append('Current subscription: ' + (existing ? 'exists' : 'null'));
      if (existing) {
        append(existing);
        // send to server for logging
        try { await fetch(`${BASE_URL}/api/push/log-subscribe`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ note: 'debug-existing-sub', sub: existing, ua: navigator.userAgent }) }); append('Logged existing subscription to server'); } catch(e){ append('Failed to log existing sub: '+e.message); }
        return;
      }

      // get public key
      append('Fetching public key from backend...');
      const pkRes = await fetch(`${BASE_URL}/api/push/public-key`);
      if (!pkRes.ok) throw new Error('Failed to get public key: ' + pkRes.status);
      const { publicKey } = await pkRes.json();
      append('Public key length: ' + (publicKey || '').length);

      // subscribe
      append('Requesting pushManager.subscribe()...');
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      append('Subscription created');
      append(subscription);

      // send to backend
      append('Sending subscription to backend...');
      const saveRes = await fetch(`${BASE_URL}/api/push/subscribe`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(subscription) });
      append('Backend responded: ' + saveRes.status);
      try { const body = await saveRes.text(); append('Body: '+body); } catch(e){}

    } catch (err) {
      append('ERROR: ' + (err && err.message ? err.message : String(err)));
      try { await fetch(`${BASE_URL}/api/push/log-subscribe`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ error: err && err.message ? err.message : String(err), ua: navigator.userAgent }) }); append('Diagnostic posted to server'); } catch(e){ append('Failed to post diagnostic: '+e.message); }
    }
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-3">Push debug</h2>
      <p className="text-sm mb-4">Premi il pulsante per forzare la creazione della subscription e inviare risultati al server.</p>
      <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={run}>Esegui test push</button>
      <div className="mt-4 p-3 bg-gray-100 rounded h-64 overflow-auto">
        {log.map((l, i) => <div key={i} className="text-xs font-mono">{l}</div>)}
      </div>
    </div>
  );
}
