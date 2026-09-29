import type { ImageSource } from 'expo-image';

/** Photos bundled from the Stitch exports, addressed by key from items and recipes. */
const bundled: Record<string, ImageSource> = {
  spinach: require('@/assets/images/food/spinach.jpg'),
  'spinach-hero': require('@/assets/images/food/spinach-hero.jpg'),
  strawberries: require('@/assets/images/food/strawberries.jpg'),
  'greek-yogurt': require('@/assets/images/food/greek-yogurt.jpg'),
  avocados: require('@/assets/images/food/avocados.jpg'),
  'almond-milk': require('@/assets/images/food/almond-milk.jpg'),
  'chicken-breast': require('@/assets/images/food/chicken-breast.jpg'),
  eggs: require('@/assets/images/food/eggs.jpg'),
  'whole-milk': require('@/assets/images/food/whole-milk.jpg'),
  sourdough: require('@/assets/images/food/sourdough.jpg'),
  frittata: require('@/assets/images/recipes/frittata.jpg'),
  'frittata-hero': require('@/assets/images/recipes/frittata-hero.jpg'),
  'green-smoothie': require('@/assets/images/recipes/green-smoothie.jpg'),
  'yogurt-parfait': require('@/assets/images/recipes/yogurt-parfait.jpg'),
  guacamole: require('@/assets/images/recipes/guacamole.jpg'),
  'squash-apple': require('@/assets/images/recipes/squash-apple.jpg'),
  'french-toast-bake': require('@/assets/images/recipes/french-toast-bake.jpg'),
  'garlic-spinach': require('@/assets/images/recipes/garlic-spinach.jpg'),
  receipt: require('@/assets/images/misc/receipt.jpg'),
  avatar: require('@/assets/images/misc/avatar-demo.jpg'),
};

/** Resolves a bundled key or passes a file/http URI through. */
export function imageSource(key: string | undefined): ImageSource | undefined {
  if (!key) return undefined;
  if (bundled[key]) return bundled[key];
  if (/^(file|https?|content|data|blob):/.test(key)) return { uri: key };
  return undefined;
}
