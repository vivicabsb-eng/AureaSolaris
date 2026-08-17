begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

-- Tables and exact V1 columns.
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'birth_profiles', 'birth_profiles table exists');
select has_table('public', 'calculation_receipts', 'calculation_receipts table exists');

select is(
  (select string_agg(column_name, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles'),
  'id,user_id,display_name,timezone,locale,created_at,updated_at',
  'profiles exposes only the Web V1 columns'
);

select is(
  (select string_agg(column_name, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'birth_profiles'),
  'id,user_id,label,birth_date,birth_time,timezone,latitude,longitude,place,house_system,is_active,created_at,updated_at',
  'birth_profiles exposes the normalized Web V1 birth contract'
);

select is(
  (select string_agg(column_name, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'calculation_receipts'),
  'id,user_id,birth_profile_id,kind,input_hash,schema_version,input_payload,result_payload,engine_name,engine_version,ephemeris_version,resolved_at,resolved_timezone,created_at',
  'calculation_receipts stores certified receipt provenance and payloads'
);

-- UUID identity/ownership and timestamp types.
select is(
  (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name in ('id', 'user_id')),
  'id:uuid,user_id:uuid',
  'profiles uses UUID ids and ownership'
);

select is(
  (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'birth_profiles' and column_name in ('id', 'user_id')),
  'id:uuid,user_id:uuid',
  'birth_profiles uses UUID ids and ownership'
);

select is(
  (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'calculation_receipts' and column_name in ('id', 'user_id', 'birth_profile_id')),
  'id:uuid,user_id:uuid,birth_profile_id:uuid',
  'calculation_receipts uses UUID ids, ownership, and birth references'
);

select is(
  (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name in ('created_at', 'updated_at')),
  'created_at:timestamp with time zone,updated_at:timestamp with time zone',
  'profiles timestamps are timezone-aware'
);

select is(
  (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'birth_profiles' and column_name in ('created_at', 'updated_at')),
  'created_at:timestamp with time zone,updated_at:timestamp with time zone',
  'birth_profiles timestamps are timezone-aware'
);

select is(
  (select string_agg(column_name || ':' || data_type, ',' order by ordinal_position)
   from information_schema.columns
   where table_schema = 'public' and table_name = 'calculation_receipts' and column_name in ('resolved_at', 'created_at')),
  'resolved_at:timestamp with time zone,created_at:timestamp with time zone',
  'receipt timestamps are timezone-aware'
);

-- Foreign keys and owner-preserving receipt reference.
select is(
  (select count(*)::integer
   from pg_constraint c
   join pg_class t on t.oid = c.conrelid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public' and t.relname = 'profiles' and c.contype = 'f'
     and pg_get_constraintdef(c.oid) like 'FOREIGN KEY (user_id) REFERENCES auth.users(id)%'),
  1,
  'profiles.user_id references auth.users'
);

select is(
  (select count(*)::integer
   from pg_constraint c
   join pg_class t on t.oid = c.conrelid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public' and t.relname = 'birth_profiles' and c.contype = 'f'
     and pg_get_constraintdef(c.oid) like 'FOREIGN KEY (user_id) REFERENCES auth.users(id)%'),
  1,
  'birth_profiles.user_id references auth.users'
);

select is(
  (select count(*)::integer
   from pg_constraint c
   join pg_class t on t.oid = c.conrelid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public' and t.relname = 'calculation_receipts' and c.contype = 'f'
     and pg_get_constraintdef(c.oid) like 'FOREIGN KEY (user_id) REFERENCES auth.users(id)%'),
  1,
  'calculation_receipts.user_id references auth.users'
);

select is(
  (select count(*)::integer
   from pg_constraint c
   join pg_class t on t.oid = c.conrelid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public' and t.relname = 'calculation_receipts' and c.contype = 'f'
     and pg_get_constraintdef(c.oid) like 'FOREIGN KEY (birth_profile_id, user_id) REFERENCES birth_profiles(id, user_id)%'),
  1,
  'receipt birth-profile foreign key preserves owner identity'
);

-- Uniqueness, validation constraints, and useful owner indexes.
select is(
  (select count(*)::integer from pg_constraint where conname = 'profiles_user_id_key' and contype = 'u'),
  1,
  'one profile row is allowed per auth user'
);

select is(
  (select count(*)::integer from pg_constraint where conname = 'calculation_receipts_user_kind_input_key' and contype = 'u'),
  1,
  'receipt key is unique per owner, kind, and canonical input hash'
);

select is((select count(*)::integer from pg_constraint where conname = 'birth_profiles_latitude_range' and contype = 'c'), 1, 'latitude range check exists');
select is((select count(*)::integer from pg_constraint where conname = 'birth_profiles_longitude_range' and contype = 'c'), 1, 'longitude range check exists');
select is((select count(*)::integer from pg_constraint where conname = 'birth_profiles_house_system_v1' and contype = 'c'), 1, 'V1 Placidus house-system check exists');
select is((select count(*)::integer from pg_constraint where conname = 'calculation_receipts_kind_allowed' and contype = 'c'), 1, 'receipt kind check exists');
select is((select count(*)::integer from pg_constraint where conname = 'calculation_receipts_schema_version_v1' and contype = 'c'), 1, 'certified receipt schema-version check exists');

select is((select count(*)::integer from pg_indexes where schemaname = 'public' and tablename = 'birth_profiles' and indexname = 'birth_profiles_user_id_idx'), 1, 'birth profile owner index exists');
select is((select count(*)::integer from pg_indexes where schemaname = 'public' and tablename = 'birth_profiles' and indexname = 'birth_profiles_one_active_per_user_idx'), 1, 'only one active birth profile index exists');
select is(
  (select indexdef from pg_indexes
   where schemaname = 'public'
     and tablename = 'calculation_receipts'
     and indexname = 'calculation_receipts_birth_profile_id_idx'),
  'CREATE INDEX calculation_receipts_birth_profile_id_idx ON public.calculation_receipts USING btree (birth_profile_id)',
  'receipt birth-profile index covers calculation_receipts.birth_profile_id'
);
select is((select count(*)::integer from pg_indexes where schemaname = 'public' and tablename = 'calculation_receipts' and indexname = 'calculation_receipts_user_created_at_idx'), 1, 'receipt owner/recency index exists');

-- RLS and owner policies are installed on every private table.
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.birth_profiles'::regclass), 'birth_profiles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.calculation_receipts'::regclass), 'calculation_receipts has RLS enabled');

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_owner_all'
     and cmd = 'ALL' and 'authenticated'::name = any(roles)
     and qual like '%auth.uid()%' and with_check like '%auth.uid()%'),
  1,
  'profiles policy uses auth.uid() for reads and writes'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'birth_profiles' and policyname = 'birth_profiles_owner_all'
     and cmd = 'ALL' and 'authenticated'::name = any(roles)
     and qual like '%auth.uid()%' and with_check like '%auth.uid()%'),
  1,
  'birth_profiles policy uses auth.uid() for reads and writes'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'calculation_receipts' and policyname = 'calculation_receipts_owner_all'
     and cmd = 'ALL' and 'authenticated'::name = any(roles)
     and qual like '%auth.uid()%' and with_check like '%auth.uid()%'),
  1,
  'calculation_receipts policy uses auth.uid() for reads and writes'
);

