---
name: api-layer
description: Structure and mandatory-test rules for the src/api/ layer in hezarfen_frontend — domain folders, one verb-first file per endpoint, index re-exports, fetch only in client.ts, and required vitest tests per domain. Load before adding or changing any API endpoint file.
---

# API layer

## Structure

- Domain-based folders under `src/api/` (e.g. `src/api/notes/`, `src/api/exams/`).
- One file per request under its domain folder, camelCase and verb-first, mirroring the endpoint exactly: `src/api/notes/getNoteById.ts`, `src/api/exams/deleteExamResultByUserId.ts`.
- Each file exports exactly one function matching its filename.
- Each domain must have an `index.ts` re-exporting its endpoints.
- Only `src/api/client/client.ts` calls `fetch` directly. Pages/components never call `fetch` — they call `src/api/<domain>` functions inside `createResource`.

## Tests — mandatory

Every new or modified API endpoint file must have a corresponding test file at `src/api/__tests__/<domain>/<domain>.test.ts` (one test file per domain, not per endpoint).

- Use **vitest** (globals enabled) and shared helpers from `src/api/__tests__/helpers/mock-fetch.ts`: `mockFetchSuccess`, `mockFetch204`, `mockFetchError`, `lastFetchCall`.
- Each test asserts correct URL, HTTP method, and request body (when applicable).
- `afterEach` must call `vi.restoreAllMocks()`.
- Run `bun run test` before committing.
- Do not skip or defer API tests — they are part of the definition of done for every API change.
