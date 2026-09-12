import { supabase } from './client';
import { toApiError, type ApiResult } from './result';

export type LogCheckinParams = {
  group_ids: string[];
  title: string;
  category: string;
  sport_type?: string | null;
  duration_minutes?: number;
  notes?: string | null;
  photo_url?: string | null;
  metrics?: Record<string, unknown> | null;
  post_to_feed?: boolean;
  is_anonymous?: boolean;
};

export type LogCheckinResult = {
  ok: boolean;
  error?: string;
  activity_id?: string | null;
};

/** Calls `log_checkin` RPC for one or more groups. */
export async function logCheckin(params: LogCheckinParams): Promise<ApiResult<LogCheckinResult>> {
  const { data, error } = await supabase.rpc('log_checkin', {
    p_group_ids: params.group_ids,
    p_title: params.title,
    p_category: params.category,
    p_sport_type: params.sport_type ?? null,
    p_duration_minutes: params.duration_minutes ?? 30,
    p_notes: params.notes ?? null,
    p_photo_url: params.photo_url ?? null,
    p_metrics: params.metrics ?? null,
    p_post_to_feed: params.post_to_feed ?? true,
    p_is_anonymous: params.is_anonymous ?? false,
  });

  if (error) return { data: null, error: toApiError(error) };
  return { data: data as LogCheckinResult, error: null };
}
