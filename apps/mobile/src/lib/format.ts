import type { PublicUser } from '@repo/types';

export const fullName = (u: Pick<PublicUser, 'firstName' | 'lastName'>): string =>
  `${u.firstName} ${u.lastName}`.trim();

export const initials = (u: Pick<PublicUser, 'firstName' | 'lastName'>): string =>
  `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();

export const score = (n: number): string => n.toFixed(2).replace(/\.00$/, '');

export const percent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

/** Maps a 1-7 score onto a percentage width for the score bars. */
export const scoreToWidth = (n: number): `${number}%` =>
  `${Math.max(0, Math.min(100, (n / 7) * 100))}%`;
