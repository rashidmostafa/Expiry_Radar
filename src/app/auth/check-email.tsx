import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import { AuthHeader, FormMessage, PrimaryAction } from '@/components/auth-ui';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { sendPasswordReset } from '@/store/account';
import { tone } from '@/theme/tones';

const RESEND_AFTER = 45;

export default function CheckEmailScreen() {
  const { email = '', kind = 'reset' } = useLocalSearchParams<{ email?: string; kind?: 'reset' | 'confirm' }>();
  const [wait, setWait] = useState(RESEND_AFTER);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | undefined>();

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const resend = async () => {
    const result = await sendPasswordReset(email);
    setMessage(result.error ? { tone: 'error', text: result.error } : { tone: 'info', text: 'A fresh link is on its way.' });
    setWait(RESEND_AFTER);
  };

  const openMail = () => {
    // There is no universal "open inbox" URL; mailto opens the mail app on both platforms.
    Linking.openURL(Platform.OS === 'ios' ? 'message://' : 'mailto:').catch(() => Linking.openURL('mailto:'));
  };

  return (
    <View className="flex-1 bg-surface">
      <AuthHeader />
      <ScrollView contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-5 pb-10 gap-space-lg items-stretch">
        <View className="items-center gap-3">
          <View className="flex-row items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary-fixed/60 dark:bg-[#1C382B]">
            <Icon name="mark_email_unread" className="text-[16px] text-primary" />
            <Text className="font-label-md text-label-md text-on-primary-fixed dark:text-primary uppercase tracking-wider">Check your inbox</Text>
          </View>
          <View className="w-56 h-56 rounded-full bg-primary-fixed/30 dark:bg-[#1C382B]/60 items-center justify-center my-2">
            <View className="w-44 h-44 rounded-full bg-surface-container-lowest dark:bg-surface-container border-8 border-primary-fixed/60 dark:border-[#2B5440] items-center justify-center">
              <View className="w-28 h-28 rounded-full bg-primary-fixed/40 dark:bg-[#1C382B] items-center justify-center">
                <Icon name="forward_to_inbox" className="text-[48px] text-primary" />
              </View>
            </View>
            <View className="absolute top-8 right-8 w-11 h-11 rounded-full bg-primary items-center justify-center">
              <Icon name="check" className="text-[24px] text-on-primary" />
            </View>
            <View className="absolute bottom-6 left-10 w-10 h-10 rounded-full bg-secondary-fixed dark:bg-[#3B2312] items-center justify-center">
              <Icon name="auto_awesome" className="text-[18px] text-secondary" />
            </View>
          </View>
          <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">Check your email</Text>
          <Text className="font-body-lg text-body-lg text-on-surface-variant text-center">
            {kind === 'confirm' ? 'We sent a confirmation link to' : 'We sent secure password reset instructions to'}
          </Text>
          <View className="flex-row items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-high dark:bg-surface-container">
            <Icon name="alternate_email" className="text-[18px] text-primary" />
            <Text className="font-label-lg text-label-lg text-on-surface">{email}</Text>
          </View>
          <Text className="font-body-md text-body-md text-on-surface-variant text-center">
            {kind === 'confirm' ? 'Open the link on this phone to finish creating your account.' : 'Open the link on this phone to choose a new password.'}
          </Text>
        </View>

        {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}

        <View className={`rounded-2xl p-4 gap-3 ${tone.inset}`}>
          <View className="flex-row items-center gap-2">
            <Icon name="lightbulb" className="text-[20px] text-secondary" />
            <Text className="font-label-lg text-label-lg text-on-surface">Didn&apos;t see it arrive?</Text>
          </View>
          <Tip icon="folder_special" title="Spam or Promotions" body="Peek in your junk folder — sometimes our pantry pings get caught there." />
          <Tip icon="timer" title="Use it soon" body="For your security the link expires after a short while. Request a new one if it does." />
        </View>

        <PrimaryAction label="Open Email App" icon="open_in_new" onPress={openMail} />
        {kind === 'reset' && (
          <Pressable disabled={wait > 0} onPress={resend} className={`h-14 rounded-full flex-row items-center justify-center gap-2 ${tone.card} ${wait > 0 ? 'opacity-70' : ''}`}>
            <Icon name="sync" className="text-[20px] text-on-surface-variant" />
            <Text className="font-label-lg text-label-lg text-on-surface-variant">
              {wait > 0 ? (
                <>
                  Resend reset link in <Text className="font-label-lg text-label-lg text-primary">{wait}s</Text>
                </>
              ) : (
                'Resend reset link'
              )}
            </Text>
          </Pressable>
        )}
        <Pressable onPress={() => router.replace('/auth/login')} className="self-center flex-row items-center gap-2 py-2">
          <Icon name="arrow_back" className="text-[20px] text-on-surface" />
          <Text className="font-label-lg text-label-lg text-on-surface">Back to Log In</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Tip({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View className="flex-row items-start gap-3 p-3 rounded-xl bg-surface-container-lowest dark:bg-surface-container-high">
      <View className="w-8 h-8 rounded-full bg-surface-container dark:bg-surface-container-highest items-center justify-center">
        <Icon name={icon} className="text-[18px] text-on-surface-variant" />
      </View>
      <View className="flex-1">
        <Text className="font-label-md text-label-md text-on-surface">{title}</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant">{body}</Text>
      </View>
    </View>
  );
}
