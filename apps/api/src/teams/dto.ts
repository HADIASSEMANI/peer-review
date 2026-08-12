import { createZodDto } from 'nestjs-zod';
import { createTeamSchema, updateTeamSchema } from '@repo/types';

export class CreateTeamDto extends createZodDto(createTeamSchema) {}
export class UpdateTeamDto extends createZodDto(updateTeamSchema) {}
