import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Validates a payload against a Zod schema from @repo/types — the same schema
 * the react-native-web client uses in its forms, so client and server can never
 * disagree about what a valid request looks like.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Validation failed',
          message: error.errors.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`),
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}
