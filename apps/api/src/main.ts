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
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  // No class-validator ValidationPipe here: validation is handled globally by
  // nestjs-zod's ZodValidationPipe (see AppModule), driven by the shared
  // @repo/types schemas. Adding one would pull in class-validator for nothing.

  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  new Logger('Bootstrap').log(`API on http://localhost:${port}/api  (docs: /api/docs)`);
}

void bootstrap();
