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

    // 1. Listen for new messages - private
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
          
          try {
            const { data: sender } = await supabase
              .from('members')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .maybeSingle();

            const senderName = sender?.full_name || 'Un membre';

            sendNotification(`Nouveau message de ${senderName}`, {
              body: newMessage.content || '',
              tag: `msg-${newMessage.id}`
            });

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

    // 1.5 Listen for group messages
    const groupBatchChannel = supabase
      .channel(`group-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          const isGroup = newMessage && newMessage.type && String(newMessage.type).startsWith('group');
          if (!newMessage || !isGroup || newMessage.sender_id === user.id) return;

          try {
            const { data: sender } = await supabase
              .from('members')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .maybeSingle();

            const senderName = sender?.full_name || 'Un membre';

            sendNotification(`[GENERAL] Message de ${senderName}`, {
              body: newMessage.content || '',
              tag: `group-msg-${newMessage.id}`
            });

            toast.info(`Groupe Général: ${senderName}`, {
              description: (newMessage.content || '').length > 50 
                ? (newMessage.content || '').substring(0, 50) + '...' 
                : (newMessage.content || ''),
              duration: 5000,
            });
          } catch (err) {
            console.error("Error processing group message:", err);
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
          const newAnnouncement = payload.new as any;
          if (!newAnnouncement) return;

          sendNotification('Nouvelle annonce !', {
            body: newAnnouncement.title || '',
            tag: `ann-${newAnnouncement.id}`
          });

          toast.success('📢 Nouvelle annonce', {
            description: newAnnouncement.title || '',
            duration: 8000,
          });
        }
      )
      .subscribe();

    // 3. Listen for new rehearsals
    const rehearsalsChannel = supabase
      .channel(`user-rehearsals-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rehearsals'
        },
        (payload) => {
          const newRehearsal = payload.new as any;
          if (!newRehearsal) return;

          sendNotification('Nouvelle répétition planifiée !', {
            body: `${newRehearsal.title} - ${newRehearsal.date}`,
            tag: `reh-${newRehearsal.id}`
          });

          toast.info('📅 Nouvelle répétition', {
            description: newRehearsal.title,
            duration: 8000,
          });
        }
      )
      .subscribe();

    // 4. Listen for new songs
    const songsChannel = supabase
      .channel(`user-songs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'songs'
        },
        (payload) => {
          const newSong = payload.new as any;
          if (!newSong) return;

          sendNotification('Nouveau chant ajouté !', {
            body: newSong.title,
            tag: `song-${newSong.id}`
          });

          toast.success('🎵 Nouveau chant', {
            description: newSong.title,
            duration: 6000,
          });
        }
      )
      .subscribe();

    // 5. Listen for new instruments
    const instrumentsChannel = supabase
      .channel(`user-instruments-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'instruments'
        },
        (payload) => {
          const newInstrument = payload.new as any;
          if (!newInstrument) return;

          sendNotification('Nouvel instrument ajouté !', {
            body: newInstrument.name,
            tag: `inst-${newInstrument.id}`
          });

          toast.success('🎸 Nouvel instrument', {
            description: newInstrument.name,
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(groupBatchChannel);
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(rehearsalsChannel);
      supabase.removeChannel(songsChannel);
      supabase.removeChannel(instrumentsChannel);
    };
  }, [user, sendNotification]);
}
