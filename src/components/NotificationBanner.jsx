import { useNotification } from "../context/NotificationContext";

export default function NotificationBanner() {
  const { notification } = useNotification();
  if (!notification) return null;
  const bg = notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : notification.type === 'warning' ? 'bg-yellow-600 text-black' : 'bg-blue-600';
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${bg} text-white px-6 py-3 rounded shadow-lg min-w-[300px] text-center`}>
      <span className="font-bold mr-2">{notification.title || 'Messaggio'}:</span>
      <span>{notification.text}</span>
    </div>
  );
}
