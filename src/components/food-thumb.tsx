import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { categories } from '@/domain/categories';
import { findFood } from '@/domain/foods';
import type { PantryItem } from '@/domain/types';

type Props = {
  item: Pick<PantryItem, 'image' | 'category' | 'name'>;
  size: number;
  /** Stitch uses rounded-xl (12px) tiles; hero images pass their own. */
  radius?: number;
  className?: string;
};

/** Item photo, falling back to the category emoji on a cream tile (DESIGN.md "Pantry Cards"). */
export function FoodThumb({ item, size, radius = 12, className = '' }: Props) {
  const source = imageSource(item.image);
  return (
    <View
      className={`items-center justify-center overflow-hidden bg-surface-container ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}>
      {source ? (
        <Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ fontSize: size * 0.45, lineHeight: size * 0.6 }}>{findFood(item.name)?.emoji ?? categories[item.category].emoji}</Text>
      )}
    </View>
  );
}
