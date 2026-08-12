#!/usr/bin/env node
/**
 * Drops a `{"type":"module"}` package.json into an ESM output directory.
 *
 * The packages themselves are CommonJS (NestJS must be able to require() them),
 * so Node would otherwise read the .js files under dist/esm as CJS too. This
 * marker scopes the ESM interpretation to that folder — the standard dual-build
 * trick, and cheaper than renaming every emitted file to .mjs.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('usage: write-esm-marker.mjs <dir>');
  process.exit(1);
}

const dir = resolve(process.cwd(), target);
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
console.log(`[build] wrote ESM marker to ${target}/package.json`);
