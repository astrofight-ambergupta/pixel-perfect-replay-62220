create extension if not exists pgcrypto with schema extensions;
create type public.workspace_role as enum ('astronaut','professional');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null,
  description text not null default '',
  created_at timestamptz not null default now()
);
grant select, update, delete on public.workspaces to authenticated;
grant all on public.workspaces to service_role;
alter table public.workspaces enable row level security;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role public.workspace_role not null,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id, role)
);
grant select, delete on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;
alter table public.workspace_members enable row level security;

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code_hash text not null unique,
  code_hint text not null,
  role public.workspace_role not null default 'astronaut',
  created_by uuid not null,
  expires_at timestamptz not null default now() + interval '14 days',
  revoked boolean not null default false,
  uses int not null default 0,
  created_at timestamptz not null default now()
);
grant select, update on public.workspace_invites to authenticated;
grant all on public.workspace_invites to service_role;
alter table public.workspace_invites enable row level security;

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  kind text not null check (kind in ('checkin','note','voice','profile')),
  local_id text not null,
  record_date date,
  payload jsonb not null,
  synced_at timestamptz not null default now(),
  unique (workspace_id, user_id, kind, local_id)
);
grant select, insert, update on public.health_records to authenticated;
grant all on public.health_records to service_role;
alter table public.health_records enable row level security;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  level text not null check (level in ('attention','severe')),
  reason text not null default '',
  status text not null default 'open' check (status in ('open','reviewed')),
  reviewed_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;

create table public.sync_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  requested_by uuid not null,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);
grant select, insert, update on public.sync_requests to authenticated;
grant all on public.sync_requests to service_role;
alter table public.sync_requests enable row level security;

create table public.access_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null,
  subject_user_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.access_log to authenticated;
grant all on public.access_log to service_role;
alter table public.access_log enable row level security;

-- helpers
create or replace function public.is_member(_ws uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from workspace_members where workspace_id=_ws and user_id=_uid) $$;
create or replace function public.is_professional(_ws uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from workspace_members where workspace_id=_ws and user_id=_uid and role='professional') $$;
create or replace function public.is_astronaut(_ws uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from workspace_members where workspace_id=_ws and user_id=_uid and role='astronaut') $$;
create or replace function public.is_owner(_ws uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from workspaces where id=_ws and owner_id=_uid) $$;

-- policies
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create policy "members read workspace" on public.workspaces for select to authenticated using (public.is_member(id, auth.uid()));
create policy "owner updates workspace" on public.workspaces for update to authenticated using (owner_id = auth.uid());
create policy "owner deletes workspace" on public.workspaces for delete to authenticated using (owner_id = auth.uid());

create policy "see own memberships" on public.workspace_members for select to authenticated using (user_id = auth.uid());
create policy "professionals see members" on public.workspace_members for select to authenticated using (public.is_professional(workspace_id, auth.uid()));
create policy "owner removes members" on public.workspace_members for delete to authenticated using (public.is_owner(workspace_id, auth.uid()) and user_id <> auth.uid());
create policy "leave workspace" on public.workspace_members for delete to authenticated using (user_id = auth.uid() and not public.is_owner(workspace_id, auth.uid()));

create policy "owner reads invites" on public.workspace_invites for select to authenticated using (public.is_owner(workspace_id, auth.uid()));
create policy "owner revokes invites" on public.workspace_invites for update to authenticated using (public.is_owner(workspace_id, auth.uid()));

create policy "astronaut reads own records" on public.health_records for select to authenticated using (user_id = auth.uid() and public.is_astronaut(workspace_id, auth.uid()));
create policy "professional reads records" on public.health_records for select to authenticated using (public.is_professional(workspace_id, auth.uid()));
create policy "astronaut writes own records" on public.health_records for insert to authenticated with check (user_id = auth.uid() and public.is_astronaut(workspace_id, auth.uid()));
create policy "astronaut updates own records" on public.health_records for update to authenticated using (user_id = auth.uid() and public.is_astronaut(workspace_id, auth.uid())) with check (user_id = auth.uid() and public.is_astronaut(workspace_id, auth.uid()));

create policy "astronaut raises own alert" on public.alerts for insert to authenticated with check (user_id = auth.uid() and public.is_astronaut(workspace_id, auth.uid()));
create policy "professional reads alerts" on public.alerts for select to authenticated using (public.is_professional(workspace_id, auth.uid()));
create policy "professional reviews alerts" on public.alerts for update to authenticated using (public.is_professional(workspace_id, auth.uid()));

create policy "professional requests sync" on public.sync_requests for insert to authenticated with check (requested_by = auth.uid() and public.is_professional(workspace_id, auth.uid()) and public.is_astronaut(workspace_id, user_id));
create policy "professional sees sync" on public.sync_requests for select to authenticated using (public.is_professional(workspace_id, auth.uid()));
create policy "astronaut sees own sync" on public.sync_requests for select to authenticated using (user_id = auth.uid());
create policy "astronaut fulfils sync" on public.sync_requests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "professional logs access" on public.access_log for insert to authenticated with check (actor_id = auth.uid() and public.is_professional(workspace_id, auth.uid()));
create policy "professional reads log" on public.access_log for select to authenticated using (public.is_professional(workspace_id, auth.uid()));

-- RPCs
create or replace function public.create_workspace(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid; dn text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select display_name into dn from profiles where id = auth.uid();
  insert into workspaces(name, owner_id) values (trim(_name), auth.uid()) returning id into ws;
  insert into workspace_members(workspace_id, user_id, role, display_name) values (ws, auth.uid(), 'professional', coalesce(dn,''));
  return ws;
end $$;

create or replace function public.create_invite(_ws uuid, _role public.workspace_role default 'astronaut')
returns text language plpgsql security definer set search_path = public, extensions as $$
declare code text;
begin
  if not is_owner(_ws, auth.uid()) then raise exception 'only the workspace owner can invite'; end if;
  code := upper(substr(encode(gen_random_bytes(8),'hex'),1,4) || '-' || substr(encode(gen_random_bytes(8),'hex'),1,4) || '-' || substr(encode(gen_random_bytes(8),'hex'),1,4));
  insert into workspace_invites(workspace_id, code_hash, code_hint, role, created_by)
  values (_ws, encode(digest(code,'sha256'),'hex'), right(code,4), _role, auth.uid());
  return code;
end $$;

create or replace function public.redeem_invite(_code text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare inv workspace_invites; dn text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from workspace_invites where code_hash = encode(digest(upper(trim(_code)),'sha256'),'hex');
  if inv.id is null or inv.revoked or inv.expires_at < now() then raise exception 'This invitation code is not valid or has expired.'; end if;
  select display_name into dn from profiles where id = auth.uid();
  insert into workspace_members(workspace_id, user_id, role, display_name) values (inv.workspace_id, auth.uid(), inv.role, coalesce(dn,''))
  on conflict do nothing;
  update workspace_invites set uses = uses + 1 where id = inv.id;
  return inv.workspace_id;
end $$;

revoke execute on function public.create_workspace(text) from anon, public;
revoke execute on function public.create_invite(uuid, public.workspace_role) from anon, public;
revoke execute on function public.redeem_invite(text) from anon, public;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.create_invite(uuid, public.workspace_role) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.sync_requests;