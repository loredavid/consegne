import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

export default function GestioneUtenti() {
  const { user, token, users, addUser, updateUser, deleteUser, loading, error } = useAuth();
  const { setNotification } = useNotification();
  const [form, setForm] = useState({ username: "", password: "", nome: "", mail: "", ruolo: "admin" });
  const [editId, setEditId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionUserId, setActionUserId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && token) {
      let isMounted = true;
      let lastCount = 0;
      const fetchMessages = () => {
        fetch("http://localhost:3001/api/messaggi", {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (!isMounted) return;
            if (lastCount > 0 && data.length > lastCount) {
              const newMsgs = data.slice(lastCount);
              newMsgs.forEach(msg => {
                setNotification({ text: `${msg.sender?.nome}: ${msg.text}` });
              });
            }
            lastCount = data.length;
          });
      };
      fetchMessages();
      const interval = setInterval(fetchMessages, 2000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [setNotification, user, token]);

  if (!user || user.role !== "admin") return <div className="p-8 text-center text-red-600">Accesso negato</div>;

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async e => {
    e.preventDefault();
    const payload = { ...form, role: form.ruolo };
    delete payload.ruolo;
    await addUser(payload);
    setForm({ username: "", password: "", nome: "", mail: "", ruolo: "admin" });
    setShowAddModal(false);
  };

  const handleEdit = u => {
    setEditId(u.id);
    setForm({ ...u, ruolo: u.role });
    setShowEditModal(true);
  };

  const handleUpdate = async e => {
    e.preventDefault();
    const payload = { ...form, role: form.ruolo, id: editId };
    delete payload.ruolo;
    await updateUser(editId, payload);
    setEditId(null);
    setShowEditModal(false);
    setForm({ username: "", password: "", nome: "", mail: "", ruolo: "admin" });
  };

  const handleDelete = async id => {
    if (window.confirm("Sei sicuro di voler eliminare questo utente?")) await deleteUser(id);
  };

  const handleActionClick = (id) => {
    setActionUserId(actionUserId === id ? null : id);
  };
  const closeActions = () => setActionUserId(null);

  // Raggruppa utenti per ruolo
  const gruppi = {
    admin: users.filter(u => u.role === "admin"),
    autista: users.filter(u => u.role === "autista"),
    pianificatore: users.filter(u => u.role === "pianificatore"),
    richiedente: users.filter(u => u.role === "richiedente"),
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">Utenti</h2>
      {loading && <div className="mb-4 text-blue-600">Caricamento utenti...</div>}
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <div className="flex justify-end mb-6">
        <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" onClick={() => setShowAddModal(true)} disabled={loading}>
          + Aggiungi Utente
        </button>
      </div>
      <div className="bg-white rounded shadow p-4">
        {Object.entries(gruppi).map(([ruolo, utenti]) => (
          <div key={ruolo} className="mb-6">
            <div className="font-semibold text-lg mb-2 capitalize">{ruolo === "admin" ? "Amministratore" : ruolo.charAt(0).toUpperCase() + ruolo.slice(1)}</div>
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="text-left px-2">Nome</th>
                  <th className="text-left px-2">Email</th>
                  <th className="text-center px-2">Foto</th>
                  <th className="text-left px-2">Ruolo</th>
                  <th className="text-center px-2"></th>
                </tr>
              </thead>
              <tbody>
                {utenti.map(u => (
                  <tr key={u.id} className="bg-white hover:bg-gray-50 rounded shadow-sm">
                    <td className="px-2 py-2 font-medium text-sm">{u.nome}</td>
                    <td className="px-2 py-2 text-sm">{u.mail}</td>
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
                        <User size={24} className="text-gray-400" />
                      </span>
                    </td>
                    <td className="px-2 py-2 text-sm">{ruolo === "admin" ? "Amministratore" : u.role.charAt(0).toUpperCase() + u.role.slice(1)}</td>
                    <td className="px-2 py-2 text-center relative">
                      <button className="text-gray-400 hover:text-blue-600 mr-2" title="Azioni" onClick={() => handleActionClick(u.id)} disabled={loading}>
                        &#x2026;
                      </button>
                      {actionUserId === u.id && (
                        <div className="absolute right-0 mt-2 bg-white border rounded shadow z-10 min-w-[120px]">
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" onClick={() => { handleEdit(u); closeActions(); }} disabled={loading}>
                            Modifica
                          </button>
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600" onClick={() => { handleDelete(u.id); closeActions(); }} disabled={loading}>
                            Elimina
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {/* Modal aggiunta utente */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Aggiungi Utente</h3>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <label className="text-sm font-semibold">Username
                <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2 rounded w-full mt-1" required disabled={loading} />
              </label>
              <label className="text-sm font-semibold">Password
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="border p-2 rounded w-full mt-1 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </label>
              <label className="text-sm font-semibold">Nome
                <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome" className="border p-2 rounded w-full mt-1" required disabled={loading} />
              </label>
              <label className="text-sm font-semibold">Mail
                <input name="mail" value={form.mail} onChange={handleChange} placeholder="Mail" className="border p-2 rounded w-full mt-1" required disabled={loading} />
              </label>
              <label className="text-sm font-semibold">Ruolo
                <select name="ruolo" value={form.ruolo} onChange={handleChange} className="border p-2 rounded w-full mt-1" disabled={loading}>
                  <option value="admin">Admin</option>
                  <option value="pianificatore">Pianificatore</option>
                  <option value="richiedente">Richiedente</option>
                  <option value="autista">Autista</option>
                </select>
              </label>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>Aggiungi</button>
                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => { setShowAddModal(false); setForm({ username: "", password: "", nome: "", mail: "", ruolo: "admin" }); }} disabled={loading}>Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal modifica utente */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Modifica Utente</h3>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <label className="text-sm font-semibold">Username
                <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2 rounded w-full mt-1" required disabled={loading} />
              </label>
              <label className="text-sm font-semibold">Password
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="border p-2 rounded w-full mt-1 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </label>
              <label className="text-sm font-semibold">Nome
                <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome" className="border p-2 rounded w-full mt-1" required disabled={loading} />
              </label>
              <label className="text-sm font-semibold">Mail
                <input name="mail" value={form.mail} onChange={handleChange} placeholder="Mail" className="border p-2 rounded w-full mt-1" required disabled={loading} />
              </label>
              <label className="text-sm font-semibold">Ruolo
                <select name="ruolo" value={form.ruolo} onChange={handleChange} className="border p-2 rounded w-full mt-1" disabled={loading}>
                  <option value="admin">Admin</option>
                  <option value="pianificatore">Pianificatore</option>
                  <option value="richiedente">Richiedente</option>
                  <option value="autista">Autista</option>
                </select>
              </label>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>Salva</button>
                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => { setEditId(null); setShowEditModal(false); setForm({ username: "", password: "", nome: "", mail: "", ruolo: "admin" }); }} disabled={loading}>Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
