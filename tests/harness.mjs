// Test harness: a real Postgres (PGlite) with the Supabase pieces the migration relies on stubbed in.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS = fileURLToPath(new URL('../supabase/migrations/', import.meta.url));

export async function freshDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; grant usage on schema auth to anon, authenticated, service_role;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.role() returns text language sql stable as $$ select auth.jwt() ->> 'role' $$;
    grant execute on all functions in schema auth to anon, authenticated, service_role;`);
  for (const f of fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(MIGRATIONS + f, 'utf8'));
  await db.exec(`grant usage on schema public to service_role; grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;`);
  return db;
}

export function check() {
  let failed = 0;
  const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failed++; };
  const done = () => { if (failed) { console.error(`${failed} failed`); process.exit(1); } };
  return { ok, done };
}
