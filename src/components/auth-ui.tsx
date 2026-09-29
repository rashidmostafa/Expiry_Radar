import { router } from 'expo-router';
import { forwardRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Logo } from '@/components/logo';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text, TextInput } from '@/components/ui/text';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

/** Stitch auth bar: back chevron, logo + title, round account badge. */
export function AuthHeader({ title = 'Expiry Radar' }: { title?: string }) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  return (
    <View className="bg-surface/85 dark:bg-surface/90" style={[{ paddingTop: insets.top }, shadow('header')]}>
      <View className="h-16 px-space-md flex-row items-center justify-between">
        <View className="flex-row items-center gap-space-sm">
          <Pressable accessibilityLabel="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} className="w-11 h-11 -ml-2 rounded-full items-center justify-center">
            <Icon name="arrow_back_ios_new" className="text-[22px] text-on-surface" />
          </Pressable>
          <Logo size={32} />
          <Text className="font-headline-md text-headline-md text-on-surface">{title}</Text>
        </View>
        <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
          <Icon name="person" className="text-[22px] text-on-primary" />
        </View>
      </View>
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; icon: IconName; secure?: boolean; right?: ReactNode; hint?: ReactNode };

/** Labelled white input with a leading icon (and an eye toggle for passwords). */
export const AuthField = forwardRef<RNTextInput, FieldProps>(function AuthField({ label, icon, secure, right, hint, ...props }, ref) {
  const shadow = useShadow();
  const [hidden, setHidden] = useState(true);
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="font-label-lg text-label-lg text-on-surface">{label}</Text>
        {right}
      </View>
      <View className={`flex-row items-center gap-3 h-14 px-4 rounded-2xl ${tone.card}`} style={shadow('sm')}>
        <Icon name={icon} className="text-[22px] text-on-surface-variant" />
        <TextInput
          ref={ref}
          secureTextEntry={secure && hidden}
          autoCapitalize={secure || props.keyboardType === 'email-address' ? 'none' : props.autoCapitalize}
          autoCorrect={false}
          className="flex-1 h-12 font-body-lg text-body-lg text-on-surface"
          {...props}
        />
        {secure && (
          <Pressable accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden(!hidden)} hitSlop={8}>
            <Icon name={hidden ? 'visibility' : 'visibility_off'} className="text-[22px] text-on-surface-variant" />
          </Pressable>
        )}
      </View>
      {hint}
    </View>
  );
});

export function PrimaryAction({ label, icon = 'arrow_forward', onPress, busy, disabled }: { label: string; icon?: IconName; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  const shadow = useShadow();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      className={`h-14 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98] ${disabled ? 'opacity-50' : ''}`}
      style={shadow('primaryButton')}>
      {busy ? <ActivityIndicator color={colors['on-primary']} /> : null}
      <Text className="font-label-lg text-[16px] text-on-primary">{label}</Text>
      {!busy && <Icon name={icon} className="text-[22px] text-on-primary" />}
    </Pressable>
  );
}

export function FormMessage({ tone: kind, children }: { tone: 'error' | 'info'; children: ReactNode }) {
  return (
    <View className={`flex-row items-start gap-2 p-3 rounded-xl ${kind === 'error' ? tone.urgentBg : tone.freshBg}`}>
      <Icon name={kind === 'error' ? 'error' : 'info'} className={`text-[18px] ${kind === 'error' ? tone.urgentText : tone.freshText}`} />
      <Text className={`font-body-sm text-body-sm flex-1 ${kind === 'error' ? tone.urgentText : tone.freshText}`}>{children}</Text>
    </View>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 h-px bg-outline-variant/60" />
      <Text className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{label}</Text>
      <View className="flex-1 h-px bg-outline-variant/60" />
    </View>
  );
}

function AppleLogo({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M16.37 12.64c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.35 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.13 2.76-2.24.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.51 2.69-1.27z"
      />
    </Svg>
  );
}

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </Svg>
  );
}

export function SocialButtons({ onPress, disabled }: { onPress: (provider: 'apple' | 'google') => void; disabled?: boolean }) {
  const shadow = useShadow();
  const { colors } = useTheme();
  return (
    <View className="flex-row gap-3">
      {(
        [
          ['apple', 'Apple'],
          ['google', 'Google'],
        ] as const
      ).map(([provider, label]) => (
        <Pressable
          key={provider}
          disabled={disabled}
          accessibilityLabel={`Continue with ${label}`}
          onPress={() => onPress(provider)}
          className={`flex-1 h-14 rounded-2xl flex-row items-center justify-center gap-2 ${tone.card}`}
          style={shadow('sm')}>
          {provider === 'apple' ? <AppleLogo color={colors['on-surface']} /> : <GoogleLogo />}
          <Text className="font-label-lg text-label-lg text-on-surface">{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Shown on account screens when this build has no Supabase project configured. */
export function NotConfigured() {
  return (
    <FormMessage tone="info">
      Accounts aren&apos;t connected in this build yet. Everything else works offline on this device.
    </FormMessage>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (value: string) => EMAIL.test(value.trim());

/** 0–4: length, mixed case, digit, symbol. */
export function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return password.length < 8 ? Math.min(score, 1) : score;
}
