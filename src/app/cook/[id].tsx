import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { FoodThumb } from '@/components/food-thumb';
import { Logo } from '@/components/logo';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { getRecipe, type Recipe } from '@/data/recipes';
import { shortCountdown } from '@/domain/expiry';
import { indexPantry, matchRecipe } from '@/domain/recipe-match';
import { cookDeductions, useActiveItems } from '@/store/pantry';
import { useSettings } from '@/store/settings';
import { useShadow } from '@/theme/shadows';
import { useTheme } from '@/theme/theme-provider';
import { tone } from '@/theme/tones';

export default function HandsFreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = getRecipe(id);
  if (!recipe) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <Text className="font-headline-md text-headline-md">Recipe not found</Text>
      </View>
    );
  }
  return <HandsFree recipe={recipe} />;
}

function format(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

/** What's happening in a step, for the status chip over the timer. */
function stepStatus(text: string) {
  const temp = text.match(/(\d{3})°F/);
  if (/\b(rest|chill|soak)\b/i.test(text)) return 'Resting';
  if (/oven|bake/i.test(text)) return `Baking in oven${temp ? ` • ${temp[1]}°F` : ''}`;
  if (/blend/i.test(text)) return 'Blending';
  if (/heat|skillet|pan|sauté|toast|wilt|roast/i.test(text)) return 'On the stove';
  return 'Prep';
}

/** Keeps the screen on while cooking. Failures (unsupported browsers, early exit) are harmless. */
function useScreenAwake() {
  useEffect(() => {
    const tag = 'hands-free-cooking';
    const activation = activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      activation.then(() => deactivateKeepAwake(tag)).catch(() => {});
    };
  }, []);
}

