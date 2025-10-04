-- Profiles with full_name & avatar and safe RLS + public avatars bucket
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'reader' check (role in ('admin','contributor','reader')),
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email) values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin');
$$;

drop policy if exists admin_manage_all on public.profiles;
create policy admin_manage_all on public.profiles
for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists user_read_own on public.profiles;
create policy user_read_own on public.profiles
for select to authenticated using (user_id = auth.uid());

drop policy if exists user_update_own on public.profiles;
create policy user_update_own on public.profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Public bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

-- Policies for Storage
drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects
for select to public
using (bucket_id = 'avatars');

drop policy if exists "Users manage own avatars" on storage.objects;
create policy "Users manage own avatars" on storage.objects
for all to authenticated
using (bucket_id = 'avatars' and (auth.uid()::text = (storage.foldername(name)) ) )
with check (bucket_id = 'avatars' and (auth.uid()::text = (storage.foldername(name)) ) );
