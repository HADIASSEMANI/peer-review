import { z } from 'zod';
import { EVAL_DIMENSIONS, EvalDimension, RATING_MAX, RATING_MIN, Role } from './enums.js';

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

export const idSchema = z.string().min(1, 'Required');
export const roleSchema = z.enum([Role.STUDENT, Role.INSTRUCTOR]);

export const ratingSchema = z
  .number({ invalid_type_error: 'Pick a rating' })
  .int('Ratings are whole numbers')
  .min(RATING_MIN, `Minimum is ${RATING_MIN}`)
  .max(RATING_MAX, `Maximum is ${RATING_MAX}`);

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerBaseSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(60, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(60, 'Last name is too long'),
  studentId: z
    .string()
    .max(20, 'Student ID cannot exceed 20 digits')
    .regex(/^\d+$/, 'Student ID must contain numbers only')
    .optional()
    .or(z.literal('')),
  organizationId: z.string().min(1, 'Please select an organization from the list').default('org1'),
  role: roleSchema.default(Role.STUDENT),
});

export const registerSchema = registerBaseSchema
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match. Please try again',
    path: ['confirmPassword'],
  })
  .refine(
    (v) => {
      if (v.role === Role.STUDENT) {
        return Boolean(v.studentId && v.studentId.trim().length > 0);
      }
      return true;
    },
    {
      message: 'Student ID is required for students',
      path: ['studentId'],
    },
  );
export type RegisterInput = z.infer<typeof registerSchema>;

/** What the API accepts on POST /auth/register (no confirmPassword round-trip). */
export const registerPayloadSchema = registerBaseSchema.omit({ confirmPassword: true });
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

