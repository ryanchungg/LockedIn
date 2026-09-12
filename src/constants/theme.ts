export const colors = {
  background: '#0A0A0F',
  surface: '#12121A',
  surfaceElevated: '#1C1C28',
  border: '#27273A',
  primary: '#6366F1',
  safe: '#10B981',
  pending: '#64748B',
  danger: '#EF4444',
  warning: '#F59E0B',
  textPrimary: '#F8FAFC',
  textMuted: '#94A3B8',
} as const;

export const statusLabels = {
  safe: 'Safe',
  pending: 'Pending',
  fell_off: 'Fell Off',
} as const;

export const theme = {
  colors,
  statusLabels,
} as const;

export default theme;
