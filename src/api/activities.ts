import { supabase } from './client';
import { toApiError, type ApiResult } from './result';
import type { Activity, Profile } from '../types';

export type ActivityWithProfile = Activity & {
  profile: Profile | null;
};

/** Public feed activities with author profile (null when anonymous). */
export async function fetchFeedActivities(): Promise<ApiResult<ActivityWithProfile[]>> {
  const { data, error } = await supabase
    .from('activities')
    .select('*, profiles(*)')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: toApiError(error) };

  const activities = (data ?? []).map((row) => {
    const { profiles, ...activity } = row as Activity & {
      profiles: Profile | Profile[] | null;
    };
    const profile = Array.isArray(profiles) ? (profiles[0] ?? null) : profiles;
    const typed = activity as Activity;
    return {
      ...typed,
      profile: typed.is_anonymous ? null : profile,
    };
  });

  return { data: activities, error: null };
}
