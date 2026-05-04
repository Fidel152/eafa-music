/**
 * Frontend API client using Supabase
 */
import { Member, Song, Announcement, Instrument, Rehearsal, Attendance, Comment, Message } from '../types';
import { supabase } from './supabase';

export const api = {
  auth: {
    loginByName: async (name: string) => {
      const trimmedName = name.trim();
      // Try finding by access_name first, then full_name as fallback
      let { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('access_name', trimmedName)
        .single();
      
      if (error || !data) {
        // Fallback for existing users who might only have full_name set as key
        const { data: fallback, error: fallbackError } = await supabase
          .from('members')
          .select('*')
          .ilike('full_name', trimmedName)
          .single();
        
        if (fallbackError || !fallback) {
          throw new Error("Accès refusé : clé d'accès incorrecte.");
        }
        data = fallback;
      }

      return { 
        success: true, 
        user: { 
          id: data.id, 
          displayName: data.full_name, 
          role: data.role 
        } 
      };
    },
    logout: async () => {
      return { success: true };
    },
  },
  members: {
    list: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.id,
        fullName: m.full_name,
        accessName: m.access_name,
        role: m.role,
        voiceType: m.voice_type,
        instrument: m.instrument,
        active: m.active,
        joinedAt: m.joined_at,
        avatarUrl: m.avatar_url,
        phoneNumber: m.phone_number,
        lastSeen: m.last_seen
      }));
    },
    create: async (member: Partial<Member>) => {
      const dbMember = {
        id: member.id || Date.now().toString(),
        full_name: member.fullName,
        access_name: member.accessName,
        role: member.role,
        voice_type: member.voiceType,
        instrument: member.instrument,
        active: member.active,
        avatar_url: member.avatarUrl,
        phone_number: member.phoneNumber
      };
      
      const { data, error } = await supabase
        .from('members')
        .insert([dbMember])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, member: Partial<Member>) => {
      const dbMember: any = {};
      if (member.fullName !== undefined) dbMember.full_name = member.fullName;
      if (member.accessName !== undefined) dbMember.access_name = member.accessName;
      if (member.role !== undefined) dbMember.role = member.role;
      if (member.voiceType !== undefined) dbMember.voice_type = member.voiceType;
      if (member.instrument !== undefined) dbMember.instrument = member.instrument;
      if (member.active !== undefined) dbMember.active = member.active;
      if (member.avatarUrl !== undefined) dbMember.avatar_url = member.avatarUrl;
      if (member.phoneNumber !== undefined) dbMember.phone_number = member.phoneNumber;
      if (member.lastSeen !== undefined) dbMember.last_seen = member.lastSeen;

      const { data, error } = await supabase
        .from('members')
        .update(dbMember)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    updatePresence: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }
  },
  songs: {
    list: async (): Promise<Song[]> => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(s => ({
        id: s.id,
        title: s.title,
        category: s.category,
        lyrics: s.lyrics,
        chords: s.chords,
        key: s.key,
        author: s.author,
        audioUrl: s.audio_url,
        addedAt: s.added_at
      }));
    },
    create: async (song: Partial<Song>) => {
      const dbSong = {
        id: song.id || Date.now().toString(),
        title: song.title,
        category: song.category,
        lyrics: song.lyrics,
        chords: song.chords,
        key: song.key,
        author: song.author,
        audio_url: song.audioUrl
      };

      const { data, error } = await supabase
        .from('songs')
        .insert([dbSong])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, song: Partial<Song>) => {
      const dbSong: any = {};
      if (song.title !== undefined) dbSong.title = song.title;
      if (song.category !== undefined) dbSong.category = song.category;
      if (song.lyrics !== undefined) dbSong.lyrics = song.lyrics;
      if (song.chords !== undefined) dbSong.chords = song.chords;
      if (song.key !== undefined) dbSong.key = song.key;
      if (song.author !== undefined) dbSong.author = song.author;
      if (song.audioUrl !== undefined) dbSong.audio_url = song.audioUrl;

      const { data, error } = await supabase
        .from('songs')
        .update(dbSong)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },
  announcements: {
    list: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        type: a.type,
        imageUrl: a.image_url,
        createdAt: a.created_at
      }));
    },
    create: async (ann: Partial<Announcement>) => {
      const dbAnn = {
        id: ann.id || Date.now().toString(),
        title: ann.title,
        content: ann.content,
        type: ann.type,
        image_url: ann.imageUrl
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert([dbAnn])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, ann: Partial<Announcement>) => {
      const dbAnn: any = {};
      if (ann.title !== undefined) dbAnn.title = ann.title;
      if (ann.content !== undefined) dbAnn.content = ann.content;
      if (ann.type !== undefined) dbAnn.type = ann.type;
      if (ann.imageUrl !== undefined) dbAnn.image_url = ann.imageUrl;

      const { data, error } = await supabase
        .from('announcements')
        .update(dbAnn)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },
  instruments: {
    list: async (): Promise<Instrument[]> => {
      const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        condition: i.condition,
        imageUrl: i.image_url,
        lastMaintenance: i.last_maintenance
      }));
    },
    create: async (inst: Partial<Instrument>) => {
      const dbInst = {
        id: inst.id || Date.now().toString(),
        name: inst.name,
        category: inst.category,
        quantity: inst.quantity,
        condition: inst.condition,
        image_url: inst.imageUrl
      };

      const { data, error } = await supabase
        .from('instruments')
        .insert([dbInst])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('instruments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, inst: Partial<Instrument>) => {
      const dbInst: any = {};
      if (inst.name !== undefined) dbInst.name = inst.name;
      if (inst.category !== undefined) dbInst.category = inst.category;
      if (inst.quantity !== undefined) dbInst.quantity = inst.quantity;
      if (inst.condition !== undefined) dbInst.condition = inst.condition;
      if (inst.imageUrl !== undefined) dbInst.image_url = inst.imageUrl;

      const { data, error } = await supabase
        .from('instruments')
        .update(dbInst)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },
  rehearsals: {
    list: async (): Promise<Rehearsal[]> => {
      const { data, error } = await supabase
        .from('rehearsals')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        date: r.date,
        location: r.location,
        createdAt: r.created_at
      }));
    },
    create: async (rehearsal: Partial<Rehearsal>) => {
      const { data, error } = await supabase
        .from('rehearsals')
        .insert([{
          title: rehearsal.title,
          description: rehearsal.description,
          date: rehearsal.date,
          location: rehearsal.location
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('rehearsals').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }
  },
  attendance: {
    listForRehearsal: async (rehearsalId: string): Promise<Attendance[]> => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('rehearsal_id', rehearsalId);
      if (error) throw error;
      return (data || []).map(a => ({
        id: a.id,
        rehearsalId: a.rehearsal_id,
        memberId: a.member_id,
        status: a.status,
        updatedAt: a.updated_at
      }));
    },
    update: async (rehearsalId: string, memberId: string, status: string) => {
      // First try to find existing record to be safe
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('rehearsal_id', rehearsalId)
        .eq('member_id', memberId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('attendance')
          .update({ 
            status: status,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('attendance')
          .insert([{
            rehearsal_id: rehearsalId,
            member_id: memberId,
            status: status
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }
  },
  comments: {
    list: async (targetId: string): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('target_id', targetId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        targetId: c.target_id,
        targetType: c.target_type,
        memberId: c.member_id,
        memberName: c.member_name,
        content: c.content,
        createdAt: c.created_at,
        parentId: c.parent_id
      }));
    },
    create: async (comment: Partial<Comment>) => {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          target_id: comment.targetId,
          target_type: comment.targetType,
          member_id: comment.memberId,
          member_name: comment.memberName,
          content: comment.content,
          parent_id: comment.parentId
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }
  },
  messages: {
    listConversations: async (userId: string): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        type: m.type || 'text',
        fileUrl: m.file_url,
        read: m.read,
        createdAt: m.created_at,
        deleted: m.deleted
      }));
    },
    listThread: async (userId: string, otherId: string): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        type: m.type || 'text',
        fileUrl: m.file_url,
        read: m.read,
        createdAt: m.created_at,
        deleted: m.deleted
      }));
    },
    send: async (message: Partial<Message> & { type?: string, fileUrl?: string }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: message.senderId,
          receiver_id: message.receiverId,
          content: message.content,
          type: message.type || 'text',
          file_url: message.fileUrl
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ deleted: true, content: 'Message supprimé' })
        .eq('id', messageId);
      if (error) throw error;
      return true;
    },
    markAsRead: async (userId: string, senderId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', senderId)
        .eq('read', false);
      if (error) throw error;
    }
  }
};
