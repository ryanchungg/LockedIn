import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ActivityWithProfile } from '../api/activities';
import { Badge, Card } from '../components/common';
import { CheckInModal } from '../components/groups/CheckInModal';
import { getCategoryById } from '../constants/categories';
import { colors } from '../constants/theme';
import { useData } from '../context/DataContext';

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const deltaSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (deltaSec < 60) return 'just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86400)}d ago`;
}

function FeedCard({ item }: { item: ActivityWithProfile }) {
  const anonymous = item.is_anonymous;
  const category = getCategoryById(item.category);
  const displayName = anonymous
    ? 'Anonymous'
    : item.profile?.name?.trim() || item.profile?.handle || 'Member';
  const handle = anonymous ? '@anonymous' : item.profile?.handle ?? '';
  const initials = anonymous ? '?' : item.profile?.avatar_initials || 'XX';

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, anonymous && styles.avatarAnonymous]}>
          {anonymous ? (
            <Ionicons name="eye-off-outline" size={18} color={colors.textMuted} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.handle}>
            {handle}
            {handle ? ' · ' : ''}
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        {category ? (
          <Badge
            label={category.label}
            tone={category.kind === 'sport' ? 'primary' : 'muted'}
            icon={category.icon as keyof typeof Ionicons.glyphMap}
          />
        ) : (
          <Badge label={item.category} tone="muted" />
        )}
      </View>

      <Text style={styles.title}>{item.title}</Text>
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{item.duration_minutes} min</Text>
        </View>
        {item.sport_type ? (
          <View style={styles.metaChip}>
            <Ionicons name="fitness-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.sport_type}</Text>
          </View>
        ) : null}
      </View>

      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.photo} />
      ) : null}
    </Card>
  );
}

export function FeedScreen() {
  const { feed, loading, refreshing, error, refreshAll, refreshFeed } = useData();
  const [checkInOpen, setCheckInOpen] = useState(false);

  const onRefresh = useCallback(() => {
    void refreshAll();
  }, [refreshAll]);

  const empty = useMemo(() => !loading && feed.length === 0, [loading, feed.length]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>LockedIn</Text>
          <Text style={styles.subtitle}>Public grind feed</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCheckInOpen(true)}
          style={styles.checkInButton}
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
          <Text style={styles.checkInLabel}>Check In</Text>
        </Pressable>
      </View>

      {error ? (
        <Pressable onPress={() => void refreshFeed()} style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>Tap to retry</Text>
        </Pressable>
      ) : null}

      {loading && feed.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            empty ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="newspaper-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptyBody}>
                  Check in to a group and post to the public feed to appear here.
                </Text>
              </Card>
            ) : null
          }
          renderItem={({ item }) => <FeedCard item={item} />}
        />
      )}

      <CheckInModal visible={checkInOpen} onClose={() => setCheckInOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
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
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkInLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAnonymous: {
    backgroundColor: colors.surface,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  headerMeta: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  handle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  notes: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  photo: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
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

export default FeedScreen;
