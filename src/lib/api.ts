/**
 * Frontend API client for calling our Express SQL backend
 */
import { Member, Song, Announcement, Instrument } from '../types';

const fetchApi = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(JSON.stringify({
      error: error.error || response.statusText,
      path,
      operation: options.method || 'GET'
    }));
  }
  
  return response.json();
};

export const api = {
  auth: {
    loginByName: async (name: string) => {
      return fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },
    logout: async () => {
      // In a simple name-based auth, we just clear the local state
      return { success: true };
    },
  },
  members: {
    list: async (): Promise<Member[]> => {
      return fetchApi('/members');
    },
    create: async (data: Partial<Member>) => {
      return fetchApi('/members', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return fetchApi(`/members/${id}`, {
        method: 'DELETE',
      });
    },
    update: async (id: string, data: Partial<Member>) => {
      return fetchApi(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  songs: {
    list: async (): Promise<Song[]> => {
      return fetchApi('/songs');
    },
    create: async (data: Partial<Song>) => {
      return fetchApi('/songs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return fetchApi(`/songs/${id}`, {
        method: 'DELETE',
      });
    },
    update: async (id: string, data: Partial<Song>) => {
      return fetchApi(`/songs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  announcements: {
    list: async (): Promise<Announcement[]> => {
      return fetchApi('/announcements');
    },
    create: async (data: Partial<Announcement>) => {
      return fetchApi('/announcements', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return fetchApi(`/announcements/${id}`, {
        method: 'DELETE',
      });
    },
    update: async (id: string, data: Partial<Announcement>) => {
      return fetchApi(`/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  instruments: {
    list: async (): Promise<Instrument[]> => {
      return fetchApi('/instruments');
    },
    create: async (data: Partial<Instrument>) => {
      return fetchApi('/instruments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string) => {
      return fetchApi(`/instruments/${id}`, {
        method: 'DELETE',
      });
    },
    update: async (id: string, data: Partial<Instrument>) => {
      return fetchApi(`/instruments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  }
};
