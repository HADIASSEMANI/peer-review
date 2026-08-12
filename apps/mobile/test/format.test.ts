import { describe, expect, it } from 'vitest';
import { fullName, initials, percent, score, scoreToWidth } from '../src/lib/format';

const user = { firstName: 'Adja', lastName: 'Boye' };

describe('format helpers', () => {
  it('builds display names and initials', () => {
    expect(fullName(user)).toBe('Adja Boye');
    expect(initials(user)).toBe('AB');
  });

  it('trims trailing zeroes from whole scores but keeps decimals', () => {
    expect(score(6)).toBe('6');
    expect(score(5.5)).toBe('5.50');
    expect(score(4.25)).toBe('4.25');
  });

  it('renders completion as a rounded percentage', () => {
    expect(percent(0)).toBe('0%');
    expect(percent(0.666)).toBe('67%');
    expect(percent(1)).toBe('100%');
  });

  it('clamps score bar widths to 0-100%', () => {
    expect(scoreToWidth(0)).toBe('0%');
    expect(scoreToWidth(7)).toBe('100%');
    expect(scoreToWidth(14)).toBe('100%');
    expect(scoreToWidth(-3)).toBe('0%');
  });
});
