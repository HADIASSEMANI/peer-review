# Peer Review v2

Peer assessment system for university team projects. Students rate teammates on
four dimensions (cooperation, conceptual contribution, practical contribution,
work ethic) on a 7-point scale; scores are aggregated anonymously for students
and reported in detail to instructors.

Rebuilt from the ground up in TypeScript. Replaces the original
Create-React-App + Express + lowdb stack.

## Stack

| Layer     | Choice                                                                 |
| --------- | ---------------------------------------------------------------------- |
| Monorepo  | Bun workspaces + Turborepo                                             |
| Frontend  | React Native (`react-native-web`) + Vite + NativeWind                  |
| Routing   | React Navigation (native-stack) with real web URLs                     |
| State     | TanStack Query (server) + Zustand (session)                            |
| Forms     | React Hook Form + Zod, sharing schemas with the API                    |
| Backend   | NestJS 10 + Passport JWT + `nestjs-zod`                                |
| Database  | Prisma — SQLite in dev, PostgreSQL in prod, one shared model file      |
| Tests     | Vitest (unit + e2e via supertest)                                      |

```
apps/
  api/            NestJS service
  mobile/         react-native-web app bundled by Vite
packages/
  types/          Zod schemas + enums — the single source of truth
  db/             Prisma models, provider switch, seed
  api-client/     Typed HTTP client built on @repo/types
```

The shared packages compile to `dist/` rather than being imported as TypeScript
source, because NestJS runs on Node and Node cannot execute `.ts`. `types` and
`api-client` emit **both** formats — CommonJS for Nest's `require()`, ESM for
Vite, selected through the `exports` map — while `db` is CommonJS only, since
nothing but the API consumes it. Turbo builds them before anything that depends
on them, so `bun run dev` and `bun run test` take care of this; after editing a
package directly, `bun run build` refreshes the output.

## Quick start

```bash
bun install
cp .env.example .env

bun run db:generate      # build schema.prisma + generate the Prisma client
bun run db:push          # create the SQLite database
bun run db:seed          # dummy users, teams, and a full round of evaluations

bun run dev              # API on :3001, web app on :5173
```

Open http://localhost:5173.

### Demo accounts

Every seeded account uses the password `Password123`.

| Email                         | Role       | State                                  |
| ----------------------------- | ---------- | -------------------------------------- |
| `instructor@peerreview.dev`   | Instructor | Owns SOEN 341, two teams               |
| `student@peerreview.dev`      | Student    | Team Alpha — has scores and comments   |
| `amara@peerreview.dev`        | Student    | Team Beta — nothing submitted yet      |

Team Beta is deliberately left without evaluations so the empty states are easy
to exercise.

## Switching to PostgreSQL

`packages/db/prisma/models.prisma` holds the models with no datasource block.
`scripts/build-schema.mjs` prepends the right header and writes
`prisma/schema.prisma`, so the dev and prod schemas cannot drift apart.

```bash
docker compose up -d postgres

# in .env
DATABASE_PROVIDER=postgresql
DATABASE_URL="postgresql://peerreview:peerreview@localhost:5432/peerreview?schema=public"

bun run db:generate && bun run db:push && bun run db:seed
```

Model types are chosen to be valid on both providers — roles are stored as
strings rather than native enums, because SQLite has none.

## Commands

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `bun run dev`          | API and web app in watch mode                         |
| `bun run build`        | Build every package through Turbo                     |
| `bun run typecheck`    | `tsc --noEmit` across the workspace                   |
| `bun run test`         | Vitest suites in `apps/api` and `apps/mobile`         |
| `bun run db:reset`     | Drop, recreate, and reseed the database               |
| `bun run db:studio`    | Prisma Studio                                         |
| `bun run api:openapi`  | Write `apps/api/openapi.json`                         |

The API serves Swagger UI at http://localhost:3001/api/docs.

## How the pieces fit

**One schema, three consumers.** `packages/types` exports Zod schemas. The API
turns them into DTOs with `createZodDto`, so `POST /api/evaluations` validates
against the same object the form uses in `react-hook-form`, and the API client
parses responses with them too. A field can't drift between the three.

**Anonymity is enforced at the query, not the serializer.** `myFeedback()`
selects only rating columns and comment text — the reviewer relation is never
loaded, so it cannot leak through a later change to a response shape. Comments
are ordered by a hash of their text rather than by id or timestamp, so display
order reveals nothing about who wrote what.

**Evaluations are upserts.** The unique constraint is
`(teamId, reviewerId, revieweeId)`, so a student revising their submission
updates the existing row instead of double-counting.

**Auth.** A global `JwtAuthGuard` protects everything; routes opt out with
`@Public()`. `@Roles(Role.INSTRUCTOR)` gates the instructor surface. The JWT
strategy re-reads the user on every request, so a deleted or demoted account
loses access immediately rather than at token expiry.

## Notes on the frontend

Screens are written with React Native primitives (`View`, `Text`, `Pressable`)
and NativeWind classes. Vite aliases `react-native` to `react-native-web` at
bundle time; TypeScript keeps the real `react-native` types, which is the
contract `react-native-web` implements. Adding an Expo target later means
pointing Metro at the same `src/` — no rewrite of the screens.

`index.html` sets `#root { display: flex }` on purpose: react-native-web's root
view is `flex: 1`, which only resolves if its parent is a flex container with a
real height. Without it the entire tree collapses to zero height.

## What is not built yet

Carried over from the original project but out of scope for this rebuild:
dispute filing and resolution, in-app notifications, CSV import/export, and
instructor-side filter/sort persistence.
