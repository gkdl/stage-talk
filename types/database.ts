export interface Performance {
  id: string;
  kopis_id: string | null;
  title: string;
  venue: string;
  start_date: string;
  end_date: string;
  genre: 'musical' | 'play';
  status: 'ongoing' | 'upcoming' | 'ended';
  created_at: string;
}

export interface Actor {
  id: string;
  name: string;
  created_at: string;
}

export interface ContentBlock {
  type: 'text' | 'image';
  value?: string;
  url?: string;
}

export interface Post {
  id: string;
  type: 'general' | 'casting';
  board: 'performance' | 'actor' | 'tips';
  performance_id: string | null;
  actor_id: string | null;
  cast_date: string | null;
  tag: string;
  title: string;
  content_blocks: ContentBlock[];
  user_id: string;
  likes_count: number;
  comments_count: number;
  is_hidden: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  depth: number;
  content: string;
  images: string[] | null;
  user_id: string;
  likes_count: number;
  is_hidden: boolean;
  created_at: string;
  replies?: Comment[];
}

export interface Casting {
  id: string;
  performance_id: string;
  cast_date: string;
  time_slot: '14:00' | '19:30' | 'other';
  roles: { role: string; actor: string }[];
  reported_by: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  performance_id: string;
  created_at: string;
}

export interface ActorFollow {
  id: string;
  user_id: string;
  actor_id: string;
  created_at: string;
}

export interface WatchLog {
  id: string;
  user_id: string;
  performance_id: string;
  watch_date: string;
  seat: string | null;
  casting: string | null;
  rating: number | null;
  memo: string | null;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_post' | 'casting_update' | 'comment';
  performance_id: string | null;
  post_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'comment' | 'user';
  target_id: string;
  category: 'spam' | 'hate' | 'false_info' | 'illegal' | 'etc';
  description: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
