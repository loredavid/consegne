  // Funzione export CSV
  function exportCSV(data, columns, filename) {
    const header = columns.join(';');
    const rows = data.map(row => columns.map(col => {
      let val = row[col];
      if (val === undefined) {
        // Supporta chiavi custom
        if (col === 'mail') val = row.mail || row.email || '';
        if (col === 'role') val = row.role || row.ruolo || '';
        if (col === 'autista') val = row.autista?.nome || '';
        if (col === 'sender') val = row.sender?.nome || '';
        if (col === 'createdAt') val = row.createdAt ? new Date(row.createdAt).toLocaleString() : '';
        if (col === 'dataPianificata') val = row.dataPianificata ? new Date(row.dataPianificata).toLocaleDateString() : '';
        if (col === 'oraPianificata') val = row.dataPianificata ? new Date(row.dataPianificata).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      }
      return (val !== undefined && val !== null) ? String(val).replace(/;/g, ',') : '';
    }).join(';'));
    const csv = header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
import { useEffect, useState } from "react";
import { useNotification } from "../context/NotificationContext";

function isMobile() {
  if (typeof window === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(window.navigator.userAgent);
}

export default function Admin() {
  const { setNotification } = useNotification();
  const [mobile, setMobile] = useState(false);
  const [utenti, setUtenti] = useState([]);
  const [spedizioni, setSpedizioni] = useState([]);
  const [posizioni, setPosizioni] = useState([]);
  const [messaggi, setMessaggi] = useState([]);

  useEffect(() => {
    setMobile(isMobile());
  }, []);

  useEffect(() => {
    fetch("http://localhost:3001/api/utenti")
      .then(res => res.json())
      .then(data => setUtenti(data));
    fetch("http://localhost:3001/api/spedizioni")
      .then(res => res.json())
      .then(data => setSpedizioni(data));
    fetch("http://localhost:3001/api/posizioni")
      .then(res => res.json())
      .then(data => setPosizioni(data));
    fetch("http://localhost:3001/api/messaggi")
      .then(res => res.json())
      .then(data => setMessaggi(data));
  }, []);

  return (
    <div className={mobile ? "p-0 max-w-full mx-auto w-full flex flex-col items-center" : "px-0 max-w-6xl mx-auto w-full"}>
      <h1 className={mobile ? "text-xl font-bold mb-2" : "text-2xl font-bold mb-2 sm:mb-4"}>Admin - Database</h1>
      <div className="mb-8 w-full">
        <button
          className="mb-2 px-4 py-2 bg-green-600 text-white rounded font-semibold"
          onClick={() => exportCSV(utenti, utenti.length > 0 ? Object.keys(utenti[0]) : [], 'utenti.csv')}
        >Export CSV</button>
        <h2 className="text-lg font-bold mb-2">Utenti</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full table-auto border text-base">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {utenti.length > 0 && Object.keys(utenti[0]).map(key => (
                  <th key={key} className="px-4 py-2 font-semibold text-gray-700 border-b">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {utenti.map((u, idx) => (
                <tr key={u.id || u.mail || u.nome} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {Object.keys(utenti[0] || {}).map(key => (
                    <td key={key} className="px-6 py-3 border-b align-top max-w-[400px] break-words">
                      {typeof u[key] === 'object' && u[key] !== null ? (
                        <table className="bg-gray-100 rounded text-xs mt-1">
                          <tbody>
                            {Object.entries(u[key]).map(([k, v]) => (
                              <tr key={k}><td className="font-semibold text-gray-600 px-2 py-1">{k}</td><td className="px-2 py-1">{String(v)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : String(u[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-8 w-full">
        <button
          className="mb-2 px-4 py-2 bg-green-600 text-white rounded font-semibold"
          onClick={() => exportCSV(spedizioni, spedizioni.length > 0 ? Object.keys(spedizioni[0]) : [], 'spedizioni.csv')}
        >Export CSV</button>
        <h2 className="text-lg font-bold mb-2">Spedizioni</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full table-auto border text-base">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {spedizioni.length > 0 && Object.keys(spedizioni[0]).map(key => (
                  <th key={key} className="px-4 py-2 font-semibold text-gray-700 border-b">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spedizioni.map((s, idx) => (
                <tr key={s.id || s.aziendaDestinazione} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {Object.keys(spedizioni[0] || {}).map(key => (
                    <td key={key} className="px-6 py-3 border-b align-top max-w-[400px] break-words">
                      {typeof s[key] === 'object' && s[key] !== null ? (
                        <table className="bg-gray-100 rounded text-xs mt-1">
                          <tbody>
                            {Object.entries(s[key]).map(([k, v]) => (
                              <tr key={k}><td className="font-semibold text-gray-600 px-2 py-1">{k}</td><td className="px-2 py-1">{String(v)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : String(s[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-8 w-full">
        <button
          className="mb-2 px-4 py-2 bg-green-600 text-white rounded font-semibold"
          onClick={() => exportCSV(posizioni, posizioni.length > 0 ? Object.keys(posizioni[0]) : [], 'posizioni.csv')}
        >Export CSV</button>
        <h2 className="text-lg font-bold mb-2">Posizioni</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full table-auto border text-base">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {posizioni.length > 0 && Object.keys(posizioni[0]).map(key => (
                  <th key={key} className="px-4 py-2 font-semibold text-gray-700 border-b">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posizioni.map((p, idx) => (
                <tr key={p.id || p.nome} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {Object.keys(posizioni[0] || {}).map(key => (
                    <td key={key} className="px-6 py-3 border-b align-top max-w-[400px] break-words">
                      {typeof p[key] === 'object' && p[key] !== null ? (
                        <table className="bg-gray-100 rounded text-xs mt-1">
                          <tbody>
                            {Object.entries(p[key]).map(([k, v]) => (
                              <tr key={k}><td className="font-semibold text-gray-600 px-2 py-1">{k}</td><td className="px-2 py-1">{String(v)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : String(p[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-8 w-full">
        <button
          className="mb-2 px-4 py-2 bg-green-600 text-white rounded font-semibold"
          onClick={() => exportCSV(messaggi, messaggi.length > 0 ? Object.keys(messaggi[0]) : [], 'messaggi.csv')}
        >Export CSV</button>
        <h2 className="text-lg font-bold mb-2">Messaggi</h2>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full table-auto border text-base">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {messaggi.length > 0 && Object.keys(messaggi[0]).map(key => (
                  <th key={key} className="px-4 py-2 font-semibold text-gray-700 border-b">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messaggi.map((m, idx) => (
                <tr key={m.id || m.text} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {Object.keys(messaggi[0] || {}).map(key => (
                    <td key={key} className="px-6 py-3 border-b align-top max-w-[400px] break-words">
                      {typeof m[key] === 'object' && m[key] !== null ? (
                        <table className="bg-gray-100 rounded text-xs mt-1">
                          <tbody>
                            {Object.entries(m[key]).map(([k, v]) => (
                              <tr key={k}><td className="font-semibold text-gray-600 px-2 py-1">{k}</td><td className="px-2 py-1">{String(v)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : String(m[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
