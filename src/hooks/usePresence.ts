import { useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update presence initially
    api.members.updatePresence(user.id).catch(err => console.error("Presence check-in failed:", err));

    // Update every 30 seconds
    const interval = setInterval(() => {
      api.members.updatePresence(user.id).catch(err => console.error("Presence heartbeat failed:", err));
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);
}
