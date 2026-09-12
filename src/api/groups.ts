import { supabase } from './client';
import { toApiError, type ApiResult } from './result';
import type {
  Group,
  GroupAccess,
  GroupConsequence,
  GroupDiscovery,
  GroupMember,
  Profile,
} from '../types';

export type { ApiResult } from './result';

export type GroupMemberWithProfile = GroupMember & {
  profile: Profile | null;
};

export type CreateGroupParams = {
  name: string;
  description: string;
  interests: string[];
  sport_types: string[];
  access: GroupAccess;
  discovery: GroupDiscovery;
  consequence: GroupConsequence;
  checkin_frequency: number;
  require_photo: boolean;
  password?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type JoinGroupParams = {
  group_id: string;
  password?: string | null;
  invite_code?: string | null;
};

export type JoinGroupResult = {
  ok: boolean;
  error?: string;
  needs_password?: boolean;
};

export type VoteToKickResult = {
  ok: boolean;
  error?: string;
  kicked?: boolean;
  votes?: number;
  needed?: number;
};

/** Groups visible in discovery (global / local). */
export async function fetchDiscoverableGroups(): Promise<ApiResult<Group[]>> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .in('discovery', ['global', 'local'])
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: toApiError(error) };
  return { data: (data ?? []) as Group[], error: null };
}

/** Groups the given user belongs to. */
export async function fetchUserGroups(userId: string): Promise<ApiResult<Group[]>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups(*)')
    .eq('user_id', userId);

  if (error) return { data: null, error: toApiError(error) };

  const groups = (data ?? [])
    .map((row) => {
      const nested = (row as { groups: Group | Group[] | null }).groups;
      if (Array.isArray(nested)) return nested[0] ?? null;
      return nested;
    })
    .filter((group): group is Group => group != null);

  return { data: groups, error: null };
}

/** Current user's membership rows (cycle status, strikes, etc.). */
export async function fetchUserMemberships(
  userId: string,
): Promise<ApiResult<GroupMember[]>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('user_id', userId);

  if (error) return { data: null, error: toApiError(error) };
  return { data: (data ?? []) as GroupMember[], error: null };
}

/** Members of a group with joined profile rows. */
export async function fetchGroupMembersWithProfiles(
  groupId: string,
): Promise<ApiResult<GroupMemberWithProfile[]>> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles(*)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) return { data: null, error: toApiError(error) };

  const members = (data ?? []).map((row) => {
    const { profiles, ...member } = row as GroupMember & {
      profiles: Profile | Profile[] | null;
    };
    const profile = Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
    return { ...(member as GroupMember), profile };
  });

  return { data: members, error: null };
}

/** Calls `create_group` RPC. Returns the new group id. */
export async function createGroup(params: CreateGroupParams): Promise<ApiResult<string>> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: params.name,
    p_description: params.description,
    p_interests: params.interests,
    p_sport_types: params.sport_types,
    p_access: params.access,
    p_discovery: params.discovery,
    p_consequence: params.consequence,
    p_checkin_frequency: params.checkin_frequency,
    p_require_photo: params.require_photo,
    p_password: params.password ?? null,
    p_city: params.city ?? null,
    p_region: params.region ?? null,
    p_country: params.country ?? null,
    p_latitude: params.latitude ?? null,
    p_longitude: params.longitude ?? null,
  });

  if (error) return { data: null, error: toApiError(error) };
  return { data: data as string, error: null };
}

/** Calls `join_group` RPC. */
export async function joinGroup(params: JoinGroupParams): Promise<ApiResult<JoinGroupResult>> {
  const { data, error } = await supabase.rpc('join_group', {
    p_group_id: params.group_id,
    p_password: params.password ?? null,
    p_invite_code: params.invite_code ?? null,
  });

  if (error) return { data: null, error: toApiError(error) };
  return { data: data as JoinGroupResult, error: null };
}

/** Calls `vote_to_kick_member` RPC. */
export async function voteToKickMember(
  groupId: string,
  targetUserId: string,
): Promise<ApiResult<VoteToKickResult>> {
  const { data, error } = await supabase.rpc('vote_to_kick_member', {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
  });

  if (error) return { data: null, error: toApiError(error) };
  return { data: data as VoteToKickResult, error: null };
}
