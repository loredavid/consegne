import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User } from "lucide-react";

export default function GestioneUtenti() {
  const { user, users, addUser, updateUser, deleteUser } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", nome: "", mail: "", ruolo: "admin" });
  const [editId, setEditId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionUserId, setActionUserId] = useState(null);

  if (!user || user.role !== "admin") return <div className="p-8 text-center text-red-600">Accesso negato</div>;

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = e => {
    e.preventDefault();
    addUser(form);
    setForm({ username: "", password: "", nome: "", mail: "", ruolo: "admin" });
  };

  const handleEdit = u => {
    setEditId(u.id);
    setForm({ ...u });
    setShowEditModal(true);
  };

  const handleUpdate = e => {
    e.preventDefault();
    updateUser(editId, form);
    setEditId(null);
    setShowEditModal(false);
    setForm({ username: "", password: "", nome: "", mail: "", ruolo: "admin" });
  };

  const handleDelete = id => {
    if (window.confirm("Sei sicuro di voler eliminare questo utente?")) deleteUser(id);
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
      <form onSubmit={handleAdd} className="mb-8 flex gap-4 flex-wrap items-end">
        <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2 rounded w-32" required />
        <input name="password" value={form.password} onChange={handleChange} placeholder="Password" className="border p-2 rounded w-32" required />
        <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome" className="border p-2 rounded w-32" required />
        <input name="mail" value={form.mail} onChange={handleChange} placeholder="Mail" className="border p-2 rounded w-32" required />
        <select name="ruolo" value={form.ruolo} onChange={handleChange} className="border p-2 rounded w-32">
          <option value="admin">Admin</option>
          <option value="pianificatore">Pianificatore</option>
          <option value="richiedente">Richiedente</option>
          <option value="autista">Autista</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Aggiungi</button>
      </form>
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
                      <button className="text-gray-400 hover:text-blue-600 mr-2" title="Azioni" onClick={() => handleActionClick(u.id)}>
                        &#x2026;
                      </button>
                      {actionUserId === u.id && (
                        <div className="absolute right-0 mt-2 bg-white border rounded shadow z-10 min-w-[120px]">
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" onClick={() => { handleEdit(u); closeActions(); }}>
                            Modifica
                          </button>
                          <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600" onClick={() => { handleDelete(u.id); closeActions(); }}>
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
      {/* Modal modifica utente */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Modifica Utente</h3>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <label className="text-sm font-semibold">Username
                <input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="border p-2 rounded w-full mt-1" required />
              </label>
              <label className="text-sm font-semibold">Password
                <input name="password" value={form.password} onChange={handleChange} placeholder="Password" className="border p-2 rounded w-full mt-1" required />
              </label>
              <label className="text-sm font-semibold">Nome
                <input name="nome" value={form.nome} onChange={handleChange} placeholder="Nome" className="border p-2 rounded w-full mt-1" required />
              </label>
              <label className="text-sm font-semibold">Mail
                <input name="mail" value={form.mail} onChange={handleChange} placeholder="Mail" className="border p-2 rounded w-full mt-1" required />
              </label>
              <label className="text-sm font-semibold">Ruolo
                <select name="ruolo" value={form.ruolo} onChange={handleChange} className="border p-2 rounded w-full mt-1">
                  <option value="admin">Admin</option>
                  <option value="pianificatore">Pianificatore</option>
                  <option value="richiedente">Richiedente</option>
                  <option value="autista">Autista</option>
                </select>
              </label>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Salva</button>
                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => { setEditId(null); setShowEditModal(false); setForm({ username: "", password: "", nome: "", mail: "", ruolo: "admin" }); }}>Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
