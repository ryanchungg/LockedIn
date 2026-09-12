import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { fetchUserMemberships } from '../../api/groups';
import { Badge, Button, Card, Input } from '../common';
import {
  CATEGORIES,
  getCategoryById,
  type CategoryConfig,
} from '../../constants/categories';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { Group, GroupMember, MemberCycleStatus } from '../../types';

type CheckInModalProps = {
  visible: boolean;
  onClose: () => void;
};

const DURATION_PRESETS = [15, 30, 45, 60, 90];

export function CheckInModal({ visible, onClose }: CheckInModalProps) {
  const { userId } = useAuth();
  const { groups, submitCheckin } = useData();

  const [membershipByGroupId, setMembershipByGroupId] = useState<
    Record<string, GroupMember>
  >({});
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]?.id ?? 'study');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [postToFeed, setPostToFeed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory: CategoryConfig | undefined = useMemo(
    () => getCategoryById(categoryId),
    [categoryId],
  );

  const loadMemberships = useCallback(async () => {
    if (!userId) {
      setMembershipByGroupId({});
      return;
    }
    const { data, error: membershipError } = await fetchUserMemberships(userId);
    if (membershipError) {
      setError(membershipError.message);
      return;
    }
    const next: Record<string, GroupMember> = {};
    for (const row of data ?? []) {
      next[row.group_id] = row;
    }
    setMembershipByGroupId(next);
  }, [userId]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setSelectedGroupIds(groups.map((group) => group.id));
    setCategoryId(CATEGORIES[0]?.id ?? 'study');
    setDurationMinutes(30);
    setNotes('');
    setPhotoUri(null);
    setPostToFeed(true);
    void loadMemberships();
  }, [visible, groups, loadMemberships]);

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to attach a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setError(null);
    }
  }

  async function handleSubmit() {
    if (selectedGroupIds.length === 0) {
      setError('Select at least one group.');
      return;
    }
    if (!selectedCategory) {
      setError('Pick a category.');
      return;
    }

    const requiresPhoto = selectedGroupIds.some((groupId) => {
      const group = groups.find((item) => item.id === groupId);
      return group?.require_photo === true;
    });
    if (requiresPhoto && !photoUri) {
      setError('One or more selected groups require a photo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const title = `${selectedCategory.label} · ${durationMinutes}m`;
    const isSport = selectedCategory.kind === 'sport';

    const { data, error: submitError } = await submitCheckin({
      group_ids: selectedGroupIds,
      title,
      category: selectedCategory.id,
      sport_type: isSport ? selectedCategory.id : null,
      duration_minutes: durationMinutes,
      notes: notes.trim() || null,
      photo_url: photoUri,
      post_to_feed: postToFeed,
      is_anonymous: false,
    });

    setSubmitting(false);

    if (submitError) {
      setError(submitError.message);
      return;
    }
    if (data && data.ok === false) {
      setError(data.error ?? 'Check-in failed.');
      return;
    }

    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check In</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Photo</Text>
          <Pressable style={styles.photoBox} onPress={pickPhoto} accessibilityRole="button">
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                <Text style={styles.photoHint}>Tap to select a photo</Text>
              </View>
            )}
          </Pressable>
          {photoUri ? (
            <Pressable onPress={() => setPhotoUri(null)} style={styles.clearPhoto}>
              <Text style={styles.clearPhotoText}>Remove photo</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((category) => {
              const active = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Ionicons
                    name={category.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={active ? colors.textPrimary : colors.textMuted}
                  />
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.chipRow}>
            {DURATION_PRESETS.map((preset) => {
              const active = durationMinutes === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setDurationMinutes(preset)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                    {preset}m
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            label="Custom minutes"
            keyboardType="number-pad"
            value={String(durationMinutes)}
            onChangeText={(text) => {
              const next = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
              if (!Number.isNaN(next) && next > 0) setDurationMinutes(next);
            }}
            leftIcon="time-outline"
          />

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you get done?"
            multiline
            style={styles.notesInput}
            leftIcon="create-outline"
          />

          <Text style={styles.sectionLabel}>Groups</Text>
          {groups.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>Join a group to check in.</Text>
            </Card>
          ) : (
            groups.map((group) => (
              <GroupCheckRow
                key={group.id}
                group={group}
                membership={membershipByGroupId[group.id]}
                selected={selectedGroupIds.includes(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))
          )}

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Post to Public Feed</Text>
              <Text style={styles.toggleHint}>
                Share this session on the global activity feed
              </Text>
            </View>
            <Switch
              value={postToFeed}
              onValueChange={setPostToFeed}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Submit Check-In"
            icon="checkmark-circle"
            loading={submitting}
            onPress={handleSubmit}
            style={styles.submit}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function GroupCheckRow({
  group,
  membership,
  selected,
  onToggle,
}: {
  group: Group;
  membership?: GroupMember;
  selected: boolean;
  onToggle: () => void;
}) {
  const status: MemberCycleStatus = membership?.cycle_status ?? 'pending';
  const frequency = Math.max(1, group.checkin_frequency);
  const done = membership?.checkins_this_cycle ?? 0;
  const progress = Math.min(1, done / frequency);

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.groupRow, selected && styles.groupRowSelected]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <Ionicons
        name={selected ? 'checkbox' : 'square-outline'}
        size={22}
        color={selected ? colors.primary : colors.textMuted}
      />
      <View style={styles.groupMeta}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupProgress}>
          {done}/{frequency} this cycle
          {group.require_photo ? ' · photo required' : ''}
        </Text>
        <View style={styles.groupProgressTrack}>
          <View
            style={[
              styles.groupProgressFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
      </View>
      <Badge status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  photoBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    height: 160,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  clearPhoto: {
    alignSelf: 'flex-start',
  },
  clearPhotoText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  chipLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  groupRowSelected: {
    borderColor: colors.primary,
  },
  groupMeta: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  groupProgress: {
    color: colors.textMuted,
    fontSize: 12,
  },
  groupProgressTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  groupProgressFill: {
    height: 3,
    backgroundColor: colors.primary,
  },
  toggleRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  toggleHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  submit: {
    marginTop: 8,
  },
});

export default CheckInModal;
