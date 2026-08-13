/**
 * Client-side mirror of the Organization table, used to populate selectors
 * without a round trip. Ids match the seeded rows; `GET /api/courses/organizations`
 * returns the authoritative list.
 */
export const ORGANIZATIONS = [
  { label: 'Concordia University', value: 'org1' },
  { label: 'McGill University', value: 'org2' },
  { label: 'Université de Montréal', value: 'org3' },
  { label: 'Université du Québec à Montréal', value: 'org4' },
  { label: 'École de technologie supérieure', value: 'org5' },
  { label: 'Polytechnique Montréal', value: 'org6' },
] as const;

export const DEFAULT_ORG = 'org1';

export const orgLabel = (value: string | null | undefined): string =>
  ORGANIZATIONS.find((o) => o.value === value)?.label ?? 'Unknown organization';

