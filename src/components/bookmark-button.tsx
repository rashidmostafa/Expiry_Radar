import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { toggleSavedRecipe, useSettings } from '@/store/settings';

export function BookmarkButton({
  recipeId,
  className = '',
  size = 'text-[18px]',
  color = 'text-on-surface-variant',
}: {
  recipeId: string;
  className?: string;
  size?: string;
  color?: string;
}) {
  const { savedRecipes } = useSettings();
  const saved = savedRecipes.includes(recipeId);
  return (
    <Pressable
      accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark recipe'}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={() => toggleSavedRecipe(recipeId)}
      className={`active:scale-90 ${className}`}>
      <Icon name="bookmark" filled={saved} className={`${size} ${saved ? 'text-primary' : color}`} />
    </Pressable>
  );
}
