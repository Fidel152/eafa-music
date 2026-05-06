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

    // 1. Listen for new messages
    const messagesChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Get sender info for a better notification
          const { data: sender } = await supabase
            .from('members')
            .select('full_name')
            .eq('id', newMessage.sender_id)
            .single();

          const senderName = sender?.full_name || 'Un membre';

          // Browser notification
          sendNotification(`Nouveau message de ${senderName}`, {
            body: newMessage.content,
            tag: `msg-${newMessage.id}`
          });

          // In-app toast
          toast.info(`Message de ${senderName}`, {
            description: newMessage.content.length > 50 
              ? newMessage.content.substring(0, 50) + '...' 
              : newMessage.content,
            duration: 5000,
          });
        }
      )
      .subscribe();

    // 2. Listen for new announcements
    const announcementsChannel = supabase
      .channel('public:announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          const newAnnouncement = payload.new;

          // External notification
          sendNotification('Nouvelle annonce !', {
            body: newAnnouncement.title,
            tag: `ann-${newAnnouncement.id}`
          });

          // In-app toast
          toast.success('📢 Nouvelle annonce', {
            description: newAnnouncement.title,
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
