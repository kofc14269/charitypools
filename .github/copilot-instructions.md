## Repo Summary

- Purpose: a small React + TypeScript single-page app that runs a Super Bowl "charity squares" contest and stores state in Firebase Realtime Database.
- Runtime: Vite dev server; deploys to GitHub Pages (`npm run deploy`).

## Big Picture / Architecture

- Frontend: React + TypeScript (entry: `index.tsx` → `App.tsx`). UI components live in `components/` (notably `Grid.tsx`, `AdminPanel.tsx`, `AIAssistant.tsx`).
- State & persistence: single canonical app state stored under the Realtime DB root key `state`. `App.tsx` reads/writes `state` and normalizes legacy/object shapes into arrays.
- Data model: types in `types.ts` (Pool, Square, Participant, ScoreEntry, GlobalSettings). IDs are UUIDs generated with `crypto.randomUUID()`.
- DB paths: most updates use array indices for pools/squares (e.g. `state/pools/${poolIndex}/squares/${idx}`); compute `poolIndex` with `state.pools.findIndex(p => p.id === state.activePoolId)` before writing.
- Payments: payment allocation is performed client-side via `atomicUpdateFinancials` in `App.tsx` which updates both `participants` and each square's `paidAmount` using a single `update(ref(db), updates)` call.

## Key files to inspect for behavior

- `App.tsx` — orchestration: load/normalize DB `state`, handlers for entries, payments, pool management, admin auth, and all DB writes.
- `components/Grid.tsx` — rendering, export/print, auto-fit/zoom, winner calculation logic (uses last-digit matching against `rowNumbers`/`colNumbers`).
- `components/AIAssistant.tsx` — uses `@google/genai` to query a Gemini-like model; it builds a short context from `globalSettings` and `activePool` before calling the model.
- `firebase.ts` — Firebase config and `db` export used across the app.
- `types.ts` — canonical shapes; use these when generating or validating data structures.

## Developer workflows / commands

- Install: `npm install`
- Run dev server: `npm run dev` (Vite)
- Build: `npm run build`
- Preview build: `npm run preview`
- Deploy (GitHub Pages): `npm run deploy` (runs `gh-pages -d dist`).

Notes: README suggests setting `GEMINI_API_KEY` in `.env.local`, but the code (`AIAssistant.tsx`) reads `process.env.API_KEY`. Verify environment variable mapping when running AI features.

## Project-specific patterns & conventions

- Single-source DB: the app treats `state` as authoritative. Avoid creating parallel local state that diverges from DB unless explicitly intended.
- Use index-based DB paths when writing arrays; always resolve the current array index first (see `App.tsx` `poolIndex` usage).
- Aliases: participant aliases are uppercased in `handleEntrySubmit` — keep this when importing/exporting.
- Payment logic: payments are applied across a participant's squares in insertion order until funds are exhausted. Use `atomicUpdateFinancials` semantics for any script or migration to stay consistent.
- UI locking: `pool.settings.isLocked` prevents new assignments; many controls check this flag before allowing writes.

## AI integration specifics

- Dependency: `@google/genai` in `package.json`.
- Model call example: `ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: <context+prompt> })` in `components/AIAssistant.tsx`.
- Required key: set environment variable for the GenAI API key (README says `GEMINI_API_KEY` but code expects `API_KEY`). Ensure CI/dev environment exposes the key as `process.env.API_KEY` or update the component.

## Safe edit guidelines for contributors or agents

- Prefer non-destructive DB updates using `update(ref(db), updates)` rather than overwriting `state` unless intentionally resetting/importing full state.
- When adding features that write to pools/squares: replicate the pattern: compute `poolIndex`, then write to `state/pools/${poolIndex}/...` paths.
- Keep types aligned with `types.ts`. Add any new fields to `types.ts` and normalize reads in `App.tsx` if persisted structures vary.
- Tests: there are no automated tests in the repo — manual verification steps are via `npm run dev` and by observing Realtime DB changes.

## Quick examples (copy-paste patterns)

- Find pool index before write:
```
const poolIndex = state.pools.findIndex(p => p.id === state.activePoolId);
update(ref(db, `state/pools/${poolIndex}/settings`), newSettings);
```

- Atomic payment/square update (single `update(ref(db), updates)` object): see `atomicUpdateFinancials` in `App.tsx`.

---
If anything here is unclear or you'd like me to include code snippets for a specific task (migration, test harness, or CI setup), tell me which part to expand. I'll iterate. 
