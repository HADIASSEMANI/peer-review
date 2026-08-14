import { createZodDto } from 'nestjs-zod';
import { createCourseSchema, updateCourseSchema } from '@repo/types';

export class CreateCourseDto extends createZodDto(createCourseSchema) {}
export class UpdateCourseDto extends createZodDto(updateCourseSchema) {}
