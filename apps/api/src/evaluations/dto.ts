import { createZodDto } from 'nestjs-zod';
import { submitEvaluationBatchSchema } from '@repo/types';

export class SubmitEvaluationBatchDto extends createZodDto(submitEvaluationBatchSchema) {}
