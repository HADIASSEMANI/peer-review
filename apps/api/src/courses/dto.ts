import { createZodDto } from 'nestjs-zod';
import { createCourseSchema } from '@repo/types';

export class CreateCourseDto extends createZodDto(createCourseSchema) {}
