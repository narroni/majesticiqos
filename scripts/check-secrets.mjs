#!/usr/bin/env node
// BLUEPRINT §8.2 — "Add a CI check that greps the client bundle for the key
// prefix." Never logs the secret value itself, only its presence/absence.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!secret) {
  console.warn(
    "[check-secrets] SUPABASE_SERVICE_ROLE_KEY is not set in this environment — skipping client bundle scan. " +
      "This check only verifies anything when the key is present at build time.",
  );
  process.exit(0);
}

const clientDir = join(process.cwd(), ".next", "static");

let found = false;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const content = readFileSync(fullPath, "utf8");
      if (content.includes(secret)) {
        found = true;
        console.error(
          `[check-secrets] SUPABASE_SERVICE_ROLE_KEY was found inside the client bundle: ${fullPath}`,
        );
      }
    }
  }
}

try {
  statSync(clientDir);
} catch {
  console.warn(
    `[check-secrets] ${clientDir} does not exist yet — run \`next build\` first. Skipping.`,
  );
  process.exit(0);
}

walk(clientDir);

if (found) {
  console.error(
    "[check-secrets] Failing build: the service role key must never reach the browser.",
  );
  process.exit(1);
}

console.log(
  "[check-secrets] OK — SUPABASE_SERVICE_ROLE_KEY was not found in the client bundle.",
);
