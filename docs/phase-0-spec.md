# Phase 0 — Expo skeleton + server-side API route

Date: 2026-08-17
Status: awaiting review

## Goal

Prove one thing: **an Expo Router API route is reachable from the iOS Simulator,
and a secret read inside it never reaches the app bundle.**

Everything else in the app is out of scope. This phase exists to de-risk the
architecture in `CLAUDE.md` before any real code depends on it.

## The risk, and why it is already mostly retired

The open question was whether API routes resolve from the Simulator or whether
we need the separate Node server on `:3001` that `CLAUDE.md` documents as a
fallback. Checked against current Expo docs (Context7, `/expo/expo`) rather than
training data:

1. **Relative fetch resolves in dev.** Expo docs: *"Relative fetch requests
   automatically resolve to the development server's origin."* The `origin`
   field in the `expo-router` plugin config is for **production native builds**
   only — a deployed server, EAS. We run dev-only, so we do not set it.

2. **Non-public env vars are dropped from the client bundle by the bundler.**
   Enforced in `@expo/metro-config/src/transform-worker/dot-env-development.ts`:

   ```typescript
   if (isClient && !key.startsWith('EXPO_PUBLIC_')) {
     // Don't include non-public variables in the client bundle.
     continue;
   }
   ```

   API routes separately receive *all* env vars, not only `EXPO_PUBLIC_` ones.

So the expected outcome is that this works. The phase is a verification, not an
experiment. **The Node `:3001` fallback is not implemented and not hedged for.**

## Deliverables

1. Expo + TypeScript + Expo Router app at the repo root, iOS Simulator target.
   Scaffolded via `create-expo-app` into a temp directory, then merged into the
   repo so `CLAUDE.md`, `LICENSE`, `README.md` and `.gitignore` survive.
   Generated `.gitignore` entries (`node_modules/`, `.expo/`, `dist/`, build
   output) get merged into ours rather than replacing it.

2. `app.json` with `web.output: "server"`, carrying a comment at the config site
   explaining that this gates API routes on **native** too, and that removing
   the `web` key because "we don't ship web" silently breaks iOS.

3. `.env` containing `FAKE_KEY=hunter2`. Never imported in app code. Already
   covered by the committed `.gitignore`.

4. `.env.example` containing `FAKE_KEY=replace_me`, committed. Without it a
   teammate clones, gets `keyLoaded: false`, and reads it as phase 0 failing.
   The `!.env.example` negation is already in `.gitignore`.

   **A placeholder, never the live value.** `hunter2` is harmless today because
   the secret is fake, but mirroring real values into `.env.example` is the
   convention that leaks a provider key into this public repo at Phase 2. The
   convention gets set correctly now rather than retrofitted under deadline.

5. `README.md` note: Phase 0 expects `FAKE_KEY=hunter2` specifically in `.env`.
   That value lives in the README, which is documentation, and not in
   `.env.example`, which is a template people copy over their real secrets.

6. `app/api/health+api.ts` exporting `GET`, returning
   `{ ok: true, keyLoaded: <boolean> }` where `keyLoaded` is
   `Boolean(process.env.FAKE_KEY)`. **The route never echoes the value**, only
   whether it was readable.

7. `app/index.tsx` — one screen, fetches the route on mount via a **relative**
   URL, renders the raw JSON response.

8. `CLAUDE.md` updated (see below).

Nothing else. No data layer, no `MenuSource`, no `ModelClient`, no filter, no
persona blocks, no chat UI.

## Verification

The original plan was a single test asserting `keyLoaded: true`. That test
passes even when routing from the Simulator is entirely broken — it proves the
handler works, which was never the risk. Reachability is the phase. So: one
check per layer that can independently fail.

| # | Layer | Check | Catches |
|---|-------|-------|---------|
| 1 | Handler | Unit test on the `GET` export asserting `keyLoaded: true` | env not readable server-side |
| 2 | Routing | `curl http://localhost:8081/api/health` against the running dev server | `+api.ts` convention or `web.output` wrong |
| 3 | Native origin | Simulator renders the response | relative fetch not resolving on iOS |
| 4 | Secret containment | `npx expo export --platform ios`, then the scoped greps below | the secret actually shipping |

