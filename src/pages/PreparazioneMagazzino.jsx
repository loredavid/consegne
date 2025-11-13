import React, { useState, useEffect } from "react";
import { Calendar, Package, Download, FileSpreadsheet, Filter, Truck } from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { BASE_URL } from "../App";
import useChatNotifications from "../hooks/useChatNotifications";
import NotificationPermissionBanner from "../components/NotificationPermissionBanner";

export default function PreparazioneMagazzino() {
  const { user, token } = useAuth();
  const { setNotification } = useNotification();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [spedizioni, setSpedizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredSpedizioni, setFilteredSpedizioni] = useState([]);
  const [filterAutista, setFilterAutista] = useState("");

  // Abilita notifiche chat in background
  useChatNotifications({
    pollInterval: 5000,
    enablePushNotifications: true
  });

  // Controlla accesso (solo pianificatori e admin)
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "pianificatore" && user.role !== "richiedente") {
      setNotification({ text: "Accesso negato. Solo pianificatori e admin possono accedere a questa pagina." });
      return;
    }
  }, [user, setNotification]);

  useEffect(() => {
    if (user && token && (user.role === "admin" || user.role === "pianificatore" || user.role === "richiedente")) {
      fetchSpedizioni();
    }
  }, [selectedDate, user, token]);

  useEffect(() => {
    // Filtra le spedizioni in base all'autista selezionato
    if (filterAutista === "") {
      setFilteredSpedizioni(spedizioni);
    } else {
      setFilteredSpedizioni(spedizioni.filter(s => s.autista?.nome === filterAutista));
    }
  }, [spedizioni, filterAutista]);

  const fetchSpedizioni = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/spedizioni`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Errore nel caricamento");
      
      const data = await response.json();
      
      // Filtra per data selezionata e ordina per ora
      const spedizioniDelGiorno = data.filter(spedizione => {
        const dataSpedizione = new Date(spedizione.dataPianificata).toISOString().split('T')[0];
        return dataSpedizione === selectedDate && spedizione.status !== "Consegnata" && spedizione.daPianificare === false;
      }).sort((a, b) => {
        const oraA = new Date(a.dataPianificata).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const oraB = new Date(b.dataPianificata).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        return oraA.localeCompare(oraB);
      });

      setSpedizioni(spedizioniDelGiorno);
    } catch (error) {
      setNotification({ text: "Errore nel caricamento delle spedizioni" });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
  };

  const getUniqueAutisti = () => {
    const autisti = [...new Set(spedizioni.map(s => s.autista?.nome).filter(Boolean))];
    return autisti.sort();
  };

  const groupSpedizioniByAutista = () => {
    const grouped = {};
    filteredSpedizioni.forEach(spedizione => {
      const autista = spedizione.autista?.nome || "Non assegnato";
      if (!grouped[autista]) {
        grouped[autista] = [];
      }
      grouped[autista].push(spedizione);
    });
    return grouped;
  };

  const exportToCSV = () => {
    const headers = [
      "Data", "Ora", "Autista", "Destinazione", "Indirizzo", "Richiedente", "Tipo", "Note"
    ];
    
    const csvData = filteredSpedizioni.map(spedizione => [
      formatDate(spedizione.dataPianificata),
      new Date(spedizione.dataPianificata).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      spedizione.autista?.nome || "",
      spedizione.aziendaDestinazione || "",
      spedizione.indirizzo || "",
      spedizione.richiedente?.nome || "",
      spedizione.tipo || "",
      (spedizione.note || "").replace(/\n/g, ' | ') // Sostituisce gli a capo con | per CSV
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(","))
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `preparazione_magazzino_${selectedDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const headers = [
      "Data", "Ora", "Autista", "Destinazione", "Indirizzo", "Richiedente", "Tipo", "Note"
    ];
    
    let content = `<table border="1">`;
    content += `<tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
    
    filteredSpedizioni.forEach(spedizione => {
      content += `<tr>
        <td>${formatDate(spedizione.dataPianificata)}</td>
        <td>${new Date(spedizione.dataPianificata).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${spedizione.autista?.nome || ""}</td>
        <td>${spedizione.aziendaDestinazione || ""}</td>
        <td>${spedizione.indirizzo || ""}</td>
        <td>${spedizione.richiedente?.nome || ""}</td>
        <td>${spedizione.tipo || ""}</td>
        <td style="white-space: pre-wrap;">${(spedizione.note || "").replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
      </tr>`;
    });
    content += `</table>`;

    const blob = new Blob([content], { type: "application/vnd.ms-excel" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `preparazione_magazzino_${selectedDate}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printTable = () => {
    const printContent = document.getElementById('tabella-magazzino').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <html>
        <head>
          <title>Preparazione Magazzino - ${formatDate(selectedDate)}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 4px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .autista-header { background-color: #e8f4fd; font-weight: bold; }
            .page-break { page-break-before: always; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Preparazione Magazzino - ${formatDate(selectedDate)}</h1>
          ${printContent}
        </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const groupedSpedizioni = groupSpedizioniByAutista();

  if (!user || (user.role !== "admin" && user.role !== "pianificatore" && user.role !== "richiedente" )) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Accesso negato</h3>
          <p className="mt-1 text-sm text-gray-500">
            Solo gli amministratori e i pianificatori possono accedere a questa pagina.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotificationPermissionBanner />
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="md:flex md:items-center md:justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Preparazione Magazzino</h1>
                    <p className="text-sm text-gray-500">
                      Organizzazione spedizioni per la preparazione
                    </p>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  {/* Filtro Data */}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Filtro Autista */}
                  <div className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                      value={filterAutista}
                      onChange={(e) => setFilterAutista(e.target.value)}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Tutti gli autisti</option>
                      {getUniqueAutisti().map(autista => (
                        <option key={autista} value={autista}>{autista}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pulsanti Esportazione */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={printTable}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Stampa
                    </button>
                    
                    <button
                      onClick={exportToCSV}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </button>
                    
                    <button
                      onClick={exportToExcel}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-6">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div id="tabella-magazzino" className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                          Data
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Ora
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Autista
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Destinazione
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Indirizzo
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                          Richiedente
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Tipo
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(groupedSpedizioni).map(([autista, spedizioniAutista]) => (
                        <React.Fragment key={autista}>
                          {/* Header Autista */}
                          <tr className="bg-blue-50">
                            <td colSpan="9" className="px-3 py-2 text-sm font-semibold text-blue-900 bg-blue-100">
                              <div className="flex items-center">
                                <Truck className="h-4 w-4 mr-2" />
                                {autista} ({spedizioniAutista.length} spedizioni)
                              </div>
                            </td>
                          </tr>
                          
                          {/* Spedizioni dell'autista */}
                          {spedizioniAutista.map((spedizione, index) => (
                            <tr key={spedizione.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(spedizione.dataPianificata)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {new Date(spedizione.dataPianificata).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {spedizione.autista?.nome || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {spedizione.aziendaDestinazione || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {spedizione.indirizzo || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {spedizione.richiedente?.nome || '-'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  spedizione.tipo === 'consegna' 
                                    ? 'bg-green-100 text-green-800'
                                    : spedizione.tipo === 'ritiro'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {spedizione.tipo === 'consegna' ? 'Consegna' : 
                                   spedizione.tipo === 'ritiro' ? 'Ritiro' : 
                                   spedizione.tipo === 'entrambi' ? 'Entrambi' : 'Non specificato'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500 max-w-xs">
                                <div className="whitespace-pre-wrap break-words" title={spedizione.note}>
                                  {spedizione.note || '-'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      
                      {filteredSpedizioni.length === 0 && (
                        <tr>
                          <td colSpan="9" className="px-3 py-8 text-center text-sm text-gray-500">
                            <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                            <p>Nessuna spedizione trovata per la data selezionata</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {filteredSpedizioni.length > 0 && (
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <Package className="h-4 w-4 mr-2" />
                      Totale: {filteredSpedizioni.length} spedizioni
                      {filterAutista && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Filtrate per: {filterAutista}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
