/**
 * Frontend API client using Supabase
 */
import { supabase } from './supabase';
import { Member, Song, Announcement, Instrument, Rehearsal, Attendance, Comment, Message } from '../types';

// Helper to map snake_case from Supabase to camelCase for the app
const mapMember = (m: any): Member => {
  if (!m) return null as any;
  
  // Harmonize roles (french/english, case-insensitive)
  let role = String(m.role || 'member').toLowerCase();
  if (role === 'membre' || role === 'choriste') role = 'member';
  if (role === 'admin' || role === 'administrateur' || role === 'coordinateur') role = 'admin';
  if (role !== 'admin') role = 'member';

  return {
    id: m.id,
    fullName: m.full_name || '',
    accessName: m.id || '', 
    email: m.email || '',
    role: role as 'admin' | 'member',
    joinedAt: m.created_at || m.joined_at || new Date().toISOString(),
    active: m.active !== false,
    voiceType: m.voice_type,
    instrument: m.instrument,
    avatarUrl: m.avatar_url,
    phoneNumber: m.phone_number,
    lastSeen: m.last_seen
  };
};

const mapToMemberDB = (m: Partial<Member>) => {
  const db: any = {};
  // Prioritize ID if present, otherwise use accessName as the ID
  if (m.id !== undefined) db.id = m.id;
  else if (m.accessName !== undefined) db.id = m.accessName;
  
  if (m.fullName !== undefined) db.full_name = m.fullName;
  if (m.email !== undefined) db.email = m.email;
  if (m.role !== undefined) db.role = m.role;
  if (m.active !== undefined) db.active = m.active;
  if (m.voiceType !== undefined) db.voice_type = m.voiceType;
  if (m.instrument !== undefined) db.instrument = m.instrument;
  if (m.avatarUrl !== undefined) db.avatar_url = m.avatarUrl;
  if (m.phoneNumber !== undefined) db.phone_number = m.phoneNumber;
  if (m.lastSeen !== undefined) db.last_seen = m.lastSeen;
  return db;
};

const mapSong = (s: any): Song => ({
  ...s,
  audioUrl: s.audio_url,
  addedAt: s.added_at
});

const mapToSongDB = (s: Partial<Song>) => {
  const db: any = { ...s };
  if (s.audioUrl !== undefined) { db.audio_url = s.audioUrl; delete db.audioUrl; }
  if (s.addedAt !== undefined) { db.added_at = s.addedAt; delete db.addedAt; }
  return db;
};

const mapAnnouncement = (a: any): Announcement => ({
  ...a,
  imageUrl: a.image_url,
  createdAt: a.created_at
});

const mapToAnnouncementDB = (a: Partial<Announcement>) => {
  const db: any = { ...a };
  if (a.imageUrl !== undefined) { db.image_url = a.imageUrl; delete db.imageUrl; }
  if (a.createdAt !== undefined) { db.created_at = a.createdAt; delete db.createdAt; }
  return db;
};

const mapInstrument = (i: any): Instrument => ({
  ...i,
  imageUrl: i.image_url,
  lastMaintenance: i.last_maintenance
});

const mapToInstrumentDB = (i: Partial<Instrument>) => {
  const db: any = { ...i };
  if (i.imageUrl !== undefined) { db.image_url = i.imageUrl; delete db.imageUrl; }
  if (i.lastMaintenance !== undefined) { 
    db.last_maintenance = i.lastMaintenance instanceof Date ? i.lastMaintenance.toISOString() : i.lastMaintenance; 
    delete db.lastMaintenance; 
  }
  return db;
};

const mapRehearsal = (r: any): Rehearsal => ({
  ...r,
  createdAt: r.created_at
});

const mapToRehearsalDB = (r: Partial<Rehearsal>) => {
  const db: any = { ...r };
  if (r.createdAt !== undefined) { db.created_at = r.createdAt; delete db.createdAt; }
  return db;
};

const mapAttendance = (a: any): Attendance => ({
  ...a,
  rehearsalId: a.rehearsal_id,
  memberId: a.member_id,
  updatedAt: a.updated_at
});

const mapComment = (c: any): Comment => ({
  ...c,
  targetId: c.target_id,
  targetType: c.target_type,
  memberId: c.member_id,
  memberName: c.member_name,
  createdAt: c.created_at,
  parentId: c.parent_id
});

