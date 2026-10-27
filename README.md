# BookLeaf Author Support

A private, local-first author support portal built for the BookLeaf technical assignment. It contains an author dashboard, a support-ticket workflow for operations staff, a SQLite API, and optional AI classification and response drafting. The provided ten-author/eighteen-book sample dataset is included for local testing.

## Run locally

Requirements: Node.js 20+ and npm.

```powershell
npm install
Copy-Item .env.example .env
$secret = node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
(Get-Content .env) -replace '^JWT_SECRET=.*$', "JWT_SECRET=$secret" | Set-Content .env
npm run seed
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The API runs on `http://localhost:4000`. The first seed creates the database at `server/data/bookleaf.sqlite`; running the seed again is safe and does not overwrite existing users or records.

The `JWT_SECRET` line in `.env.example` is intentionally blank: generate a unique secret for each environment and keep it in the ignored `.env` file or a deployment secret manager. Do not paste a real secret into the example file or commit it.

### Demo accounts

All sample authors use the password `Author123!`.

| Role | Email | Password |
| --- | --- | --- |
| Author | `priya.sharma@email.com` | `Author123!` |
| Admin | `admin@bookleaf.local` | `Admin123!` |

Set `ADMIN_PASSWORD` in `.env` before the first seed to change the local demo admin password. In production, set a unique password of at least 12 characters before seeding; the seed refuses the demo default in production mode. The seed is idempotent and will not reset a password on an existing account. Treat these credentials as demo-only; do not expose a deployed instance with demo credentials.

## Architecture

- `src/main.tsx`: browser entry point; mounts the React application and global styles.
- `src/App.tsx`: top-level role-based screen composition; delegates auth/session/data operations to the portal hook and feature screens to their components.
- `src/hooks/usePortal.ts`: auth/session state, typed API orchestration, ticket actions, filter-based queue loading, and eight-second refresh.
- `src/lib/api.ts`: shared authenticated JSON request helper and API error handling.
- `src/lib/format.ts`: shared currency/date formatters.
- `src/types.ts`: shared client-side domain types and ticket filter/category constants.
- `src/components/`: common UI primitives, login, and the shared application shell.
- `src/features/author/AuthorPages.tsx`: author overview, book catalogue, ticket list, and new-ticket form.
- `src/features/admin/AdminQueue.tsx` and `TicketDetail.tsx`: admin queue, filters, ticket conversation, and response tools.
- `src/styles.css`: responsive visual system for both portals.
- `server/index.js`: process entry point; loads environment/database and starts the HTTP listener.
- `server/app.js`: Express configuration, security middleware, route mounting, static client hosting, and centralized error handling.
- `server/routes/`: URL-to-controller mapping and route-specific authentication, role, validation, and rate-limit middleware.
- `server/controllers/`: HTTP handlers; translate validated requests into service/repository calls and shape HTTP responses.
- `server/repositories/`: SQLite queries and persistence mapping, including author-scoped lookups and ticket/message relations.
- `server/middleware/`: shared authentication, role checks, validation, async error forwarding, and rate limits.
- `server/validation/`: reusable Zod schemas for request bodies and filters.
- `server/ai.js`: AI service prompts, provider call, enum validation, local classifier fallback, and safe editable response fallback.
- `server/ai.test.js`: focused tests for Groq request configuration, valid response parsing, no-key fallback, and rate-limit fallback.
- `server/db.js`: SQLite connection, relational schema, constraints, and JSON book decoding.
- `server/seed.js`: idempotent loader for the provided author/book dataset plus local demo accounts.
- `server/data/bookleaf_sample_data.json`: supplied assignment dataset; `server/data/bookleaf.sqlite` is the generated local database and is ignored by Git.
- SQLite is a low-friction local demo store. Foreign keys constrain relationships; passwords are bcrypt hashes; tickets and public/internal messages are separate records.
- JWTs expire after 12 hours and are held in browser session storage. Author endpoints constrain book and ticket reads/writes to the signed-in author's ID. Admin routes are role-protected.

### Request flow

`server/index.js` starts the process → `server/app.js` installs shared middleware and mounts routers → a route validates and authorizes the request → a controller handles HTTP-level behavior → a repository owns database reads/writes. AI integration stays in its service module and is called by the relevant controller. This keeps SQL out of route definitions, HTTP response details out of repositories, and authorization at the API boundary. For a project this size, the separation is intentionally lightweight; a larger system could add a dedicated domain/service layer and repository interfaces where business rules or database backends justify them.

