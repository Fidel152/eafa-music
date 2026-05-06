import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'sonner';

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  useEffect(() => {
    if (!user) return;

    // Sound effect for notifications
    const playNotificationSound = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
      } catch (e) {
        console.error("Sound error:", e);
      }
    };

    // 1. Listen for new messages - scoped to user for better performance
    const messagesChannel = supabase
      .channel(`user-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("Real-time message received:", payload);
          const newMessage = payload.new as any;
          if (!newMessage || !newMessage.sender_id) return;
          
          playNotificationSound();

          try {
            // Get sender info for a better notification
            const { data: sender } = await supabase
              .from('members')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .maybeSingle();

            const senderName = sender?.full_name || 'Un membre';

            // Browser notification
            sendNotification(`Nouveau message de ${senderName}`, {
              body: newMessage.content || '',
              tag: `msg-${newMessage.id}`
            });

            // In-app toast
            toast.info(`Message de ${senderName}`, {
              description: (newMessage.content || '').length > 50 
                ? (newMessage.content || '').substring(0, 50) + '...' 
                : (newMessage.content || ''),
              duration: 5000,
            });
          } catch (err) {
            console.error("Error processing realtime message:", err);
          }
        }
      )
      .subscribe();

    // 2. Listen for new announcements
    const announcementsChannel = supabase
      .channel(`user-announcements-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          console.log("Real-time announcement received:", payload);
          const newAnnouncement = payload.new as any;
          if (!newAnnouncement) return;

          playNotificationSound();

          // External notification
          sendNotification('Nouvelle annonce !', {
            body: newAnnouncement.title || '',
            tag: `ann-${newAnnouncement.id}`
          });

          // In-app toast
          toast.success('📢 Nouvelle annonce', {
            description: newAnnouncement.title || '',
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(announcementsChannel);
    };
  }, [user, sendNotification]);
}