function HandsFree({ recipe }: { recipe: Recipe }) {
  useScreenAwake();
  const insets = useSafeAreaInsets();
  const shadow = useShadow();
  const { colors } = useTheme();
  const { householdSize } = useSettings();
  const items = useActiveItems();
  const match = useMemo(() => matchRecipe(recipe, indexPantry(items)), [recipe, items]);

  const [step, setStep] = useState(0);
  const current = recipe.steps[step];
  const last = step === recipe.steps.length - 1;
  const [total, setTotal] = useState(current.minutes * 60);
  const [remaining, setRemaining] = useState(current.minutes * 60);
  const [running, setRunning] = useState(false);
  const [readAloud, setReadAloud] = useState(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Speech.speak(`Timer done for ${current.title}.`);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, current.title]);

  useEffect(() => () => void Speech.stop(), []);

  const goTo = (index: number) => {
    const next = recipe.steps[index];
    setStep(index);
    setTotal(next.minutes * 60);
    setRemaining(next.minutes * 60);
    setRunning(false);
    if (readAloud) {
      Speech.stop();
      Speech.speak(`Step ${index + 1}. ${next.title}. ${next.text}`);
    }
  };

  const toggleRead = () => {
    const next = !readAloud;
    setReadAloud(next);
    Speech.stop();
    if (next) Speech.speak(`Step ${step + 1}. ${current.title}. ${current.text}`);
  };

  const finish = () => {
    const scale = householdSize / recipe.servings;
    cookDeductions(
      match.ingredients
        .filter((entry) => entry.item && entry.ingredient.deduct > 0)
        .map((entry) => ({ id: entry.item!.id, percent: Math.max(1, Math.round(entry.ingredient.deduct * scale * 100)) })),
      recipe.id
    );
    router.replace({ pathname: '/cook/done', params: { recipe: recipe.id } });
  };

  const inStep = match.ingredients.filter((entry) => current.text.toLowerCase().includes(entry.ingredient.name.toLowerCase().split(' ').at(-1)!.replace(/s$/, '')));
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const progress = total === 0 ? 0 : remaining / total;

  return (
    <View className="flex-1 bg-surface">
      <View className="px-margin flex-row items-center justify-between w-full max-w-[480px] self-center" style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}>
        <View className="flex-row items-center gap-2 flex-1">
          <Pressable accessibilityLabel="Exit cooking mode" onPress={() => router.back()} className="w-11 h-11 rounded-full bg-surface-container-high dark:bg-surface-container items-center justify-center">
            <Icon name="close" className="text-[22px] text-on-surface" />
          </Pressable>
          <Logo size={32} />
          <Text numberOfLines={1} className="font-headline-sm text-headline-sm text-on-surface flex-1">Hands-Free Cooking</Text>
        </View>
        <Pressable
          accessibilityLabel={readAloud ? 'Stop reading steps aloud' : 'Read steps aloud'}
          onPress={toggleRead}
          className={`w-11 h-11 rounded-full items-center justify-center ${readAloud ? 'bg-primary' : 'bg-primary-fixed dark:bg-[#1C382B]'}`}>
          <Icon name={readAloud ? 'volume_up' : 'record_voice_over'} className={`text-[22px] ${readAloud ? 'text-on-primary' : 'text-primary'}`} />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pb-6 gap-space-md">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-surface-container">
            <View className="w-2 h-2 rounded-full bg-primary" />
            <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase">Screen awake</Text>
          </View>
          <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${tone.freshBg}`}>
            <Icon name="timer" className="text-[14px] text-primary" />
            <Text className={`font-label-sm text-label-sm ${tone.freshText}`}>
              Step {step + 1} of {recipe.steps.length}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-1.5">
          {recipe.steps.map((entry, index) => (
            <Pressable key={entry.title} accessibilityLabel={`Go to step ${index + 1}`} onPress={() => goTo(index)} className={`flex-1 h-2 rounded-full ${index <= step ? 'bg-primary' : 'bg-surface-container-highest'}`} />
          ))}
        </View>

        <View>
          <View className="flex-row items-center gap-1.5">
            <Icon name="restaurant" className="text-[16px] text-primary" />
            <Text className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold">Hands-free active cook</Text>
          </View>
          <Text className="font-headline-lg text-headline-lg text-on-surface">{recipe.title}</Text>
        </View>

        {/* Timer */}
        <View className={`rounded-3xl p-space-md items-center gap-space-md ${tone.card}`} style={shadow('card')}>
          <View className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${tone.soonBg}`}>
            <Icon name="local_fire_department" className={`text-[16px] ${tone.soonText}`} />
            <Text className={`font-label-sm text-label-sm uppercase tracking-wider ${tone.soonText}`}>{stepStatus(current.text)}</Text>
          </View>
          <View className="items-center justify-center" style={{ width: 220, height: 220 }}>
            <Svg width={220} height={220} viewBox="0 0 200 200" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={100} cy={100} r={radius} fill="none" stroke={colors['surface-container-high']} strokeWidth={10} />
              <Circle
                cx={100}
                cy={100}
                r={radius}
                fill="none"
                stroke={colors.primary}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
              />
            </Svg>
            <Text className="text-[52px] leading-[58px] font-bold text-on-surface">{format(remaining)}</Text>
            <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              {remaining === 0 ? 'Time is up' : `Remaining of ${format(total)}`}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable accessibilityLabel="Reset timer" onPress={() => { setRemaining(total); setRunning(false); }} className="w-14 h-14 rounded-full bg-surface-container-high dark:bg-surface-container-highest items-center justify-center">
              <Icon name="replay" className="text-[24px] text-on-surface" />
            </Pressable>
            <Pressable
              onPress={() => {
                if (remaining === 0) setRemaining(total);
                setRunning(remaining === 0 || !running);
              }}
              className="h-14 px-8 rounded-full bg-primary flex-row items-center gap-2 active:scale-95"
              style={shadow('primaryButton')}>
              <Icon name={running ? 'pause' : 'play_arrow'} filled className="text-[26px] text-on-primary" />
              <Text className="font-headline-sm text-headline-sm text-on-primary">{running ? 'Pause' : remaining === total ? 'Start' : 'Resume'}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Add one minute"
              onPress={() => { setRemaining((value) => value + 60); setTotal((value) => value + 60); }}
              className="w-14 h-14 rounded-full bg-surface-container-high dark:bg-surface-container-highest items-center justify-center">
              <Text className="font-label-md text-label-md text-on-surface">+1</Text>
              <Text className="font-label-sm text-[10px] text-on-surface-variant">Min</Text>
            </Pressable>
          </View>
        </View>

        {/* Step */}
        <View className={`rounded-3xl p-space-md gap-space-md ${tone.card}`} style={shadow('card')}>
          <View className="flex-row items-start gap-3">
            <View className="w-9 h-9 rounded-xl bg-primary items-center justify-center">
              <Text className="font-headline-sm text-headline-sm text-on-primary">{step + 1}</Text>
            </View>
            <Text className="font-headline-md text-headline-md text-on-surface flex-1">{current.title}</Text>
            <View className="px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-surface-container-highest">
              <Text className="font-label-sm text-label-sm text-on-surface-variant">{current.minutes} min</Text>
            </View>
          </View>
          <Text className="font-body-lg text-[18px] leading-[30px] text-on-surface">
            <Highlighted text={current.text} names={recipe.ingredients.map((entry) => entry.name)} />
          </Text>
          {inStep
            .filter((entry) => entry.item)
            .map((entry) => (
              <View key={entry.ingredient.key} className={`flex-row items-center gap-3 p-3 rounded-2xl ${tone.insetLow}`}>
                <FoodThumb item={entry.item!} size={44} />
                <View className="flex-1">
                  <Text className="font-label-md text-label-md text-on-surface font-semibold">{entry.item!.name}</Text>
                  <Text numberOfLines={1} className="font-body-sm text-body-sm text-on-surface-variant">
                    {entry.ingredient.amount} needed{entry.item!.openedOn ? ' • Opened' : ''}
                  </Text>
                </View>
                {entry.urgency !== 'fresh' && (
                  <View className={`px-2 py-0.5 rounded-full ${tone.urgentBg}`}>
                    <Text className={`font-label-sm text-label-sm ${tone.urgentText}`}>{shortCountdown(entry.days!)}</Text>
                  </View>
                )}
              </View>
            ))}
          {last && (
            <>
              <View className="flex-row items-start gap-3 p-3 rounded-2xl bg-secondary-fixed/50 dark:bg-[#3B2312]">
                <Icon name="tips_and_updates" className="text-[20px] text-secondary" />
                <View className="flex-1">
                  <Text className="font-label-md text-label-md text-on-surface font-semibold">Chef&apos;s Radar Tip</Text>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">{recipe.tip}</Text>
                </View>
              </View>
              <View className="h-44 rounded-2xl overflow-hidden">
                <Image source={imageSource(recipe.heroImage ?? recipe.image)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                <View className="absolute left-3 bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/50">
                  <Text className="font-label-md text-label-md text-white">Expected look: golden, set and ready to plate</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View className="px-margin pt-2 gap-2 w-full max-w-[480px] self-center" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Previous step"
            disabled={step === 0}
            onPress={() => goTo(step - 1)}
            className={`w-16 h-16 rounded-2xl bg-surface-container-high dark:bg-surface-container items-center justify-center ${step === 0 ? 'opacity-40' : ''}`}>
            <Icon name="arrow_back" className="text-[24px] text-on-surface" />
          </Pressable>
          <Pressable onPress={() => (last ? finish() : goTo(step + 1))} className="flex-1 h-16 rounded-2xl bg-primary flex-row items-center justify-between px-5 active:scale-[0.98]" style={shadow('primaryButton')}>
            <View className="flex-1">
              <Text className="font-label-sm text-label-sm text-on-primary/80 uppercase tracking-wider">
                {last ? 'All done?' : step + 1 === recipe.steps.length - 1 ? 'Next step (final)' : 'Next step'}
              </Text>
              <Text numberOfLines={1} className="font-headline-sm text-headline-sm text-on-primary">
                {last ? 'Finish & update pantry' : recipe.steps[step + 1].title}
              </Text>
            </View>
            <Icon name={last ? 'check' : 'arrow_forward'} className="text-[24px] text-on-primary" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Bolds ingredient names and colors temperatures inside a step's text. */
function Highlighted({ text, names }: { text: string; names: string[] }) {
  const words = names.map((name) => name.toLowerCase().split(' ').at(-1)!.replace(/s$/, '')).filter((word) => word.length > 3);
  const pattern = new RegExp(`(\\d{3}°F(?: \\(\\d{2,3}°C\\))?|\\b(?:${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\w*)`, 'gi');
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  for (const found of text.matchAll(pattern)) {
    const index = found.index ?? 0;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    const temperature = /°F/.test(found[0]);
    parts.push(
      <Text key={index} className={`font-body-lg text-[18px] leading-[30px] font-bold ${temperature ? 'text-secondary' : 'text-primary'}`}>
        {found[0]}
      </Text>
    );
    lastIndex = index + found[0].length;
  }
  parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}
