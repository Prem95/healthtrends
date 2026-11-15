// Runs the database tests without Docker or the Supabase CLI, on PGlite
// (Postgres compiled to WebAssembly), with a minimal stand-in for Supabase's
// `auth` schema and roles. Use it where `supabase start` is unavailable (CI
// without Docker, a cloud session). The real check before release is still
// the psql run against `supabase start` in docs/ios/12-qa.md.
//
// Usage, from the repository root:
//   mkdir -p /tmp/dbtest && npm --prefix /tmp/dbtest install @electric-sql/pglite@0.5
//   cp supabase/tests/run-without-docker.mjs /tmp/dbtest/
//   node /tmp/dbtest/run-without-docker.mjs "$PWD"
//
// Applies every supabase/migrations/*.sql in order, applies 0006 a second time
// (it must be idempotent), then runs mobile_test.sql and rls_test.sql.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(process.argv[2] ?? ".");
const dir = path.join(repo, "supabase");
const db = new PGlite({ extensions: { pgcrypto } });

async function run(label, sql) {
  try {
    return await db.exec(sql);
  } catch (e) {
    console.error(`FAILED in ${label}: ${e.message}`);
    process.exit(1);
  }
}

await run("auth stand-in", `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon;
`);

const migrations = fs.readdirSync(path.join(dir, "migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const f of migrations) {
  await run(f, fs.readFileSync(path.join(dir, "migrations", f), "utf8"));
  console.log(`applied ${f}`);
}
const m6 = migrations.find((f) => f.startsWith("0006_"));
if (!m6) {
  console.error("FAILED: supabase/migrations/0006_*.sql not found");
  process.exit(1);
}
await run(`${m6} (second run)`, fs.readFileSync(path.join(dir, "migrations", m6), "utf8"));
console.log(`applied ${m6} again: idempotent`);

const out = await run("mobile_test.sql", fs.readFileSync(path.join(dir, "tests", "mobile_test.sql"), "utf8"));
const last = out.filter((r) => r.rows?.length).pop()?.rows?.[0];
console.log(last ? Object.values(last)[0] : "mobile_test.sql: finished");
await run("rls_test.sql", fs.readFileSync(path.join(dir, "tests", "rls_test.sql"), "utf8"));
console.log("rls_test.sql: passed");
