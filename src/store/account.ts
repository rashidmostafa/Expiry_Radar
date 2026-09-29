import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { forgetHousehold, queueEverything, startSync, stopSync, syncNow } from '@/services/sync';

import { getValue, setValue } from './persistence';
import { getSettings, updateSettings } from './settings';

/**
 * Account + household state. Everything is optional: without an account the app is fully
 * local. Signing in enables household sync and receipt reading.
 */

export type Household = { id: string; name: string; inviteCode: string; role: 'owner' | 'member' };
export type Member = { userId: string; role: 'owner' | 'member'; displayName: string; handle: string; joinedAt: string; isYou: boolean };

type AccountState = {
  ready: boolean;
  user?: { id: string; email?: string; displayName: string };
  household?: Household;
  members: Member[];
};

const HOUSEHOLD_KEY = 'household';

let state: AccountState = { ready: !supabase, members: [], household: getValue<Household>(HOUSEHOLD_KEY) };
const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  if ('household' in patch) setValue(HOUSEHOLD_KEY, patch.household ?? null);
  listeners.forEach((listener) => listener());
}

export function useAccount() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
}

function requireClient() {
  if (!supabase) throw new Error('Accounts are not set up in this build yet.');
  return supabase;
}

/** Friendlier wording for the auth errors people actually hit. */
function explain(error: { message: string } | null) {
  if (!error) return undefined;
  const message = error.message;
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match an account.';
  if (/already registered|already been registered/i.test(message)) return 'An account with that email already exists. Try logging in.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first — check your inbox for the link.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  if (/provider is not enabled|unsupported provider/i.test(message)) return 'That sign-in option isn’t switched on yet. Use email for now.';
  if (/network|fetch/i.test(message)) return 'Can’t reach the server. Check your connection.';
  return message;
}

async function applySession(session: Session | null) {
  if (!session) {
    stopSync();
    set({ ready: true, user: undefined, members: [] });
    return;
  }
  const meta = session.user.user_metadata as { display_name?: string } | undefined;
  set({ ready: true, user: { id: session.user.id, email: session.user.email, displayName: meta?.display_name ?? '' } });
  if (!getSettings().userName && meta?.display_name) updateSettings({ userName: meta.display_name.split(' ')[0] });
  await refreshHousehold();
}

/** Call once at startup. */
export function initAccount() {
  if (!supabase) return;
  // Resume syncing immediately with the last known household, even before the network answers.
  if (state.household) startSync(state.household.id);
  supabase.auth.getSession().then(({ data }) => applySession(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void applySession(session);
  });
}

/** Reloads the household the user belongs to (first one) and its members. */
export async function refreshHousehold() {
  const client = requireClient();
  const user = state.user;
  if (!user) return;
  const { data: memberships, error } = await client
    .from('household_members')
    .select('role, households(id, name, invite_code)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1);
  if (error) return; // Offline: keep the cached household.
  const membership = memberships?.[0] as unknown as { role: Household['role']; households: { id: string; name: string; invite_code: string } } | undefined;
  if (!membership) {
    if (state.household) forgetHousehold();
    set({ household: undefined, members: [] });
    return;
  }
  const household: Household = {
    id: membership.households.id,
    name: membership.households.name,
    inviteCode: membership.households.invite_code,
    role: membership.role,
  };
  set({ household });
  startSync(household.id);

  const { data: rows } = await client
    .from('household_members')
    .select('user_id, role, joined_at')
    .eq('household_id', household.id)
    .order('joined_at', { ascending: true });
  const ids = (rows ?? []).map((row) => row.user_id as string);
  const { data: profiles } = ids.length ? await client.from('profiles').select('id, display_name, handle').in('id', ids) : { data: [] };
  const byId = new Map((profiles ?? []).map((profile) => [profile.id as string, profile]));
  set({
    members: (rows ?? []).map((row) => ({
      userId: row.user_id as string,
      role: row.role as Member['role'],
      joinedAt: row.joined_at as string,
      displayName: (byId.get(row.user_id)?.display_name as string) || 'Household member',
      handle: (byId.get(row.user_id)?.handle as string) || '',
      isYou: row.user_id === user.id,
    })),
  });
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function signUp(input: { name: string; email: string; password: string }) {
  const client = requireClient();
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { display_name: input.name.trim() }, emailRedirectTo: Linking.createURL('auth/callback') },
  });
  if (error) return { error: explain(error) };
  if (!getSettings().userName) updateSettings({ userName: input.name.trim().split(' ')[0] });
  // With email confirmation on, there's no session until the link is opened.
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  return { error: explain(error) };
}

