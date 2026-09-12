import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '../common';
import { colors } from '../../constants/theme';
import { useData } from '../../context/DataContext';

type KickVoteModalProps = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  targetUserId: string;
  targetName?: string;
  onVoted?: () => void;
};

export function KickVoteModal({
  visible,
  onClose,
  groupId,
  targetUserId,
  targetName,
  onVoted,
}: KickVoteModalProps) {
  const { submitKickVote } = useData();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSubmitting(false);
    setError(null);
    setResultMessage(null);
  }, [visible, groupId, targetUserId]);

  async function handleVote() {
    setSubmitting(true);
    setError(null);
    setResultMessage(null);

    const { data, error: voteError } = await submitKickVote(groupId, targetUserId);
    setSubmitting(false);

    if (voteError) {
      setError(voteError.message);
      return;
    }
    if (!data || data.ok === false) {
      setError(data?.error ?? 'Vote failed.');
      return;
    }

    if (data.kicked) {
      setResultMessage(
        `${targetName?.trim() || 'Member'} was removed from the group.`,
      );
    } else {
      const votes = data.votes ?? 0;
      const needed = data.needed;
      setResultMessage(
        needed != null
          ? `Vote recorded. ${votes}/${needed} votes needed to remove.`
          : `Vote recorded. Current votes: ${votes}.`,
      );
    }

    onVoted?.();
  }

  const displayName = targetName?.trim() || 'this member';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Card elevated style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Vote to Kick</Text>
              <Text style={styles.subtitle}>
                Cast a kick vote for {displayName}. Majority removes them.
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {resultMessage ? <Text style={styles.success}>{resultMessage}</Text> : null}

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="outline"
              onPress={onClose}
              disabled={submitting}
              style={styles.actionButton}
            />
            <Button
              label="Confirm Vote"
              variant="destructive"
              icon="hand-left-outline"
              loading={submitting}
              onPress={handleVote}
              disabled={Boolean(resultMessage)}
              style={styles.actionButton}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  success: {
    color: colors.safe,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});

export default KickVoteModal;
