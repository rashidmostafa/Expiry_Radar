import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';

import { AuthField, AuthHeader, Divider, FormMessage, isEmail, NotConfigured, passwordStrength, PrimaryAction, SocialButtons } from '@/components/auth-ui';
import { Logo } from '@/components/logo';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cloudConfigured } from '@/lib/supabase';
import { signInWithProvider, signUp } from '@/store/account';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const STRENGTH = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export default function SignUpScreen() {
  const shadow = useShadow();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const emailInput = useRef<RNTextInput>(null);
  const passwordInput = useRef<RNTextInput>(null);
  const strength = passwordStrength(password);

  const submit = async () => {
    if (!name.trim()) return setError('Tell us your name so your household knows who you are.');
    if (!isEmail(email)) return setError('Enter a valid email address.');
    if (strength < 2) return setError('Use at least 8 characters with a mix of letters, numbers or symbols.');
    if (!agreed) return setError('Please accept the Terms of Service and Privacy Policy.');
    setBusy(true);
    setError(undefined);
    const result = await signUp({ name, email, password });
    setBusy(false);
    if (result.error) setError(result.error);
    else if (result.needsConfirmation) router.replace({ pathname: '/auth/check-email', params: { email, kind: 'confirm' } });
    else router.replace('/household');
  };

  const social = async (provider: 'apple' | 'google') => {
    setError(undefined);
    const result = await signInWithProvider(provider);
    if (result?.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-surface">
      <AuthHeader title="Create Account" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-5 pb-10 gap-space-lg">
        <View className="items-center gap-2">
          <View className="p-3 rounded-3xl bg-surface-container-lowest dark:bg-surface-container" style={shadow('card')}>
            <Logo size={56} />
            <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary items-center justify-center border-2 border-surface-container-lowest">
              <Icon name="eco" className="text-[14px] text-on-primary" />
            </View>
          </View>
          <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed/60 dark:bg-[#1C382B] mt-2">
            <View className="w-2 h-2 rounded-full bg-primary" />
            <Text className="font-label-md text-label-md text-on-primary-fixed dark:text-primary">Fresh & Mindful Kitchen</Text>
          </View>
          <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">Create Account</Text>
          <Text className="font-body-lg text-body-lg text-on-surface-variant text-center">Share one pantry with your household and scan receipts in seconds.</Text>
        </View>

        <View className={`flex-row items-center gap-3 p-4 rounded-2xl ${tone.card}`} style={shadow('sm')}>
          <View className={`w-12 h-12 rounded-xl items-center justify-center ${tone.amberTile}`}>
            <Icon name="savings" className="text-[24px] text-secondary" />
          </View>
          <View className="flex-1">
            <Text className="font-label-lg text-label-lg text-on-surface">Your pantry comes with you</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Everything on this device is kept and synced.</Text>
          </View>
          <Icon name="auto_awesome" className="text-[22px] text-outline-variant" />
        </View>

        {!cloudConfigured && <NotConfigured />}
        {error && <FormMessage tone="error">{error}</FormMessage>}

        <AuthField label="Full Name" icon="person" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" textContentType="name" autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => emailInput.current?.focus()} />
        <AuthField ref={emailInput} label="Email Address" icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} />
        <AuthField
          ref={passwordInput}
          label="Password"
          icon="lock"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          right={
            password.length > 0 ? (
              <View className="flex-row items-center gap-1">
                <Icon name={strength >= 3 ? 'check_circle' : 'info'} className={`text-[16px] ${strength >= 3 ? 'text-primary' : 'text-secondary'}`} />
                <Text className={`font-label-md text-label-md ${strength >= 3 ? 'text-primary' : 'text-secondary'}`}>{STRENGTH[strength]}</Text>
              </View>
            ) : undefined
          }
          hint={
            <View className="gap-1.5 pt-1">
              <View className="flex-row gap-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <View key={step} className={`flex-1 h-1.5 rounded-full ${strength >= step ? (strength >= 3 ? 'bg-primary' : 'bg-secondary') : 'bg-surface-container-highest'}`} />
                ))}
              </View>
              <Text className="font-label-sm text-label-sm text-on-surface-variant">Includes letters, numbers & a special symbol</Text>
            </View>
          }
        />

        <Pressable onPress={() => setAgreed(!agreed)} className="flex-row items-center gap-3" accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
          <Checkbox label="Agree to terms" checked={agreed} />
          <Text className="font-body-md text-body-md text-on-surface-variant flex-1">
            I agree to the <Text className="font-body-md text-body-md text-primary font-semibold">Terms of Service</Text> &{' '}
            <Text className="font-body-md text-body-md text-primary font-semibold">Privacy Policy</Text>
          </Text>
        </Pressable>

        <PrimaryAction label="Create Free Account" onPress={submit} busy={busy} disabled={!cloudConfigured} />

        <Divider label="or sign up with" />
        <SocialButtons onPress={social} disabled={!cloudConfigured} />

        <View className="flex-row justify-center items-center gap-1.5 pt-2">
          <Text className="font-body-lg text-body-lg text-on-surface-variant">Already have an account?</Text>
          <Pressable onPress={() => router.replace('/auth/login')} className="flex-row items-center">
            <Text className="font-label-lg text-[16px] text-primary">Log in</Text>
            <Icon name="chevron_right" className="text-[18px] text-primary" />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