## AI approach

Set `GROQ_API_KEY` in the server's `.env` to enable Groq chat completions (default model: `llama-3.3-70b-versatile`; override with `GROQ_MODEL`). Create a key from the [GroqCloud console](https://console.groq.com/keys). The key stays server-side. Groq's chat-completions endpoint is OpenAI-compatible, so this app uses the standard HTTPS API without a vendor SDK. Ticket classification asks for a constrained category/priority JSON result, then validates both against the allowed enums. Draft generation includes only the relevant short policy excerpt, ticket text capped at 2,000 characters, and related book status—not the entire knowledge base or message history. Generation is bounded by output-token limits and a 12-second timeout.

Without a key, or when the provider returns an error, new tickets still save with transparent rule-based classification and admins still get a safe editable response suggestion. The admin can override category, priority, and status and must review/edit a draft before sending it. AI output is treated as a suggestion, not an action or source of account facts.

### Why Groq

I selected Groq because it offers a free developer tier for trying supported hosted models, and its OpenAI-compatible chat API makes integration small and easy to run. The chosen model is a starting point, not a guarantee that a free quota will always be available: Groq can change its model catalog and rate limits, and requests can be throttled. Check the [current model list](https://console.groq.com/docs/models) and [organization rate limits](https://console.groq.com/docs/rate-limits). The application handles AI errors and quota limits by saving tickets with local-rule classification and providing a safe editable response draft. Before production, compare Groq with other providers on a labeled BookLeaf ticket set for classification accuracy, factuality/tone, latency, reliability, privacy requirements, and actual price/limits.

The prompt incorporates the assignment's royalty terms (80% of net profit; quarterly calculation; 45-day payout window; ₹1,000 rollover threshold), ISBN escalation, print/reprint and distribution timelines, production stages, and empathetic communication guidance. It instructs the model not to invent account data or claim an action was taken, and treats the ticket as untrusted input. Ticket text is sent to Groq when a key is configured; do not include bank credentials, passwords, or other secrets in a support query, and confirm the provider's data terms before using real author data.

## REST API

All routes below except `POST /api/auth/login` and `GET /api/health` require `Authorization: Bearer <token>`. Admin routes require the admin role. JSON errors use `{ "error": "..." }`.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | API health |
| `POST` | `/api/auth/login` | Public | Validate `{ email, password }`; returns `{ token, user }` |
| `GET` | `/api/auth/me` | Signed in | Current account |
| `GET` | `/api/books` | Author | Own book catalogue and royalty figures |
| `POST` | `/api/tickets` | Author | Create ticket `{ bookId?, subject, description }`; `bookId` may be omitted for general/account-level |
| `GET` | `/api/tickets` | Author | Own tickets with public responses |
| `GET` | `/api/tickets/:id` | Author | One owned ticket with public responses |
| `GET` | `/api/admin/tickets` | Admin | Queue; optional `status`, `category`, `priority`, `from`, `to`, and `q` filters |
| `GET` | `/api/admin/tickets/:id` | Admin | Ticket including internal notes |
| `POST` | `/api/admin/tickets/:id/draft` | Admin | Generate an editable AI/fallback reply |
| `PATCH` | `/api/admin/tickets/:id` | Admin | Update `{ status?, category?, priority?, assignToMe? }` |
| `POST` | `/api/admin/tickets/:id/messages` | Admin | Add `{ body, visibility }`; visibility is `public` or `internal` |

Ticket statuses: `Open`, `In Progress`, `Resolved`, `Closed`. Categories: `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry`. Priorities: `Critical`, `High`, `Medium`, `Low`.

## Configuration and production notes

Copy `.env.example` to `.env`. Set a long random `JWT_SECRET`, a non-demo `ADMIN_PASSWORD`, and (optionally) `GROQ_API_KEY`. Never commit `.env`. The API adds standard security headers, JSON/body-size validation, API/login/ticket/AI throttles, and a stricter production check for the JWT secret. These rate limits use in-memory storage, which is not shared across server instances. For a real production deployment, use HTTPS, persistent managed database/storage (SQLite here is for local evaluation), a distributed rate-limit store, managed secrets, audit logging, schema migrations/backups, observability, account recovery and stronger session controls, and real attachment storage. File selection is UI-only in this assignment build; do not deploy the seeded demo accounts as real credentials.

The assignment says not to publish this confidential solution or data publicly. Keep this workspace and any repository private.

## Checks

```powershell
npm test
npm run build
npm audit --omit=dev
```
