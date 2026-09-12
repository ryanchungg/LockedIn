import { supabase } from './client';
import { toApiError, type ApiResult } from './result';
import type { Goal } from '../types';

export type CreateGoalParams = {
  user_id: string;
  category: string;
  sport_type?: string | null;
  title: string;
  intent: string;
  target_value: number;
  unit: string;
  deadline?: string | null;
  is_public?: boolean;
  is_anonymous?: boolean;
};

/** Goals visible to the current user (own + public). */
export async function fetchGoals(userId?: string): Promise<ApiResult<Goal[]>> {
  let query = supabase.from('goals').select('*').order('created_at', { ascending: false });

  if (userId) {
    query = query.or(`user_id.eq.${userId},is_public.eq.true`);
  }

  const { data, error } = await query;

  if (error) return { data: null, error: toApiError(error) };
  return { data: (data ?? []) as Goal[], error: null };
}

/** Insert a new goal row. */
export async function createGoal(params: CreateGoalParams): Promise<ApiResult<Goal>> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: params.user_id,
      category: params.category,
      sport_type: params.sport_type ?? null,
      title: params.title,
      intent: params.intent,
      target_value: params.target_value,
      current_value: 0,
      unit: params.unit,
      deadline: params.deadline ?? null,
      is_public: params.is_public ?? true,
      is_anonymous: params.is_anonymous ?? false,
    })
    .select('*')
    .single();

  if (error) return { data: null, error: toApiError(error) };
  return { data: data as Goal, error: null };
}

/** Set goal progress (`current_value`). */
export async function updateGoalProgress(
  goalId: string,
  currentValue: number,
): Promise<ApiResult<Goal>> {
  const { data, error } = await supabase
    .from('goals')
    .update({ current_value: currentValue })
    .eq('id', goalId)
    .select('*')
    .single();

  if (error) return { data: null, error: toApiError(error) };
  return { data: data as Goal, error: null };
}
