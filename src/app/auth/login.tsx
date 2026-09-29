import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';

import { AuthField, AuthHeader, Divider, FormMessage, isEmail, NotConfigured, PrimaryAction, SocialButtons } from '@/components/auth-ui';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { needsAttention } from '@/domain/expiry';
import { cloudConfigured } from '@/lib/supabase';
import { signIn, signInWithProvider } from '@/store/account';
import { useActiveItems } from '@/store/pantry';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

export default function LoginScreen() {
  const shadow = useShadow();
  const items = useActiveItems();
  const attention = items.filter((item) => needsAttention(item)).length;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const passwordInput = useRef<RNTextInput>(null);

  const submit = async () => {
    if (!isEmail(email)) return setError('Enter the email address you signed up with.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError(undefined);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.replace('/household');
  };

  const social = async (provider: 'apple' | 'google') => {
    setError(undefined);
    const result = await signInWithProvider(provider);
    if (result?.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-surface">
      <AuthHeader />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-5 pb-10 gap-space-lg">
        <View className="items-center gap-2">
          <View className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-fixed dark:bg-[#1C382B]">
            <Icon name="eco" className="text-[16px] text-primary" />
            <Text className="font-label-md text-label-md text-on-primary-fixed dark:text-primary uppercase tracking-wider">Welcome back</Text>
          </View>
          <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface text-center">Log In to Expiry Radar</Text>
          <Text className="font-body-lg text-body-lg text-on-surface-variant text-center">Pick up where you left off. Keep your pantry fresh and waste-free.</Text>
        </View>

        {items.length > 0 && (
          <View className="flex-row items-start gap-3 p-4 rounded-2xl bg-secondary-fixed/50 dark:bg-[#3B2312] dark:border dark:border-[#5D361B]" style={shadow('sm')}>
            <View className="w-10 h-10 rounded-full bg-secondary-container items-center justify-center">
              <Icon name="lightbulb" className="text-[20px] text-on-secondary-container" />
            </View>
            <View className="flex-1">
              <Text className="font-label-lg text-label-lg text-secondary">Pantry Status</Text>
              <Text className="font-body-md text-body-md text-on-surface">
                {items.length} items tracked on this device{attention ? `, ${attention} need attention this week` : ''}. They stay put when you log in.
              </Text>
            </View>
          </View>
        )}

        {!cloudConfigured && <NotConfigured />}
        {error && <FormMessage tone="error">{error}</FormMessage>}

        <AuthField
          label="Email Address"
          icon="mail"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordInput.current?.focus()}
        />
        <AuthField
          ref={passwordInput}
          label="Password"
          icon="lock"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          right={
            <Pressable onPress={() => router.push({ pathname: '/auth/forgot', params: { email } })}>
              <Text className="font-label-md text-label-md text-primary">Forgot password?</Text>
            </Pressable>
          }
        />

        <PrimaryAction label="Log In" onPress={submit} busy={busy} disabled={!cloudConfigured} />

        <Divider label="or continue with" />
        <SocialButtons onPress={social} disabled={!cloudConfigured} />

        <View className="flex-row justify-center gap-1.5 pt-2">
          <Text className="font-body-lg text-body-lg text-on-surface-variant">Don&apos;t have an account?</Text>
          <Pressable onPress={() => router.replace('/auth/signup')}>
            <Text className="font-label-lg text-[16px] text-primary">Sign up</Text>
          </Pressable>
        </View>
        <View className={`flex-row items-center gap-2 p-3 rounded-xl ${tone.insetLow}`}>
          <Icon name="cloud_off" className="text-[18px] text-on-surface-variant" />
          <Text className="font-body-sm text-body-sm text-on-surface-variant flex-1">
            An account is optional. It lets you share a pantry with your household and read receipts.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
