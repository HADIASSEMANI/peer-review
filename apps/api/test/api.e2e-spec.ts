/**
 * End-to-end smoke test over the real HTTP surface, against the seeded SQLite
 * database. Run `bun run db:reset` first.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

const STUDENT = { email: 'student@peerreview.dev', password: 'Password123' };
const OTHER_STUDENT = { email: 'adja@peerreview.dev', password: 'Password123' };
const INSTRUCTOR = { email: 'instructor@peerreview.dev', password: 'Password123' };

describe('Peer Review API (e2e)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    // Mirrors main.ts: the global ZodValidationPipe comes from AppModule.
    await app.init();
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
  });

  const login = async (creds: { email: string; password: string }): Promise<string> => {
    const res = await http().post('/api/auth/login').send(creds).expect(200);
    expect(res.body.accessToken).toBeTruthy();
    return res.body.accessToken as string;
  };

  it('rejects bad credentials with the same message as an unknown email', async () => {
    const unknown = await http()
      .post('/api/auth/login')
      .send({ email: 'nobody@peerreview.dev', password: 'Password123' })
      .expect(401);
    const wrongPassword = await http()
      .post('/api/auth/login')
      .send({ email: STUDENT.email, password: 'WrongPassword1' })
      .expect(401);
    expect(unknown.body.message).toEqual(wrongPassword.body.message);
  });

  it('rejects malformed payloads with 400 and field-level messages', async () => {
    const res = await http()
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
    expect(res.body.message).toBeDefined();
  });

  it('blocks unauthenticated access to protected routes', async () => {
    await http().get('/api/teams').expect(401);
  });

  it('lets a student log in, see their team, and read their feedback', async () => {
    const token = await login(STUDENT);

    const me = await http().get('/api/auth/me').auth(token, { type: 'bearer' }).expect(200);
    expect(me.body.role).toBe('STUDENT');

    const teams = await http().get('/api/teams').auth(token, { type: 'bearer' }).expect(200);
    expect(teams.body.length).toBeGreaterThan(0);

    const feedback = await http()
      .get('/api/evaluations/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(feedback.body.reviewCount).toBeGreaterThan(0);
    expect(feedback.body.overall).toBeGreaterThan(0);
    // Anonymity: nothing identifying a reviewer may appear in the payload.
    expect(JSON.stringify(feedback.body)).not.toContain('reviewerId');
    // Comments carry their criterion but never an author.
    for (const c of feedback.body.comments) {
      expect(['cooperation', 'conceptualContribution', 'practicalContribution', 'workEthic']).toContain(
        c.dimension,
      );
      expect(Object.keys(c).sort()).toEqual(['dimension', 'text']);
    }
  });

  it('lets a student submit and revise an evaluation', async () => {
    const token = await login(STUDENT);
    const teams = await http().get('/api/teams').auth(token, { type: 'bearer' }).expect(200);
    const teamId = teams.body[0].id as string;

    const targets = await http()
      .get(`/api/evaluations/targets?teamId=${teamId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(targets.body.length).toBeGreaterThan(0);
    // A student is never offered themselves as a target.
    expect(targets.body.every((t: { user: { email: string } }) => t.user.email !== STUDENT.email)).toBe(true);

    const revieweeId = targets.body[0].user.id as string;
    const payload = {
      teamId,
      evaluations: [
        {
          revieweeId,
          ratings: {
            cooperation: 6,
            conceptualContribution: 5,
            practicalContribution: 7,
            workEthic: 6,
          },
          comments: {
            cooperation: 'Updated by the e2e smoke test.',
            workEthic: 'Second criterion comment.',
          },
        },
      ],
    };

    const first = await http()
      .post('/api/evaluations')
      .auth(token, { type: 'bearer' })
      .send(payload)
      .expect(201);
    expect(first.body.saved).toBe(1);

    // Re-submitting updates rather than duplicating.
    const second = await http()
      .post('/api/evaluations')
      .auth(token, { type: 'bearer' })
      .send(payload)
      .expect(201);
    expect(second.body.saved).toBe(1);
  });

  it('rejects out-of-range ratings', async () => {
    const token = await login(STUDENT);
    const teams = await http().get('/api/teams').auth(token, { type: 'bearer' }).expect(200);
    const teamId = teams.body[0].id as string;
    const targets = await http()
      .get(`/api/evaluations/targets?teamId=${teamId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);

    await http()
      .post('/api/evaluations')
      .auth(token, { type: 'bearer' })
      .send({
        teamId,
        evaluations: [
          {
            revieweeId: targets.body[0].user.id,
            ratings: {
              cooperation: 9,
              conceptualContribution: 5,
              practicalContribution: 5,
              workEthic: 5,
            },
          },
        ],
      })
      .expect(400);
  });

  it('forbids students from reading instructor aggregates', async () => {
    const studentToken = await login(OTHER_STUDENT);
    const instructorToken = await login(INSTRUCTOR);

    const courses = await http()
      .get('/api/courses')
      .auth(instructorToken, { type: 'bearer' })
      .expect(200);
    const courseId = courses.body[0].id as string;

    await http()
      .get(`/api/evaluations/summary/course/${courseId}`)
      .auth(studentToken, { type: 'bearer' })
      .expect(403);
  });

  it('refuses to put a student on two teams in the same course', async () => {
    const token = await login(INSTRUCTOR);

    const courses = await http().get('/api/courses').auth(token, { type: 'bearer' }).expect(200);
    const courseId = courses.body[0].id as string;

    const teams = await http()
      .get(`/api/teams?courseId=${courseId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    const alpha = teams.body.find((t: { teamName?: string; name: string }) => t.name === 'Team Alpha');
    expect(alpha).toBeDefined();
    const alreadyRostered = alpha.members[0].userId as string;

    const res = await http()
      .post('/api/teams')
      .auth(token, { type: 'bearer' })
      .send({
        name: 'Conflict Check Team',
        courseId,
        memberIds: [alreadyRostered],
      })
      .expect(400);

    // The message names the offending student and their existing team.
    expect(JSON.stringify(res.body.message)).toContain('one team per course');
  });

  it('gives the instructor aggregated team results', async () => {
    const token = await login(INSTRUCTOR);
    const courses = await http().get('/api/courses').auth(token, { type: 'bearer' }).expect(200);
    const summaries = await http()
      .get(`/api/evaluations/summary/course/${courses.body[0].id}`)
      .auth(token, { type: 'bearer' })
      .expect(200);

    expect(summaries.body.length).toBeGreaterThan(0);
    const alpha = summaries.body.find((s: { teamName: string }) => s.teamName === 'Team Alpha');
    expect(alpha).toBeDefined();
    expect(alpha.completionRate).toBeGreaterThan(0);
    expect(alpha.students.length).toBe(alpha.memberCount);
  });
});
