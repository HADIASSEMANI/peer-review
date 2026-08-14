import {
  RATING_MAX,
  loginSchema,
  registerSchema,
  submitEvaluationBatchSchema,
} from '@repo/types';
import { describe, expect, it } from 'vitest';

/**
 * These are the exact schemas the NestJS controllers validate with, so a test
 * here is also a test of what the server will accept.
 */
describe('shared validation schemas', () => {
  it('rejects a malformed email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.dev', password: 'x' }).success).toBe(true);
  });

  it('requires matching passwords on registration', () => {
    const base = {
      email: 'a@b.dev',
      firstName: 'A',
      lastName: 'B',
      studentId: '12345678',
      password: 'Password123',
      role: 'STUDENT' as const,
    };
    expect(registerSchema.safeParse({ ...base, confirmPassword: 'Password123' }).success).toBe(true);
    const mismatch = registerSchema.safeParse({ ...base, confirmPassword: 'Different1' });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.errors[0]?.path).toEqual(['confirmPassword']);
    }
  });

  it('rejects passwords without a digit', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.dev',
      firstName: 'A',
      lastName: 'B',
      password: 'nodigitshere',
      confirmPassword: 'nodigitshere',
      role: 'STUDENT',
    });
    expect(result.success).toBe(false);
  });

  it('bounds every rating to the 7-point scale', () => {
    const build = (cooperation: number) => ({
      teamId: 't1',
      evaluations: [
        {
          revieweeId: 'u1',
          ratings: {
            cooperation,
            conceptualContribution: 5,
            practicalContribution: 5,
            workEthic: 5,
          },
        },
      ],
    });
    expect(submitEvaluationBatchSchema.safeParse(build(RATING_MAX)).success).toBe(true);
    expect(submitEvaluationBatchSchema.safeParse(build(RATING_MAX + 1)).success).toBe(false);
    expect(submitEvaluationBatchSchema.safeParse(build(0)).success).toBe(false);
    expect(submitEvaluationBatchSchema.safeParse(build(4.5)).success).toBe(false);
  });

  it('requires at least one teammate in a submission', () => {
    expect(submitEvaluationBatchSchema.safeParse({ teamId: 't1', evaluations: [] }).success).toBe(
      false,
    );
  });
});
