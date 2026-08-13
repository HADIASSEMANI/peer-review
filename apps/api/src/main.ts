import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from './app.module';

// Teaches Swagger how to read the Zod-derived DTOs.
patchNestJsSwagger();

export function buildSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Peer Review API')
    .setDescription('Peer assessment system — teams, evaluations, and anonymised reporting.')
    .setVersion('2.0.0')
    .addBearerAuth()
    .build();
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(
    helmet({
      // The web app is served from a different origin (:5173) than the API
      // (:3001). helmet's default `Cross-Origin-Resource-Policy: same-origin`
      // makes the browser discard the response body on every cross-origin
      // fetch — the CORS headers are honoured, but the body never reaches JS,
      // so requests look like they succeed and return nothing. Relaxing CORP
      // is required for any split-origin frontend.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // CSP off: this process serves JSON and Swagger UI, not the app shell.
      contentSecurityPolicy: false,
    }),
  );
  // CORS_ORIGIN may be a comma-separated allowlist or "*". An array of ["*"]
  // is NOT treated as a wildcard by the cors package, so it has to be passed
  // through as the bare string or every deployed request is rejected.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.enableCors({
    origin:
      !corsOrigin || corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((o) => o.trim()),
    // `credentials` cannot be combined with a literal "*" origin; reflecting
    // the request origin (origin: true) keeps cookies working either way.
    credentials: true,
  });
  app.setGlobalPrefix('api');
  // No class-validator ValidationPipe here: validation is handled globally by
  // nestjs-zod's ZodValidationPipe (see AppModule), driven by the shared
  // @repo/types schemas. Adding one would pull in class-validator for nothing.

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  SwaggerModule.setup('api/docs', app, document);

  // Render (and most PaaS) inject the port to bind as PORT and route to it.
  // API_PORT stays as the local-dev override.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  // Must bind 0.0.0.0, not localhost — Render's proxy reaches the container
  // from outside, and a localhost-bound server fails its health check.
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`API listening on port ${port} (docs: /api/docs)`);
}

void bootstrap();
