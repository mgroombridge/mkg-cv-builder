-- MKG CV Builder account-stage schema
-- Applied to Supabase project: Cv-builder

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  phone text not null default '',
  location text not null default '',
  career_goals text not null default '',
  target_roles text not null default '',
  default_cv_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled CV',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cvs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  change_details text not null default 'Edit',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cvs_user_updated_idx on public.cvs(user_id, updated_at desc);
create index if not exists cv_versions_cv_created_idx on public.cv_versions(cv_id, created_at desc);
create index if not exists cv_versions_user_created_idx on public.cv_versions(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists cvs_set_updated_at on public.cvs;
create trigger cvs_set_updated_at before update on public.cvs for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.cv_versions enable row level security;

revoke all on public.profiles from anon;
revoke all on public.cvs from anon;
revoke all on public.cv_versions from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.cvs to authenticated;
grant select, insert, update, delete on public.cv_versions to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists "cvs_select_own" on public.cvs;
create policy "cvs_select_own" on public.cvs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "cvs_insert_own" on public.cvs;
create policy "cvs_insert_own" on public.cvs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "cvs_update_own" on public.cvs;
create policy "cvs_update_own" on public.cvs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "cvs_delete_own" on public.cvs;
create policy "cvs_delete_own" on public.cvs for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "cv_versions_select_own" on public.cv_versions;
create policy "cv_versions_select_own" on public.cv_versions for select to authenticated using (
  (select auth.uid()) = user_id and exists (
    select 1 from public.cvs c where c.id = cv_versions.cv_id and c.user_id = (select auth.uid())
  )
);
drop policy if exists "cv_versions_insert_own" on public.cv_versions;
create policy "cv_versions_insert_own" on public.cv_versions for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.cvs c where c.id = cv_versions.cv_id and c.user_id = (select auth.uid())
  )
);
drop policy if exists "cv_versions_delete_own" on public.cv_versions;
create policy "cv_versions_delete_own" on public.cv_versions for delete to authenticated using ((select auth.uid()) = user_id);
