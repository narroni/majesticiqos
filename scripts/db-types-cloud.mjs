#!/usr/bin/env node
// Generates src/types/database.ts from the live cloud project via
// --project-id, bypassing `supabase link` (see db-push-cloud.mjs for why
// linking is broken). `gen types` supports --project-id directly, so this
// never touches the broken API-keys endpoint. Requires `supabase login` to
// have been run once on this machine. If this still fails, it fails loudly
// instead of writing an empty or partial file.

import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { requireEnv } from "./require-env.mjs";

const FALLBACK_MESSAGE =
  "[db:types] Failed to generate types from the cloud project.\n" +
  "Generate them manually instead: Supabase Dashboard → this project → " +
  'Project Settings → API → "Generate types" (or Database → Generate types), ' +
  "then paste the output into src/types/database.ts.";

const projectId = requireEnv(
  "SUPABASE_PROJECT_ID",
  "db:types",
  "Set it to this project's ref (visible in its Supabase dashboard URL) and try again.",
);

const result = spawnSync(
  "supabase",
  [
    "gen",
    "types",
    "typescript",
    "--project-id",
    projectId,
    "--schema",
    "public",
  ],
  { encoding: "utf8" },
);

if (result.status !== 0 || !result.stdout || !result.stdout.trim()) {
  console.error(FALLBACK_MESSAGE);
  if (result.stderr) {
    console.error(result.stderr);
  }
  process.exit(1);
}

writeFileSync("src/types/database.ts", result.stdout);
console.log("[db:types] src/types/database.ts updated from the cloud project.");
