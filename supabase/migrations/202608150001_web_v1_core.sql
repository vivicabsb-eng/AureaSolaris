begin;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  timezone text not null,
  locale text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_id_key unique (user_id),
  constraint profiles_display_name_not_blank check (btrim(display_name) <> ''),
  constraint profiles_timezone_not_blank check (btrim(timezone) <> ''),
  constraint profiles_locale_not_blank check (btrim(locale) <> '')
);

create table public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  birth_date date not null,
  birth_time time(0) without time zone not null,
  timezone text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  place text not null,
  house_system text not null default 'P',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint birth_profiles_id_user_id_key unique (id, user_id),
  constraint birth_profiles_label_not_blank check (btrim(label) <> ''),
  constraint birth_profiles_timezone_not_blank check (btrim(timezone) <> ''),
  constraint birth_profiles_place_not_blank check (btrim(place) <> ''),
  constraint birth_profiles_latitude_range check (latitude between -90 and 90),
  constraint birth_profiles_longitude_range check (longitude between -180 and 180),
  constraint birth_profiles_house_system_v1 check (house_system = 'P')
);

create table public.calculation_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_profile_id uuid not null,
  kind text not null,
  input_hash text not null,
  schema_version text not null default 'calculation-receipt.v1',
  input_payload jsonb not null,
  result_payload jsonb not null,
  engine_name text not null,
  engine_version text not null,
  ephemeris_version text not null,
  resolved_at timestamptz not null,
  resolved_timezone text not null,
  created_at timestamptz not null default now(),
  constraint calculation_receipts_birth_profile_owner_fkey
    foreign key (birth_profile_id, user_id)
    references public.birth_profiles(id, user_id)
    on delete cascade,
  constraint calculation_receipts_user_kind_input_key unique (user_id, kind, input_hash),
  constraint calculation_receipts_kind_allowed check (kind in ('natal', 'transit')),
  constraint calculation_receipts_schema_version_v1 check (schema_version = 'calculation-receipt.v1'),
  constraint calculation_receipts_input_hash_not_blank check (btrim(input_hash) <> ''),
  constraint calculation_receipts_input_payload_object check (jsonb_typeof(input_payload) = 'object'),
  constraint calculation_receipts_result_payload_object check (jsonb_typeof(result_payload) = 'object'),
  constraint calculation_receipts_engine_name_not_blank check (btrim(engine_name) <> ''),
  constraint calculation_receipts_engine_version_not_blank check (btrim(engine_version) <> ''),
  constraint calculation_receipts_ephemeris_version_not_blank check (btrim(ephemeris_version) <> ''),
  constraint calculation_receipts_resolved_timezone_not_blank check (btrim(resolved_timezone) <> '')
);

create index birth_profiles_user_id_idx
  on public.birth_profiles(user_id);

create unique index birth_profiles_one_active_per_user_idx
  on public.birth_profiles(user_id)
  where is_active;

create index calculation_receipts_birth_profile_id_idx
  on public.calculation_receipts(birth_profile_id);

create index calculation_receipts_user_created_at_idx
  on public.calculation_receipts(user_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger birth_profiles_set_updated_at
before update on public.birth_profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.birth_profiles enable row level security;
alter table public.calculation_receipts enable row level security;

create policy profiles_owner_all
on public.profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy birth_profiles_owner_all
on public.birth_profiles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy calculation_receipts_owner_all
on public.calculation_receipts
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.birth_profiles, public.calculation_receipts from anon;
grant select, insert, update, delete on public.profiles, public.birth_profiles, public.calculation_receipts to authenticated;

commit;