### Check 4 in detail

Grepping our own source proves nothing — we never write `FAKE_KEY` in app code,
so it passes trivially. Only the built output is evidence.

`web.output: "server"` means the export may emit a **server** portion alongside
the client one. If it does, that server portion legitimately contains
`process.env.FAKE_KEY` — the API route reads it there, which is the entire
design. A blanket `grep -r FAKE_KEY dist/` would flag correct behaviour as a
breach and cost us an hour chasing it.

So the check runs in three ordered steps, with both branches predefined so there
is no judgment call at execution time:

**4a — Inspect before asserting.** Run the export, then record the actual tree:

```
find dist -maxdepth 2 -type d
```

Write down what it produced. Everything below keys off that.

**4b — Value grep. Unscoped, unconditional. This is the check that matters.**

```
grep -r 'hunter2' dist/    # must return zero hits
```

The value must never be inlined anywhere — client or server. A server bundle
reading `process.env.FAKE_KEY` at runtime is correct; a server bundle containing
the literal string `hunter2` is a build-time inlining bug and a real failure.

**4c — Key-name grep. Scoped to the client portion only.** Secondary check.

- If 4a shows a server portion (e.g. `dist/server`), grep the **client** paths
  only. A `FAKE_KEY` hit inside the server portion is **expected and correct** —
  not a failure, and not to be "fixed".
- If 4a shows no server portion, all of `dist/` is client output, so grep all of
  it.

Record which branch applied in the phase report, so the next person reading this
knows which shape the export actually produced.

Test runner: `jest-expo`, the Expo-sanctioned preset. Heavier than a bare
`node --test` for one test, but later phases (deterministic filter, persona
composition) need a runner regardless, so this is setup we would do anyway
rather than scaffolding waste.

## Stop condition

If the route does not resolve from the Simulator after a real attempt: **stop and
report.** Do not implement the `:3001` Node fallback. It rewires every later
phase and that call belongs to the team, not to the implementer.

## CLAUDE.md changes

A short `### Verified 17 Aug 2026` subsection under **Stack**. Rationale: this is
shared memory across four people and across cleared sessions. Anything living
only in a transcript is lost at the next `/clear` and gets rediscovered at the
cost of an hour.

Content, tight:

- API routes resolve from the Simulator in dev via relative fetch. **The `:3001`
  Node fallback is RESOLVED as unnecessary — later phases must not hedge for
  it.**
- `origin` in the `expo-router` plugin config is required only for production
  native builds. Forward note: the moment we make a real build instead of
  running dev, it becomes mandatory.
- Metro drops non-`EXPO_PUBLIC_` vars from the client bundle, with the
  `dot-env-development.ts` mechanism named so nobody re-derives it.
- `web.output: "server"` gates API routes on native too. Do not remove the `web`
  key.

## Spec path convention

This document lives at `docs/phase-0-spec.md`. Every later phase follows the same
shape: `docs/phase-<N>-spec.md`. Five more are coming, and these specs are the
recovery mechanism when a session is cleared or dies mid-phase — a predictable
path matters more than a descriptive filename.

## Commits

Two, in order:

1. This spec document.
2. `phase 0: expo skeleton + server-side API route` — scaffold, route, screen,
   test, `.env.example`, README note, and the `CLAUDE.md` update, which is part
   of the phase rather than an afterthought.

Both pushed to `origin/main`. Remote is public; `.env` is gitignored and stays
untracked.

## Done when

- Simulator renders `keyLoaded: true`
- `curl` against the dev server returns the same
- Unit test passes
- `grep -r 'hunter2' dist/` returns zero hits (unscoped — the check that matters)
- Key-name grep clean in the client portion, per the 4c branch that applied
- Pushed to the remote
