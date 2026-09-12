create extension if not exists pgcrypto;

-- Enums
create type group_access as enum ('public', 'private');
create type group_discovery as enum ('global', 'local', 'hidden');
create type group_consequence as enum ('auto_kick', 'three_strikes', 'social_shame');
create type member_role as enum ('founder', 'admin', 'member');
create type member_cycle_status as enum ('safe', 'pending', 'fell_off');

-- 1. Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'User',
  handle text not null unique,
  bio text not null default '',
  avatar_initials text not null default 'XX',
  city text not null default 'San Francisco',
  region text not null default 'California',
  country text not null default 'USA',
  latitude double precision not null default 37.7749,
  longitude double precision not null default -122.4194,
  streak_days integer not null default 0,
  total_sessions integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Groups
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  interests text[] not null default '{}',
  sport_types text[] not null default '{}',
  access group_access not null default 'public',
  discovery group_discovery not null default 'global',
  consequence group_consequence not null default 'three_strikes',
  checkin_frequency integer not null default 3 check (checkin_frequency between 1 and 7),
  require_photo boolean not null default false,
  invite_code text unique,
  city text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  member_count integer not null default 1,
  cycle_start_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3. Group Secrets (Private Passwords)
create table public.group_secrets (
  group_id uuid primary key references public.groups (id) on delete cascade,
  password_hash text not null
);
alter table public.group_secrets enable row level security;

-- 4. Group Members
create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role member_role not null default 'member',
  strikes integer not null default 0,
  checkins_this_cycle integer not null default 0,
  cycle_status member_cycle_status not null default 'pending',
  last_checked_in_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 5. Democratic Kick Votes (For "Fell Off" members)
create table public.group_kick_votes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id) on delete cascade,
  voter_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_vote_per_target unique (group_id, target_user_id, voter_user_id)
);

-- 6. Activities (Feed Posts)
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  sport_type text,
  title text not null,
  notes text,
  duration_minutes integer not null,
  metrics jsonb,
  photo_url text,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7. Group Check-Ins (Audit Log)
create table public.group_checkins (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete set null,
  photo_url text,
  created_at timestamptz not null default now()
);

-- 8. Goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  sport_type text,
  title text not null,
  intent text not null,
  target_value integer not null,
  current_value integer not null default 0,
  unit text not null,
  deadline date,
  is_public boolean not null default true,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

-- =======================================================
-- RPC FUNCTIONS & TRIGGERS
-- =======================================================

-- Auto Profile on Signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_handle text;
  final_handle text;
