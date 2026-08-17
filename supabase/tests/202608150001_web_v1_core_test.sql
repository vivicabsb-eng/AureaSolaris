begin;

create extension if not exists pgtap with schema extensions;

\set fdm704_include_helpers true
\ir helpers.sql
\unset fdm704_include_helpers

select plan(68);

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

-- FDM-704: prove owner isolation with two authenticated identities.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000704'::uuid),
  ('00000000-0000-0000-0000-000000000705'::uuid);

-- Exercise profiles WITH CHECK before either identity has a profile, so the
-- candidate rows are otherwise valid and cannot fail on profiles_user_id_key.
select test_helpers.set_request_jwt_claims('00000000-0000-0000-0000-000000000704'::uuid);
set local role authenticated;
select throws_ok(
  $$
    insert into public.profiles (id, user_id, display_name, timezone, locale)
    values (
      '11000000-0000-0000-0000-000000000705'::uuid,
      '00000000-0000-0000-0000-000000000705'::uuid,
      'Forbidden A to B',
      'America/Sao_Paulo',
      'pt-BR'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "profiles"',
  'subject A cannot insert a profile owned by subject B'
);
reset role;
select test_helpers.clear_request_jwt_claims();

select test_helpers.set_request_jwt_claims('00000000-0000-0000-0000-000000000705'::uuid);
set local role authenticated;
select throws_ok(
  $$
    insert into public.profiles (id, user_id, display_name, timezone, locale)
    values (
      '11000000-0000-0000-0000-000000000704'::uuid,
      '00000000-0000-0000-0000-000000000704'::uuid,
      'Forbidden B to A',
      'America/Sao_Paulo',
      'pt-BR'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "profiles"',
  'subject B cannot insert a profile owned by subject A'
);
reset role;
select test_helpers.clear_request_jwt_claims();

insert into public.profiles (id, user_id, display_name, timezone, locale) values
  (
    '10000000-0000-0000-0000-000000000704'::uuid,
    '00000000-0000-0000-0000-000000000704'::uuid,
    'Isolation A',
    'America/Sao_Paulo',
    'pt-BR'
  ),
  (
    '10000000-0000-0000-0000-000000000705'::uuid,
    '00000000-0000-0000-0000-000000000705'::uuid,
    'Isolation B',
    'America/Sao_Paulo',
    'pt-BR'
  );

insert into public.birth_profiles (
  id, user_id, label, birth_date, birth_time, timezone, latitude, longitude, place, house_system, is_active
) values
  (
    '20000000-0000-0000-0000-000000000704'::uuid,
    '00000000-0000-0000-0000-000000000704'::uuid,
    'Isolation A Birth',
    date '1991-01-01',
    time '10:00:00',
    'America/Sao_Paulo',
    -23.550520,
    -46.633308,
    'Test Place A',
    'P',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000705'::uuid,
    '00000000-0000-0000-0000-000000000705'::uuid,
    'Isolation B Birth',
    date '1992-02-02',
    time '11:00:00',
    'America/Sao_Paulo',
    -15.793889,
    -47.882778,
    'Test Place B',
    'P',
    true
  );

insert into public.calculation_receipts (
  id, user_id, birth_profile_id, kind, input_hash, input_payload, result_payload,
  engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone
) values
  (
    '30000000-0000-0000-0000-000000000704'::uuid,
    '00000000-0000-0000-0000-000000000704'::uuid,
    '20000000-0000-0000-0000-000000000704'::uuid,
    'natal', repeat('c', 64), '{"owner":"A"}'::jsonb, '{"owner":"A"}'::jsonb,
    'aurea', '1', 'test', '2026-08-17T12:00:00Z', 'America/Sao_Paulo'
  ),
  (
    '30000000-0000-0000-0000-000000000705'::uuid,
    '00000000-0000-0000-0000-000000000705'::uuid,
    '20000000-0000-0000-0000-000000000705'::uuid,
    'natal', repeat('d', 64), '{"owner":"B"}'::jsonb, '{"owner":"B"}'::jsonb,
    'aurea', '1', 'test', '2026-08-17T12:00:00Z', 'America/Sao_Paulo'
  );

select test_helpers.set_request_jwt_claims('00000000-0000-0000-0000-000000000704'::uuid);
select is(
  auth.uid(),
  '00000000-0000-0000-0000-000000000704'::uuid,
  'JWT helper exposes subject A through auth.uid()'
);
set local role authenticated;

select is((select count(*)::integer from public.profiles), 1, 'subject A sees only its profile');
select is((select count(*)::integer from public.birth_profiles), 1, 'subject A sees only its birth profile');
select is((select count(*)::integer from public.calculation_receipts), 1, 'subject A sees only its receipt');

select is(
  test_helpers.exec_row_count($sql$
    update public.profiles
    set display_name = 'Isolation A Updated'
    where id = '10000000-0000-0000-0000-000000000704'::uuid
  $sql$),
  1,
  'subject A may update its profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.birth_profiles
    set label = 'Isolation A Birth Updated'
    where id = '20000000-0000-0000-0000-000000000704'::uuid
  $sql$),
  1,
  'subject A may update its birth profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.calculation_receipts
    set result_payload = '{"owner":"A","updated":true}'::jsonb
    where id = '30000000-0000-0000-0000-000000000704'::uuid
  $sql$),
  1,
  'subject A may update its receipt'
);

