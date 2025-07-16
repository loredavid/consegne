import { useEffect, useState, useRef } from "react";

const MAX_LOGO_SIZE = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export default function Posizioni() {
  const [posizioni, setPosizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ azienda: "", indirizzo: "", referente: "", telefono: "", email: "", logo: "" });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:3001/api/posizioni")
      .then(res => res.json())
      .then(data => {
        setPosizioni(data);
        setLoading(false);
      });
  }, [showAdd, showEdit, saving, success]); // aggiunto success per forzare reload

  const resetForm = () => {
    setForm({ azienda: "", indirizzo: "", referente: "", telefono: "", email: "", logo: "" });
    setLogoPreview(null);
    setLogoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateLogo = (file) => {
    if (!file) return true;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato immagine non valido. Usa PNG, JPG, WEBP.");
      return false;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError("Logo troppo grande (max 1MB).");
      return false;
    }
    return true;
  };

  const handleAdd = async e => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    if (!validateLogo(logoFile)) { setSaving(false); return; }
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k !== "logo") data.append(k, v); });
      if (logoFile) data.append("logo", logoFile);
      const res = await fetch("http://localhost:3001/api/posizioni", {
        method: "POST",
        body: data
      });
      if (!res.ok) throw new Error();
      setShowAdd(false);
      setSuccess("Posizione aggiunta!");
      resetForm();
    } catch {
      setError("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (index) => {
    const pos = posizioni[index];
    setEditIndex(pos.id); // Usa l'id reale
    setForm({ ...pos });
    setLogoPreview(pos.logo ? `http://localhost:3001/uploads/${pos.logo}` : null);
    setLogoFile(null);
    setShowEdit(true);
    setError("");
    setSuccess("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEditSave = async e => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    if (!validateLogo(logoFile)) { setSaving(false); return; }
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k !== "logo") data.append(k, v); });
      if (logoFile) data.append("logo", logoFile);
      const res = await fetch(`http://localhost:3001/api/posizioni/${editIndex}`, {
        method: "PUT",
        body: data
      });
      if (!res.ok) throw new Error();
      setShowEdit(false);
      setSuccess("Modifica salvata!");
      resetForm();
    } catch {
      setError("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3001/api/posizioni/${editIndex}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error();
      setShowEdit(false);
      setSuccess("Posizione eliminata!");
      resetForm();
    } catch {
      setError("Errore nell'eliminazione");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = e => {
    const file = e.target.files[0];
    setLogoFile(file || null);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Posizioni</h1>
        <button onClick={() => { setShowAdd(true); setError(""); setSuccess(""); resetForm(); }} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-blue-700">+ Aggiungi</button>
      </div>
      {success && <div className="text-green-600 mb-2">{success}</div>}
      {loading ? (
        <div>Caricamento...</div>
      ) : (
        <div className="bg-white rounded shadow divide-y">
          {posizioni.map((p, i) => (
            <div key={i} className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50">
              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-2xl font-bold overflow-hidden">
                {p.logo && typeof p.logo === 'string' && p.logo !== '' ? (
                  <img src={`http://localhost:3001/uploads/${p.logo}`} alt="logo" className="object-contain w-full h-full" onError={e => { e.target.onerror=null; e.target.src='https://placehold.co/64x64?text=Logo'; }} />
                ) : (
                  <span className="material-icons">location_on</span>
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase text-blue-800 font-bold tracking-wide">{p.referente}</div>
                <div className="text-lg font-bold text-gray-900 mb-1">{p.azienda}</div>
                <div className="text-gray-700 text-sm mb-1">{p.indirizzo}</div>
                <div className="text-gray-500 text-xs mt-1">Tel: {p.telefono} | Email: {p.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-gray-400 hover:text-gray-700 p-2 rounded-full" onClick={() => handleEdit(i)} aria-label="Modifica">
                  <span className="material-icons">more_horiz</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow p-6 w-full max-w-md relative" role="dialog" aria-modal="true">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl" onClick={() => { setShowAdd(false); resetForm(); }} aria-label="Chiudi">&times;</button>
            <h2 className="text-xl font-bold mb-4">Aggiungi Destinazione</h2>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <input className="border p-2 rounded" placeholder="Azienda" value={form.azienda} onChange={e => setForm(f => ({ ...f, azienda: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Indirizzo" value={form.indirizzo} onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Referente" value={form.referente} onChange={e => setForm(f => ({ ...f, referente: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Telefono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required type="email" />
              <input className="border p-2 rounded" type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoChange} />
              {logoPreview && <img src={logoPreview} alt="Anteprima logo" className="h-16 object-contain mt-2" />}
              <div className="flex gap-2 mt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={saving}>Salva</button>
                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => { setShowAdd(false); resetForm(); }} disabled={saving}>Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow p-6 w-full max-w-md relative" role="dialog" aria-modal="true">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl" onClick={() => { setShowEdit(false); resetForm(); }} aria-label="Chiudi">&times;</button>
            <h2 className="text-xl font-bold mb-4">Modifica Destinazione</h2>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <form onSubmit={handleEditSave} className="flex flex-col gap-3">
              <input className="border p-2 rounded" placeholder="Azienda" value={form.azienda} onChange={e => setForm(f => ({ ...f, azienda: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Indirizzo" value={form.indirizzo} onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Referente" value={form.referente} onChange={e => setForm(f => ({ ...f, referente: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Telefono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} required />
              <input className="border p-2 rounded" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required type="email" />
              <input className="border p-2 rounded" type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoChange} />
              {logoPreview && <img src={logoPreview} alt="Anteprima logo" className="h-16 object-contain mt-2" />}
              <div className="flex gap-2 mt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={saving}>Salva</button>
                <button type="button" className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDelete} disabled={saving}>Elimina</button>
                <button type="button" className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => { setShowEdit(false); resetForm(); }} disabled={saving}>Annulla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
