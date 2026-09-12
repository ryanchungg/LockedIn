import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge, Card, ProgressBar } from '../components/common';
import { getCategoryById } from '../constants/categories';
import { colors } from '../constants/theme';
import { useData } from '../context/DataContext';
import type { Goal } from '../types';

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function GoalCard({ goal }: { goal: Goal }) {
  const category = getCategoryById(goal.category);
  const deadline = formatDeadline(goal.deadline);
  const unit = goal.unit || category?.unit || '';
  const progressColor =
    goal.current_value >= goal.target_value && goal.target_value > 0
      ? colors.safe
      : colors.primary;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitles}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.intent} numberOfLines={2}>
            {goal.intent}
          </Text>
        </View>
        {category ? (
          <Badge
            label={category.label}
            tone={category.kind === 'sport' ? 'primary' : 'muted'}
            icon={category.icon as keyof typeof Ionicons.glyphMap}
          />
        ) : (
          <Badge label={goal.category} tone="muted" />
        )}
      </View>

      <ProgressBar
        value={goal.current_value}
        max={goal.target_value}
        label={`${goal.current_value} / ${goal.target_value}${unit ? ` ${unit}` : ''}`}
        showPercent
        color={progressColor}
        height={6}
      />

      <View style={styles.metaRow}>
        {goal.sport_type ? (
          <View style={styles.metaChip}>
            <Ionicons name="fitness-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{goal.sport_type}</Text>
          </View>
        ) : null}
        {deadline ? (
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Due {deadline}</Text>
          </View>
        ) : null}
        {goal.is_public ? (
          <View style={styles.metaChip}>
            <Ionicons name="globe-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Public</Text>
          </View>
        ) : (
          <View style={styles.metaChip}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>Private</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

export function GoalsScreen() {
  const { goals, loading, refreshing, error, refreshAll, refreshGoals } = useData();

  const onRefresh = useCallback(() => {
    void refreshAll();
  }, [refreshAll]);

  const empty = useMemo(() => !loading && goals.length === 0, [loading, goals.length]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>Goals</Text>
          <Text style={styles.subtitle}>Intent progress</Text>
        </View>
      </View>

      {error ? (
        <Pressable onPress={() => void refreshGoals()} style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>Tap to retry</Text>
        </Pressable>
      ) : null}

      {loading && goals.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={goals}
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
                <Ionicons name="flag-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No goals yet</Text>
                <Text style={styles.emptyBody}>
                  Set an intent and track progress as you check in.
                </Text>
              </Card>
            ) : null
          }
          renderItem={({ item }) => <GoalCard goal={item} />}
        />
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
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitles: {
    flex: 1,
    gap: 4,
  },
  goalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  intent: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
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

export default GoalsScreen;
