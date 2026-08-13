import {
  authResponseSchema,
  courseSchema,
  organizationSchema,
  evaluationTargetSchema,
  myFeedbackSchema,
  publicUserSchema,
  teamSchema,
  teamSummarySchema,
  type AuthResponse,
  type Course,
  type Organization,
  type CreateCourseInput,
  type CreateTeamInput,
  type EvaluationTarget,
  type LoginInput,
  type MyFeedback,
  type PublicUser,
  type RegisterPayload,
  type SubmitEvaluationBatchInput,
  type Team,
  type TeamSummary,
  type UpdateTeamInput,
  type UpdateUserInput,
} from '@repo/types';
import { z } from 'zod';
import { ApiRequestError } from './errors.js';

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current JWT, or null when signed out. Called per request. */
  getToken?: () => string | null | Promise<string | null>;
  /** Invoked on any 401 so the app can clear its session and route to login. */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Runtime-validates the response so a backend change surfaces as a clear error. */
  schema?: z.ZodType<unknown>;
};

/**
 * Typed wrapper over the Peer Review API.
 *
 * Request and response shapes come from @repo/types — the same Zod schemas the
 * NestJS controllers validate with — so the client cannot drift from the server.
 * `bun run api:openapi && bun run --cwd packages/api-client generate` refreshes
 * src/openapi.d.ts if you want to diff the spec against these signatures.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`);
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const token = await this.options.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await this.fetchImpl(url.toString(), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });

    if (response.status === 401) this.options.onUnauthorized?.();

    const text = await response.text();
    const payload: unknown = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const body = payload as { message?: string | string[] } | null;
      const raw = body?.message;
      const details = Array.isArray(raw) ? raw : undefined;
      const message = Array.isArray(raw)
        ? (raw[0] ?? 'Request failed')
        : (raw ?? `Request failed with status ${response.status}`);
      throw new ApiRequestError(response.status, message, details);
    }

    return (opts.schema ? opts.schema.parse(payload) : payload) as T;
  }

  /* -- auth ---------------------------------------------------------------- */

  login(input: LoginInput): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: input,
      schema: authResponseSchema,
    });
  }

  register(input: RegisterPayload): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: input,
      schema: authResponseSchema,
    });
  }

  me(): Promise<PublicUser> {
    return this.request('/auth/me', { schema: publicUserSchema });
  }

  /* -- users --------------------------------------------------------------- */

  listStudents(search?: string): Promise<PublicUser[]> {
    return this.request('/users/students', {
      query: { search },
      schema: z.array(publicUserSchema),
    });
  }

  deleteUser(id: string): Promise<{ id: string }> {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
      schema: z.object({ id: z.string() }),
    });
  }

  updateUser(id: string, input: UpdateUserInput): Promise<PublicUser> {
    return this.request(`/users/${id}`, {
      method: 'PATCH',
      body: input,
      schema: publicUserSchema,
    });
  }

  /* -- courses ------------------------------------------------------------- */

  listOrganizations(): Promise<Organization[]> {
    return this.request('/courses/organizations', {
      schema: z.array(organizationSchema),
    });
  }

  listCourses(): Promise<Course[]> {
    return this.request('/courses', { schema: z.array(courseSchema) });
  }

  createCourse(input: CreateCourseInput): Promise<Course> {
    return this.request('/courses', { method: 'POST', body: input, schema: courseSchema });
  }

  /* -- teams --------------------------------------------------------------- */

  listTeams(courseId?: string): Promise<Team[]> {
    return this.request('/teams', { query: { courseId }, schema: z.array(teamSchema) });
  }

  getTeam(id: string): Promise<Team> {
    return this.request(`/teams/${id}`, { schema: teamSchema });
  }

  createTeam(input: CreateTeamInput): Promise<Team> {
    return this.request('/teams', { method: 'POST', body: input, schema: teamSchema });
  }

  updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
    return this.request(`/teams/${id}`, { method: 'PATCH', body: input, schema: teamSchema });
  }

  deleteTeam(id: string): Promise<{ id: string }> {
    return this.request(`/teams/${id}`, {
      method: 'DELETE',
      schema: z.object({ id: z.string() }),
    });
  }

  /* -- evaluations --------------------------------------------------------- */

  listEvaluationTargets(teamId: string): Promise<EvaluationTarget[]> {
    return this.request('/evaluations/targets', {
      query: { teamId },
      schema: z.array(evaluationTargetSchema),
    });
  }

  submitEvaluations(input: SubmitEvaluationBatchInput): Promise<{ saved: number }> {
    return this.request('/evaluations', {
      method: 'POST',
      body: input,
      schema: z.object({ saved: z.number() }),
    });
  }

  myFeedback(teamId?: string): Promise<MyFeedback> {
    return this.request('/evaluations/me', { query: { teamId }, schema: myFeedbackSchema });
  }

  teamSummary(teamId: string): Promise<TeamSummary> {
    return this.request(`/evaluations/summary/team/${teamId}`, { schema: teamSummarySchema });
  }

  courseSummary(courseId: string): Promise<TeamSummary[]> {
    return this.request(`/evaluations/summary/course/${courseId}`, {
      schema: z.array(teamSummarySchema),
    });
  }
}

export const createApiClient = (options: ApiClientOptions): ApiClient => new ApiClient(options);
