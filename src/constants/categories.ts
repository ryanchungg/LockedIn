export type CategoryKind = 'grind' | 'sport';

export interface CategoryConfig {
  id: string;
  label: string;
  kind: CategoryKind;
  /** Ionicons glyph name from @expo/vector-icons */
  icon: string;
  unit: string;
}

export const GRINDS: CategoryConfig[] = [
  { id: 'leetcode', label: 'LeetCode', kind: 'grind', icon: 'code-slash', unit: 'problems' },
  { id: 'study', label: 'Study', kind: 'grind', icon: 'book', unit: 'minutes' },
  { id: 'coding', label: 'Coding', kind: 'grind', icon: 'laptop', unit: 'minutes' },
  { id: 'reading', label: 'Reading', kind: 'grind', icon: 'library', unit: 'pages' },
  { id: 'music', label: 'Music', kind: 'grind', icon: 'musical-notes', unit: 'minutes' },
];

export const SPORTS: CategoryConfig[] = [
  { id: 'running', label: 'Running', kind: 'sport', icon: 'walk', unit: 'miles' },
  { id: 'cycling', label: 'Cycling', kind: 'sport', icon: 'bicycle', unit: 'miles' },
  { id: 'swimming', label: 'Swimming', kind: 'sport', icon: 'water', unit: 'laps' },
  { id: 'basketball', label: 'Basketball', kind: 'sport', icon: 'basketball', unit: 'minutes' },
  { id: 'soccer', label: 'Soccer', kind: 'sport', icon: 'football', unit: 'minutes' },
  { id: 'tennis', label: 'Tennis', kind: 'sport', icon: 'tennisball', unit: 'minutes' },
  { id: 'weightlifting', label: 'Weightlifting', kind: 'sport', icon: 'barbell', unit: 'sets' },
  { id: 'hiking', label: 'Hiking', kind: 'sport', icon: 'trail-sign', unit: 'miles' },
  { id: 'yoga', label: 'Yoga', kind: 'sport', icon: 'body', unit: 'minutes' },
  { id: 'boxing', label: 'Boxing', kind: 'sport', icon: 'fitness', unit: 'rounds' },
  { id: 'volleyball', label: 'Volleyball', kind: 'sport', icon: 'baseball', unit: 'minutes' },
  { id: 'golf', label: 'Golf', kind: 'sport', icon: 'golf', unit: 'holes' },
];

export const CATEGORIES: CategoryConfig[] = [...GRINDS, ...SPORTS];

export function getCategoryById(id: string): CategoryConfig | undefined {
  return CATEGORIES.find((category) => category.id === id);
}
