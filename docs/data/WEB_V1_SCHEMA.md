# Web V1 private schema

## Decision

Web V1 starts with a clean Supabase/Postgres private-data schema. This migration does **not** import legacy SQLite, `localStorage`, production records, credentials, tokens, or any existing user data. Legacy migration/parity work remains separate and must not be inferred from these tables.

The schema contains only the private foundation required for the first hosted product flow:

- `profiles` — one application profile row for each Supabase Auth user.
- `birth_profiles` — normalized birth inputs owned by that user, with at most one active birth profile per user.
- `calculation_receipts` — owner-scoped certified natal/transit receipts and the metadata needed to reproduce or audit a result.

This migration does not change astrology formulas, rounding, aspect rules, receipt hashing, or any certified engine behavior.

## Ownership and access boundary

Every private table has a `user_id uuid not null` foreign key to `auth.users(id)` with cascading deletion. Row-level security is enabled from the first migration.

The authenticated policy on each table uses `auth.uid() = user_id` for both visibility and writes. The anonymous role receives no table privileges. The receipt-to-birth-profile foreign key includes both `birth_profile_id` and `user_id`, so a receipt cannot reference another owner's birth profile even when a write is performed by trusted backend code.

RLS is defense in depth, not a browser product-data API. The approved Web V1 architecture is:

1. The browser uses Supabase directly for authentication only.
2. Product profile, birth-profile, receipt, and calculation operations go through the versioned FastAPI service.
3. FastAPI derives the user identity from the authenticated request and performs explicit owner-scoped database operations.

A later isolation task proves the same policies with two disposable authenticated identities. FDM-703 establishes the schema and policies those tests exercise.

## `profiles`

| Column | Type | Contract |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated with `gen_random_uuid()` |
| `user_id` | `uuid` | Required FK to `auth.users`; unique, so one profile row exists per user |
| `display_name` | `text` | Required, non-blank |
| `timezone` | `text` | Required, non-blank; API-layer IANA validation is added by the typed domain contract |
| `locale` | `text` | Required, non-blank; API-layer locale validation is added by the typed domain contract |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Automatically advanced before updates |

## `birth_profiles`

| Column | Type | Contract |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated with `gen_random_uuid()` |
| `user_id` | `uuid` | Required owner FK to `auth.users` |
| `label` | `text` | Required, non-blank |
| `birth_date` | `date` | Required local birth date |
| `birth_time` | `time(0)` | Required local birth time with deterministic whole-second storage |
| `timezone` | `text` | Required, non-blank IANA identifier contract; API layer validates membership |
| `latitude` | `numeric(9,6)` | Required, inclusive range `-90..90`; zero is valid |
| `longitude` | `numeric(9,6)` | Required, inclusive range `-180..180`; zero is valid |
| `place` | `text` | Required, non-blank display place |
| `house_system` | `text` | Web V1 is constrained to Placidus code `P` |
| `is_active` | `boolean` | A partial unique index allows at most one active birth profile for a user |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Automatically advanced before updates |

The database intentionally enforces stable structural constraints while later FastAPI domain validation owns semantic checks such as valid IANA timezone names, past birth dates, and normalized text.

## `calculation_receipts`

Receipts are persisted calculation evidence, not a second astrology engine. Web V1 supports only `natal` and `transit` kinds and preserves the existing certified receipt schema version `calculation-receipt.v1`.

| Column | Type | Contract |
| --- | --- | --- |
| `id` | `uuid` | Primary key, generated with `gen_random_uuid()` |
| `user_id` | `uuid` | Required owner FK to `auth.users` |
| `birth_profile_id` | `uuid` | Required birth-profile reference; paired with `user_id` in the FK |
| `kind` | `text` | `natal` or `transit` only |
| `input_hash` | `text` | Required non-blank canonical input hash |
| `schema_version` | `text` | Fixed to `calculation-receipt.v1` |
| `input_payload` | `jsonb` | Required JSON object containing the canonicalized calculation input/provenance |
| `result_payload` | `jsonb` | Required JSON object containing the certified calculation result |
| `engine_name` | `text` | Required engine identifier |
| `engine_version` | `text` | Required engine version |
| `ephemeris_version` | `text` | Required ephemeris version/reference |
| `resolved_at` | `timestamptz` | Resolved calculation instant |
| `resolved_timezone` | `text` | Required non-blank IANA timezone recorded with the receipt |
| `created_at` | `timestamptz` | Persistence timestamp |

`(user_id, kind, input_hash)` is unique. That gives the application service a deterministic exact-receipt key for reuse while keeping the cache/force decision in the service layer. A receipt has no `updated_at` trigger because certified calculation evidence is stored as a new receipt rather than silently rewritten.

## Indexes and update behavior

- `birth_profiles_user_id_idx` supports owner-scoped birth-profile queries.
- `birth_profiles_one_active_per_user_idx` is a partial unique index on active rows.
- `calculation_receipts_birth_profile_id_idx` supports receipt lookup by birth profile.
- `calculation_receipts_user_created_at_idx` supports owner-scoped receipt history ordered by recency.
- `profiles_set_updated_at` and `birth_profiles_set_updated_at` keep mutable rows' `updated_at` values current.

## Validation

From the repository root, with Docker available:

```bash
supabase start
supabase db reset
supabase test db
```

`supabase db reset` must apply the migration to an empty local database. `supabase test db` runs `supabase/tests/202608150001_web_v1_core_test.sql`, which verifies the exact columns, UUID ownership, foreign keys, uniqueness, coordinate/kind/schema checks, indexes, RLS policies, and update triggers, including behavioral failure cases.
