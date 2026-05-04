/**
 * Frontend API client using local Express backend
 */
import { Member, Song, Announcement, Instrument, Rehearsal, Attendance, Comment, Message } from '../types';

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Une erreur est survenue' }));
    throw new Error(error.error || 'Erreur réseau');
  }
  return res.json();
};

export const api = {
  auth: {
    loginByName: async (name: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      return handleResponse(res);
    },
    logout: async () => {
      return { success: true };
    },
  },
  members: {
    list: async (): Promise<Member[]> => {
      const res = await fetch('/api/members');
      return handleResponse(res);
    },
    create: async (member: Partial<Member>) => {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    update: async (id: string, member: Partial<Member>) => {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });
      return handleResponse(res);
    },
    updatePresence: async (id: string) => {
      const res = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSeen: new Date().toISOString() })
      });
      return handleResponse(res);
    }
  },
  songs: {
    list: async (): Promise<Song[]> => {
      const res = await fetch('/api/songs');
      return handleResponse(res);
    },
    create: async (song: Partial<Song>) => {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song)
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/songs/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    update: async (id: string, song: Partial<Song>) => {
      const res = await fetch(`/api/songs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song)
      });
      return handleResponse(res);
    }
  },
  announcements: {
    list: async (): Promise<Announcement[]> => {
      const res = await fetch('/api/announcements');
      return handleResponse(res);
    },
    create: async (ann: Partial<Announcement>) => {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ann)
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    update: async (id: string, ann: Partial<Announcement>) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ann)
      });
      return handleResponse(res);
    }
  },
  instruments: {
    list: async (): Promise<Instrument[]> => {
      const res = await fetch('/api/instruments');
      return handleResponse(res);
    },
    create: async (inst: Partial<Instrument>) => {
      const res = await fetch('/api/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inst)
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/instruments/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    update: async (id: string, inst: Partial<Instrument>) => {
      const res = await fetch(`/api/instruments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inst)
      });
      return handleResponse(res);
    }
  },
  rehearsals: {
    list: async (): Promise<Rehearsal[]> => {
      const res = await fetch('/api/rehearsals');
      return handleResponse(res);
    },
    create: async (rehearsal: Partial<Rehearsal>) => {
      const res = await fetch('/api/rehearsals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rehearsal)
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/rehearsals/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    }
  },
  attendance: {
    listForRehearsal: async (rehearsalId: string): Promise<Attendance[]> => {
      const res = await fetch(`/api/attendance/${rehearsalId}`);
      return handleResponse(res);
    },
    update: async (rehearsalId: string, memberId: string, status: string) => {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rehearsalId, memberId, status })
      });
      return handleResponse(res);
    }
  },
  comments: {
    list: async (targetId: string): Promise<Comment[]> => {
      const res = await fetch(`/api/comments/${targetId}`);
      return handleResponse(res);
    },
    create: async (comment: Partial<Comment>) => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
      return handleResponse(res);
    }
  },
  messages: {
    listConversations: async (userId: string): Promise<Message[]> => {
      const res = await fetch(`/api/messages/${userId}`);
      return handleResponse(res);
    },
    listThread: async (userId: string, otherId: string): Promise<Message[]> => {
      const res = await fetch(`/api/messages/thread/${userId}/${otherId}`);
      return handleResponse(res);
    },
    send: async (message: Partial<Message> & { type?: string, fileUrl?: string }) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      return handleResponse(res);
    },
    delete: async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      return handleResponse(res);
    },
    markAsRead: async (userId: string, senderId: string) => {
      const res = await fetch('/api/messages/mark-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, senderId })
      });
      return handleResponse(res);
    }
  }
};