select is(
  test_helpers.exec_row_count($sql$
    update public.profiles
    set display_name = 'A cannot touch B'
    where id = '10000000-0000-0000-0000-000000000705'::uuid
  $sql$),
  0,
  'subject A cannot update subject B profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.birth_profiles
    set label = 'A cannot touch B'
    where id = '20000000-0000-0000-0000-000000000705'::uuid
  $sql$),
  0,
  'subject A cannot update subject B birth profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.calculation_receipts
    set result_payload = '{"tampered":true}'::jsonb
    where id = '30000000-0000-0000-0000-000000000705'::uuid
  $sql$),
  0,
  'subject A cannot update subject B receipt'
);

select throws_ok(
  $$
    insert into public.birth_profiles (
      user_id, label, birth_date, birth_time, timezone, latitude, longitude, place, house_system, is_active
    ) values (
      '00000000-0000-0000-0000-000000000705'::uuid,
      'A cannot create for B',
      date '1993-03-03',
      time '12:00:00',
      'America/Sao_Paulo',
      0,
      0,
      'Forbidden A to B',
      'P',
      false
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "birth_profiles"',
  'subject A cannot insert a birth profile owned by subject B'
);

select throws_ok(
  $$
    insert into public.calculation_receipts (
      id, user_id, birth_profile_id, kind, input_hash, input_payload, result_payload,
      engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone
    ) values (
      '31000000-0000-0000-0000-000000000705'::uuid,
      '00000000-0000-0000-0000-000000000705'::uuid,
      '20000000-0000-0000-0000-000000000705'::uuid,
      'transit', repeat('e', 64), '{"owner":"B","attempted_by":"A"}'::jsonb, '{}'::jsonb,
      'aurea', '1', 'test', '2026-08-17T13:00:00Z', 'America/Sao_Paulo'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "calculation_receipts"',
  'subject A cannot insert a receipt owned by subject B'
);

reset role;
select test_helpers.clear_request_jwt_claims();

select test_helpers.set_request_jwt_claims('00000000-0000-0000-0000-000000000705'::uuid);
select is(
  auth.uid(),
  '00000000-0000-0000-0000-000000000705'::uuid,
  'JWT helper exposes subject B through auth.uid()'
);
set local role authenticated;

select is((select count(*)::integer from public.profiles), 1, 'subject B sees only its profile');
select is((select count(*)::integer from public.birth_profiles), 1, 'subject B sees only its birth profile');
select is((select count(*)::integer from public.calculation_receipts), 1, 'subject B sees only its receipt');

select is(
  test_helpers.exec_row_count($sql$
    update public.profiles
    set display_name = 'Isolation B Updated'
    where id = '10000000-0000-0000-0000-000000000705'::uuid
  $sql$),
  1,
  'subject B may update its profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.birth_profiles
    set label = 'Isolation B Birth Updated'
    where id = '20000000-0000-0000-0000-000000000705'::uuid
  $sql$),
  1,
  'subject B may update its birth profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.calculation_receipts
    set result_payload = '{"owner":"B","updated":true}'::jsonb
    where id = '30000000-0000-0000-0000-000000000705'::uuid
  $sql$),
  1,
  'subject B may update its receipt'
);

select is(
  test_helpers.exec_row_count($sql$
    update public.profiles
    set display_name = 'B cannot touch A'
    where id = '10000000-0000-0000-0000-000000000704'::uuid
  $sql$),
  0,
  'subject B cannot update subject A profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.birth_profiles
    set label = 'B cannot touch A'
    where id = '20000000-0000-0000-0000-000000000704'::uuid
  $sql$),
  0,
  'subject B cannot update subject A birth profile'
);
select is(
  test_helpers.exec_row_count($sql$
    update public.calculation_receipts
    set result_payload = '{"tampered":true}'::jsonb
    where id = '30000000-0000-0000-0000-000000000704'::uuid
  $sql$),
  0,
  'subject B cannot update subject A receipt'
);

select throws_ok(
  $$
    insert into public.birth_profiles (
      user_id, label, birth_date, birth_time, timezone, latitude, longitude, place, house_system, is_active
    ) values (
      '00000000-0000-0000-0000-000000000704'::uuid,
      'B cannot create for A',
      date '1994-04-04',
      time '13:00:00',
      'America/Sao_Paulo',
      0,
      0,
      'Forbidden B to A',
      'P',
      false
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "birth_profiles"',
  'subject B cannot insert a birth profile owned by subject A'
);

select throws_ok(
  $$
    insert into public.calculation_receipts (
      id, user_id, birth_profile_id, kind, input_hash, input_payload, result_payload,
      engine_name, engine_version, ephemeris_version, resolved_at, resolved_timezone
    ) values (
      '31000000-0000-0000-0000-000000000704'::uuid,
      '00000000-0000-0000-0000-000000000704'::uuid,
      '20000000-0000-0000-0000-000000000704'::uuid,
      'transit', repeat('f', 64), '{"owner":"A","attempted_by":"B"}'::jsonb, '{}'::jsonb,
      'aurea', '1', 'test', '2026-08-17T14:00:00Z', 'America/Sao_Paulo'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "calculation_receipts"',
  'subject B cannot insert a receipt owned by subject A'
);

reset role;
select test_helpers.clear_request_jwt_claims();
select is(auth.uid(), null::uuid, 'JWT helper clears request.jwt.claims between identities');

select * from finish();
rollback;