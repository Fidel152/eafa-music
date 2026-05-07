import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  sendNotification: (title: string, options?: any) => void;
  playSound: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const playSound = () => {
    try {
      // Messenger-like "pop" sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio playback prevented by browser policy.', e));
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  };

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast.success('Notifications activées !');
      playSound();
    } else if (result === 'denied') {
      toast.error('Notifications bloquées par le navigateur');
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    playSound(); // Play sound regardless of browser notification permission for in-app feedback
    
    if (permission === 'granted') {
      // Create notification
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        silent: true, // We already played the sound manually for control
        ...options
      } as any);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  useEffect(() => {
    // Initial check
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      permission, 
      requestPermission, 
      sendNotification, 
      playSound,
      activeConversationId,
      setActiveConversationId
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