const mapMessage = (m: any): Message => {
  if (!m) return null as any;
  const isGroup = m.type && String(m.type).startsWith('group');
  let msgType = m.type || 'text';
  
  if (isGroup) {
    if (msgType === 'group') msgType = 'text';
    else if (msgType.startsWith('group_')) msgType = msgType.replace('group_', '');
  }

  return {
    id: m.id,
    senderId: m.sender_id,
    receiverId: isGroup ? 'general' : m.receiver_id,
    content: m.content || '',
    type: msgType as any,
    fileUrl: m.file_url,
    createdAt: m.created_at || new Date().toISOString(),
    read: !!m.read,
    deleted: !!m.deleted
  };
};

// Simple in-memory cache to improve responsiveness
const _cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 180000; // 3 minutes for general data
const SHORT_CACHE_TTL = 1000; // 1 second for volatile data (messages)

export const getCached = (key: string, ttl = CACHE_TTL) => {
  const entry = _cache[key];
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data;
  }
  return null;
};

export const setCache = (key: string, data: any) => {
  _cache[key] = { data, timestamp: Date.now() };
};

export const clearCache = (key: string) => {
  if (key.endsWith('*')) {
    const prefix = key.slice(0, -1);
    Object.keys(_cache).forEach(k => {
      if (k.startsWith(prefix)) delete _cache[k];
    });
  } else {
    delete _cache[key];
  }
};

