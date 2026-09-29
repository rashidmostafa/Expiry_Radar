import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { imageSource } from '@/data/images';
import { zones } from '@/domain/categories';
import { daysBetween, formatShort, today } from '@/domain/dates';
import { expiresPhrase } from '@/domain/expiry';
import { formatMoney } from '@/domain/format';
import { nudgeMatches, type Nudge, type NudgeFilter } from '@/domain/nudges';
import { dismissNudge, markNudgesSeen, snoozeNudge } from '@/store/nudge-state';
import { freezeItem, markUsed } from '@/store/pantry';
import { addToRestock } from '@/store/restock';
import { useNudges } from '@/store/use-nudges';
import { useShadow } from '@/theme/shadows';
import { tone } from '@/theme/tones';

const FILTERS: { value: NudgeFilter; label: string; dot: string }[] = [
  { value: 'urgent', label: 'Urgent', dot: 'bg-tertiary' },
  { value: 'duplicate', label: 'Duplications', dot: 'bg-secondary' },
  { value: 'freeze', label: 'Freeze', dot: 'bg-primary' },
  { value: 'restock', label: 'Restock', dot: 'bg-outline' },
  { value: 'milestone', label: 'Milestones', dot: 'bg-primary-container' },
];

export default function NudgesScreen() {
  const { nudges, unseenIds } = useNudges();
  const [filter, setFilter] = useState<NudgeFilter>('all');
  const [toast, setToast] = useState<string | undefined>();
  // Remember which were new when the screen opened, so the "new" labels don't vanish instantly.
  const [newIds] = useState(() => new Set(unseenIds));

  useEffect(() => {
    if (unseenIds.length) markNudgesSeen(unseenIds);
  }, [unseenIds]);

  const visible = nudges.filter((nudge) => nudgeMatches(nudge, filter));
  const today_ = visible.filter((nudge) => nudge.section === 'today');
  const week = visible.filter((nudge) => nudge.section === 'week');

  const done = (message: string, dismissId?: string) => {
    if (dismissId) dismissNudge(dismissId);
    setToast(message);
  };

  return (
    <View className="flex-1 bg-surface">
      <AppHeader page="Nudges" />
      <ScrollView className="flex-1" contentContainerClassName="w-full max-w-[480px] self-center px-margin pt-1 pb-8">
        <View className="flex-row items-center justify-between mb-space-md">
          <View className="flex-col flex-1">
            <Text className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface">Smart Nudges</Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Icon name="auto_awesome" filled className="text-[15px] text-primary" />
              <Text className="font-body-sm text-body-sm text-on-surface-variant">Pantry radar & freshness alerts</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-space-xs">
            <Pressable onPress={() => router.push('/digest')} className="px-space-xs py-1">
              <Text className="font-label-sm text-label-sm text-primary font-semibold">Daily digest</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Notification preferences"
              onPress={() => router.push('/settings/alerts')}
              className="w-9 h-9 rounded-full bg-surface-container dark:bg-surface-container-high items-center justify-center active:scale-95">
              <Icon name="settings" className="text-[19px] text-on-surface-variant" />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-margin mb-space-md" contentContainerClassName="px-margin pb-space-sm gap-space-xs">
          <Pressable onPress={() => setFilter('all')} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${filter === 'all' ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}>
            <Text className={`font-label-md text-label-md ${filter === 'all' ? 'text-on-primary' : 'text-on-surface-variant'}`}>All</Text>
            <View className={`w-4 h-4 rounded-full items-center justify-center ${filter === 'all' ? 'bg-on-primary/20' : 'bg-surface-container-highest'}`}>
              <Text className={`text-[10px] font-bold ${filter === 'all' ? 'text-on-primary' : 'text-on-surface'}`}>{nudges.length}</Text>
            </View>
          </Pressable>
          {FILTERS.map((entry) => {
            const count = nudges.filter((nudge) => nudgeMatches(nudge, entry.value)).length;
            if (count === 0) return null;
            const active = filter === entry.value;
            return (
              <Pressable key={entry.value} onPress={() => setFilter(entry.value)} className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${active ? 'bg-primary' : 'bg-surface-container-low dark:bg-surface-container'}`}>
                <View className={`w-2 h-2 rounded-full ${active ? 'bg-on-primary' : entry.dot}`} />
                <Text className={`font-label-md text-label-md ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                  {entry.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {toast && (
          <View className="mb-space-sm rounded-xl bg-on-surface px-space-md py-2 flex-row items-center justify-between">
            <Text className="font-label-sm text-label-sm text-inverse-on-surface flex-1">{toast}</Text>
            <Pressable accessibilityLabel="Dismiss" onPress={() => setToast(undefined)}>
              <Icon name="close" className="text-[16px] text-inverse-on-surface" />
            </Pressable>
          </View>
        )}

        {visible.length === 0 && (
          <View className="items-center py-16 px-6 gap-2">
            <View className="w-16 h-16 rounded-full bg-primary-fixed dark:bg-[#1C382B] items-center justify-center mb-2">
              <Icon name="notifications_off" className="text-[30px] text-primary" />
            </View>
            <Text className="font-headline-md text-headline-md text-on-surface">All quiet on the radar</Text>
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">
              Nothing needs your attention right now. We&apos;ll nudge you the moment something does.
            </Text>
          </View>
        )}

        {today_.length > 0 && (
          <Section title="Today" dot="bg-tertiary" titleColor="text-tertiary" note={`${today_.filter((nudge) => newIds.has(nudge.id)).length} new`}>
            {today_.map((nudge) => (
              <NudgeView key={nudge.id} nudge={nudge} onDone={done} />
            ))}
          </Section>
        )}
        {week.length > 0 && (
          <Section title="Earlier this week" dot="bg-primary" titleColor="text-primary" note="Past 7 days">
            {week.map((nudge) => (
              <NudgeView key={nudge.id} nudge={nudge} onDone={done} />
            ))}
          </Section>
        )}
      </ScrollView>
      <BottomNav active="home" />
    </View>
  );
}

function Section({ title, dot, titleColor, note, children }: { title: string; dot: string; titleColor: string; note: string; children: ReactNode }) {
  return (
    <View className="gap-space-md mb-space-lg">
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-1.5">
          <View className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          <Text className={`font-label-sm text-label-sm uppercase tracking-wider font-bold ${titleColor}`}>{title}</Text>
        </View>
        <Text className="font-label-sm text-label-sm text-on-surface-variant/70">{note}</Text>
      </View>
      {children}
    </View>
  );
}

type Tag = { icon: IconName; label: string; className: string; text: string };

function Card({
  id,
  icon,
  iconTile,
  iconColor,
  pulse,
  tag,
  meta,
  title,
  body,
  children,
}: {
  id: string;
  icon: IconName;
  iconTile: string;
  iconColor: string;
  pulse?: boolean;
  tag: Tag;
  meta?: string;
  title: string;
  body: ReactNode;
  children?: ReactNode;
}) {
  const shadow = useShadow();
  return (
    <View className={`relative rounded-2xl p-space-md ${tone.card}`} style={shadow('card')}>
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={() => dismissNudge(id)}
        className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-surface-container-low dark:bg-surface-container-high items-center justify-center">
        <Icon name="close" className="text-[16px] text-on-surface-variant" />
      </Pressable>
      <View className="flex-row items-start gap-space-sm mb-space-sm">
        <View className={`relative w-12 h-12 rounded-xl items-center justify-center shrink-0 ${iconTile}`} style={shadow('sm')}>
          <Icon name={icon} filled={icon === 'celebration'} className={`text-[24px] ${iconColor}`} />
          {pulse && <View className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-tertiary" />}
        </View>
        <View className="flex-1 pr-6 min-w-0">
          <View className="flex-row items-center gap-1.5 mb-1 flex-wrap">
            <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${tag.className}`}>
              <Icon name={tag.icon} className={`text-[12px] ${tag.text}`} />
              <Text className={`font-label-sm text-label-sm ${tag.text}`}>{tag.label}</Text>
            </View>
            {meta && <Text className="font-label-sm text-label-sm text-on-surface-variant">{meta}</Text>}
          </View>
          <Text numberOfLines={2} className="font-headline-sm text-headline-sm text-on-surface">
            {title}
          </Text>
        </View>
      </View>
      <Text className="font-body-md text-body-md text-on-surface-variant mb-space-md pl-1">{body}</Text>
      {children}
    </View>
  );
}

function Actions({ primary, secondary }: { primary: { icon: IconName; label: string; onPress: () => void; tone?: 'amber' }; secondary?: { icon?: IconName; label: string; onPress: () => void } }) {
  const shadow = useShadow();
  return (
    <View className="flex-row items-center gap-space-xs pt-1">
      <Pressable
        onPress={primary.onPress}
        className={`flex-1 h-11 rounded-full flex-row items-center justify-center gap-1.5 active:scale-95 ${primary.tone === 'amber' ? 'bg-secondary' : 'bg-primary'}`}
        style={shadow('sm')}>
        <Icon name={primary.icon} className={`text-[18px] ${primary.tone === 'amber' ? 'text-on-secondary' : 'text-on-primary'}`} />
        <Text className={`font-label-lg text-label-lg ${primary.tone === 'amber' ? 'text-on-secondary' : 'text-on-primary'}`}>{primary.label}</Text>
      </Pressable>
      {secondary && (
        <Pressable onPress={secondary.onPress} className="h-11 px-4 rounded-full bg-surface-container dark:bg-surface-container-high flex-row items-center justify-center gap-1">
          {secondary.icon && <Icon name={secondary.icon} className="text-[17px] text-on-surface-variant" />}
          <Text className="font-label-md text-label-md text-on-surface">{secondary.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function NudgeView({ nudge, onDone }: { nudge: Nudge; onDone: (message: string, dismissId?: string) => void }) {
  switch (nudge.kind) {
    case 'expiry': {
      const { item, days, recipes } = nudge;
      const name = item.name.replace(/\s*\(.*\)$/, '');
      const where = (item.shelf ?? zones[item.zone].label).toLowerCase();
      const top = recipes[0];
      const expired = days < 0;
      return (
        <Card
          id={nudge.id}
          icon="crisis_alert"
          iconTile={tone.coralTile}
          iconColor="text-on-tertiary-fixed dark:text-tertiary"
          pulse
          tag={{ icon: 'alarm', label: expired ? 'Past its date' : days === 0 ? 'Expires today' : `Expires ${days === 1 ? 'tomorrow' : `in ${days} days`}`, className: tone.coralTile, text: 'text-on-tertiary-fixed dark:text-tertiary' }}
          meta={item.shelf ?? zones[item.zone].label}
          title={`${name} ${expiresPhrase(days)}`}
          body={
            expired
              ? `It passed its date ${-days === 1 ? 'yesterday' : `${-days} days ago`}. If it still looks and smells good, use it today — otherwise log it so the radar can nudge earlier next time.`
              : `You have ${item.remainingPct < 100 ? `${item.remainingPct}% of a ${item.unit}` : `${item.quantity} ${item.unit}`} in the ${where} at risk.${recipes.length ? ` Here ${recipes.length === 1 ? 'is 1 quick idea' : `are ${recipes.length} quick ideas`} to rescue it.` : ' Use it, freeze it, or share it before it turns.'}`
          }>
          {top && !expired && (
            <Pressable onPress={() => router.push(`/recipe/${top.recipe.id}`)} className={`rounded-xl p-space-sm mb-space-md flex-row items-center justify-between ${tone.insetLow}`}>
              <View className="flex-row items-center gap-2 flex-1">
                <Image source={imageSource(top.recipe.image)} style={{ width: 32, height: 32, borderRadius: 8 }} contentFit="cover" />
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-label-sm text-label-sm text-on-surface font-semibold">
                    {top.recipe.title}
                  </Text>
                  <Text className="font-body-sm text-[11px] text-primary leading-tight">
                    {top.recipe.minutes} min prep • Rescues {top.rescues.length} {top.rescues.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>
              <Icon name="chevron_right" className="text-[18px] text-on-surface-variant" />
            </Pressable>
          )}
          {expired ? (
            <Actions
              primary={{ icon: 'check_circle', label: 'Still good — used it', onPress: () => { markUsed(item.id); onDone(`Nice save! ${name} marked as used.`); } }}
              secondary={{ label: 'View item', onPress: () => router.push(`/item/${item.id}`) }}
            />
          ) : (
            <Actions
              primary={{
                icon: 'menu_book',
                label: recipes.length ? `View Recipes (${recipes.length})` : 'Open item',
                onPress: () => (recipes.length ? router.push({ pathname: '/recipes', params: { ingredient: item.id } }) : router.push(`/item/${item.id}`)),
              }}
              secondary={{ icon: 'snooze', label: 'Snooze 12h', onPress: () => { snoozeNudge(nudge.id, 12); onDone(`Snoozed — we'll remind you about ${name} later.`); } }}
            />
          )}
        </Card>
      );
    }
    case 'duplicate': {
      const { older, newer } = nudge;
      const name = older.name.replace(/\s*\(.*\)$/, '');
      const olderDays = daysBetween(today(), older.expiresOn);
      return (
        <Card
          id={nudge.id}
          icon="content_copy"
          iconTile={tone.amberTile}
          iconColor="text-on-secondary-fixed dark:text-secondary"
          tag={{ icon: 'inventory_2', label: `2 × ${name}`, className: tone.amberTile, text: 'text-on-secondary-fixed dark:text-secondary' }}
          meta={zones[older.zone].label}
          title={`Duplicate Item: ${name}`}
          body={`You have two of these. Use the one expiring ${formatShort(older.expiresOn)} first so nothing gets forgotten at the back.`}>
          <View className="flex-row gap-space-sm mb-space-md">
            <View className="flex-1 rounded-xl p-space-sm bg-secondary-fixed/40 dark:bg-[#3B2312] dark:border dark:border-[#5D361B]">
              <Text className="font-label-sm text-label-sm text-secondary uppercase font-bold">Older (use now)</Text>
              <Text numberOfLines={1} className="font-label-md text-label-md text-on-surface mt-0.5">{older.detail ?? older.name}</Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Icon name="event_busy" className="text-[14px] text-secondary" />
                <Text className="font-label-sm text-label-sm text-secondary">{olderDays <= 0 ? 'Due today' : `${olderDays} days left`}</Text>
              </View>
            </View>
            <View className={`flex-1 rounded-xl p-space-sm ${tone.insetLow}`}>
              <Text className="font-label-sm text-label-sm text-on-surface-variant uppercase font-bold">Newer</Text>
              <Text numberOfLines={1} className="font-label-md text-label-md text-on-surface mt-0.5">{newer.detail ?? newer.name}</Text>
              <View className="flex-row items-center gap-1 mt-0.5">
                <Icon name="check_circle" className="text-[14px] text-on-surface-variant" />
                <Text className="font-label-sm text-label-sm text-on-surface-variant">Until {formatShort(newer.expiresOn)}</Text>
              </View>
            </View>
          </View>
          <Actions
            primary={{ icon: 'check_circle', label: 'Mark Older as Used', tone: 'amber', onPress: () => { markUsed(older.id); onDone(`Done — the older ${name.toLowerCase()} is logged as used.`, nudge.id); } }}
            secondary={{ label: 'Details', onPress: () => router.push(`/item/${older.id}`) }}
          />
        </Card>
      );
    }
    case 'freeze': {
      const { item, freezerDays } = nudge;
      const name = item.name.replace(/\s*\(.*\)$/, '');
      const bought = daysBetween(item.purchasedOn, today());
      return (
        <Card
          id={nudge.id}
          icon="ac_unit"
          iconTile="bg-surface-container-high dark:bg-surface-container-highest"
          iconColor="text-on-surface"
          tag={{ icon: 'eco', label: 'Shelf-Life Extension', className: 'bg-surface-container-high dark:bg-surface-container-highest', text: 'text-on-surface-variant' }}
          meta={bought > 0 ? `Bought ${bought}d ago` : undefined}
          title={`Flash Freeze ${name}?`}
          body={`If you aren't cooking it by ${nudge.days <= 0 ? 'tonight' : nudge.days === 1 ? 'tomorrow' : 'the weekend'}, freeze it now to keep it fresh for up to ${freezerDays >= 60 ? `${Math.round(freezerDays / 30)} months` : `${freezerDays} days`}.`}>
          <View className="flex-row items-center gap-space-xs pt-1">
            <Pressable
              onPress={() => { freezeItem(item.id); onDone(`${name} moved to the freezer. Good call!`, nudge.id); }}
              className="flex-1 h-11 rounded-full bg-surface-container-high dark:bg-surface-container-highest flex-row items-center justify-center gap-1.5 active:scale-95">
              <Icon name="ac_unit" className="text-[18px] text-on-surface" />
              <Text className="font-label-lg text-label-lg text-on-surface">Mark as Frozen (+{freezerDays}d)</Text>
            </Pressable>
            <Pressable
              onPress={() => { markUsed(item.id); onDone(`${name} logged as cooked. Delicious!`, nudge.id); }}
              className="h-11 px-4 rounded-full bg-surface-container-low dark:bg-surface-container items-center justify-center">
              <Text className="font-label-md text-label-md text-on-surface">Already Cooked</Text>
            </Pressable>
          </View>
        </Card>
      );
    }
    case 'restock': {
      const { item } = nudge;
      const name = item.name.replace(/\s*\(.*\)$/, '');
      return (
        <Card
          id={nudge.id}
          icon="lightbulb"
          iconTile={tone.freshBg}
          iconColor="text-primary"
          tag={{ icon: 'insights', label: 'Smart Pattern', className: tone.freshBg, text: tone.freshText }}
          title={`${name}: all used up`}
          body={`You finished your ${name.toLowerCase()}${item.detail ? ` (${item.detail})` : ''}. Add it to the restock list so it's on your next shop.`}>
          <Pressable
            onPress={() => {
              addToRestock({ name: item.name, detail: item.detail, category: item.category, priceCents: item.priceCents, image: item.image, reason: 'depleted', sourceItemId: item.id });
              onDone(`${name} added to your restock list.`, nudge.id);
            }}
            className="h-11 rounded-full bg-surface-container-high dark:bg-surface-container-highest flex-row items-center justify-center gap-1.5 active:scale-95">
            <Icon name="add_shopping_cart" className="text-[18px] text-on-surface" />
            <Text className="font-label-lg text-label-lg text-on-surface">Add to Restock List</Text>
          </Pressable>
        </Card>
      );
    }
    case 'win': {
      const names = nudge.names.length > 1 ? `${nudge.names.slice(0, -1).join(', ')} and ${nudge.names.at(-1)}` : nudge.names[0];
      return (
        <Card
          id={nudge.id}
          icon="celebration"
          iconTile={tone.freshBg}
          iconColor="text-on-primary-fixed dark:text-primary"
          tag={{ icon: 'eco', label: 'Zero-Waste Streak', className: tone.freshBg, text: tone.freshText }}
          title="Weekly Food Waste Win!"
          body={
            <>
              You saved <Text className="font-body-md text-body-md text-primary font-semibold">{formatMoney(nudge.savedCents)}</Text> and diverted{' '}
              <Text className="font-body-md text-body-md text-primary font-semibold">{nudge.co2Kg.toFixed(1)} kg CO₂e</Text> this week
              {names ? ` by finishing ${names} in time` : ''}. {nudge.tossed === 0 ? '0 items wasted!' : `Only ${nudge.tossed} ${nudge.tossed === 1 ? 'item' : 'items'} tossed.`}
            </>
          }>
          <View className={`rounded-xl p-space-md mb-space-md flex-row items-center justify-between ${tone.insetLow}`}>
            <Stat icon="savings" value={formatMoney(nudge.savedCents)} label="Wallet preserved" />
            <View className="h-8 w-px bg-surface-variant" />
            <Stat icon="forest" value={`${nudge.co2Kg.toFixed(1)} kg`} label="CO₂e eliminated" />
          </View>
          <Actions
            primary={{ icon: 'insights', label: 'See Impact Report', onPress: () => router.push('/insights') }}
            secondary={{
              icon: 'share',
              label: 'Share',
              onPress: () => Share.share({ message: `This week I saved ${formatMoney(nudge.savedCents)} of food and ${nudge.co2Kg.toFixed(1)} kg CO₂e with Expiry Radar 🌱` }).catch(() => {}),
            }}
          />
        </Card>
      );
    }
    case 'milestone':
      return (
        <Card
          id={nudge.id}
          icon="local_fire_department"
          iconTile={tone.amberTile}
          iconColor="text-secondary"
          tag={{ icon: 'military_tech', label: 'Milestone', className: tone.amberTile, text: 'text-on-secondary-fixed dark:text-secondary' }}
          title={`${nudge.streak}-day zero-waste streak!`}
          body={`Nothing has gone in the bin for ${nudge.streak} days. That's a habit worth celebrating — keep the radar humming.`}
        />
      );
  }
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-full bg-primary-container/10 items-center justify-center">
        <Icon name={icon} className="text-[22px] text-primary" />
      </View>
      <View>
        <Text className="font-headline-sm text-headline-sm text-primary leading-tight">{value}</Text>
        <Text className="font-label-sm text-label-sm text-on-surface-variant">{label}</Text>
      </View>
    </View>
  );
}
