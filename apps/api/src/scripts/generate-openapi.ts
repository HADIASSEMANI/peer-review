/**
 * Writes apps/api/openapi.json without starting a server.
 * `bun run api:openapi` from the repo root, then regenerate the typed client
 * with `bun run --cwd packages/api-client generate`.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from '../app.module';
import { buildSwaggerConfig } from '../main';

patchNestJsSwagger();

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.init();

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  const out = resolve(__dirname, '../../openapi.json');
  writeFileSync(out, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec written to ${out}`);

  await app.close();
}

void main();
