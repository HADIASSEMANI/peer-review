/**
 * Domain enums. Kept as plain const objects (not TS `enum`) so the values are
 * usable at runtime in both the NestJS API and the react-native-web client
 * without pulling in a Prisma runtime dependency on the frontend.
 */

export const Role = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/**
 * The four assessment dimensions from the original SOEN 341 spec.
 * Each is rated on a 7-point scale.
 */
export const EvalDimension = {
  COOPERATION: 'cooperation',
  CONCEPTUAL: 'conceptualContribution',
  PRACTICAL: 'practicalContribution',
  WORK_ETHIC: 'workEthic',
} as const;
export type EvalDimension = (typeof EvalDimension)[keyof typeof EvalDimension];

export const EVAL_DIMENSIONS = [
  EvalDimension.COOPERATION,
  EvalDimension.CONCEPTUAL,
  EvalDimension.PRACTICAL,
  EvalDimension.WORK_ETHIC,
] as const;

export const DIMENSION_LABELS: Record<EvalDimension, string> = {
  [EvalDimension.COOPERATION]: 'Cooperation',
  [EvalDimension.CONCEPTUAL]: 'Conceptual Contribution',
  [EvalDimension.PRACTICAL]: 'Practical Contribution',
  [EvalDimension.WORK_ETHIC]: 'Work Ethic',
};

export const DIMENSION_DESCRIPTIONS: Record<EvalDimension, string> = {
  [EvalDimension.COOPERATION]:
    'Actively participates, communicates, and supports teammates.',
  [EvalDimension.CONCEPTUAL]:
    'Contributes ideas, research, and problem framing to the project.',
  [EvalDimension.PRACTICAL]:
    'Delivers concrete work: code, documents, designs, testing.',
  [EvalDimension.WORK_ETHIC]:
    'Meets deadlines, is reliable, and respects the team process.',
};

/** Inclusive rating bounds for every dimension. */
export const RATING_MIN = 1;
export const RATING_MAX = 7;
