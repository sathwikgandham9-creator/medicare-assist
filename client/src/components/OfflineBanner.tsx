import React, { useState, useEffect } from 'react';
import { WifiOff, Bell, AlertCircle } from 'lucide-react';
import { useReminder } from '../context/ReminderContext';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { notificationPermission, requestNotificationPermission } = useReminder();
  const [dismissNotificationBanner, setDismissNotificationBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between text-base sm:text-lg font-bold shadow-md">
          <div className="flex items-center gap-3">
            <WifiOff className="w-6 h-6 flex-shrink-0" />
            <span>You are offline. Showing cached schedule. Medicine responses will sync automatically when back online.</span>
          </div>
        </div>
      )}

      {/* Notification banner */}
      {notificationPermission !== 'granted' && !dismissNotificationBanner && (
        <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between text-base sm:text-lg font-semibold shadow-md">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 flex-shrink-0 animate-bounce" />
            <span>Enable notifications to hear and see timely medicine reminders!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={requestNotificationPermission}
              className="px-4 py-1.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 text-base shadow"
            >
              Allow
            </button>
            <button
              onClick={() => setDismissNotificationBanner(true)}
              className="text-white hover:text-blue-200 text-xl font-bold px-2"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

