export type UserRole = 'admin' | 'member';

export interface Member {
  id: string;
  fullName: string;
  role: UserRole;
  joinedAt: any;
  active: boolean;
  voiceType?: string;
  instrument?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
  type: 'info' | 'urgent' | 'repetition';
}

export interface Song {
  id: string;
  title: string;
  category: string;
  lyrics: string;
  chords?: string;
  key: string;
  author?: string;
  audioUrl?: string;
  addedAt: any;
}

export interface Instrument {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
  imageUrl?: string;
  lastMaintenance: any;
}

export interface AuthState {
  user: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: UserRole;
  } | null;
  loading: boolean;
  memberData?: Member | null;
}