select is((select count(*)::integer from pg_trigger where tgname = 'profiles_set_updated_at' and not tgisinternal), 1, 'profiles updated_at trigger exists');
select is((select count(*)::integer from pg_trigger where tgname = 'birth_profiles_set_updated_at' and not tgisinternal), 1, 'birth_profiles updated_at trigger exists');

-- Behavioral checks for the constraints and update triggers.
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000703'::uuid);

insert into public.profiles (id, user_id, display_name, timezone, locale, updated_at)
values (
  '10000000-0000-0000-0000-000000000703'::uuid,
  '00000000-0000-0000-0000-000000000703'::uuid,
  'Schema Test',
  'America/Sao_Paulo',
  'pt-BR',
  '2000-01-01T00:00:00Z'
);

insert into public.birth_profiles (
  id, user_id, label, birth_date, birth_time, timezone, latitude, longitude, place, house_system, is_active, updated_at
) values (
  '20000000-0000-0000-0000-000000000703'::uuid,
  '00000000-0000-0000-0000-000000000703'::uuid,
  'Primary',
  date '1990-01-01',
  time '12:00:00',
  'America/Sao_Paulo',
  0,
  0,
  'Test Place',
  'P',
  true,
  '2000-01-01T00:00:00Z'
);

select throws_ok(
  $$
    insert into public.birth_profiles (
      user_id, label, birth_date, birth_time, timezone, latitude, longitude, place, house_system, is_active
    ) values (
      '00000000-0000-0000-0000-000000000703'::uuid, 'Bad latitude', date '1990-01-01', time '12:00:00',
      'America/Sao_Paulo', 90.000001, 0, 'Test Place', 'P', false
    )
  $$,
  '23514',
  'new row for relation "birth_profiles" violates check constraint "birth_profiles_latitude_range"',
  'latitude above 90 is rejected'
);

