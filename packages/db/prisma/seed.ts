/**
 * Seeds a demo dataset: one instructor, twelve students, one course, two teams,
 * and a full round of peer evaluations for Team Alpha so the instructor
 * dashboard has something real to aggregate.
 *
 * Idempotent — safe to re-run. Every account uses the password below.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123';

type SeedUser = {
  email: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  role: 'STUDENT' | 'INSTRUCTOR';
};

const INSTRUCTOR: SeedUser = {
  email: 'instructor@peerreview.dev',
  firstName: 'Dana',
  lastName: 'Whitfield',
  role: 'INSTRUCTOR',
};

const STUDENTS: SeedUser[] = [
  { email: 'student@peerreview.dev', firstName: 'Hadi', lastName: 'Assemani', studentId: '26710549', role: 'STUDENT' },
  { email: 'adja@peerreview.dev', firstName: 'Adja', lastName: 'Boye', studentId: '40281923', role: 'STUDENT' },
  { email: 'mik@peerreview.dev', firstName: 'Mik', lastName: 'Driver', studentId: '40244456', role: 'STUDENT' },
  { email: 'sara@peerreview.dev', firstName: 'Sara', lastName: 'Habte', studentId: '40224677', role: 'STUDENT' },
  { email: 'youssef@peerreview.dev', firstName: 'Youssef', lastName: 'Tassine', studentId: '40242322', role: 'STUDENT' },
  { email: 'vlad@peerreview.dev', firstName: 'Nicolas', lastName: 'Tita', studentId: '40209853', role: 'STUDENT' },
  { email: 'amara@peerreview.dev', firstName: 'Amara', lastName: 'Okonkwo', studentId: '40311001', role: 'STUDENT' },
  { email: 'liwei@peerreview.dev', firstName: 'Li', lastName: 'Wei', studentId: '40311002', role: 'STUDENT' },
  { email: 'priya@peerreview.dev', firstName: 'Priya', lastName: 'Raman', studentId: '40311003', role: 'STUDENT' },
  { email: 'tomas@peerreview.dev', firstName: 'Tomas', lastName: 'Herrera', studentId: '40311004', role: 'STUDENT' },
  { email: 'noor@peerreview.dev', firstName: 'Noor', lastName: 'Haddad', studentId: '40311005', role: 'STUDENT' },
  { email: 'erik@peerreview.dev', firstName: 'Erik', lastName: 'Lindqvist', studentId: '40311006', role: 'STUDENT' },
];

/** Deterministic pseudo-random in [0,1) so re-seeding produces the same numbers. */
function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function rating(seed: string, floor = 4): number {
  const span = 8 - floor; // upper bound is 7 inclusive
  return Math.min(7, floor + Math.floor(seededRandom(seed) * span));
}

const COMMENT_POOL = [
  'Consistently showed up prepared and kept the team unblocked.',
  'Strong technical contributions, could communicate blockers earlier.',
  'Great at framing the problem before we started coding.',
  'Reliable on deadlines. Would like more input during design discussions.',
  'Took on the hardest tickets without being asked.',
  'Helpful in review, gave feedback that actually improved the code.',
  'Good work overall; attendance at stand-ups was occasionally spotty.',
  'Kept documentation current, which saved the rest of us time.',
];

/** Stable slugs so the client selector and the database agree without mapping. */
const ORGANIZATIONS = [
  { id: 'org1', name: 'Concordia University' },
  { id: 'org2', name: 'McGill University' },
  { id: 'org3', name: 'Université de Montréal' },
  { id: 'org4', name: 'Université du Québec à Montréal' },
  { id: 'org5', name: 'École de technologie supérieure' },
  { id: 'org6', name: 'Polytechnique Montréal' },
];

