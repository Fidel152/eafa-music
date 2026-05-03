/**
 * Frontend API client using Supabase
 */
import { Member, Song, Announcement, Instrument } from '../types';
import { supabase } from './supabase';

export const api = {
  auth: {
    loginByName: async (name: string) => {
      const trimmedName = name.trim();
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .ilike('full_name', trimmedName)
        .single();
      
      if (error || !data) {
        throw new Error("Accès refusé : vous n'êtes pas membre de la chorale ou votre nom est incorrect.");
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
        role: m.role,
        voiceType: m.voice_type,
        instrument: m.instrument,
        active: m.active,
        joinedAt: m.joined_at
      }));
    },
    create: async (member: Partial<Member>) => {
      const dbMember = {
        id: member.id || Date.now().toString(),
        full_name: member.fullName,
        role: member.role,
        voice_type: member.voiceType,
        instrument: member.instrument,
        active: member.active
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
      if (member.role !== undefined) dbMember.role = member.role;
      if (member.voiceType !== undefined) dbMember.voice_type = member.voiceType;
      if (member.instrument !== undefined) dbMember.instrument = member.instrument;
      if (member.active !== undefined) dbMember.active = member.active;

      const { data, error } = await supabase
        .from('members')
        .update(dbMember)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
  }
};
