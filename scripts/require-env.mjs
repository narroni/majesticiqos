export function requireEnv(name, commandLabel, hint) {
  const value = process.env[name];

  if (!value) {
    console.error(`[${commandLabel}] ${name} is not set.\n${hint}`);
    process.exit(1);
  }

  return value;
}
