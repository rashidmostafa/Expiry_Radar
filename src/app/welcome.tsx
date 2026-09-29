import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';
import { Icon, type IconName } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { daysLeft, needsAttention, shortCountdown } from '@/domain/expiry';
import { useActiveItems } from '@/store/pantry';
import { updateSettings, useSettings, type DietId } from '@/store/settings';
import { DIETS, SIZES } from '@/data/household';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

type Step = 'splash' | 0 | 1 | 2 | 'quiz';

const SLIDES: {
  image: string;
  title: string;
  body: string;
  chips: [string, string][];
  top: { icon: IconName; title: string; detail: string };
  bottom: { icon: IconName; title: string; detail: string };
}[] = [
  {
    image: 'onboarding-groceries',
    title: 'Never let good food go to waste',
    body: 'Snap barcodes as you unpack. Expiry Radar tracks shelf life and nudges you with recipes before groceries spoil.',
    chips: [['⚡', 'Instant Barcode Scan'], ['🔔', 'Proactive Smart Nudges'], ['💰', 'See What You Save']],
    top: { icon: 'receipt_long', title: 'Grocery run', detail: '6 items detected ✨' },
    bottom: { icon: 'eco', title: 'Avocados (3x)', detail: 'Expires in 2 days' },
  },
  {
    image: 'spinach-hero',
    title: 'The app does the remembering',
    body: 'Smart defaults estimate every date for you. A gentle nudge arrives before anything turns — never a guilt trip.',
    chips: [['🥬', 'Smart Shelf-Life'], ['⏰', '2-Day Early Warning'], ['🌙', 'Quiet Hours']],
    top: { icon: 'notifications_active', title: 'Baby Spinach', detail: 'Expires tomorrow · 3 ideas' },
    bottom: { icon: 'ac_unit', title: 'Freeze it instead?', detail: 'Keeps for 8 more months' },
  },
  {
    image: 'frittata-hero',
    title: 'Cook what needs eating first',
    body: 'Recipes are ranked by what is about to expire, and cooking one updates your pantry automatically.',
    chips: [['🍳', 'Rescue Recipes'], ['✅', 'Auto Pantry Deduct'], ['📊', 'Weekly Savings']],
    top: { icon: 'skillet', title: 'Spinach & Goat Cheese Frittata', detail: '15 mins · uses 3 items' },
    bottom: { icon: 'savings', title: 'You saved $6.80', detail: 'and 0.4 kg CO₂e' },
  },
];

const LOADING = ['Warming up the radar…', 'Cataloging pantry shelves…', 'Tuning freshness sensors…'];

export default function WelcomeScreen() {
  const [step, setStep] = useState<Step>('splash');

  useEffect(() => {
    if (step !== 'splash') return;
    const timer = setTimeout(() => setStep(0), 2200);
    return () => clearTimeout(timer);
  }, [step]);

  if (step === 'splash') return <Splash onSkip={() => setStep(0)} />;
  if (step === 'quiz') return <HouseholdQuiz onBack={() => setStep(2)} />;
  return <Slide index={step} onNext={() => setStep(step === 2 ? 'quiz' : ((step + 1) as 1 | 2))} onSkip={() => setStep('quiz')} />;
}

