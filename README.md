# BookLeaf Author Support Portal

> A full-stack author-care portal for BookLeaf Publishing, with separate author and operations experiences, a PostgreSQL-backed REST API, and optional AI-assisted ticket triage.

| Authors can | Operations can |
| --- | --- |
| Browse books, sales, and royalty balances | Triage a searchable, filterable ticket queue |
| Submit book-specific or account-level questions | Override AI category, priority, and status |
| Follow replies and ticket status as they update | Assign tickets, add private notes, and send reviewed replies |

The included sample dataset contains **10 authors and 18 books**. The project is intended to remain private because the assignment and its sample data are confidential.

## Contents

- [Run locally](#run-locally)
- [Demo sign-in](#demo-sign-in)
- [Project structure](#project-structure)
- [AI workflow](#ai-workflow)
- [REST API](#rest-api)
- [Configuration and limitations](#configuration-and-limitations)
- [Checks](#checks)

## Run locally

Requirements: Node.js 20+ and npm.

```powershell
git clone https://github.com/Ajay-308/bookleaf.git
cd bookleaf
npm install
Copy-Item .env.example .env
$secret = node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
(Get-Content .env) -replace '^JWT_SECRET=.*$', "JWT_SECRET=$secret" | Set-Content .env
npm run db:generate
npm run db:migrate
npm run seed
npm run dev
```

Set `DATABASE_URL` in `.env` to a PostgreSQL connection URL before running the setup commands. The database role needs permission to create tables and indexes. Generate Prisma Client with `npm run db:generate`, apply migrations with `npm run db:migrate`, then run `npm run seed` to idempotently add sample authors, books, and the admin account without overwriting matching IDs. Set `ADMIN_PASSWORD` to configure the admin account password. For schema changes in development, update `prisma/schema.prisma` and run `npm run db:migrate:dev -- --name describe_change`. Open the Vite URL shown in the terminal (normally `http://localhost:5173`); the API runs on `http://localhost:4000`.

### Demo sign-in

These are the **local seed defaults**. All seeded authors share the author password; the admin password changes if `ADMIN_PASSWORD` is set in `.env`.

| Portal | Email | Password |
| --- | --- | --- |
| Author (Priya Sharma) | `priya.sharma@email.com` | `Author123!` |
| Operations admin | `admin@bookleaf.local` | `Admin123!` by default; otherwise the configured `ADMIN_PASSWORD` |

Use the author and admin quick-select buttons on the sign-in screen. These demo credentials are for local evaluation only; change them before using any real deployment.

This project currently targets Prisma 6 (`prisma` and `@prisma/client` 6.19). Prisma 6 supports the datasource `url` in `schema.prisma`; Prisma 7's `prisma.config.ts` and driver-adapter setup are not used here. Use the project-local CLI (`npx prisma` or the npm scripts) rather than a separately installed Prisma 7 CLI.

The `JWT_SECRET` line in `.env.example` is intentionally blank: generate a unique secret for each environment and keep it in the ignored `.env` file or a deployment secret manager. Do not paste a real secret into the example file or commit it.

## Project structure

`src/main.tsx`: browser entry point; mounts the React application and global styles.

`src/App.tsx`: top level role based screen composition; delegates auth/session/data operations to the portal hook and feature screens to their components.

`src/hooks/usePortal.ts`: auth/session state, typed API orchestration, ticket actions, queue loading based on filters, and eight second refresh.

`src/lib/api.ts`: shared authenticated JSON request helper and API error handling.

`src/lib/format.ts`: shared currency/date formatters.

`src/types.ts`: shared client side domain types and ticket filter/category constants.

`src/components/`: common UI primitives, login, and the shared application shell.

`src/features/author/AuthorPages.tsx`: author overview, book catalogue, ticket list, and new ticket form.

`src/features/admin/AdminQueue.tsx` and `TicketDetail.tsx`: admin queue, filters, ticket conversation, and response tools.

`src/styles.css`: responsive visual system for both portals.

`server/index.js`: process entry point; loads environment/database and starts the HTTP listener.

`server/app.js`: Express configuration, security middleware, route mounting, static client hosting, and centralized error handling.

`server/routes/`: URL to controller mapping and route specific authentication, role, validation, and rate limit middleware.

`server/controllers/`: HTTP handlers; translate validated requests into service/repository calls and shape HTTP responses.

`server/repositories/`: Prisma ORM queries and API response mapping, including author-scoped lookups and ticket/message relations.

`server/middleware/`: shared authentication, role checks, validation, async error forwarding, and rate limits.

`server/validation/`: reusable Zod schemas for request bodies and filters.

`server/ai.js`: AI service prompts, provider call, enum validation, local classifier fallback, and safe editable response fallback.

`server/ai.test.js`: focused tests for Groq request configuration, valid response parsing, fallback when there is no key, and rate limit fallback.

`server/api.integration.test.js`: HTTP-level author/admin ticket lifecycle, authorization, validation, and response visibility coverage.

`server/db.js`: Prisma Client setup and API response mapping for books.

`prisma/schema.prisma`: PostgreSQL data model and Prisma Client generator.

`server/data/bookleaf_sample_data.json`: supplied assignment dataset.

`server/seed.js`: idempotent ORM seed for the provided author/book dataset plus a demo admin account.

`prisma/migrations/`: versioned PostgreSQL schema migrations.

PostgreSQL foreign keys constrain relationships; passwords are bcrypt hashes; tickets and public/internal messages are separate records. The `db` connection URL is used only by server-side Prisma and must never be exposed to the client or committed.

JWTs expire after 12 hours and are held in browser session storage. Author endpoints constrain book and ticket reads/writes to the signed in author's ID. Admin routes are protected by role.

### Request flow

The request starts in `server/index.js`, where `server/app.js` installs shared middleware and mounts routers. A route validates and authorizes each request, a controller handles HTTP behavior, and a repository owns database reads and writes. AI integration stays in its service module and is called by the relevant controller. This keeps SQL out of route definitions, HTTP response details out of repositories, and authorization at the API boundary. For a project this size, the separation is intentionally lightweight; a larger system could add a dedicated domain layer and repository interfaces where business rules or database backends justify them.

## AI workflow

Set `GROQ_API_KEY` in the server's `.env` to enable Groq chat completions (default model: `openai/gpt-oss-20b`; override with `GROQ_MODEL`). Create a key from the [GroqCloud console](https://console.groq.com/keys). The key stays on the server. Groq's chat completions endpoint is OpenAI compatible, so this app uses the standard HTTPS API without a vendor SDK. Ticket classification asks for a constrained category/priority JSON result, then validates both against the allowed enums. Draft generation starts automatically when an admin opens a ticket; the admin can regenerate it with the button. It includes only the relevant BookLeaf policy excerpt, ticket text capped at 2,000 characters, and related book title/status, rather than the entire knowledge base or conversation history. Generation is bounded by output token limits and a 12 second timeout.

Without a key, or when the provider returns an error, new tickets still save with transparent classification based on rules and admins still get a safe editable response suggestion. The admin can override category, priority, and status and must review and edit a draft before sending it. AI output is treated as a suggestion, not an action or source of account facts.

### Provider choice

I selected Groq because it offers a free developer tier for trying supported hosted models, and its chat API compatible with OpenAI makes integration small and easy to run. The chosen model is a starting point, not a guarantee that a free quota will always be available: Groq can change its model catalog and rate limits, and requests can be throttled. Check the [current model list](https://console.groq.com/docs/models) and [organization rate limits](https://console.groq.com/docs/rate-limits). The application handles AI errors and quota limits by saving tickets with classification based on local rules and providing a safe editable response draft. Before production, compare Groq with other providers on a labeled BookLeaf ticket set for classification accuracy, factuality/tone, latency, reliability, privacy requirements, and actual price/limits.

The prompt incorporates the assignment's royalty terms (80% of net profit; quarterly calculation; 45 day payout window; ₹1,000 rollover threshold), ISBN escalation, print and reprint and distribution timelines, production stages, package descriptions, and empathetic communication guidance. It instructs the model not to invent account data or claim an action was taken, and treats the ticket as untrusted input. Ticket text is sent to Groq when a key is configured; do not include bank credentials, passwords, or other secrets in a support query, and confirm the provider's data terms before using real author data.

## REST API

All routes below except `POST /api/auth/login` and `GET /api/health` require `Authorization: Bearer <token>`. Admin routes require the admin role. JSON errors use `{ "error": "..." }`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | API health |
| `POST` | `/api/auth/login` | Public | Validate `{ email, password }`; returns `{ token, user }` |
| `GET` | `/api/auth/me` | Signed in | Current account |
| `GET` | `/api/books` | Author | Own book catalogue and royalty figures |
| `POST` | `/api/tickets` | Author | Create ticket `{ bookId?, subject, description }`; `bookId` may be omitted for general account questions |
| `GET` | `/api/tickets` | Author | Own tickets with public responses |
| `GET` | `/api/tickets/:id` | Author | One owned ticket with public responses |
| `GET` | `/api/admin/tickets` | Admin | Queue; optional `status`, `category`, `priority`, `from`, `to`, and `q` filters |
| `GET` | `/api/admin/tickets/:id` | Admin | Ticket including internal notes |
| `POST` | `/api/admin/tickets/:id/draft` | Admin | Generate an editable AI/fallback reply |
| `PATCH` | `/api/admin/tickets/:id` | Admin | Update `{ status?, category?, priority?, assignToMe? }` |
| `POST` | `/api/admin/tickets/:id/messages` | Admin | Add `{ body, visibility }`; visibility is `public` or `internal` |

Ticket statuses: `Open`, `In Progress`, `Resolved`, `Closed`. Categories: `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry`. Priorities: `Critical`, `High`, `Medium`, `Low`.

## Configuration and limitations

Copy `.env.example` to `.env`. Set a PostgreSQL connection URL in `DATABASE_URL`, a long random `JWT_SECRET`, a unique `ADMIN_PASSWORD`, and (optionally) `GROQ_API_KEY`. Set `CLIENT_ORIGIN` to the exact frontend origin and `VITE_API_BASE_URL` to the API base URL when the client and API are hosted separately. `VITE_API_BASE_URL` is public client configuration—never put secrets there. Apply the checked-in migrations as part of your deployment release, generate Prisma Client during the build, and do not run the sample seed against a production database.

The API adds standard security headers, JSON and body-size validation, rate limits for API, login, ticket, and AI requests, and a production check for the JWT secret. Rate limits use in-memory storage and are not shared across server instances. File selection is UI-only; attachments are not uploaded or persisted. For production, add shared rate-limit storage, managed secrets, audit logging, backups, observability, account recovery, stronger session controls, and secure attachment storage/scanning. Never deploy the sample credentials as real account credentials.

The assignment says not to publish this confidential solution or data publicly. Keep this workspace and any repository private.

## Checks

```powershell
npm test
npm run build
npm audit --omit=dev
```

`npm test` runs the AI service tests and an HTTP-level API lifecycle test. The lifecycle test exercises the real Express app, routes, authentication, validation, controllers, and repositories from sign-in through ticket creation, admin triage, private notes, and author-visible replies. It substitutes an in-memory Prisma boundary, so it requires no running database and does not modify local or production data.
