import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { username, role }
  const [users, setUsers] = useState([
    { id: 1, username: "admin", password: "admin", role: "admin", nome: "Mario Rossi", mail: "mario@rossi.it" },
    { id: 2, username: "autista", password: "autista", role: "autista", nome: "Anna Neri", mail: "anna@neri.it" },
    { id: 3, username: "pianificatore", password: "pianificatore", role: "pianificatore", nome: "Giulia Bianchi", mail: "giulia@bianchi.it" },
    { id: 4, username: "richiedente", password: "richiedente", role: "richiedente", nome: "Luca Verdi", mail: "luca@verdi.it" },
  ]);

  const login = (mail, password) => {
    const found = users.find(u => u.mail === mail && u.password === password);
    if (found) {
      setUser({ username: found.username, role: found.role, nome: found.nome, mail: found.mail });
    } else {
      setUser(null);
    }
  };

  const logout = () => setUser(null);

  const addUser = (newUser) => {
    setUsers([...users, { ...newUser, id: Date.now() }]);
  };

  const updateUser = (id, updated) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...updated } : u));
  };

  const deleteUser = (id) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users, addUser, updateUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