function Splash({ onSkip }: { onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [message, setMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setMessage((current) => (current + 1) % LOADING.length), 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <Pressable onPress={onSkip} className="flex-1 bg-surface px-margin" style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 16 }}>
      <View
        className="w-full max-w-[480px] self-center overflow-hidden min-h-[560px] rounded-[280px]"
        style={{ boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)' }}>
        <LinearGradient
          colors={[colors.primary, colors['primary-container']]}
          style={{ flex: 1, minHeight: 560, paddingHorizontal: 16, paddingVertical: 32, justifyContent: 'space-between' }}>
          <View className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary-fixed opacity-20" />
          <View className="absolute -bottom-10 right-0 w-48 h-48 rounded-full bg-primary-fixed-dim opacity-25" />

          <View className="items-center pt-space-md">
            <View className="flex-row items-center gap-space-xs px-space-md py-1 rounded-full bg-on-primary/10">
              <Icon name="eco" filled className="text-[12px] text-primary-fixed dark:text-on-primary" />
              <Text className="font-label-sm text-label-sm text-on-primary tracking-wider uppercase font-semibold">Fresh Living • Pure Pantry</Text>
            </View>
          </View>

          <View className="items-center py-space-lg">
            <View className="relative items-center justify-center mb-space-lg">
              <View className="absolute w-44 h-44 rounded-full bg-primary-fixed/20" />
              <View className="absolute w-36 h-36 rounded-full bg-on-primary/15" />
              <View className="w-28 h-28 rounded-full bg-surface-container-lowest p-2 items-center justify-center" style={{ boxShadow: '0px 20px 25px -5px rgba(0,0,0,0.15)' }}>
                <View className="w-full h-full rounded-full overflow-hidden items-center justify-center bg-surface-container-low">
                  <Logo size={76} />
                </View>
                <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-primary-fixed border-2 border-surface-container-lowest items-center justify-center">
                  <View className="w-2 h-2 rounded-full bg-primary" />
                </View>
              </View>
            </View>
            <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-primary font-bold tracking-tight mb-space-xs">Expiry Radar</Text>
            <Text className="font-body-md text-body-md text-on-primary/85 max-w-[260px] text-center leading-relaxed">
              Smart pantry tracking <Text className="text-primary-fixed dark:text-on-primary">•</Text> Zero wasted food
            </Text>
            <View className="flex-row items-center gap-space-xs mt-space-md">
              {(
                [
                  ['timer', 'Instant Scan', 'text-primary-fixed'],
                  ['notifications_active', 'Alerts', 'text-secondary-container'],
                  ['skillet', 'Recipes', 'text-primary-fixed'],
                ] as const
              ).map(([icon, label, color]) => (
                <View key={label} className="flex-row items-center gap-1 px-space-sm py-0.5 rounded-full bg-on-primary/10">
                  <Icon name={icon} className={`text-[13px] ${color} dark:text-on-primary`} />
                  <Text className="font-label-sm text-label-sm text-on-primary">{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="items-center pb-space-lg">
            <View className="w-full max-w-[280px] bg-on-primary/10 rounded-full px-4 py-3 flex-row items-center justify-center gap-3">
              <ActivityIndicator size="small" color={colors['on-primary']} />
              <Text className="font-label-md text-label-md text-on-primary">{LOADING[message]}</Text>
            </View>
            <View className="flex-row items-center gap-1.5 mt-space-md">
              <View className="w-1.5 h-1.5 rounded-full bg-primary-fixed dark:bg-on-primary" />
              <Text className="font-label-sm text-label-sm text-on-primary/70 tracking-widest uppercase">Kitchen Intelligence v1.0</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

function Slide({ index, onNext, onSkip }: { index: 0 | 1 | 2; onNext: () => void; onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const slide = SLIDES[index];
  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <ScrollView contentContainerClassName="w-full max-w-[480px] self-center px-margin pb-space-lg flex-grow">
        <View className="flex-row items-center justify-between py-space-sm">
          <View accessibilityLabel={`Step ${index + 1} of 3`} className="flex-row items-center gap-1.5">
            {[0, 1, 2].map((dot) => (
              <View key={dot} className={`h-2 rounded-full ${dot === index ? 'w-7 bg-primary' : 'w-2 bg-surface-container-highest'}`} />
            ))}
          </View>
          <Pressable onPress={onSkip} className="py-1 px-2.5 rounded-full active:bg-surface-container">
            <Text className="font-label-md text-label-md text-on-surface-variant">Skip</Text>
          </Pressable>
        </View>

        <View className="relative w-full rounded-2xl bg-surface-container-low dark:bg-surface-container overflow-hidden p-space-md mt-space-sm mb-space-lg" style={shadow('sm')}>
          <View className="relative w-full h-64 rounded-xl overflow-hidden" style={shadow('sm')}>
            <Image source={imageSource(slide.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            <FloatingCard {...slide.top} className="absolute top-3 left-3 max-w-[210px]" iconTile="bg-primary-container/20" iconColor="text-primary" detailColor="text-primary" />
            <FloatingCard {...slide.bottom} className="absolute bottom-3 right-3" iconTile={tone.amberTile} iconColor="text-on-secondary-container dark:text-secondary" detailColor="text-secondary" dot />
          </View>
        </View>

        <View className="gap-space-xs px-space-xs">
          <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface text-center">{slide.title}</Text>
          <Text className="font-body-md text-body-md text-on-surface-variant max-w-sm self-center text-center leading-relaxed mt-1">{slide.body}</Text>
        </View>

        <View className="flex-row flex-wrap justify-center gap-2 mt-space-md mb-space-lg">
          {slide.chips.map(([emoji, label]) => (
            <View key={label} className="flex-row items-center gap-1.5 bg-surface-container-low dark:bg-surface-container px-3 py-1.5 rounded-full" style={shadow('sm')}>
              <Text className="text-[13px]">{emoji}</Text>
              <Text className="font-label-sm text-label-sm font-semibold text-on-surface">{label}</Text>
            </View>
          ))}
        </View>

        <View className="mt-auto pt-space-xs">
          <Pressable onPress={onNext} className="w-full h-12 bg-primary rounded-full flex-row items-center justify-center gap-2 active:scale-[0.98]" style={shadow('primaryButton')}>
            <Text className="font-label-lg text-label-lg text-on-primary">{index === 0 ? 'Get Started' : index === 2 ? 'Set Up My Kitchen' : 'Next'}</Text>
            <Icon name="arrow_forward" className="text-[20px] text-on-primary" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function FloatingCard({
  icon,
  title,
  detail,
  className,
  iconTile,
  iconColor,
  detailColor,
  dot,
}: {
  icon: IconName;
  title: string;
  detail: string;
  className: string;
  iconTile: string;
  iconColor: string;
  detailColor: string;
  dot?: boolean;
}) {
  const shadow = useShadow();
  return (
    <View className={`bg-surface-container-lowest/95 dark:bg-surface-container-high/95 rounded-xl p-2.5 flex-row items-center gap-2.5 ${className}`} style={shadow('card')}>
      <View className={`w-8 h-8 rounded-lg items-center justify-center shrink-0 ${iconTile}`}>
        <Icon name={icon} className={`text-[18px] ${iconColor}`} />
      </View>
      <View className="flex-shrink">
        <Text numberOfLines={1} className="font-label-sm text-label-sm font-semibold text-on-surface">
          {title}
        </Text>
        <View className="flex-row items-center gap-1">
          {dot && <View className="w-1.5 h-1.5 rounded-full bg-secondary" />}
          <Text numberOfLines={1} className={`font-label-sm text-[10px] font-bold ${detailColor}`}>
            {detail}
          </Text>
        </View>
      </View>
    </View>
  );
}

function HouseholdQuiz({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const settings = useSettings();
  const items = useActiveItems();
  const [size, setSize] = useState(settings.householdSize);
  const [diets, setDiets] = useState<DietId[]>(settings.diets);
  const [nudges, setNudges] = useState(settings.nudgeTypes.expiry);
  const example = items.find((item) => needsAttention(item));

  const toggleDiet = (value: DietId | 'none') => {
    if (value === 'none') return setDiets([]);
    setDiets((current) => (current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]));
  };

  const finish = (save: boolean) => {
    updateSettings({
      onboarded: true,
      ...(save ? { householdSize: size, diets, nudgeTypes: { ...settings.nudgeTypes, expiry: nudges } } : {}),
    });
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-surface/85 dark:bg-surface/90" style={[{ paddingTop: insets.top }, shadow('header')]}>
        <View className="h-16 px-space-md flex-row items-center justify-between">
          <View className="flex-row items-center gap-space-sm">
            <Pressable accessibilityLabel="Back" onPress={onBack} className="w-11 h-11 -ml-2 rounded-full items-center justify-center">
              <Icon name="arrow_back_ios_new" className="text-[22px] text-on-surface" />
            </Pressable>
            <Logo size={32} />
            <Text className="font-headline-md text-headline-md text-on-surface">Household Setup</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-4 gap-space-lg" contentContainerStyle={{ paddingBottom: 24 }}>
        <View>
          <Text className="font-headline-lg text-headline-lg text-on-surface">Tailor your pantry radar</Text>
          <Text className="font-body-md text-body-md text-on-surface-variant mt-1">Help us size recipe portions and personalize your nudges.</Text>
        </View>

        <View className="gap-space-sm">
          <SectionTitle icon="group" title="Household Size" hint="Influences portions" />
          <View className="flex-row flex-wrap gap-3">
            {SIZES.map((option) => {
              const active = size === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSize(option.value)}
                  className={`p-4 rounded-2xl gap-3 active:scale-[0.98] ${active ? 'bg-primary-fixed dark:bg-[#1C382B] dark:border dark:border-[#2B5440]' : tone.inset}`}
                  style={{ width: '48%' }}>
                  <View className="flex-row items-start justify-between">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${active ? 'bg-primary' : 'bg-surface-container-high dark:bg-surface-container-highest'}`}>
                      <Icon name={option.icon} className={`text-[20px] ${active ? 'text-on-primary' : 'text-on-surface-variant'}`} />
                    </View>
                    {active && <Icon name="check_circle" filled className="text-[22px] text-primary" />}
                  </View>
                  <View>
                    <Text className={`font-label-lg text-label-lg ${active ? 'text-on-primary-fixed dark:text-primary' : 'text-on-surface'}`}>{option.label}</Text>
                    <Text className="font-body-sm text-body-sm text-on-surface-variant">{option.detail}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-space-sm">
          <SectionTitle icon="nutrition" title="Dietary & Allergies" hint="Multi-select" />
          <View className="flex-row flex-wrap gap-2">
            {DIETS.map((option) => {
              const active = option.value === 'none' ? diets.length === 0 : diets.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => toggleDiet(option.value)}
                  className={`h-10 px-4 rounded-full flex-row items-center gap-2 ${active ? 'bg-primary-fixed dark:bg-[#1C382B] dark:border dark:border-[#2B5440]' : tone.inset}`}>
                  <Icon name={option.icon} className={`text-[18px] ${active ? 'text-primary' : 'text-on-surface-variant'}`} />
                  <Text className={`font-label-md text-label-md ${active ? 'text-on-primary-fixed dark:text-primary' : 'text-on-surface'}`}>{option.label}</Text>
                  {active && option.value !== 'none' && <Icon name="check" className="text-[16px] text-primary" />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-space-sm">
          <SectionTitle icon="notification_add" title="Smart Expiry Nudge Alerts" />
          <View className={`rounded-2xl p-4 gap-3 ${tone.inset}`}>
            <View className="flex-row items-start gap-3">
              <View className="w-11 h-11 rounded-full bg-surface-container-high dark:bg-surface-container-highest items-center justify-center">
                <Icon name="alarm" className="text-[22px] text-primary" />
              </View>
              <View className="flex-1">
                <Text className="font-headline-sm text-headline-sm text-on-surface">Expiry Warning</Text>
                <Text className="font-body-sm text-body-sm text-on-surface-variant">Notify {settings.alertDaysBefore * 24}h before food expires, with recipe ideas</Text>
              </View>
              <Switch size="lg" label="Expiry warnings" value={nudges} onValueChange={setNudges} />
            </View>
            {example && (
              <View className="flex-row items-center gap-3 p-3 rounded-xl bg-surface-container-low dark:bg-surface-container-high">
                <View className="w-9 h-9 rounded-lg bg-secondary-container items-center justify-center">
                  <Icon name="cloud_done" className="text-[18px] text-on-secondary-container" />
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-label-md text-label-md text-on-surface">
                    {example.name} • {shortCountdown(daysLeft(example))}
                  </Text>
                  <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                    Tap for a quick recipe suggestion
                  </Text>
                </View>
                <Text className="font-label-sm text-label-sm text-tertiary font-bold">Urgent</Text>
              </View>
            )}
          </View>
        </View>

        <View className={`rounded-2xl p-4 flex-row items-center gap-4 ${tone.inset}`}>
          <Image source={imageSource('pantry-shelf')} style={{ width: 80, height: 80, borderRadius: 12 }} contentFit="cover" />
          <View className="flex-1">
            <Text className="font-label-lg text-label-lg text-on-surface">Zero-Guilt Pantry</Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              Around a third of the food households buy ends up uneaten. A few nudges at the right moment change that.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-margin pt-3 gap-2 w-full max-w-[480px] self-center" style={{ paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={() => finish(true)} className="w-full h-14 rounded-full bg-primary flex-row items-center justify-center gap-2 active:scale-[0.98]" style={shadow('primaryButton')}>
          <Text className="font-label-lg text-label-lg text-on-primary">Continue to My Kitchen</Text>
          <Icon name="arrow_forward" className="text-[20px] text-on-primary" />
        </Pressable>
        <Pressable onPress={() => finish(false)} className="py-2 items-center">
          <Text className="font-label-md text-label-md text-on-surface-variant">Set up later</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionTitle({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Icon name={icon} className="text-[22px] text-primary" />
        <Text className="font-headline-md text-headline-md text-on-surface">{title}</Text>
      </View>
      {hint && <Text className="font-label-sm text-label-sm text-on-surface-variant">{hint}</Text>}
    </View>
  );
}
