import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchFeedActivities,
  type ActivityWithProfile,
} from '../api/activities';
import {
  logCheckin,
  type LogCheckinParams,
  type LogCheckinResult,
} from '../api/checkins';
import {
  fetchUserGroups,
  voteToKickMember,
  type VoteToKickResult,
} from '../api/groups';
import { fetchGoals } from '../api/goals';
import type { ApiResult } from '../api/result';
import type { Goal, Group } from '../types';
import { useAuth } from './AuthContext';

type DataContextValue = {
  feed: ActivityWithProfile[];
  groups: Group[];
  goals: Goal[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  submitCheckin: (params: LogCheckinParams) => Promise<ApiResult<LogCheckinResult>>;
  submitKickVote: (
    groupId: string,
    targetUserId: string,
  ) => Promise<ApiResult<VoteToKickResult>>;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [feed, setFeed] = useState<ActivityWithProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFeed = useCallback(async () => {
    const { data, error: feedError } = await fetchFeedActivities();
    if (feedError) {
      setError(feedError.message);
      return;
    }
    setFeed(data ?? []);
  }, []);

  const refreshGroups = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      return;
    }
    const { data, error: groupsError } = await fetchUserGroups(userId);
    if (groupsError) {
      setError(groupsError.message);
      return;
    }
    setGroups(data ?? []);
  }, [userId]);

  const refreshGoals = useCallback(async () => {
    if (!userId) {
      setGoals([]);
      return;
    }
    const { data, error: goalsError } = await fetchGoals(userId);
    if (goalsError) {
      setError(goalsError.message);
      return;
    }
    // Active goals: prefer the signed-in user's own goals.
    const all = data ?? [];
    setGoals(all.filter((goal) => goal.user_id === userId));
  }, [userId]);

  const refreshAll = useCallback(async () => {
    if (!userId) {
      setFeed([]);
      setGroups([]);
      setGoals([]);
      setError(null);
      return;
    }

    setRefreshing(true);
    setError(null);
    try {
      await Promise.all([refreshFeed(), refreshGroups(), refreshGoals()]);
    } finally {
      setRefreshing(false);
    }
  }, [userId, refreshFeed, refreshGroups, refreshGoals]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!userId) {
        setFeed([]);
        setGroups([]);
        setGoals([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        await Promise.all([refreshFeed(), refreshGroups(), refreshGoals()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshFeed, refreshGroups, refreshGoals]);

  const submitCheckin = useCallback(
    async (params: LogCheckinParams) => {
      const previousFeed = feed;
      const shouldPost = params.post_to_feed !== false;

      if (shouldPost && userId) {
        const optimistic: ActivityWithProfile = {
          id: `optimistic-${Date.now()}`,
          user_id: userId,
          category: params.category,
          sport_type: params.sport_type ?? null,
          title: params.title,
          notes: params.notes ?? null,
          duration_minutes: params.duration_minutes ?? 30,
          metrics: params.metrics ?? null,
          photo_url: params.photo_url ?? null,
          is_anonymous: params.is_anonymous ?? false,
          created_at: new Date().toISOString(),
          profile: null,
        };
        setFeed((current) => [optimistic, ...current]);
      }

      const result = await logCheckin(params);
      if (result.error || result.data?.ok === false) {
        setFeed(previousFeed);
        return result;
      }

      await Promise.all([refreshFeed(), refreshGroups(), refreshGoals()]);
      return result;
    },
    [feed, userId, refreshFeed, refreshGroups, refreshGoals],
  );

  const submitKickVote = useCallback(
    async (groupId: string, targetUserId: string) => {
      const previousGroups = groups;
      // Optimistic: if the RPC reports a kick, drop member_count locally until refresh.
      const result = await voteToKickMember(groupId, targetUserId);

      if (result.error) {
        setGroups(previousGroups);
        return result;
      }

      if (result.data?.kicked) {
        setGroups((current) =>
          current.map((group) =>
            group.id === groupId
              ? { ...group, member_count: Math.max(0, group.member_count - 1) }
              : group,
          ),
        );
      }

      await refreshGroups();
      return result;
    },
    [groups, refreshGroups],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      feed,
      groups,
      goals,
      loading,
      refreshing,
      error,
      refreshAll,
      refreshFeed,
      refreshGroups,
      refreshGoals,
      submitCheckin,
      submitKickVote,
    }),
    [
      feed,
      groups,
      goals,
      loading,
      refreshing,
      error,
      refreshAll,
      refreshFeed,
      refreshGroups,
      refreshGoals,
      submitCheckin,
      submitKickVote,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within DataProvider');
  }
  return ctx;
}

export default DataContext;
