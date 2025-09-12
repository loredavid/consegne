import { createContext, useContext, useState, useEffect } from "react";
import { BASE_URL } from "../App";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // Verifica la validità del token al caricamento dell'app
  useEffect(() => {
    const validateToken = async () => {
      const token = user?.token;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BASE_URL}/api/utenti`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
          // Token non valido, rimuovi l'utente
          setUser(null);
          setError("Sessione scaduta");
          setLoading(false);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.warn("Errore nella validazione del token:", err);
        setError("Errore nel caricamento utenti");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [user?.token]);

  // Quando un utente è presente (es. al refresh o al login), proviamo automaticamente
  // ad associare qualsiasi PushSubscription esistente nel browser a questo userId.
  useEffect(() => {
    if (!user || !user.id) return;
    (async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        const registration = await navigator.serviceWorker.ready;
        if (!registration || !registration.pushManager) return;
        const existing = await registration.pushManager.getSubscription();
        if (!existing) return;

        const body = { ...existing, userId: user.id };
        try {
          await fetch(`${BASE_URL}/api/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          await fetch(`${BASE_URL}/api/push/associate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: existing.endpoint, userId: user.id }) });
          console.log('[PUSH] Auto-associated existing subscription to user', user.id);
        } catch (e) {
          console.warn('Auto-associate request failed:', e.message);
        }
      } catch (e) {
        console.warn('Error checking push subscription for auto-associate:', e.message);
      }
    })();
  }, [user]);

  const login = async (mail, password) => {
    try {
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, password })
      });
      if (!res.ok) {
        // Try to read backend error message for debugging
        let body = null;
        try { body = await res.json(); } catch (e) { body = null; }
        console.warn('Login failed:', res.status, body);
        setUser(null);
        setError((body && body.error) ? body.error : "Credenziali non valide");
        return false;
      }
      const userData = await res.json();
      // Store all backend fields and token
      setUser({ ...userData });
      // Persist immediately so callers can read it synchronously after login
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('[Auth] login success, user persisted to localStorage');
      } catch (e) {
        console.warn('Could not persist user to localStorage immediately:', e.message);
      }
      setError(null);

      // After login, if a service worker subscription exists in the browser, associate it with this user
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.pushManager) {
            const existing = await registration.pushManager.getSubscription();
            if (existing) {
              // send to backend with userId
              try {
                const endpoint = existing.endpoint;
                const body = { ...existing, userId: userData.id };
                await fetch(`${BASE_URL}/api/push/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                // also try associate endpoint in case server expects that
                await fetch(`${BASE_URL}/api/push/associate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint, userId: userData.id }) });
              } catch (e) {
                console.warn('Could not associate push subscription with user after login:', e.message);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Error checking push subscription after login:', e.message);
      }
      return true;
    } catch {
      setError("Errore di autenticazione");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const addUser = async (newUser) => {
    try {
      const res = await fetch(`${BASE_URL}/api/utenti`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user && user.token ? user.token : localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : ''}`
        },
        body: JSON.stringify(newUser)
      });
      const added = await res.json();
      setUsers(prev => [...prev, added]);
      setError(null);
    } catch {
      setError("Errore nell'aggiunta utente");
    }
  };

  const updateUser = async (id, updated) => {
    try {
      await fetch(`${BASE_URL}/api/utenti/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user && user.token ? user.token : localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : ''}`
        },
        body: JSON.stringify(updated)
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
      setError(null);
    } catch {
      setError("Errore nell'aggiornamento utente");
    }
  };

  const deleteUser = async (id) => {
    try {
      await fetch(`${BASE_URL}/api/utenti/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user && user.token ? user.token : localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : ''}`
        }
      });
      setUsers(prev => prev.filter(u => u.id !== id));
      setError(null);
    } catch {
      setError("Errore nell'eliminazione utente");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token: user?.token, login, logout, users, addUser, updateUser, deleteUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
