import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { AuthField, AuthHeader, FormMessage, isEmail, NotConfigured, PrimaryAction } from '@/components/auth-ui';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cloudConfigured } from '@/lib/supabase';
import { sendPasswordReset } from '@/store/account';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

export default function ForgotPasswordScreen() {
  const shadow = useShadow();
  const { colors, scheme } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!isEmail(email)) return setError('Enter the email address on your account.');
    setBusy(true);
    setError(undefined);
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.replace({ pathname: '/auth/check-email', params: { email, kind: 'reset' } });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-surface">
      <AuthHeader />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-4 pb-10 gap-space-lg">
        <View className={`rounded-3xl overflow-hidden ${tone.card}`} style={shadow('card')}>
          <LinearGradient
            colors={scheme === 'dark' ? [colors['surface-container'], colors['surface-container']] : [`${colors['primary-fixed']}55`, colors['surface-container-lowest'], `${colors['secondary-fixed']}66`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24, alignItems: 'center', gap: 12 }}>
            <View className="w-28 h-28 rounded-full bg-primary/10 items-center justify-center">
              <View className="w-20 h-20 rounded-full bg-primary items-center justify-center">
                <Icon name="mark_email_read" className="text-[38px] text-on-primary" />
              </View>
              <View className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-secondary-container items-center justify-center">
                <Icon name="lock_reset" className="text-[20px] text-on-secondary-container" />
              </View>
            </View>
            <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed/70 dark:bg-[#1C382B]">
              <Icon name="shield" className="text-[16px] text-primary" />
              <Text className="font-label-md text-label-md text-on-primary-fixed dark:text-primary">Safe & Encrypted Recovery</Text>
            </View>
            <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface text-center">Forgot your password?</Text>
            <Text className="font-body-lg text-body-lg text-on-surface-variant text-center">No worries at all! Enter your account email and we’ll send a secure reset link.</Text>
          </LinearGradient>
        </View>

        {!cloudConfigured && <NotConfigured />}
        {error && <FormMessage tone="error">{error}</FormMessage>}

        <AuthField
          label="Registered Email Address"
          icon="mail"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={submit}
          right={<Text className="font-label-sm text-label-sm text-on-surface-variant">Personal or pantry shared</Text>}
        />
        <PrimaryAction label="Send Reset Link" icon="send" onPress={submit} busy={busy} disabled={!cloudConfigured} />

        <View className={`flex-row items-start gap-3 p-4 rounded-2xl ${tone.inset}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center ${tone.amberTile}`}>
            <Icon name="schedule" className="text-[20px] text-secondary" />
          </View>
          <View className="flex-1">
            <Text className="font-label-lg text-label-lg text-on-surface">Quick Pantry Tip</Text>
            <Text className="font-body-md text-body-md text-on-surface-variant">Links usually arrive within 2 minutes. Check your Promotions or Spam folder if it takes a moment.</Text>
          </View>
        </View>

        <Pressable onPress={() => router.replace('/auth/login')} className="self-center flex-row items-center gap-2 px-5 py-3 rounded-full bg-surface-container-high dark:bg-surface-container">
          <Icon name="arrow_back" className="text-[20px] text-on-surface" />
          <Text className="font-label-lg text-label-lg text-on-surface">Remembered password? Back to Log In</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
