import type { IconName } from '@/components/ui/icon';
import type { DietId } from '@/store/settings';

/** Household quiz / Pantry Settings options. */
export const SIZES: { value: number; label: string; detail: string; icon: IconName }[] = [
  { value: 1, label: 'Solo', detail: '1 person', icon: 'person' },
  { value: 2, label: 'Couple', detail: '2 people', icon: 'group' },
  { value: 4, label: 'Family', detail: '3–4 people', icon: 'groups' },
  { value: 6, label: 'Large Family', detail: '5+ people', icon: 'diversity_3' },
];

export const DIETS: { value: DietId | 'none'; label: string; icon: IconName }[] = [
  { value: 'vegetarian', label: 'Vegetarian', icon: 'eco' },
  { value: 'vegan', label: 'Vegan', icon: 'psychiatry' },
  { value: 'gluten-free', label: 'Gluten-Free', icon: 'grain' },
  { value: 'dairy-free', label: 'Dairy-Free', icon: 'water_drop' },
  { value: 'pescatarian', label: 'Pescatarian', icon: 'set_meal' },
  { value: 'nut-free', label: 'Nut-Free', icon: 'spa' },
  { value: 'none', label: 'No Restrictions', icon: 'check_circle' },
];
