import { useMemo } from 'react';

import { buildNudges } from '@/domain/nudges';

import { isHidden, useNudgeState } from './nudge-state';
import { useEvents, useItems, zeroWasteStreak } from './pantry';
import { useRankedRecipes } from './recipe-book';
import { useRestock } from './restock';
import { useSettings } from './settings';

/** Visible smart nudges (not dismissed/snoozed) and how many are new. */
export function useNudges() {
  const items = useItems();
  const events = useEvents();
  const ranked = useRankedRecipes();
  const settings = useSettings();
  const nudgeState = useNudgeState();
  const restock = useRestock();

  return useMemo(() => {
    const all = buildNudges({
      items,
      events,
      ranked,
      settings,
      streak: zeroWasteStreak(events, items),
      onRestockList: (name) =>
        restock.entries.some((entry) => !entry.inCart && entry.name.trim().toLowerCase() === name.trim().toLowerCase()),
    });
    const nudges = all.filter((nudge) => !isHidden(nudge.id, nudgeState));
    const unseen = nudges.filter((nudge) => !nudgeState.seen.includes(nudge.id));
    return { nudges, unseenIds: unseen.map((nudge) => nudge.id) };
  }, [items, events, ranked, settings, nudgeState, restock]);
}
