import { createContext, useContext, useState, useEffect } from "react";

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

  // Fetch users from backend on mount
  useEffect(() => {
    fetch("http://localhost:3001/api/utenti")
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        setError("Errore nel caricamento utenti");
        setLoading(false);
      });
  }, []);

  const login = async (mail, password) => {
    try {
      const res = await fetch("http://localhost:3001/api/utenti");
      const utenti = await res.json();
      const found = utenti.find(u => u.mail === mail && u.password === password);
      if (found) {
        setUser({ nome: found.nome, role: found.role, mail: found.mail });
        return true;
      } else {
        setUser(null);
        return false;
      }
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
      const res = await fetch("http://localhost:3001/api/utenti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      await fetch(`http://localhost:3001/api/utenti/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      await fetch(`http://localhost:3001/api/utenti/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== id));
      setError(null);
    } catch {
      setError("Errore nell'eliminazione utente");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users, addUser, updateUser, deleteUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
