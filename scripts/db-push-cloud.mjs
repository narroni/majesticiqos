#!/usr/bin/env node
// Pushes local migrations straight to the cloud Postgres connection string.
// Uses --db-url instead of `supabase link` + `supabase db push`, because the
// linked-project flow currently hits a CLI/Management-API bug (SchemaError
// on inserted_at from the API keys endpoint). --db-url talks to Postgres
// directly and never calls that endpoint. `db push` has no --project-id
// option, unlike `gen types` — see db-types-cloud.mjs.

import { spawnSync } from "node:child_process";

import { requireEnv } from "./require-env.mjs";

const dbUrl = requireEnv(
  "SUPABASE_DB_URL",
  "db:push",
  "Set it to this project's connection string (Supabase Dashboard → Project Settings → Database → Connection string) and try again.",
);

const result = spawnSync("supabase", ["db", "push", "--db-url", dbUrl], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