async function main() {
  console.log('Seeding database...');

  // Must come first: users and courses both carry a foreign key to these rows.
  for (const org of ORGANIZATIONS) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: { name: org.name },
      create: org,
    });
  }
  console.log(`  organizations: ${ORGANIZATIONS.length}`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const upsertUser = (u: SeedUser) =>
    prisma.user.upsert({
      where: { email: u.email },
      update: { firstName: u.firstName, lastName: u.lastName, role: u.role },
      create: {
        email: u.email,
        password: passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        studentId: u.studentId ?? null,
        role: u.role,
      },
    });

  const instructor = await upsertUser(INSTRUCTOR);
  const students = [];
  for (const s of STUDENTS) students.push(await upsertUser(s));
  console.log(`  users: 1 instructor, ${students.length} students`);

  const course = await prisma.course.upsert({
    where: { code_term: { code: 'SOEN 341', term: 'Fall 2026' } },
    update: { title: 'Software Process', instructorId: instructor.id },
    create: {
      code: 'SOEN 341',
      title: 'Software Process',
      term: 'Fall 2026',
      organizationId: 'org1',
      instructorId: instructor.id,
    },
  });

  const teamPlan: Array<{ name: string; members: typeof students }> = [
    { name: 'Team Alpha', members: students.slice(0, 6) },
    { name: 'Team Beta', members: students.slice(6, 12) },
  ];

  const teams = [];
  for (const plan of teamPlan) {
    const team = await prisma.team.upsert({
      where: { courseId_name: { courseId: course.id, name: plan.name } },
      update: {},
      create: { name: plan.name, courseId: course.id },
    });
    for (const member of plan.members) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: member.id } },
        update: {},
        create: { teamId: team.id, userId: member.id },
      });
    }
    teams.push({ team, members: plan.members });
    console.log(`  team: ${plan.name} (${plan.members.length} members)`);
  }

  // Round-robin evaluations for all teams and students.
  for (const teamItem of teams) {
    let count = 0;
    for (const reviewer of teamItem.members) {
      for (const reviewee of teamItem.members) {
        if (reviewer.id === reviewee.id) continue;
        const key = `${reviewer.id}:${reviewee.id}`;
        const commentIndex = Math.floor(seededRandom(`c${key}`) * COMMENT_POOL.length);
        await prisma.evaluation.upsert({
          where: {
            teamId_reviewerId_revieweeId: {
              teamId: teamItem.team.id,
              reviewerId: reviewer.id,
              revieweeId: reviewee.id,
            },
          },
          update: {
            cooperation: rating(`coop${key}`),
            conceptualContribution: rating(`conc${key}`),
            practicalContribution: rating(`prac${key}`),
            workEthic: rating(`work${key}`),
            cooperationComment:
              seededRandom(`c1${key}`) > 0.4 ? COMMENT_POOL[commentIndex] : null,
            conceptualContributionComment:
              seededRandom(`c2${key}`) > 0.5
                ? COMMENT_POOL[(commentIndex + 2) % COMMENT_POOL.length]
                : null,
            practicalContributionComment:
              seededRandom(`c3${key}`) > 0.5
                ? COMMENT_POOL[(commentIndex + 4) % COMMENT_POOL.length]
                : null,
            workEthicComment:
              seededRandom(`c4${key}`) > 0.6
                ? COMMENT_POOL[(commentIndex + 6) % COMMENT_POOL.length]
                : null,
          },
          create: {
            teamId: teamItem.team.id,
            reviewerId: reviewer.id,
            revieweeId: reviewee.id,
            cooperation: rating(`coop${key}`),
            conceptualContribution: rating(`conc${key}`),
            practicalContribution: rating(`prac${key}`),
            workEthic: rating(`work${key}`),
            cooperationComment:
              seededRandom(`c1${key}`) > 0.4 ? COMMENT_POOL[commentIndex] : null,
            conceptualContributionComment:
              seededRandom(`c2${key}`) > 0.5
                ? COMMENT_POOL[(commentIndex + 2) % COMMENT_POOL.length]
                : null,
            practicalContributionComment:
              seededRandom(`c3${key}`) > 0.5
                ? COMMENT_POOL[(commentIndex + 4) % COMMENT_POOL.length]
                : null,
            workEthicComment:
              seededRandom(`c4${key}`) > 0.6
                ? COMMENT_POOL[(commentIndex + 6) % COMMENT_POOL.length]
                : null,
          },
        });
        count += 1;
      }
    }
    console.log(`  evaluations: ${count} for ${teamItem.team.name}`);
  }

  console.log('\nDone. Demo accounts (password for all: %s)', DEMO_PASSWORD);
  console.log('  instructor  %s', INSTRUCTOR.email);
  console.log('  student     %s  (Team Alpha, has feedback)', STUDENTS[0]?.email);
  console.log('  student     %s  (Team Beta, no feedback yet)', STUDENTS[6]?.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
