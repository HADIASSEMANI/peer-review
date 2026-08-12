import { createZodDto } from 'nestjs-zod';
import { loginSchema, registerPayloadSchema } from '@repo/types';

/**
 * nestjs-zod turns the shared Zod schemas into Nest DTO classes, which also
 * gives Swagger accurate request schemas without a second source of truth.
 */
export class LoginDto extends createZodDto(loginSchema) {}
export class RegisterDto extends createZodDto(registerPayloadSchema) {}
