export default function Admin() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-gray-600 mb-4">Contenuto della pagina Admin...</p>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
        onClick={() => window.open('https://www.google.com', '_blank')}
      >
        Vai su Google
      </button>
    </div>
  );
}