export const publicUserSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  studentId: z.string().nullable(),
  role: roleSchema,
  organizationId: z.string(),
  createdAt: z.string(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  studentId: z
    .string()
    .regex(/^\d+$/, 'Must contain numbers only')
    .nullable()
    .optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: publicUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const jwtPayloadSchema = z.object({
  sub: idSchema,
  email: z.string().email(),
  role: roleSchema,
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

/* -------------------------------------------------------------------------- */
/* Courses & teams                                                             */
/* -------------------------------------------------------------------------- */

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

/* -- course name formatting ------------------------------------------------
   Normalisation lives here rather than in the form so the API and the client
   apply exactly one rule. Both are pure and idempotent: running them twice
   yields the same string, which is what lets the schemas below transform on
   every parse without drift.
-------------------------------------------------------------------------- */

/** Words that stay lowercase inside a title (never at either end). */
const TITLE_MINOR_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'the',
  'to',
  'via',
  'with',
]);

/**
 * Initialisms common in course titles that should be upper-cased even when the
 * instructor typed them in lowercase. Every entry is deliberately NOT an
 * English word, so this can never fire on ordinary prose.
 */
const TITLE_INITIALISMS = new Set([
  'ai',
  'api',
  'cpu',
  'css',
  'db',
  'gpu',
  'gui',
  'html',
  'http',
  'ide',
  'io',
  'json',
  'ml',
  'oop',
  'os',
  'sql',
  'ui',
  'ux',
  'xml',
]);

const capitalize = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/**
 * "software  PROCESS" -> "Software Process", "intro to ai" -> "Intro to AI".
 *
 * Short all-caps tokens are left alone: they are nearly always initialisms or
 * roman numerals ("AI", "OOP", "II"), and rewriting them as "Ai"/"Ii" would be
 * worse than the input. Longer all-caps words are treated as shouting.
 */
export function toTitleCase(raw: string): string {
  const words = raw.trim().replace(/\s+/g, ' ').split(' ');
  return words
    .map((word, index) => {
      if (word.length <= 3 && word === word.toUpperCase() && /[A-Z]/.test(word)) return word;
      const lower = word.toLowerCase();
      if (TITLE_INITIALISMS.has(lower)) return lower.toUpperCase();
      const atEdge = index === 0 || index === words.length - 1;
      if (!atEdge && TITLE_MINOR_WORDS.has(lower)) return lower;
      // Hyphenated compounds capitalise on both sides: "object-oriented".
      return lower.split('-').map(capitalize).join('-');
    })
    .join(' ');
}

const SEASONS = ['Fall', 'Winter', 'Spring', 'Summer'] as const;
const TERM_PATTERN = /^(fall|winter|spring|summer)[\s-]*(\d{4})$/i;

/** "fall2026", "FALL 2026", "fall-2026" -> "Fall 2026". null if unparseable. */
export function normalizeTerm(raw: string): string | null {
  const match = TERM_PATTERN.exec(raw.trim().replace(/\s+/g, ' '));
  // Destructured rather than indexed: noUncheckedIndexedAccess types capture
  // groups as possibly-undefined even when the pattern guarantees them.
  const rawSeason = match?.[1];
  const year = match?.[2];
  if (!rawSeason || !year) return null;
  const season = SEASONS.find((s) => s.toLowerCase() === rawSeason.toLowerCase());
  return season ? `${season} ${year}` : null;
}

export const TERM_HINT = 'Use a season and a year, e.g. "Fall 2026".';

const termSchema = z
  .string()
  .min(2, 'Required')
  .max(40)
  .refine((v) => normalizeTerm(v) !== null, TERM_HINT)
  .transform((v) => normalizeTerm(v) ?? v.trim());

export const createCourseSchema = z.object({
  code: z
    .string()
    .min(2, 'Required')
    .max(20)
    .transform((v) => v.trim().replace(/\s+/g, ' ')),
  title: z.string().min(2, 'Required').max(120).transform(toTitleCase),
  term: termSchema,
  /** Defaults to the creating instructor's own organization. */
  organizationId: z.string().min(1).optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

/**
 * The RESPONSE shape, deliberately NOT derived from createCourseSchema. Rows
 * written before the formatting rules existed would fail the strict term
 * refinement, and a response schema that rejects its own database takes the
 * whole dashboard down. Input is validated; output is only shaped.
 */
export const courseSchema = z.object({
  code: z.string(),
  title: z.string(),
  term: z.string(),
  id: idSchema,
  organizationId: z.string(),
  instructorId: idSchema,
  createdAt: z.string(),
});
export type Course = z.infer<typeof courseSchema>;

/** Every field optional; the owning school is fixed at creation time. */
export const updateCourseSchema = createCourseSchema.partial().omit({ organizationId: true });
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

/**
 * What a course delete would destroy. Deleting a Course cascades through
 * Team -> TeamMember and Team -> Evaluation, so the confirmation dialog has to
 * be able to name the damage before the instructor commits to it.
 */
export const courseDeleteImpactSchema = z.object({
  teamCount: z.number().int(),
  memberCount: z.number().int(),
  evaluationCount: z.number().int(),
});
export type CourseDeleteImpact = z.infer<typeof courseDeleteImpactSchema>;

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name is required').max(80),
  courseId: idSchema,
  maxSize: z.number().int().min(2, 'At least 2').max(50, 'At most 50').optional(),
  memberIds: z.array(idSchema).default([]),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = createTeamSchema.partial().omit({ courseId: true });
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export const teamMemberSchema = z.object({
  id: idSchema,
  userId: idSchema,
  teamId: idSchema,
  user: publicUserSchema,
  joinedAt: z.string(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const teamSchema = z.object({
  id: idSchema,
  name: z.string(),
  courseId: idSchema,
  course: courseSchema.optional(),
  members: z.array(teamMemberSchema).default([]),
  createdAt: z.string(),
});
export type Team = z.infer<typeof teamSchema>;

/* -------------------------------------------------------------------------- */
/* Evaluations                                                                 */
/* -------------------------------------------------------------------------- */

const dimensionRatings = Object.fromEntries(
  EVAL_DIMENSIONS.map((d) => [d, ratingSchema]),
) as Record<(typeof EVAL_DIMENSIONS)[number], typeof ratingSchema>;

/** Ratings for one teammate across all four dimensions. */
export const ratingsSchema = z.object(dimensionRatings);
export type Ratings = z.infer<typeof ratingsSchema>;

const dimensionComments = Object.fromEntries(
  EVAL_DIMENSIONS.map((d) => [
    d,
    z.string().max(2000, 'Keep comments under 2000 characters').optional(),
  ]),
) as Record<(typeof EVAL_DIMENSIONS)[number], z.ZodOptional<z.ZodString>>;

/** One optional written comment per criterion, as the original form had. */
export const commentsSchema = z.object(dimensionComments);
export type Comments = z.infer<typeof commentsSchema>;

export const submitEvaluationSchema = z.object({
  teamId: idSchema,
  revieweeId: idSchema,
  ratings: ratingsSchema,
  comments: commentsSchema.default({}),
});
export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;

/** The whole form: one entry per teammate, submitted in a single request. */
export const submitEvaluationBatchSchema = z.object({
  teamId: idSchema,
  evaluations: z
    .array(submitEvaluationSchema.omit({ teamId: true }))
    .min(1, 'Evaluate at least one teammate'),
});
export type SubmitEvaluationBatchInput = z.infer<typeof submitEvaluationBatchSchema>;

export const evaluationSchema = z.object({
  id: idSchema,
  teamId: idSchema,
  reviewerId: idSchema,
  revieweeId: idSchema,
  cooperation: z.number(),
  conceptualContribution: z.number(),
  practicalContribution: z.number(),
  workEthic: z.number(),
  cooperationComment: z.string().nullable(),
  conceptualContributionComment: z.string().nullable(),
  practicalContributionComment: z.string().nullable(),
  workEthicComment: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Evaluation = z.infer<typeof evaluationSchema>;

/* -------------------------------------------------------------------------- */
/* Aggregates (anonymised)                                                     */
/* -------------------------------------------------------------------------- */

export const dimensionAverageSchema = z.object({
  cooperation: z.number(),
  conceptualContribution: z.number(),
  practicalContribution: z.number(),
  workEthic: z.number(),
});
export type DimensionAverage = z.infer<typeof dimensionAverageSchema>;

export const anonymousCommentSchema = z.object({
  dimension: z.enum([
    EvalDimension.COOPERATION,
    EvalDimension.CONCEPTUAL,
    EvalDimension.PRACTICAL,
    EvalDimension.WORK_ETHIC,
  ]),
  text: z.string(),
});
export type AnonymousComment = z.infer<typeof anonymousCommentSchema>;

export const studentSummarySchema = z.object({
  user: publicUserSchema,
  teamId: idSchema,
  teamName: z.string(),
  averages: dimensionAverageSchema,
  overall: z.number(),
  reviewCount: z.number().int(),
  /** Comments only — never the reviewer identity. Anonymity is enforced server-side. */
  comments: z.array(anonymousCommentSchema),
});
export type StudentSummary = z.infer<typeof studentSummarySchema>;

export const teamSummarySchema = z.object({
  teamId: idSchema,
  teamName: z.string(),
  courseCode: z.string(),
  memberCount: z.number().int(),
  maxSize: z.number().nullable(),
  /** Evaluations actually submitted for this team. */
  submittedCount: z.number().int(),
  /** n * (n-1) — everyone reviews everyone but themselves. */
  expectedCount: z.number().int(),
  /** Ratio of submitted evaluations to expected. */
  completionRate: z.number(),
  averages: dimensionAverageSchema,
  overall: z.number(),
  students: z.array(studentSummarySchema),
});
export type TeamSummary = z.infer<typeof teamSummarySchema>;

/** What a student is shown about themselves: scores + anonymous comments. */
export const myFeedbackSchema = z.object({
  averages: dimensionAverageSchema,
  overall: z.number(),
  reviewCount: z.number().int(),
  comments: z.array(anonymousCommentSchema),
});
export type MyFeedback = z.infer<typeof myFeedbackSchema>;

/** A teammate the current student still needs to evaluate. */
export const evaluationTargetSchema = z.object({
  user: publicUserSchema,
  submitted: z.boolean(),
  existing: ratingsSchema.nullable(),
  existingComments: commentsSchema.nullable(),
  /** ISO timestamp of the reviewer's last submission for this teammate. */
  submittedAt: z.string().nullable(),
});
export type EvaluationTarget = z.infer<typeof evaluationTargetSchema>;

export const apiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
