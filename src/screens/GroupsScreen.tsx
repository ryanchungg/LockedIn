import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  createGroup,
  fetchDiscoverableGroups,
  joinGroup,
} from '../api/groups';
import { Badge, Button, Card, Input } from '../components/common';
import { GRINDS, SPORTS } from '../constants/categories';
import { colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import type {
  Group,
  GroupAccess,
  GroupConsequence,
  GroupDiscovery,
} from '../types';

type TabKey = 'global' | 'local' | 'mine';

type GroupsScreenProps = {
  onOpenGroup?: (groupId: string) => void;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'local', label: 'Local' },
  { key: 'mine', label: 'My Groups' },
];

const CONSEQUENCE_OPTIONS: {
  value: GroupConsequence;
  label: string;
  hint: string;
}[] = [
  {
    value: 'auto_kick',
    label: 'Auto-Kick',
    hint: 'Miss the cycle and you are removed immediately',
  },
  {
    value: 'three_strikes',
    label: '3-Strikes',
    hint: 'Three missed cycles before removal',
  },
  {
    value: 'social_shame',
    label: 'Wall of Shame',
    hint: 'Fell-off status is visible to the group',
  },
];

const FREQUENCY_MIN = 1;
const FREQUENCY_MAX = 7;

function consequenceLabel(value: GroupConsequence): string {
  return CONSEQUENCE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function FrequencySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const steps = FREQUENCY_MAX - FREQUENCY_MIN + 1;
  const fillRatio = (value - FREQUENCY_MIN) / (FREQUENCY_MAX - FREQUENCY_MIN);

  return (
    <View style={styles.sliderWrap}>
      <View style={styles.sliderHeader}>
        <Text style={styles.fieldLabel}>Check-in Frequency</Text>
        <Text style={styles.sliderValue}>{value}/week</Text>
      </View>
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${fillRatio * 100}%` }]} />
        <View style={styles.sliderSteps}>
          {Array.from({ length: steps }, (_, index) => {
            const step = FREQUENCY_MIN + index;
            const active = step <= value;
            return (
              <Pressable
                key={step}
                accessibilityRole="button"
                accessibilityLabel={`${step} times per week`}
                onPress={() => onChange(step)}
                style={styles.sliderStepHit}
              >
                <View
                  style={[
                    styles.sliderThumb,
                    active ? styles.sliderThumbActive : null,
                    step === value ? styles.sliderThumbCurrent : null,
                  ]}
                />
                <Text
                  style={[
                    styles.sliderStepLabel,
                    step === value ? styles.sliderStepLabelActive : null,
                  ]}
                >
                  {step}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function GroupCard({
  group,
  isMember,
  joining,
  onOpen,
  onJoin,
}: {
  group: Group;
  isMember: boolean;
  joining: boolean;
  onOpen?: () => void;
  onJoin?: () => void;
}) {
  const location = [group.city, group.region].filter(Boolean).join(', ');

  return (
    <Card style={styles.groupCard}>
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
      >
        <View style={styles.groupCardHeader}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Badge
            label={group.discovery}
            tone={group.discovery === 'local' ? 'warning' : 'primary'}
            icon={group.discovery === 'local' ? 'location-outline' : 'globe-outline'}
          />
        </View>
        {group.description ? (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Badge
            label={`${group.member_count} members`}
            tone="muted"
            icon="people-outline"
          />
          <Badge
            label={`${group.checkin_frequency}x / week`}
            tone="muted"
            icon="repeat-outline"
          />
          {group.require_photo ? (
            <Badge label="Photo" tone="muted" icon="camera-outline" />
          ) : null}
          <Badge
            label={consequenceLabel(group.consequence)}
            tone="muted"
            icon="flash-outline"
          />
        </View>
        {location ? (
          <View style={styles.locationRow}>
            <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        ) : null}
      </Pressable>

      {isMember ? (
        <Button
          label="Open"
          variant="outline"
          icon="enter-outline"
          onPress={onOpen}
          disabled={!onOpen}
          style={styles.cardAction}
        />
      ) : (
        <Button
          label={group.access === 'private' ? 'Join with password' : 'Join'}
          icon="person-add-outline"
          loading={joining}
          onPress={onJoin}
          style={styles.cardAction}
        />
      )}
    </Card>
  );
}

export function GroupsScreen({ onOpenGroup }: GroupsScreenProps) {
  const { profile } = useAuth();
  const { groups: myGroups, loading, refreshing, error, refreshAll, refreshGroups } =
    useData();

  const [tab, setTab] = useState<TabKey>('global');
  const [discoverable, setDiscoverable] = useState<Group[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<GroupAccess>('public');
  const [discovery, setDiscovery] = useState<GroupDiscovery>('global');
  const [consequence, setConsequence] = useState<GroupConsequence>('three_strikes');
  const [consequenceOpen, setConsequenceOpen] = useState(false);
  const [checkinFrequency, setCheckinFrequency] = useState(3);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinPasswordOpen, setJoinPasswordOpen] = useState(false);
  const [joinTarget, setJoinTarget] = useState<Group | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const myGroupIds = useMemo(() => new Set(myGroups.map((group) => group.id)), [myGroups]);

  const loadDiscoverable = useCallback(async () => {
    setDiscoverError(null);
    setDiscoverLoading(true);
    try {
      const { data, error: fetchError } = await fetchDiscoverableGroups();
      if (fetchError) {
        setDiscoverError(fetchError.message);
        return;
      }
      setDiscoverable(data ?? []);
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiscoverable();
  }, [loadDiscoverable]);

  const visibleGroups = useMemo(() => {
    if (tab === 'mine') return myGroups;
    if (tab === 'global') {
      return discoverable.filter((group) => group.discovery === 'global');
    }

    const locals = discoverable.filter((group) => group.discovery === 'local');
    if (!profile?.city) return locals;
    const city = profile.city.trim().toLowerCase();
    const nearby = locals.filter(
      (group) => (group.city ?? '').trim().toLowerCase() === city,
    );
    return nearby.length > 0 ? nearby : locals;
  }, [tab, myGroups, discoverable, profile?.city]);

  const emptyCopy = useMemo(() => {
    if (tab === 'mine') {
      return {
        title: 'No groups yet',
        body: 'Create a group or join one from Global or Local.',
      };
    }
    if (tab === 'local') {
      return {
        title: 'No local groups',
        body: profile?.city
          ? `Nothing near ${profile.city} yet. Create one for your area.`
          : 'No local groups yet. Create one to claim your city.',
      };
    }
    return {
      title: 'No global groups',
      body: 'Be the first to start a public accountability group.',
    };
  }, [tab, profile?.city]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshAll(), loadDiscoverable()]);
  }, [refreshAll, loadDiscoverable]);

  function resetCreateForm(preferredDiscovery: GroupDiscovery = 'global') {
    setName('');
    setDescription('');
    setAccess('public');
    setDiscovery(preferredDiscovery === 'hidden' ? 'global' : preferredDiscovery);
    setConsequence('three_strikes');
    setConsequenceOpen(false);
    setCheckinFrequency(3);
    setRequirePhoto(false);
    setPassword('');
    setSelectedInterests([]);
    setSelectedSports([]);
    setCreateError(null);
  }

  function openCreateModal() {
    const preferred: GroupDiscovery = tab === 'local' ? 'local' : 'global';
    resetCreateForm(preferred);
    setCreateOpen(true);
  }

  function toggleInterest(id: string) {
    setSelectedInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSport(id: string) {
    setSelectedSports((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCreateError('Name is required.');
      return;
    }
    if (selectedInterests.length === 0 && selectedSports.length === 0) {
      setCreateError('Pick at least one interest or sport.');
      return;
    }
    if (access === 'private' && password.trim().length < 4) {
      setCreateError('Private groups need a password of at least 4 characters.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    const locationFields =
      discovery === 'local'
        ? {
            city: profile?.city ?? null,
            region: profile?.region ?? null,
            country: profile?.country ?? null,
            latitude: profile?.latitude ?? null,
            longitude: profile?.longitude ?? null,
          }
        : {
            city: null,
            region: null,
            country: null,
            latitude: null,
            longitude: null,
          };

    const { data, error: createErr } = await createGroup({
      name: trimmedName,
      description: description.trim(),
      interests: selectedInterests,
      sport_types: selectedSports,
      access,
      discovery,
      consequence,
      checkin_frequency: checkinFrequency,
      require_photo: requirePhoto,
      password: access === 'private' ? password.trim() : null,
      ...locationFields,
    });

    setCreating(false);

    if (createErr) {
      setCreateError(createErr.message);
      return;
    }

    setCreateOpen(false);
    await Promise.all([refreshGroups(), loadDiscoverable()]);
    if (data) {
      setTab('mine');
      onOpenGroup?.(data);
    }
  }

  async function performJoin(group: Group, passwordValue?: string) {
    setJoiningId(group.id);
    setJoinError(null);

    const { data, error: joinErr } = await joinGroup({
      group_id: group.id,
      password: passwordValue ?? null,
    });

    setJoiningId(null);

    if (joinErr) {
      setJoinError(joinErr.message);
      return false;
    }
    if (data && data.ok === false) {
      if (data.needs_password) {
        setJoinTarget(group);
        setJoinPassword('');
        setJoinPasswordOpen(true);
        setJoinError(data.error ?? 'Password required.');
        return false;
      }
      setJoinError(data.error ?? 'Could not join group.');
      return false;
    }

    setJoinPasswordOpen(false);
    setJoinTarget(null);
    setJoinPassword('');
    await Promise.all([refreshGroups(), loadDiscoverable()]);
    setTab('mine');
    onOpenGroup?.(group.id);
    return true;
  }

  async function handleJoinPress(group: Group) {
    if (group.access === 'private') {
      setJoinTarget(group);
      setJoinPassword('');
      setJoinError(null);
      setJoinPasswordOpen(true);
      return;
    }
    await performJoin(group);
  }

  const listLoading =
    tab === 'mine'
      ? loading && myGroups.length === 0
      : discoverLoading && visibleGroups.length === 0;

  const bannerError = tab === 'mine' ? error : discoverError;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>Groups</Text>
          <Text style={styles.subtitle}>Find a crew. Stay locked in.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={openCreateModal}
          style={styles.createButton}
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
          <Text style={styles.createLabel}>Create</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[styles.tab, active && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {bannerError ? (
        <Pressable
          onPress={() => {
            if (tab === 'mine') void refreshGroups();
            else void loadDiscoverable();
          }}
          style={styles.errorBanner}
        >
          <Text style={styles.errorText}>{bannerError}</Text>
          <Text style={styles.errorRetry}>Tap to retry</Text>
        </Pressable>
      ) : null}

      {listLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visibleGroups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (discoverLoading && !listLoading)}
              onRefresh={() => void onRefresh()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Ionicons name="people-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
              <Text style={styles.emptyBody}>{emptyCopy.body}</Text>
              <Button
                label="Create Group"
                icon="add-circle-outline"
                onPress={openCreateModal}
                style={styles.emptyAction}
              />
            </Card>
          }
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              isMember={myGroupIds.has(item.id)}
              joining={joiningId === item.id}
              onOpen={
                onOpenGroup && myGroupIds.has(item.id)
                  ? () => onOpenGroup(item.id)
                  : undefined
              }
              onJoin={() => void handleJoinPress(item)}
            />
          )}
        />
      )}

      <Modal
        visible={createOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <Pressable
              onPress={() => setCreateOpen(false)}
              hitSlop={12}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Dawn Runners"
              leftIcon="flag-outline"
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="What are you locking in for?"
              multiline
              style={styles.notesInput}
              leftIcon="create-outline"
            />

            <Text style={styles.sectionLabel}>Discovery</Text>
            <View style={styles.chipRow}>
              {(['global', 'local'] as GroupDiscovery[]).map((option) => {
                const active = discovery === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setDiscovery(option)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name={option === 'local' ? 'location-outline' : 'globe-outline'}
                      size={14}
                      color={active ? colors.textPrimary : colors.textMuted}
                    />
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {option === 'local' ? 'Local' : 'Global'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Access</Text>
            <View style={styles.chipRow}>
              {(['public', 'private'] as GroupAccess[]).map((option) => {
                const active = access === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setAccess(option)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name={option === 'private' ? 'lock-closed-outline' : 'lock-open-outline'}
                      size={14}
                      color={active ? colors.textPrimary : colors.textMuted}
                    />
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {option === 'private' ? 'Private' : 'Public'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {access === 'private' ? (
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 4 characters"
                secureTextEntry
                leftIcon="key-outline"
              />
            ) : null}

            <FrequencySlider value={checkinFrequency} onChange={setCheckinFrequency} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Proof Photo</Text>
                <Text style={styles.toggleHint}>
                  Require a photo on every check-in
                </Text>
              </View>
              <Switch
                value={requirePhoto}
                onValueChange={setRequirePhoto}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textPrimary}
              />
            </View>

            <Text style={styles.sectionLabel}>Consequence</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => setConsequenceOpen((open) => !open)}
              accessibilityRole="button"
            >
              <View style={styles.dropdownValue}>
                <Ionicons name="flash-outline" size={16} color={colors.primary} />
                <Text style={styles.dropdownLabel}>{consequenceLabel(consequence)}</Text>
              </View>
              <Ionicons
                name={consequenceOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
            {consequenceOpen ? (
              <View style={styles.dropdownMenu}>
                {CONSEQUENCE_OPTIONS.map((option) => {
                  const active = consequence === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setConsequence(option.value);
                        setConsequenceOpen(false);
                      }}
                      style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemLabel,
                          active && styles.dropdownItemLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.dropdownItemHint}>{option.hint}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Interests</Text>
            <View style={styles.chipRow}>
              {GRINDS.map((category) => {
                const active = selectedInterests.includes(category.id);
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => toggleInterest(category.id)}
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

            <Text style={styles.sectionLabel}>Sports</Text>
            <View style={styles.chipRow}>
              {SPORTS.map((category) => {
                const active = selectedSports.includes(category.id);
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => toggleSport(category.id)}
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

            {createError ? <Text style={styles.formError}>{createError}</Text> : null}

            <Button
              label="Create Group"
              icon="checkmark-circle"
              loading={creating}
              onPress={() => void handleCreate()}
              style={styles.submit}
            />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={joinPasswordOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setJoinPasswordOpen(false)}
      >
        <View style={styles.joinOverlay}>
          <Card style={styles.joinCard} elevated>
            <Text style={styles.joinTitle}>Join {joinTarget?.name ?? 'Group'}</Text>
            <Text style={styles.joinHint}>This group is private. Enter the password.</Text>
            <Input
              label="Password"
              value={joinPassword}
              onChangeText={setJoinPassword}
              secureTextEntry
              leftIcon="key-outline"
            />
            {joinError ? <Text style={styles.formError}>{joinError}</Text> : null}
            <View style={styles.joinActions}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => {
                  setJoinPasswordOpen(false);
                  setJoinTarget(null);
                  setJoinError(null);
                }}
                style={styles.joinActionButton}
              />
              <Button
                label="Join"
                loading={joiningId != null}
                onPress={() => {
                  if (!joinTarget) return;
                  void performJoin(joinTarget, joinPassword.trim());
                }}
                style={styles.joinActionButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  groupCard: {
    gap: 12,
  },
  groupCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  groupName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  groupDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  locationText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cardAction: {
    marginTop: 4,
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
  emptyAction: {
    marginTop: 8,
    alignSelf: 'stretch',
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
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalContent: {
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
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
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
  sliderWrap: {
    gap: 10,
    marginTop: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sliderTrack: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: `${colors.primary}33`,
  },
  sliderSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sliderStepHit: {
    alignItems: 'center',
    gap: 4,
    minWidth: 28,
  },
  sliderThumb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  sliderThumbActive: {
    backgroundColor: colors.primary,
  },
  sliderThumbCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textPrimary,
  },
  sliderStepLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  sliderStepLabelActive: {
    color: colors.textPrimary,
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
  dropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.surfaceElevated,
  },
  dropdownItemLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownItemLabelActive: {
    color: colors.primary,
  },
  dropdownItemHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  formError: {
    color: colors.danger,
    fontSize: 13,
  },
  submit: {
    marginTop: 8,
  },
  joinOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  joinCard: {
    width: '100%',
    gap: 12,
  },
  joinTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  joinHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  joinActions: {
    flexDirection: 'row',
    gap: 10,
  },
  joinActionButton: {
    flex: 1,
  },
});

export default GroupsScreen;
