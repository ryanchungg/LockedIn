import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/theme';
import type { MemberCycleStatus } from '../../types';

export type BadgeTone = 'safe' | 'pending' | 'danger' | 'warning' | 'primary' | 'muted';

export type BadgeVariant =
  | 'locked_in'
  | 'on_the_line'
  | 'fell_off'
  | 'strike'
  | 'custom';

type BadgeProps = {
  label?: string;
  variant?: BadgeVariant;
  /** When variant is `strike`, show STRIKE n/max. */
  strikeCount?: number;
  strikeMax?: number;
  /** Map directly from a member cycle status. */
  status?: MemberCycleStatus;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

const TONE_COLORS: Record<BadgeTone, string> = {
  safe: colors.safe,
  pending: colors.pending,
  danger: colors.danger,
  warning: colors.warning,
  primary: colors.primary,
  muted: colors.textMuted,
};

function resolveFromStatus(status: MemberCycleStatus): {
  label: string;
  tone: BadgeTone;
  icon: keyof typeof Ionicons.glyphMap;
} {
  switch (status) {
    case 'safe':
      return { label: 'LOCKED IN', tone: 'safe', icon: 'lock-closed' };
    case 'pending':
      return { label: 'ON THE LINE', tone: 'pending', icon: 'time' };
    case 'fell_off':
      return { label: 'FELL OFF', tone: 'danger', icon: 'warning' };
    default:
      return { label: 'UNKNOWN', tone: 'muted', icon: 'ellipse' };
  }
}

function resolveVariant(
  variant: BadgeVariant,
  strikeCount: number,
  strikeMax: number,
): { label: string; tone: BadgeTone; icon: keyof typeof Ionicons.glyphMap } {
  switch (variant) {
    case 'locked_in':
      return { label: 'LOCKED IN', tone: 'safe', icon: 'lock-closed' };
    case 'on_the_line':
      return { label: 'ON THE LINE', tone: 'pending', icon: 'time' };
    case 'fell_off':
      return { label: 'FELL OFF', tone: 'danger', icon: 'warning' };
    case 'strike':
      return {
        label: `STRIKE ${strikeCount}/${strikeMax}`,
        tone: 'warning',
        icon: 'flash',
      };
    case 'custom':
    default:
      return { label: '', tone: 'muted', icon: 'ellipse' };
  }
}

export function Badge({
  label,
  variant = 'custom',
  strikeCount = 1,
  strikeMax = 3,
  status,
  tone,
  icon,
  style,
}: BadgeProps) {
  const resolved = useMemo(() => {
    if (status) return resolveFromStatus(status);
    return resolveVariant(variant, strikeCount, strikeMax);
  }, [status, variant, strikeCount, strikeMax]);

  const text = (label ?? resolved.label).toUpperCase();
  const accent = TONE_COLORS[tone ?? resolved.tone];
  const glyph = icon ?? resolved.icon;

  return (
    <View style={[styles.base, { borderColor: accent, backgroundColor: `${accent}1A` }, style]}>
      <Ionicons name={glyph} size={12} color={accent} />
      <Text style={[styles.label, { color: accent }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});

export default Badge;
