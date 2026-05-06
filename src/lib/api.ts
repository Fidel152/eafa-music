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

const mapMessage = (m: any): Message => ({
  ...m,
  senderId: m.sender_id,
  receiverId: m.receiver_id,
  fileUrl: m.file_url,
  createdAt: m.created_at,
  read: m.read || false,
  deleted: m.deleted || false
});

// Simple in-memory cache to improve responsiveness
const _cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 60000; // 60 seconds

const getCached = (key: string) => {
  const entry = _cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
};

const setCache = (key: string, data: any) => {
  _cache[key] = { data, timestamp: Date.now() };
};

const clearCache = (key: string) => {
  delete _cache[key];
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
      const { data: idMatch } = await supabase
        .from('members')
        .select('*')
        .eq('id', search)
        .maybeSingle();
      data = idMatch;

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
          role: member.role
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapMessage);
    },
    listThread: async (userId: string, otherId: string): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapMessage);
    },
    send: async (message: Partial<Message> & { type?: string, fileUrl?: string }) => {
      const dbData: any = {
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        content: message.content || '',
        type: message.type || 'text',
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


