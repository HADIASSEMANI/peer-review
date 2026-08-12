import { describe, expect, it } from 'vitest';
import {
  anonymiseComments,
  averageDimensions,
  expectedEvaluationCount,
  overallScore,
} from '../src/evaluations/aggregate';

const row = (n: number) => ({
  cooperation: n,
  conceptualContribution: n,
  practicalContribution: n,
  workEthic: n,
});

describe('averageDimensions', () => {
  it('returns zeros for an empty set rather than NaN', () => {
    expect(averageDimensions([])).toEqual({
      cooperation: 0,
      conceptualContribution: 0,
      practicalContribution: 0,
      workEthic: 0,
    });
  });

  it('averages each dimension independently', () => {
    const avg = averageDimensions([
      { cooperation: 7, conceptualContribution: 5, practicalContribution: 3, workEthic: 1 },
      { cooperation: 5, conceptualContribution: 5, practicalContribution: 5, workEthic: 5 },
    ]);
    expect(avg).toEqual({
      cooperation: 6,
      conceptualContribution: 5,
      practicalContribution: 4,
      workEthic: 3,
    });
  });

  it('rounds to two decimals', () => {
    expect(averageDimensions([row(1), row(2)]).cooperation).toBe(1.5);
    expect(averageDimensions([row(1), row(1), row(2)]).cooperation).toBe(1.33);
  });
});

describe('overallScore', () => {
  it('is the mean of the four dimension averages', () => {
    expect(
      overallScore({
        cooperation: 6,
        conceptualContribution: 5,
        practicalContribution: 4,
        workEthic: 3,
      }),
    ).toBe(4.5);
  });
});

describe('anonymiseComments', () => {
  const row = (over: Partial<Record<string, string | null>> = {}) => ({
    cooperationComment: null,
    conceptualContributionComment: null,
    practicalContributionComment: null,
    workEthicComment: null,
    ...over,
  });

  it('flattens each row into one entry per criterion that has a comment', () => {
    const out = anonymiseComments([
      row({ cooperationComment: 'worked well with everyone' }),
      row({ workEthicComment: 'always on time', practicalContributionComment: 'shipped a lot' }),
    ]);
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.dimension).sort()).toEqual([
      'cooperation',
      'practicalContribution',
      'workEthic',
    ]);
  });

  it('drops empty and whitespace-only comments', () => {
    expect(anonymiseComments([row({ cooperationComment: '   ' }), row()])).toHaveLength(0);
  });

  it('does not preserve submission order', () => {
    const input = ['zebra', 'apple', 'mango', 'kiwi', 'pear'].map((t) =>
      row({ cooperationComment: t }),
    );
    const out = anonymiseComments(input);
    expect(out).toHaveLength(5);
    expect(out.map((c) => c.text).sort()).toEqual(['apple', 'kiwi', 'mango', 'pear', 'zebra']);
  });

  it('is stable across calls so the UI does not reshuffle on refetch', () => {
    const input = [row({ cooperationComment: 'one' }), row({ workEthicComment: 'two' })];
    expect(anonymiseComments(input)).toEqual(anonymiseComments(input));
  });
});

describe('expectedEvaluationCount', () => {
  it('is zero for teams too small to peer-review', () => {
    expect(expectedEvaluationCount(0)).toBe(0);
    expect(expectedEvaluationCount(1)).toBe(0);
  });

  it('is n*(n-1) — everyone reviews everyone but themselves', () => {
    expect(expectedEvaluationCount(2)).toBe(2);
    expect(expectedEvaluationCount(6)).toBe(30);
  });
});
