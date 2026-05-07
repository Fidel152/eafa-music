export type UserRole = 'admin' | 'member';

export interface Member {
  id: string;
  fullName: string;
  accessName?: string;
  email?: string;
  role: UserRole;
  joinedAt: any;
  active: boolean;
  voiceType?: string;
  instrument?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  lastSeen?: any;
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

export interface Rehearsal {
  id: string;
  title: string;
  description?: string;
  date: any;
  location: string;
  createdAt: any;
}

export interface Attendance {
  id: string;
  rehearsalId: string;
  memberId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  updatedAt: any;
}

export interface Comment {
  id: string;
  targetId: string;
  targetType: 'announcement' | 'song';
  memberId: string;
  memberName: string;
  content: string;
  createdAt: any;
  parentId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'photo' | 'file';
  fileUrl?: string;
  read: boolean;
  createdAt: any;
  deleted?: boolean;
}

export interface AuthState {
  user: {
    id: string;
    email?: string | null;
    displayName?: string | null;
    role: UserRole;
    avatarUrl?: string | null;
  } | null;
  loading: boolean;
  memberData?: Member | null;
}
