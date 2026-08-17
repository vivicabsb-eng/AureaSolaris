\if :{?fdm704_include_helpers}

create schema if not exists test_helpers;

create or replace function test_helpers.set_request_jwt_claims(subject uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', subject::text,
      'role', 'authenticated'
    )::text,
    true
  );
end;
$$;

create or replace function test_helpers.clear_request_jwt_claims()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{}'::jsonb::text, true);
end;
$$;

create or replace function test_helpers.exec_row_count(statement text)
returns integer
language plpgsql
as $$
declare
  affected integer;
begin
  execute statement;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant usage on schema test_helpers to authenticated;
grant execute on function test_helpers.exec_row_count(text) to authenticated;

\else
\echo '1..0 # SKIP helper library loaded by FDM-704 isolation test'
\endif
