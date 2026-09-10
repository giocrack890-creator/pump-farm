/**
 * Loads `.env` before anything else evaluates.
 *
 * ESM hoists imports, so a `process.loadEnvFile()` in a module body runs after
 * every module it imports has already been evaluated — which is how a script
 * ends up with a Prisma client that never saw DATABASE_URL, or a chain module
 * that captured the public RPC even though RPC_URL is set. Importing this
 * first is the fix: side effects, no exports.
 */
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* not there — the environment may already carry what is needed */
  }
}
