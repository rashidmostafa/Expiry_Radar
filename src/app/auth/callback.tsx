import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AuthHeader, FormMessage, PrimaryAction } from '@/components/auth-ui';
import { Text } from '@/components/ui/text';
import { completeAuthRedirect } from '@/store/account';
import { useTheme } from '@/theme/theme-provider';

/** Landing route for email-confirmation and OAuth links: exchanges the code for a session. */
export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL();
  const { colors } = useTheme();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    completeAuthRedirect(url).then((result) => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      else router.replace('/household');
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <View className="flex-1 bg-surface">
      <AuthHeader />
      <View className="flex-1 items-center justify-center px-margin gap-4 w-full max-w-[480px] self-center">
        {error ? (
          <>
            <FormMessage tone="error">{error}</FormMessage>
            <View className="self-stretch">
              <PrimaryAction label="Back to Log In" onPress={() => router.replace('/auth/login')} />
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text className="font-body-lg text-body-lg text-on-surface-variant">Signing you in…</Text>
          </>
        )}
      </View>
    </View>
  );
}
