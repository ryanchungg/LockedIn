import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  fetchGroupMembersWithProfiles,
  type GroupMemberWithProfile,
} from '../api/groups';
import { Badge, Card, ProgressBar } from '../components/common';
import { MemberList } from '../components/groups/MemberList';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Group, GroupConsequence } from '../types';

type GroupDetailScreenProps = {
  groupId: string;
  onBack?: () => void;
};

const CONSEQUENCE_LABELS: Record<GroupConsequence, string> = {
  auto_kick: 'Auto Kick',
  three_strikes: 'Three Strikes',
  social_shame: 'Social Shame',
};

function MetricCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.metricCell}>
      <View style={styles.metricLabelRow}>
        <Ionicons name={icon} size={12} color={colors.textMuted} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function GroupDetailScreen({ groupId, onBack }: GroupDetailScreenProps) {
  const { userId } = useAuth();
  const { groups, refreshing, refreshGroups } = useData();

  const [members, setMembers] = useState<GroupMemberWithProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const group: Group | undefined = useMemo(
    () => groups.find((item) => item.id === groupId),
    [groups, groupId],
  );

  const loadMembers = useCallback(async () => {
    setError(null);
    const { data, error: membersError } = await fetchGroupMembersWithProfiles(
      groupId,
    );
    if (membersError) {
      setError(membersError.message);
      return;
    }
    setMembers(data ?? []);
  }, [groupId]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoadingMembers(true);
      await loadMembers();
      if (!cancelled) setLoadingMembers(false);
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadMembers]);

  const myMembership = useMemo(
    () => members.find((member) => member.user_id === userId) ?? null,
    [members, userId],
  );

  const frequency = Math.max(1, group?.checkin_frequency ?? 1);
  const done = myMembership?.checkins_this_cycle ?? 0;
  const progress = Math.min(1, done / frequency);

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshGroups(), loadMembers()]);
  }, [refreshGroups, loadMembers]);

  if (!group && !loadingMembers) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <Text style={styles.topTitle}>Group</Text>
          <View style={styles.backSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Group not found</Text>
          <Text style={styles.emptyBody}>
            This group is missing from your memberships or failed to load.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <Text style={styles.topTitle} numberOfLines={1}>
          {group?.name ?? 'Group'}
        </Text>
        <View style={styles.backSpacer} />
      </View>

      {error ? (
        <Pressable onPress={() => void loadMembers()} style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>Tap to retry</Text>
        </Pressable>
      ) : null}

      {loadingMembers && !group ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.primary}
            />
          }
        >
          {group ? (
            <>
              <Card style={styles.heroCard}>
                <Text style={styles.groupName}>{group.name}</Text>
                {group.description ? (
                  <Text style={styles.groupDescription}>{group.description}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Badge
                    label={`${group.member_count} members`}
                    tone="muted"
                    icon="people-outline"
                  />
                  {myMembership ? <Badge status={myMembership.cycle_status} /> : null}
                </View>
              </Card>

              <Text style={styles.sectionLabel}>Group Rules</Text>
              <Card style={styles.metricsCard}>
                <MetricCell
                  label="Frequency"
                  value={`${frequency}x / week`}
                  icon="repeat-outline"
                />
                <View style={styles.metricDivider} />
                <MetricCell
                  label="Proof"
                  value={group.require_photo ? 'Mandatory' : 'Optional'}
                  icon="camera-outline"
                />
                <View style={styles.metricDivider} />
                <MetricCell
                  label="Consequence"
                  value={CONSEQUENCE_LABELS[group.consequence]}
                  icon="flash-outline"
                />
              </Card>

              <Text style={styles.sectionLabel}>Your Cycle</Text>
              <Card style={styles.progressCard}>
                <ProgressBar
                  progress={progress}
                  label={`${done} / ${frequency} check-ins`}
                  showPercent
                  color={
                    myMembership?.cycle_status === 'fell_off'
                      ? colors.danger
                      : myMembership?.cycle_status === 'safe'
                        ? colors.safe
                        : colors.primary
                  }
                />
              </Card>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>Members</Text>
          {loadingMembers ? (
            <View style={styles.membersLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <MemberList
              members={members}
              groupId={groupId}
              currentUserId={userId}
              onMembersChanged={() => {
                void loadMembers();
                void refreshGroups();
              }}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backSpacer: {
    width: 22,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  heroCard: {
    gap: 10,
  },
  groupName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  groupDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  metricCell: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  progressCard: {
    gap: 8,
  },
  membersLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  errorRetry: {
    color: colors.textMuted,
    fontSize: 12,
  },
});

export default GroupDetailScreen;
