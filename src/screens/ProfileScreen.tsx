import React, { useCallback, useMemo, useState } from 'react';
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

import { Badge, Button, Card } from '../components/common';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type { Group } from '../types';

type ProfileScreenProps = {
  onOpenGroup?: (groupId: string) => void;
};

function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCell}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GroupRow({
  group,
  onOpen,
}: {
  group: Group;
  onOpen?: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      disabled={!onOpen}
      style={styles.groupRow}
      accessibilityRole={onOpen ? 'button' : undefined}
    >
      <View style={styles.groupCopy}>
        <Text style={styles.groupName} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.groupMeta} numberOfLines={1}>
          {group.member_count} members · {group.checkin_frequency}x / week
        </Text>
      </View>
      <Badge
        label={group.discovery}
        tone={group.discovery === 'local' ? 'warning' : 'primary'}
        icon={group.discovery === 'local' ? 'location-outline' : 'globe-outline'}
      />
      {onOpen ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

export function ProfileScreen({ onOpenGroup }: ProfileScreenProps) {
  const { profile, session, loading: authLoading, signOut, refreshProfile } =
    useAuth();
  const { groups, loading, refreshing, error, refreshAll, refreshGroups } =
    useData();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshProfile(), refreshAll()]);
  }, [refreshProfile, refreshAll]);

  const location = useMemo(() => {
    if (!profile) return null;
    return [profile.city, profile.region].filter(Boolean).join(', ') || null;
  }, [profile]);

  const email = session?.user?.email ?? null;

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    const { error: outError } = await signOut();
    if (outError) {
      setSignOutError(outError.message);
    }
    setSigningOut(false);
  }

  if (authLoading && !profile) {
    return (
      <View style={styles.centeredRoot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>Profile</Text>
          <Text style={styles.subtitle}>Your lock-in record</Text>
        </View>
      </View>

      {error ? (
        <Pressable onPress={() => void refreshGroups()} style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>Tap to retry</Text>
        </Pressable>
      ) : null}

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
        <Card style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.avatar_initials?.trim() || 'XX'}
            </Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.name}>
              {profile?.name?.trim() || 'LockedIn member'}
            </Text>
            {profile?.handle ? (
              <Text style={styles.handle}>@{profile.handle.replace(/^@/, '')}</Text>
            ) : null}
            {location ? (
              <View style={styles.locationRow}>
                <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
                <Text style={styles.locationText}>{location}</Text>
              </View>
            ) : null}
            {profile?.bio ? (
              <Text style={styles.bio} numberOfLines={3}>
                {profile.bio}
              </Text>
            ) : null}
          </View>
        </Card>

        <Text style={styles.sectionLabel}>Stats</Text>
        <Card style={styles.statsCard}>
          <StatCell
            label="Current streak"
            value={profile?.streak_days ?? 0}
            icon="flame-outline"
          />
          <View style={styles.statDivider} />
          <StatCell
            label="Total check-ins"
            value={profile?.total_sessions ?? 0}
            icon="checkmark-done-outline"
          />
          <View style={styles.statDivider} />
          <StatCell
            label="Joined groups"
            value={groups.length}
            icon="people-outline"
          />
        </Card>

        <Text style={styles.sectionLabel}>Joined Groups</Text>
        {loading && groups.length === 0 ? (
          <View style={styles.sectionLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : groups.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="people-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyBody}>
              Join a crew from Groups to stay accountable.
            </Text>
          </Card>
        ) : (
          <Card style={styles.groupsCard}>
            {groups.map((group, index) => (
              <View key={group.id}>
                {index > 0 ? <View style={styles.groupDivider} /> : null}
                <GroupRow
                  group={group}
                  onOpen={onOpenGroup ? () => onOpenGroup(group.id) : undefined}
                />
              </View>
            ))}
          </Card>
        )}

        <Text style={styles.sectionLabel}>Account</Text>
        <Card style={styles.accountCard}>
          {email ? (
            <View style={styles.accountRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
              <Text style={styles.accountValue}>{email}</Text>
            </View>
          ) : null}
          {signOutError ? (
            <Text style={styles.formError}>{signOutError}</Text>
          ) : null}
          <Button
            label="Sign Out"
            variant="destructive"
            icon="log-out-outline"
            loading={signingOut}
            onPress={() => void handleSignOut()}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredRoot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  identityCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  handle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  locationText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  bio: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
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
  groupsCard: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  groupCopy: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  groupMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  groupDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  accountCard: {
    gap: 12,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountValue: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
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

export default ProfileScreen;
