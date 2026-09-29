-- Expiry Radar: households, membership and synced pantry records.
--
-- The app is local-first: each device keeps its own SQLite copy. When a signed-in user belongs to
-- a household, pantry items, the waste/savings ledger and the restock list sync through the
-- tables below as whole JSON documents with last-write-wins on the client's updated_at.
-- Deletions are tombstones (deleted = true) so every device learns about them.

create extension if not exists pgcrypto;

-- ─── Profiles ────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  handle text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Create a profile row for every new account (name comes from sign-up metadata).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Households ──────────────────────────────────────────────────────────────

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- security definer so RLS policies can call it without recursing into household_members' own policy.
create function public.is_household_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target and user_id = auth.uid()
  );
$$;

create function public.is_household_owner(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target and user_id = auth.uid() and role = 'owner'
  );
$$;

create policy "Members read their household"
  on public.households for select to authenticated
  using (public.is_household_member(id));

create policy "Owners rename their household"
  on public.households for update to authenticated
  using (public.is_household_owner(id))
  with check (public.is_household_owner(id));

create policy "Members see each other"
  on public.household_members for select to authenticated
  using (public.is_household_member(household_id));

-- Profiles are visible to yourself and to people you share a household with.
create policy "Read own and housemates' profiles"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.household_members mine
      join public.household_members theirs on theirs.household_id = mine.household_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

create policy "Update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Membership changes go through these functions so the rules live in one place.

-- Unambiguous alphabet (no 0/O, 1/I/L) so codes are easy to read aloud.
create function public.new_invite_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;

create function public.create_household(household_name text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.households;
begin
  if auth.uid() is null then
    raise exception 'Sign in to create a household';
  end if;
  insert into public.households (name, invite_code, created_by)
  values (trim(household_name), public.new_invite_code(), auth.uid())
  returning * into created;
  insert into public.household_members (household_id, user_id, role)
  values (created.id, auth.uid(), 'owner');
  return created;
end;
$$;

create function public.join_household(code text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.households;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a household';
  end if;
  select * into target from public.households where invite_code = upper(trim(code));
  if target.id is null then
    raise exception 'That invite code does not match any household';
  end if;
  insert into public.household_members (household_id, user_id, role)
  values (target.id, auth.uid(), 'member')
  on conflict do nothing;
  return target;
end;
$$;

-- Leaving as the last owner hands ownership to the longest-standing member,
-- and the household is deleted when nobody is left.
create function public.leave_household(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.household_members where household_id = target and user_id = auth.uid();
  if not exists (select 1 from public.household_members where household_id = target) then
    delete from public.households where id = target;
  elsif not exists (select 1 from public.household_members where household_id = target and role = 'owner') then
    update public.household_members set role = 'owner'
    where household_id = target
      and user_id = (
        select user_id from public.household_members
        where household_id = target order by joined_at limit 1
      );
  end if;
end;
$$;

create function public.remove_household_member(target uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_household_owner(target) then
    raise exception 'Only the household owner can remove members';
  end if;
  if member = auth.uid() then
    raise exception 'Use leave_household to leave your own household';
  end if;
  delete from public.household_members where household_id = target and user_id = member;
end;
$$;

create function public.regenerate_invite_code(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text;
begin
  if not public.is_household_owner(target) then
    raise exception 'Only the household owner can change the invite code';
  end if;
  code := public.new_invite_code();
  update public.households set invite_code = code where id = target;
  return code;
end;
$$;

-- ─── Synced records ──────────────────────────────────────────────────────────
-- One table per record kind, same shape. `updated_at` is the client's edit time (last write wins);
-- `synced_at` is server time and is what devices page through when pulling changes.

create table public.pantry_items (
  id uuid primary key,
  household_id uuid not null references public.households on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  updated_by uuid default auth.uid() references auth.users on delete set null,
  synced_at timestamptz not null default now()
);

create table public.ledger_events (like public.pantry_items including all);
create table public.restock_entries (like public.pantry_items including all);

alter table public.ledger_events
  add foreign key (household_id) references public.households on delete cascade;
alter table public.restock_entries
  add foreign key (household_id) references public.households on delete cascade;

create index pantry_items_pull on public.pantry_items (household_id, synced_at);
create index ledger_events_pull on public.ledger_events (household_id, synced_at);
create index restock_entries_pull on public.restock_entries (household_id, synced_at);

-- Last write wins: an older edit arriving late never overwrites a newer one.
create function public.keep_newest_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.household_id <> old.household_id then
    raise exception 'Records cannot move between households';
  end if;
  new.synced_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['pantry_items', 'ledger_events', 'restock_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create trigger keep_newest before insert or update on public.%I for each row execute function public.keep_newest_version()',
      t
    );
    execute format(
      'create policy "Members read" on public.%I for select to authenticated using (public.is_household_member(household_id))',
      t
    );
    execute format(
      'create policy "Members add" on public.%I for insert to authenticated with check (public.is_household_member(household_id))',
      t
    );
    execute format(
      'create policy "Members edit" on public.%I for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id))',
      t
    );
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end;
$$;

-- ─── Receipt scanning quota ──────────────────────────────────────────────────
-- Written only by the parse-receipt edge function (service role); lets it cap daily AI usage.

create table public.receipt_scans (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  succeeded boolean not null default false
);

create index receipt_scans_user_day on public.receipt_scans (user_id, created_at);

alter table public.receipt_scans enable row level security;

create policy "Read own scans"
  on public.receipt_scans for select to authenticated
  using (user_id = auth.uid());

-- Functions run as their owner; only signed-in users may call the membership ones.
revoke execute on function public.create_household(text), public.join_household(text),
  public.leave_household(uuid), public.remove_household_member(uuid, uuid),
  public.regenerate_invite_code(uuid)
  from public, anon;
grant execute on function public.create_household(text), public.join_household(text),
  public.leave_household(uuid), public.remove_household_member(uuid, uuid),
  public.regenerate_invite_code(uuid)
  to authenticated;
