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

export const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-zA-Z]/, 'Must contain a letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Required').max(60),
    lastName: z.string().min(1, 'Required').max(60),
    studentId: z.string().max(20).optional(),
    organizationId: z.string().min(1, 'Select an organization').default('org1'),
    role: roleSchema.default(Role.STUDENT),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

/** What the API accepts on POST /auth/register (no confirmPassword round-trip). */
export const registerPayloadSchema = registerSchema.innerType().omit({ confirmPassword: true });
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
  studentId: z.string().nullable().optional(),
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

export const createCourseSchema = z.object({
  code: z.string().min(2, 'Required').max(20),
  title: z.string().min(2, 'Required').max(120),
  term: z.string().min(2, 'Required').max(40),
  /** Defaults to the creating instructor's own organization. */
  organizationId: z.string().min(1).optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export const courseSchema = createCourseSchema.extend({
  id: idSchema,
  organizationId: z.string(),
  instructorId: idSchema,
  createdAt: z.string(),
});
export type Course = z.infer<typeof courseSchema>;

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