export const api = {
  auth: {
    loginByName: async (identifier: string) => {
      // Logic: 
      // 1. Members login via their ID (Access Key)
      // 2. ONLY Admins can also login using their Full Name
      
      const search = identifier.trim();
      let data = null;

      // 1. Try direct ID match (Exact)
      try {
        const { data: idMatch, error: idError } = await supabase
          .from('members')
          .select('*')
          .eq('id', search)
          .maybeSingle();
        
        if (!idError) {
          data = idMatch;
        }
      } catch (e) {
        // likely type mismatch if search is not UUID and column is UUID
      }

      // 2. Try Name match ONLY if they are an ADMIN
      if (!data) {
        const { data: nameMatch } = await supabase
          .from('members')
          .select('*')
          .ilike('full_name', search)
          .eq('role', 'admin')
          .maybeSingle();
        data = nameMatch;
      }

      if (!data) {
        throw new Error("Clé d'accès incorrecte. Les membres doivent utiliser leur ID unique.");
      }

      const member = mapMember(data);
      return {
        success: true,
        user: {
          id: member.id,
          displayName: member.fullName,
          role: member.role,
          avatarUrl: member.avatarUrl
        }
      };
    },
    logout: async () => {
      return { success: true };
    },
  },
  members: {
    list: async (): Promise<Member[]> => {
      const cached = getCached('members_list');
      if (cached) return cached;

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('full_name');
      if (error) throw error;
      const mapped = (data || []).map(mapMember);
      setCache('members_list', mapped);
      return mapped;
    },
    create: async (member: Partial<Member>) => {
      clearCache('members_list');
      const dbData = mapToMemberDB(member);
      // Ensure we have an ID for Supabase if not provided
      if (!dbData.id) {
        dbData.id = crypto.randomUUID();
      }
      const { data, error } = await supabase
        .from('members')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      return mapMember(data);
    },
    delete: async (id: string) => {
      clearCache('members_list');
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, member: Partial<Member>) => {
      clearCache('members_list');
      const dbData = mapToMemberDB(member);
      const { data, error } = await supabase
        .from('members')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapMember(data);
    },
    updatePresence: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    }
  },
  songs: {
    list: async (): Promise<Song[]> => {
      const cached = getCached('songs_list');
      if (cached) return cached;

      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('title');
      if (error) throw error;
      const mapped = (data || []).map(mapSong);
      setCache('songs_list', mapped);
      return mapped;
    },
    create: async (song: Partial<Song>) => {
      clearCache('songs_list');
      const dbData = mapToSongDB(song);
      if (!dbData.id) {
        dbData.id = crypto.randomUUID();
      }
      const { data, error } = await supabase
        .from('songs')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      return mapSong(data);
    },
    delete: async (id: string) => {
      clearCache('songs_list');
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, song: Partial<Song>) => {
      clearCache('songs_list');
      const dbData = mapToSongDB(song);
      const { data, error } = await supabase
        .from('songs')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapSong(data);
    }
  },
  announcements: {
    list: async (): Promise<Announcement[]> => {
      const cached = getCached('announcements_list');
      if (cached) return cached;

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(mapAnnouncement);
      setCache('announcements_list', mapped);
      return mapped;
    },
    create: async (ann: Partial<Announcement>) => {
      clearCache('announcements_list');
      const dbData = mapToAnnouncementDB(ann);
      if (!dbData.id) {
        dbData.id = crypto.randomUUID();
      }
      const { data, error } = await supabase
        .from('announcements')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      return mapAnnouncement(data);
    },
    delete: async (id: string) => {
      clearCache('announcements_list');
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, ann: Partial<Announcement>) => {
      clearCache('announcements_list');
      const dbData = mapToAnnouncementDB(ann);
      const { data, error } = await supabase
        .from('announcements')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapAnnouncement(data);
    },
    trackView: async (announcementId: string, userId: string) => {
      const { error } = await supabase
        .from('announcement_views')
        .upsert({ 
          announcement_id: announcementId, 
          user_id: userId,
          viewed_at: new Date().toISOString()
        }, { onConflict: 'announcement_id,user_id' });
      
      if (error) {
        console.error("Announcement trackView error:", error);
        return { success: false, error };
      }
      return { success: true };
    },
    getViewers: async (announcementId: string): Promise<any[]> => {
      const { data, error } = await supabase
        .from('announcement_views')
        .select(`
          viewed_at,
          members:user_id (
            full_name
          )
        `)
        .eq('announcement_id', announcementId)
        .order('viewed_at', { ascending: false });
      
      if (error) {
        console.error("getViewers error:", error);
        throw error;
      }
      return data || [];
    }
  },
  instruments: {
    list: async (): Promise<Instrument[]> => {
      const cached = getCached('instruments_list');
      if (cached) return cached;

      const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .order('name');
      if (error) throw error;
      const mapped = (data || []).map(mapInstrument);
      setCache('instruments_list', mapped);
      return mapped;
    },
    create: async (inst: Partial<Instrument>) => {
      clearCache('instruments_list');
      const dbData = mapToInstrumentDB(inst);
      if (!dbData.id) {
        dbData.id = crypto.randomUUID();
      }
      const { data, error } = await supabase
        .from('instruments')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      return mapInstrument(data);
    },
    delete: async (id: string) => {
      clearCache('instruments_list');
      const { error } = await supabase
        .from('instruments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    update: async (id: string, inst: Partial<Instrument>) => {
      clearCache('instruments_list');
      const dbData = mapToInstrumentDB(inst);
      const { data, error } = await supabase
        .from('instruments')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapInstrument(data);
    }
  },
  rehearsals: {
    list: async (): Promise<Rehearsal[]> => {
      const cached = getCached('rehearsals_list');
      if (cached) return cached;

      const { data, error } = await supabase
        .from('rehearsals')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(mapRehearsal);
      setCache('rehearsals_list', mapped);
      return mapped;
    },
    create: async (rehearsal: Partial<Rehearsal>) => {
      clearCache('rehearsals_list');
      const dbData = mapToRehearsalDB(rehearsal);
      if (!dbData.id) {
        dbData.id = crypto.randomUUID();
      }
      const { data, error } = await supabase
        .from('rehearsals')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      return mapRehearsal(data);
    },
    delete: async (id: string) => {
      clearCache('rehearsals_list');
      const { error } = await supabase
        .from('rehearsals')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    },
    trackView: async (rehearsalId: string, userId: string) => {
      const { error } = await supabase
        .from('rehearsal_views')
        .upsert({ 
          rehearsal_id: rehearsalId, 
          user_id: userId,
          viewed_at: new Date().toISOString()
        }, { onConflict: 'rehearsal_id,user_id' });
      
      if (error) {
        console.error("Rehearsal trackView error:", error);
        return { success: false, error };
      }
      return { success: true };
    },
    getViewers: async (rehearsalId: string): Promise<any[]> => {
      const { data, error } = await supabase
        .from('rehearsal_views')
        .select(`
          viewed_at,
          members:user_id (
            full_name
          )
        `)
        .eq('rehearsal_id', rehearsalId)
        .order('viewed_at', { ascending: false });
      
      if (error) {
        console.error("getViewers rehearsal error:", error);
        throw error;
      }
      return data || [];
    }
  },
  attendance: {
    listForRehearsal: async (rehearsalId: string): Promise<Attendance[]> => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('rehearsal_id', rehearsalId);
      if (error) throw error;
      return (data || []).map(mapAttendance);
    },
    update: async (rehearsalId: string, memberId: string, status: string) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert({ 
          rehearsal_id: rehearsalId, 
          member_id: memberId, 
          status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'rehearsal_id,member_id' })
        .select()
        .single();
      if (error) throw error;
      return mapAttendance(data);
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
      return (data || []).map(mapComment);
    },
    create: async (comment: Partial<Comment>) => {
      const dbData: any = {
        id: crypto.randomUUID(),
        target_id: comment.targetId,
        target_type: comment.targetType,
        member_id: comment.memberId,
        member_name: comment.memberName,
        content: comment.content,
        parent_id: comment.parentId
      };
      const { data, error } = await supabase
        .from('comments')
        .insert([dbData])
        .select()
        .single();
      if (error) throw error;
      return mapComment(data);
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    }
  },
  messages: {
    listConversations: async (userId: string): Promise<Message[]> => {
      const cacheKey = `convs_${userId}`;
      const cached = getCached(cacheKey, SHORT_CACHE_TTL);
      if (cached) return cached;

      // Limit to last 50 messages to determine active conversations quickly
      const { data: sent, error: errorSent } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: received, error: errorReceived } = await supabase
        .from('messages')
        .select('*')
        .or(`receiver_id.eq.${userId},type.like.group%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (errorSent) throw errorSent;
      if (errorReceived) throw errorReceived;

      const combined = [...(sent || []), ...(received || [])];
      combined.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      const mapped = combined.map(m => mapMessage(m)).filter(m => m !== null);
      
      // Filter for unique threads (distinct receiverId/senderId pairs)
      const uniqueThreads: Message[] = [];
      const threadKeys = new Set<string>();

      for (const msg of mapped) {
        const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        const threadKey = partnerId;
        if (!threadKeys.has(threadKey)) {
          threadKeys.add(threadKey);
          uniqueThreads.push(msg);
        }
      }

      setCache(cacheKey, uniqueThreads);
      return uniqueThreads;
    },
    listThread: async (userId: string, otherId: string): Promise<Message[]> => {
      const cacheKey = `thread_${userId}_${otherId}`;
      const cached = getCached(cacheKey, SHORT_CACHE_TTL);
      if (cached) return cached;

      let query = supabase.from('messages').select('*');

      if (otherId === 'general') {
        // Global chat: messages with type starting with 'group'
        query = query.like('type', 'group%');
      } else {
        // Private chat: messages between user and otherId
        const { data: sent, error: errorSent } = await supabase
          .from('messages')
          .select('*')
          .eq('sender_id', userId)
          .eq('receiver_id', otherId)
          .order('created_at', { ascending: false })
          .limit(30);

        const { data: received, error: errorReceived } = await supabase
          .from('messages')
          .select('*')
          .eq('sender_id', otherId)
          .eq('receiver_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (errorSent) throw errorSent;
        if (errorReceived) throw errorReceived;

        const combined = [...(sent || []), ...(received || [])];
        combined.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
        });
        
        const mapped = combined.map(m => mapMessage(m)).filter(m => m !== null);
        _cache[cacheKey] = { data: mapped, timestamp: Date.now() - 50000 }; 
        return mapped;
      }

      // Shared logic for general chat
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      const reversed = (data || []).reverse();
      const mapped = reversed.map(m => mapMessage(m)).filter(m => m !== null);
      setCache(cacheKey, mapped);
      return mapped;
    },
    send: async (message: Partial<Message> & { type?: string, fileUrl?: string }) => {
      // Clear relevant caches
      delete _cache[`convs_${message.senderId}`];
      delete _cache[`convs_${message.receiverId}`];
      delete _cache[`thread_${message.senderId}_${message.receiverId}`];
      delete _cache[`thread_${message.receiverId}_${message.senderId}`];
      const dbData: any = {
        sender_id: message.senderId,
        receiver_id: message.receiverId === 'general' ? message.senderId : message.receiverId,
        content: message.content || '',
        type: message.receiverId === 'general' 
          ? (message.type === 'text' || !message.type ? 'group' : `group_${message.type}`) 
          : (message.type || 'text'),
        file_url: message.fileUrl || null,
        read: false,
        deleted: false,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert([dbData])
        .select();

      if (error) {
        console.error("Supabase insert error details:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("No data returned after insert");
      }

      return mapMessage(data[0]);
    },
    delete: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
      return { success: true };
    },
    markAsRead: async (userId: string, senderId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', senderId);
      if (error) throw error;
      return { success: true };
    }
  }
};


