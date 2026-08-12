import { EVAL_DIMENSIONS, type AnonymousComment, type DimensionAverage } from '@repo/types';

export interface RatingRow {
  cooperation: number;
  conceptualContribution: number;
  practicalContribution: number;
  workEthic: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const EMPTY_AVERAGE: DimensionAverage = {
  cooperation: 0,
  conceptualContribution: 0,
  practicalContribution: 0,
  workEthic: 0,
};

/** Mean score per dimension, rounded to two decimals. Empty input -> all zeros. */
export function averageDimensions(rows: RatingRow[]): DimensionAverage {
  if (rows.length === 0) return { ...EMPTY_AVERAGE };
  const total = rows.reduce<RatingRow>(
    (acc, r) => ({
      cooperation: acc.cooperation + r.cooperation,
      conceptualContribution: acc.conceptualContribution + r.conceptualContribution,
      practicalContribution: acc.practicalContribution + r.practicalContribution,
      workEthic: acc.workEthic + r.workEthic,
    }),
    { ...EMPTY_AVERAGE },
  );
  return {
    cooperation: round2(total.cooperation / rows.length),
    conceptualContribution: round2(total.conceptualContribution / rows.length),
    practicalContribution: round2(total.practicalContribution / rows.length),
    workEthic: round2(total.workEthic / rows.length),
  };
}

/** Overall score = mean of the four dimension averages. */
export function overallScore(avg: DimensionAverage): number {
  return round2(
    (avg.cooperation + avg.conceptualContribution + avg.practicalContribution + avg.workEthic) / 4,
  );
}

/** Prisma column holding the written comment for each criterion. */
export const COMMENT_COLUMN = {
  cooperation: 'cooperationComment',
  conceptualContribution: 'conceptualContributionComment',
  practicalContribution: 'practicalContributionComment',
  workEthic: 'workEthicComment',
} as const;

export interface CommentRow {
  cooperationComment: string | null;
  conceptualContributionComment: string | null;
  practicalContributionComment: string | null;
  workEthicComment: string | null;
}

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Flattens each evaluation's four per-criterion comments into a single list and
 * orders it by a hash of the text — not by row id or timestamp — so the display
 * order reveals nothing about who wrote a comment or when. Blank entries drop out.
 */
export function anonymiseComments(rows: CommentRow[]): AnonymousComment[] {
  const out: AnonymousComment[] = [];
  for (const row of rows) {
    for (const dimension of EVAL_DIMENSIONS) {
      const text = row[COMMENT_COLUMN[dimension]];
      if (text && text.trim()) out.push({ dimension, text: text.trim() });
    }
  }
  return out.sort((a, b) => hash(a.text) - hash(b.text));
}

/** Expected submissions for a team of n students: everyone reviews everyone but themselves. */
export function expectedEvaluationCount(memberCount: number): number {
  return memberCount < 2 ? 0 : memberCount * (memberCount - 1);
}