select throws_ok(
  $$
    insert into public.birth_profiles (
      user_id, label, birth_date, birth_time, timezone, latitude, longitude, place, house_system, is_active
    ) values (
      '00000000-0000-0000-0000-000000000703'::uuid, 'Bad longitude', date '1990-01-01', time '12:00:00',
      'America/Sao_Paulo', 0, 180.000001, 'Test Place', 'P', false
    )
  $$,
  '23514',
  'new row for relation "birth_profiles" violates check constraint "birth_profiles_longitude_range"',
  'longitude above 180 is rejected'
);

select throws_ok(
  $$
    insert into public.calculation_receipts (
      user_id, birth_profile_id, kind, input_hash, input_payload, result_payload,
      engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone
    ) values (
      '00000000-0000-0000-0000-000000000703'::uuid,
      '20000000-0000-0000-0000-000000000703'::uuid,
      'synastry', repeat('a', 64), '{}'::jsonb, '{}'::jsonb,
      'aurea', '1', 'test', now(), 'America/Sao_Paulo'
    )
  $$,
  '23514',
  'new row for relation "calculation_receipts" violates check constraint "calculation_receipts_kind_allowed"',
  'unsupported receipt kinds are rejected'
);

insert into public.calculation_receipts (
  user_id, birth_profile_id, kind, input_hash, input_payload, result_payload,
  engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone
) values (
  '00000000-0000-0000-0000-000000000703'::uuid,
  '20000000-0000-0000-0000-000000000703'::uuid,
  'natal', repeat('b', 64), '{}'::jsonb, '{}'::jsonb,
  'aurea', '1', 'test', now(), 'America/Sao_Paulo'
);

select throws_ok(
  $$
    insert into public.calculation_receipts (
      user_id, birth_profile_id, kind, input_hash, input_payload, result_payload,
      engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone
    ) values (
      '00000000-0000-0000-0000-000000000703'::uuid,
      '20000000-0000-0000-0000-000000000703'::uuid,
      'natal', repeat('b', 64), '{}'::jsonb, '{}'::jsonb,
      'aurea', '1', 'test', now(), 'America/Sao_Paulo'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "calculation_receipts_user_kind_input_key"',
  'duplicate owner/kind/input receipts are rejected'
);

update public.profiles set display_name = 'Schema Test Updated'
where id = '10000000-0000-0000-0000-000000000703'::uuid;
select ok(
  (select updated_at > '2000-01-02T00:00:00Z'::timestamptz from public.profiles where id = '10000000-0000-0000-0000-000000000703'::uuid),
  'profiles update trigger advances updated_at'
);

update public.birth_profiles set label = 'Primary Updated'
where id = '20000000-0000-0000-0000-000000000703'::uuid;
select ok(
  (select updated_at > '2000-01-02T00:00:00Z'::timestamptz from public.birth_profiles where id = '20000000-0000-0000-0000-000000000703'::uuid),
  'birth_profiles update trigger advances updated_at'
);

select * from finish();
rollback;
