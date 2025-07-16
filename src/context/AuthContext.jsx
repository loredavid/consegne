import { createContext, useContext, useState } from "react";
import { initialUsers } from "../data/users";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { username, role }
  const [users, setUsers] = useState(initialUsers);

  const login = (mail, password) => {
    const found = users.find(u => u.mail === mail && u.password === password);
    if (found) {
      setUser({ username: found.username, role: found.role, nome: found.nome, mail: found.mail });
      return true;
    } else {
      setUser(null);
      return false;
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
