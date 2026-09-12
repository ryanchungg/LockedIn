export type GroupAccess = 'public' | 'private';
export type GroupDiscovery = 'global' | 'local' | 'hidden';
export type GroupConsequence = 'auto_kick' | 'three_strikes' | 'social_shame';
export type MemberRole = 'founder' | 'admin' | 'member';
export type MemberCycleStatus = 'safe' | 'pending' | 'fell_off';

export interface Profile {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatar_initials: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  streak_days: number;
  total_sessions: number;
  created_at: string;
}

export interface Group {
  id: string;
  creator_id: string;
  name: string;
  description: string;
  interests: string[];
  sport_types: string[];
  access: GroupAccess;
  discovery: GroupDiscovery;
  consequence: GroupConsequence;
  checkin_frequency: number;
  require_photo: boolean;
  invite_code: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  member_count: number;
  cycle_start_at: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: MemberRole;
  strikes: number;
  checkins_this_cycle: number;
  cycle_status: MemberCycleStatus;
  last_checked_in_at: string | null;
  joined_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  category: string;
  sport_type: string | null;
  title: string;
  notes: string | null;
  duration_minutes: number;
  metrics: Record<string, unknown> | null;
  photo_url: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  category: string;
  sport_type: string | null;
  title: string;
  intent: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  is_public: boolean;
  is_anonymous: boolean;
  created_at: string;
}