export async function signInWithProvider(provider: 'google' | 'apple') {
  const client = requireClient();
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' } });
  if (error) return { error: explain(error) };
  if (Platform.OS === 'web') return {};
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return {};
  return completeAuthRedirect(result.url);
}

/** Finishes an OAuth / email-link / password-reset redirect (PKCE code exchange). */
export async function completeAuthRedirect(url: string) {
  const client = requireClient();
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : undefined;
  const failure = typeof queryParams?.error_description === 'string' ? queryParams.error_description : undefined;
  if (failure) return { error: failure };
  if (!code) return { error: 'That link is missing its sign-in code. Request a new one.' };
  const { error } = await client.auth.exchangeCodeForSession(code);
  return { error: explain(error) };
}

export async function sendPasswordReset(email: string) {
  const client = requireClient();
  const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('auth/reset-password') });
  return { error: explain(error) };
}

export async function updatePassword(password: string) {
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password });
  return { error: explain(error) };
}

export async function updateProfile(patch: { displayName?: string; handle?: string }) {
  if (!supabase || !state.user) return;
  await supabase
    .from('profiles')
    .update({
      ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
      ...(patch.handle !== undefined ? { handle: patch.handle } : {}),
    })
    .eq('id', state.user.id);
}

export async function signOut() {
  const client = requireClient();
  forgetHousehold();
  set({ household: undefined, members: [] });
  await client.auth.signOut();
}

// ─── Household ──────────────────────────────────────────────────────────────

type Result<T = unknown> = { data?: T; error?: string };

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<Result<T>> {
  const client = requireClient();
  const { data, error } = await client.rpc(name, args);
  if (error) return { error: error.message.replace(/^.*?:\s*/, '') };
  return { data: data as T };
}

/** Creates a household and uploads this device's pantry into it. */
export async function createHousehold(name: string): Promise<Result> {
  const result = await rpc<{ id: string }>('create_household', { household_name: name });
  if (result.error) return result;
  queueEverything();
  await refreshHousehold();
  return {};
}

/** Joins with an invite code; this device's pantry is merged into the shared one. */
export async function joinHousehold(code: string): Promise<Result> {
  if (state.household) return { error: 'Leave your current household first.' };
  const result = await rpc<{ id: string }>('join_household', { code });
  if (result.error) return result;
  queueEverything();
  await refreshHousehold();
  return {};
}

export async function leaveHousehold(): Promise<Result> {
  if (!state.household) return {};
  const result = await rpc('leave_household', { target: state.household.id });
  if (result.error) return result;
  forgetHousehold();
  set({ household: undefined, members: [] });
  return {};
}

export async function removeMember(userId: string): Promise<Result> {
  if (!state.household) return {};
  const result = await rpc('remove_household_member', { target: state.household.id, member: userId });
  if (!result.error) await refreshHousehold();
  return result;
}

export async function renameHousehold(name: string): Promise<Result> {
  const client = requireClient();
  if (!state.household) return {};
  const { error } = await client.from('households').update({ name: name.trim() }).eq('id', state.household.id);
  if (error) return { error: error.message };
  set({ household: { ...state.household, name: name.trim() } });
  return {};
}

export async function newInviteCode(): Promise<Result<string>> {
  if (!state.household) return {};
  const result = await rpc<string>('regenerate_invite_code', { target: state.household.id });
  if (result.data) set({ household: { ...state.household, inviteCode: result.data } });
  return result;
}

export function inviteLink(code: string) {
  return Linking.createURL('join', { queryParams: { code } });
}

export { syncNow };
