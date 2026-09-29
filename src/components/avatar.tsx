import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { useSettings } from '@/store/settings';

/** Profile photo, or the user's initial on a soft green disc when there is none. */
export function Avatar({ size = 32, className = '', image }: { size?: number; className?: string; /** Preview an unsaved photo. */ image?: string }) {
  const { avatar, userName } = useSettings();
  const source = imageSource(image ?? avatar);
  if (source) {
    return (
      <Image
        source={source}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        accessibilityLabel="Profile"
      />
    );
  }
  return (
    <View
      className={`items-center justify-center rounded-full bg-primary-fixed ${className}`}
      style={{ width: size, height: size }}>
      <Text className="font-bold text-on-primary-fixed" style={{ fontSize: size * 0.42 }}>
        {(userName || 'You').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
