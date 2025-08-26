// Configurazione VAPID per Web Push (ES Module)
// Preferisce le variabili d'ambiente, altrimenti usa valori interni (placeholder).
const publicKey = process.env.VAPID_PUBLIC_KEY || 'BNC77BmR4IYHUvFStayGNAFvMwkw8Dbr_rRWcNYEM-LjvYNMs9OX3QQ23fbMKAjDJf-Mgr8ooqJKZo0aJco8V30';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'DYPG9_2faxBU6PsZSUnaM9LXNUf7JwKmeucLGffXoQU';

function isValidVapidKey(key) {
  if (!key || typeof key !== 'string') return false;
  // Deve essere URL-safe Base64 senza '=' padding
  return /^[A-Za-z0-9_-]+$/.test(key);
}

export default {
  publicKey,
  privateKey,
  isValid: () => isValidVapidKey(publicKey) && isValidVapidKey(privateKey)
};
