import { useNotification } from "../context/NotificationContext";

export default function NotificationBanner() {
  const { notification } = useNotification();
  if (!notification) return null;
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded shadow-lg min-w-[300px] text-center">
      <span className="font-bold">Nuovo messaggio:</span> {notification.text}
    </div>
  );
}
