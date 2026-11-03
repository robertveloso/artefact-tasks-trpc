# Tarefas — Next.js 15 + tRPC

[![CI](https://github.com/robertveloso/artefact-tasks-trpc/actions/workflows/ci.yml/badge.svg)](https://github.com/robertveloso/artefact-tasks-trpc/actions/workflows/ci.yml)

A task manager built for the Artefact Software Engineer case. The backend keeps the tasks in memory
and exposes them through tRPC; the frontend is a Next.js 15 (App Router) app that renders the list on
the server and uses tRPC + TanStack Query on the client.

**Live demo:** DEMO_URL
(free instance: the first request after a while asleep can take up to a minute, and the data resets
to the sample tasks whenever the service restarts).

## Running it

Requirements: Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm test           # router tests (Vitest)
npm run test:e2e   # production build + end-to-end tests (Playwright); first run: npx playwright install chromium
npm run typecheck  # TypeScript, strict mode
npm run build && npm start
```

On startup the store is seeded with 24 fictitious tasks so the list and the infinite scroll have
something to show. Set `SEED_TAREFAS=false` to start empty. Data is lost when the server restarts.

## What it does

| Requirement | Where |
| --- | --- |
| Task model: `id`, `titulo`, `descricao?`, `dataCriacao` | `src/server/store.ts` |
| CRUD via tRPC: `criar`, `listar`, `obter`, `atualizar`, `deletar` | `src/server/routers/tarefas.ts` |
| No task without a title; meaningful errors (e.g. updating a missing task → `NOT_FOUND`) | `src/lib/schemas.ts`, `src/server/trpc.ts` |
| List page pre-loaded with SSR | `src/app/(lista)/page.tsx` |
| Delete from the list with success/error feedback | `src/components/TaskList.tsx` |
| Create/edit form with hooks and validation | `src/components/TaskForm.tsx` |
| Loading, success and failure states | skeletons, "Salvando…", banners, inline field errors, error page |
| Bonus: infinite scroll | `TaskList.tsx` (IntersectionObserver + `useInfiniteQuery`) |
| Bonus: comments and README | throughout, and this file |

Beyond the brief:

- **Search by title**, on the server, ignoring case and accents, kept in the URL (`/?q=…`).
- **Optimistic delete** with rollback: the task leaves the list at once and comes back, with an
  error message, if the server fails.
- **Accessibility:** labels and names for every control, focus moved to a sensible place after
  validation errors and deletions, skip link, visible focus ring, live regions for status messages,
  reduced motion respected. Checked with axe in the end-to-end tests.
- **Dark theme** that follows the operating system setting.
- **Tests and CI:** router tests (Vitest) and end-to-end tests (Playwright) run on every push.

## Structure

```
src/
  app/
    (lista)/page.tsx           list (Server Component, SSR) + search
    (lista)/loading.tsx        list skeleton
    tarefas/nova/page.tsx      create
    tarefas/[id]/editar/       edit (Server Component loads the task, 404 if missing)
    error.tsx, not-found.tsx   error and 404 pages
    api/trpc/[trpc]/route.ts   tRPC HTTP endpoint (fetch adapter)
  components/                  TaskList, TaskForm, SearchBox, Notice, Skeleton
  lib/schemas.ts               zod schemas shared by server and client
  server/
    store.ts                   in-memory store
    trpc.ts                    tRPC init, superjson, error formatting
    routers/                   procedures
    caller.ts                  server-side caller used by Server Components
  trpc/                        React client and provider
tests/tarefas.test.ts          router tests (Vitest)
e2e/tarefas.spec.ts            end-to-end tests (Playwright)
```

## Decisions

- **One set of validation rules.** The zod schemas in `src/lib/schemas.ts` validate the tRPC input
  on the server and the form on the client, so both sides agree and show the same messages. The
  server is still the source of truth: the form only saves a round trip.
- **Readable errors.** `errorFormatter` turns schema failures into a short message plus
  `fieldErrors`, which the form shows next to each field. Missing tasks return `NOT_FOUND` with the
  id in the message.
- **SSR without a second request.** The list page calls the router directly on the server
  (`createCaller`, no HTTP hop to its own API) and passes the first page to the client, which uses it
  as `initialData` for `useInfiniteQuery`. The HTML arrives with the tasks in it and the client does
  not refetch on load (an end-to-end test checks this).
- **Keyset pagination.** The cursor is the `dataCriacao` + `id` of the last task sent, not an offset,
  so creating or deleting tasks while scrolling does not skip or repeat items (covered by tests). The
  search filters before the cursor is applied, so search results page the same way.
- **Search in the URL.** The search box updates `?q=` (debounced, as a transition), so the server
  renders the filtered first page, the result can be shared as a link, and back/forward work.
- **Optimistic delete.** `onMutate` snapshots every cached list (the full one and each search),
  removes the task from all of them, and `onError` restores the snapshot. Creating or editing drops
  the cached lists instead, so the list page starts from the fresh server render.
- **Loading boundary only where it helps.** The list skeleton lives in the `(lista)` route group. A
  `loading.tsx` makes Next.js stream the response, which sends the 200 status before the page runs,
  so the edit page has none and can still answer a real 404 for a missing task.
- **Dates.** `superjson` keeps `dataCriacao` a `Date` on the client. Dates are formatted with a fixed
  time zone (America/Sao_Paulo) so the server and the browser render the same text (no hydration
  mismatch).
- **In-memory store.** A single `Map` kept on `globalThis`, so dev hot reloads do not wipe it and the
  API route and Server Components share it. This only works in a single long-lived Node process; on
  serverless or with several instances each one would have its own data. That is why the demo runs
  as one Node service on Render (`render.yaml`) rather than on serverless functions. The store sits
  behind a small class, so swapping it for a database would not touch the router or the UI.

## Tests

- `tests/tarefas.test.ts` (Vitest) calls the router directly: CRUD, validation, `NOT_FOUND`,
  pagination without repeats or gaps, a cursor that survives deleting its task, and search.
- `e2e/tarefas.spec.ts` (Playwright) runs against the production build: the list arrives
  server-rendered with no client refetch, infinite scroll to the end, validation, create, edit,
  delete, delete rollback when the request fails, search, the 404 page, and an axe accessibility scan
  in the light and dark themes.

## Possible next steps

Persistence (PostgreSQL + an ORM), authentication with per-user lists, marking tasks as done, and
optimistic create/edit.
