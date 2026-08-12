#!/usr/bin/env node
/**
 * Composes prisma/schema.prisma from prisma/models.prisma plus a provider
 * header chosen by DATABASE_PROVIDER.
 *
 *   DATABASE_PROVIDER=sqlite      (default) -> file:./dev.db
 *   DATABASE_PROVIDER=postgresql            -> docker-compose postgres
 *
 * Keeping one model file means the dev and prod schemas cannot drift.
 *
 * It also writes packages/db/.env. That file is generated, gitignored, and
 * exists for one reason: `prisma db push`, `prisma studio`, and the seed all
 * run as separate processes with their cwd inside packages/db, so they never
 * see the repo-root .env. Mirroring the resolved values here keeps the root
 * .env as the single place you edit while still feeding the Prisma CLI.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '../..');

/** Minimal .env parser — avoids a dependency in a script that runs before install completes. */
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Real environment wins, then the repo-root .env. The generated packages/db/.env
// is deliberately NOT read back in — it is an output, not an input.
loadEnvFile(resolve(repoRoot, '.env'));

const PROVIDERS = {
  // Relative SQLite paths resolve against the schema file's directory,
  // so this lands at packages/db/prisma/dev.db.
  sqlite: 'file:./dev.db',
  postgresql: 'postgresql://peerreview:peerreview@localhost:5432/peerreview?schema=public',
};

const provider = (process.env.DATABASE_PROVIDER || 'sqlite').toLowerCase();
if (!(provider in PROVIDERS)) {
  console.error(
    `[@repo/db] Unknown DATABASE_PROVIDER "${provider}". Use one of: ${Object.keys(PROVIDERS).join(', ')}`,
  );
  process.exit(1);
}

const configuredUrl = process.env.DATABASE_URL || PROVIDERS[provider];

/**
 * Turn a relative SQLite URL into an absolute one.
 *
 * Prisma resolves a relative `file:` path against the schema directory, but
 * only reliably when the process is running from that package. The API runs
 * from apps/api and the tests from apps/api too, so a relative path silently
 * points somewhere else and SQLite fails with "unable to open the database
 * file". Writing an absolute path makes every workspace package — CLI, seed,
 * API, Vitest — open the exact same file no matter its cwd.
 *
 * Forward slashes are used even on Windows; Prisma accepts them and they avoid
 * escaping problems inside the .env value.
 */
function absolutiseSqliteUrl(url) {
  if (!url.startsWith('file:')) return url;
  const raw = url.slice('file:'.length);
  const abs = isAbsolute(raw) ? raw : resolve(pkgRoot, 'prisma', raw);
  return `file:${abs.replace(/\\/g, '/')}`;
}

const url = absolutiseSqliteUrl(configuredUrl);

// Catch the mismatch that produces a baffling error much later.
const looksLikeSqlite = configuredUrl.startsWith('file:');
if (provider === 'sqlite' && !looksLikeSqlite) {
  console.error(
    `[@repo/db] DATABASE_PROVIDER=sqlite but DATABASE_URL is not a file: URL.\n  ${configuredUrl}`,
  );
  process.exit(1);
}
if (provider === 'postgresql' && looksLikeSqlite) {
  console.error(
    `[@repo/db] DATABASE_PROVIDER=postgresql but DATABASE_URL points at a SQLite file.\n  ${configuredUrl}\n` +
      '  Update DATABASE_URL in the repo-root .env (the Postgres line is commented there).',
  );
  process.exit(1);
}

const models = readFileSync(resolve(pkgRoot, 'prisma/models.prisma'), 'utf8');

const header = `// ===========================================================================
// GENERATED FILE — do not edit.
// Source: prisma/models.prisma  |  Provider: ${provider}
// Regenerate with: bun run --cwd packages/db schema
// ===========================================================================

generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}
`;

writeFileSync(resolve(pkgRoot, 'prisma/schema.prisma'), `${header}\n${models}`);

writeFileSync(
  resolve(pkgRoot, '.env'),
  `# GENERATED FILE — do not edit. Written by scripts/build-schema.mjs.\n` +
    `# Edit the repo-root .env instead. This is the RESOLVED value every package\n` +
    `# loads at runtime: SQLite paths are absolutised here so the CLI, the seed,\n` +
    `# the API and Vitest all open the same file regardless of their cwd.\n` +
    `# Re-run \`bun run --cwd packages/db schema\` after editing the root .env.\n` +
    `DATABASE_PROVIDER=${provider}\n` +
    `DATABASE_URL="${url}"\n`,
);

console.log(`[@repo/db] schema.prisma + .env written for provider "${provider}"`);
