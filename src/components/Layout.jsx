import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 ml-[220px] transition-all duration-300">
        {children}
      </main>
    </div>
  );
}