begin
  base_handle := '@' || split_part(new.email, '@', 1);
  final_handle := base_handle;
  while exists (select 1 from public.profiles where handle = final_handle) loop
    final_handle := base_handle || floor(random() * 10000)::text;
  end loop;

  insert into public.profiles (id, name, handle, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    final_handle,
    upper(left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Maintain Member Count
create or replace function public.refresh_group_member_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.groups
    set member_count = (select count(*) from public.group_members where group_id = new.group_id)
    where id = new.group_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.groups
    set member_count = (select count(*) from public.group_members where group_id = old.group_id)
    where id = old.group_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger group_members_count_insert
  after insert on public.group_members for each row execute function public.refresh_group_member_count();

create trigger group_members_count_delete
  after delete on public.group_members for each row execute function public.refresh_group_member_count();

-- Create Group RPC
create or replace function public.create_group(
  p_name text,
  p_description text,
  p_interests text[],
  p_sport_types text[],
  p_access group_access,
  p_discovery group_discovery,
  p_consequence group_consequence,
  p_checkin_frequency integer,
  p_require_photo boolean,
  p_password text default null,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  code text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if p_access = 'private' and (p_password is null or length(p_password) < 4) then
    raise exception 'Private groups require a password of at least 4 characters';
  end if;

  if p_discovery = 'hidden' then
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;

  insert into public.groups (
    creator_id, name, description, interests, sport_types,
    access, discovery, consequence, checkin_frequency, require_photo,
    invite_code, city, region, country, latitude, longitude
  )
  values (
    auth.uid(), trim(p_name), trim(p_description), p_interests, coalesce(p_sport_types, '{}'),
    p_access, p_discovery, p_consequence, p_checkin_frequency, p_require_photo,
    code, p_city, p_region, p_country, p_latitude, p_longitude
  ) returning id into new_id;

  if p_access = 'private' then
    insert into public.group_secrets (group_id, password_hash)
    values (new_id, extensions.crypt(p_password, extensions.gen_salt('bf')));
  end if;

  insert into public.group_members (group_id, user_id, role, cycle_status)
  values (new_id, auth.uid(), 'founder', 'pending');

  return new_id;
end;
$$;

-- Join Group RPC
create or replace function public.join_group(
  p_group_id uuid,
  p_password text default null,
  p_invite_code text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.groups%rowtype;
  stored_hash text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Not authenticated'); end if;

  select * into g from public.groups where id = p_group_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Group not found'); end if;

  if exists (select 1 from public.group_members where group_id = p_group_id and user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Already a member');
  end if;

  if g.discovery = 'hidden' then
    if p_invite_code is null or upper(trim(p_invite_code)) <> upper(g.invite_code) then
      return jsonb_build_object('ok', false, 'error', 'Invalid invite code', 'needs_password', false);
    end if;
  end if;

  if g.access = 'private' then
    select password_hash into stored_hash from public.group_secrets where group_id = p_group_id;
    if stored_hash is null or p_password is null or extensions.crypt(p_password, stored_hash) <> stored_hash then
      return jsonb_build_object('ok', false, 'error', 'Incorrect password', 'needs_password', true);
    end if;
  end if;

  insert into public.group_members (group_id, user_id, role, cycle_status)
  values (p_group_id, auth.uid(), 'member', 'pending');

  return jsonb_build_object('ok', true);
end;
$$;

-- Multi-Group Unified Check-In RPC
create or replace function public.log_checkin(
  p_group_ids uuid[],
  p_title text,
  p_category text,
  p_sport_type text default null,
  p_duration_minutes integer default 30,
  p_notes text default null,
  p_photo_url text default null,
  p_metrics jsonb default null,
  p_post_to_feed boolean default true,
  p_is_anonymous boolean default false
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  act_id uuid := null;
  gid uuid;
  g_freq integer;
  g_photo_req boolean;
  new_count integer;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Not authenticated'); end if;

  -- Create public feed activity if requested
  if p_post_to_feed then
    insert into public.activities (
      user_id, category, sport_type, title, notes,
      duration_minutes, metrics, photo_url, is_anonymous
    ) values (
      auth.uid(), p_category, p_sport_type, p_title, p_notes,
      p_duration_minutes, p_metrics, p_photo_url, p_is_anonymous
    ) returning id into act_id;
  end if;

  -- Process check-in for each group
  foreach gid in array p_group_ids loop
    select checkin_frequency, require_photo into g_freq, g_photo_req
    from public.groups where id = gid;

    if g_photo_req and p_photo_url is null then
      return jsonb_build_object('ok', false, 'error', 'Group requires photo verification');
    end if;

    -- Record check-in audit
    insert into public.group_checkins (group_id, user_id, activity_id, photo_url)
    values (gid, auth.uid(), act_id, p_photo_url);

    -- Update member cycle counts & status
    update public.group_members
    set 
      checkins_this_cycle = checkins_this_cycle + 1,
      last_checked_in_at = now(),
      cycle_status = case 
        when (checkins_this_cycle + 1) >= g_freq then 'safe'::member_cycle_status
        else 'pending'::member_cycle_status
      end
    where group_id = gid and user_id = auth.uid()
    returning checkins_this_cycle into new_count;
  end loop;

  -- Update streak & total count on profile
  update public.profiles 
  set total_sessions = total_sessions + 1, streak_days = streak_days + 1
  where id = auth.uid();

  return jsonb_build_object('ok', true, 'activity_id', act_id);
end;
$$;

-- Democratic Kick Vote RPC (For "Fell Off" members)
create or replace function public.vote_to_kick_member(
  p_group_id uuid,
  p_target_user_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target_status member_cycle_status;
  total_members integer;
  current_votes integer;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Not authenticated'); end if;
  if auth.uid() = p_target_user_id then return jsonb_build_object('ok', false, 'error', 'Cannot vote on yourself'); end if;

  -- Check target eligibility
  select cycle_status into target_status 
  from public.group_members where group_id = p_group_id and user_id = p_target_user_id;

  if target_status is null then return jsonb_build_object('ok', false, 'error', 'Target is not a member'); end if;
  if target_status <> 'fell_off' then return jsonb_build_object('ok', false, 'error', 'Can only vote to kick members who fell off'); end if;

  -- Cast vote
  insert into public.group_kick_votes (group_id, target_user_id, voter_user_id)
  values (p_group_id, p_target_user_id, auth.uid())
  on conflict do nothing;

  -- Count total members and votes
  select member_count into total_members from public.groups where id = p_group_id;
  select count(*) into current_votes from public.group_kick_votes 
  where group_id = p_group_id and target_user_id = p_target_user_id;

  -- Check for majority kick threshold
  if current_votes > (total_members / 2) then
    delete from public.group_members where group_id = p_group_id and user_id = p_target_user_id;
    delete from public.group_kick_votes where group_id = p_group_id and target_user_id = p_target_user_id;
    return jsonb_build_object('ok', true, 'kicked', true, 'votes', current_votes);
  end if;

  return jsonb_build_object('ok', true, 'kicked', false, 'votes', current_votes, 'needed', (total_members / 2) + 1);
end;
$$;

-- RLS Declarations
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_kick_votes enable row level security;
alter table public.activities enable row level security;
alter table public.group_checkins enable row level security;
alter table public.goals enable row level security;

create policy "Profiles viewable by all" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Groups discoverable" on public.groups for select using (
  discovery in ('global', 'local') or creator_id = auth.uid() or
  exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid())
);

create policy "Members viewable" on public.group_members for select using (true);
create policy "Kick votes viewable" on public.group_kick_votes for select using (true);
create policy "Activities viewable" on public.activities for select using (true);
create policy "Checkins viewable" on public.group_checkins for select using (true);
create policy "Goals viewable" on public.goals for select using (is_public = true or auth.uid() = user_id);