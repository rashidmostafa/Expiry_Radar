import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AuthField, AuthHeader, FormMessage, passwordStrength, PrimaryAction } from '@/components/auth-ui';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { completeAuthRedirect, updatePassword, useAccount } from '@/store/account';
import { useTheme } from '@/theme/theme-provider';

/** Opened from the password-reset email: signs in with the link's code, then sets a new password. */
export default function ResetPasswordScreen() {
  const url = Linking.useLinkingURL();
  const { user } = useAccount();
  const { colors } = useTheme();
  const [linkError, setLinkError] = useState<string | undefined>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!url || user) return;
    completeAuthRedirect(url).then((result) => result.error && setLinkError(result.error));
  }, [url, user]);

  const submit = async () => {
    if (passwordStrength(password) < 2) return setError('Use at least 8 characters with a mix of letters, numbers or symbols.');
    if (password !== confirm) return setError('The two passwords don’t match.');
    setBusy(true);
    setError(undefined);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.replace('/household');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-surface">
      <AuthHeader />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-6 pb-10 gap-space-lg">
        <View className="items-center gap-2">
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center">
            <Icon name="lock_reset" className="text-[38px] text-on-primary" />
          </View>
          <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">Choose a new password</Text>
          <Text className="font-body-lg text-body-lg text-on-surface-variant text-center">{user?.email ? `For ${user.email}` : 'Securing your account…'}</Text>
        </View>

        {linkError ? (
          <>
            <FormMessage tone="error">{linkError}</FormMessage>
            <PrimaryAction label="Request a New Link" onPress={() => router.replace('/auth/forgot')} />
          </>
        ) : !user ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            {error && <FormMessage tone="error">{error}</FormMessage>}
            <AuthField label="New Password" icon="lock" secure value={password} onChangeText={setPassword} autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" />
            <AuthField label="Confirm Password" icon="lock" secure value={confirm} onChangeText={setConfirm} autoComplete="new-password" textContentType="newPassword" placeholder="Type it again" returnKeyType="done" onSubmitEditing={submit} />
            <PrimaryAction label="Save New Password" icon="check" onPress={submit} busy={busy} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
