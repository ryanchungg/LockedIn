import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../api/groups';
import { Badge, Button, Card } from '../common';
import { colors } from '../../constants/theme';
import type { MemberCycleStatus } from '../../types';
import { KickVoteModal } from './KickVoteModal';

type MemberListProps = {
  members: GroupMemberWithProfile[];
  groupId: string;
  currentUserId?: string | null;
  onMembersChanged?: () => void;
};

type SectionConfig = {
  status: MemberCycleStatus;
  title: string;
  empty: string;
};

const SECTIONS: SectionConfig[] = [
  {
    status: 'safe',
    title: 'LOCKED IN',
    empty: 'No one is locked in yet this cycle.',
  },
  {
    status: 'pending',
    title: 'ON THE LINE',
    empty: 'Nobody is on the line.',
  },
  {
    status: 'fell_off',
    title: 'FELL OFF',
    empty: 'No one has fallen off.',
  },
];

export function MemberList({
  members,
  groupId,
  currentUserId,
  onMembersChanged,
}: MemberListProps) {
  const [kickTarget, setKickTarget] = useState<GroupMemberWithProfile | null>(
    null,
  );

  const byStatus = useMemo(() => {
    const buckets: Record<MemberCycleStatus, GroupMemberWithProfile[]> = {
      safe: [],
      pending: [],
      fell_off: [],
    };
    for (const member of members) {
      buckets[member.cycle_status]?.push(member);
    }
    return buckets;
  }, [members]);

  return (
    <View style={styles.root}>
      {SECTIONS.map((section) => {
        const rows = byStatus[section.status];
        return (
          <View key={section.status} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Badge status={section.status} label={section.title} />
              <Text style={styles.count}>{rows.length}</Text>
            </View>

            {rows.length === 0 ? (
              <Card>
                <Text style={styles.empty}>{section.empty}</Text>
              </Card>
            ) : (
              rows.map((member) => {
                const name =
                  member.profile?.name?.trim() ||
                  member.profile?.handle ||
                  'Member';
                const handle = member.profile?.handle
                  ? `@${member.profile.handle.replace(/^@/, '')}`
                  : null;
                const initials = member.profile?.avatar_initials || 'XX';
                const isSelf = currentUserId != null && member.user_id === currentUserId;
                const showKick =
                  section.status === 'fell_off' && !isSelf;

                return (
                  <Card key={`${member.group_id}:${member.user_id}`} style={styles.row}>
                    <View style={styles.rowMain}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                      </View>
                      <View style={styles.meta}>
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.subline}>
                          {handle ? `${handle} · ` : ''}
                          {member.role}
                          {member.strikes > 0 ? ` · strike ${member.strikes}` : ''}
                        </Text>
                        <Text style={styles.subline}>
                          {member.checkins_this_cycle} check-ins this cycle
                        </Text>
                      </View>
                    </View>

                    {showKick ? (
                      <Button
                        label="Vote Kick"
                        variant="destructive"
                        icon="hand-left-outline"
                        onPress={() => setKickTarget(member)}
                        style={styles.kickButton}
                      />
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>
        );
      })}

      {kickTarget ? (
        <KickVoteModal
          visible
          groupId={groupId}
          targetUserId={kickTarget.user_id}
          targetName={
            kickTarget.profile?.name?.trim() ||
            kickTarget.profile?.handle ||
            'Member'
          }
          onClose={() => setKickTarget(null)}
          onVoted={() => {
            onMembersChanged?.();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  count: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    gap: 12,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  subline: {
    color: colors.textMuted,
    fontSize: 12,
  },
  kickButton: {
    minHeight: 42,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

export default MemberList;
