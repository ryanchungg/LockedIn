import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../constants/theme';

type ProgressBarProps = {
  /** Progress from 0–1, or pass `value`/`max` instead. */
  progress?: number;
  value?: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({
  progress,
  value,
  max = 100,
  label,
  showPercent = false,
  color = colors.primary,
  trackColor = colors.border,
  height = 4,
  style,
}: ProgressBarProps) {
  const ratio = useMemo(() => {
    if (typeof progress === 'number') {
      return Math.min(1, Math.max(0, progress));
    }
    if (typeof value === 'number' && max > 0) {
      return Math.min(1, Math.max(0, value / max));
    }
    return 0;
  }, [progress, value, max]);

  const percent = Math.round(ratio * 100);

  return (
    <View style={[styles.wrap, style]}>
      {label || showPercent ? (
        <View style={styles.meta}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {showPercent ? <Text style={styles.percent}>{percent}%</Text> : null}
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: trackColor, height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: color,
              height,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  percent: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 0,
  },
});

export default ProgressBar;
