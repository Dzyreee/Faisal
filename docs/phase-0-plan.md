# Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove an Expo Router API route is reachable from the iOS Simulator and that a secret read inside it never reaches the app bundle.

**Architecture:** A minimal Expo Router app scaffolded into the existing repo. One API route (`app/api/health+api.ts`) reads `process.env.FAKE_KEY` server-side and returns a boolean, never the value. One screen fetches it with a relative URL, which Expo resolves to the dev server origin on native. Verification is layered: handler test, `curl` against the dev server, Simulator render, and a grep of the exported bundle.

**Tech Stack:** Expo SDK (latest), Expo Router, TypeScript, jest-expo, iOS Simulator.

**Spec:** `docs/phase-0-spec.md`

## Global Constraints

- Toolchain verified on the build machine: Xcode 26.2, iPhone 17 Pro simulator, Node 24.13.0.
- Target is the **iOS Simulator**. Web is never opened; `web.output: "server"` exists only to gate API routes.
- `.env` is gitignored and must never be committed. Remote `https://github.com/Dzyreee/Faisal` is **public**.
- `.env` contains `FAKE_KEY=hunter2`. `.env.example` contains `FAKE_KEY=replace_me` — a placeholder, never the live value.
- `FAKE_KEY` is never imported, referenced, or read in any file under `app/` except `app/api/health+api.ts`.
- The route returns `keyLoaded` as a boolean. It never echoes the value.
- **Build nothing beyond this plan.** No data layer, no `MenuSource`, no `ModelClient`, no filter, no persona blocks, no chat UI.
- **Stop condition:** if the route does not resolve from the Simulator after a real attempt, stop and report. Do not implement the `:3001` Node fallback — that call belongs to the team.

## Spec deviation (approved rationale, recorded here)

The spec asks for a comment at the `web.output: "server"` config site explaining that removing the `web` key breaks native. **`app.json` is strict JSON and cannot carry comments.** Migrating to `app.config.ts` to gain comments adds risk for no phase-0 benefit. The warning therefore goes in `README.md` and `CLAUDE.md` instead. Same trap, documented where it will actually be read.

## File Structure

| File | Responsibility |
|---|---|
| `app/_layout.tsx` | Root Stack navigator. Minimal — replaces the template's example navigation. |
| `app/index.tsx` | The single screen. Fetches the route on mount, renders the raw response. |
| `app/api/health+api.ts` | The API route. Sole reader of `process.env.FAKE_KEY`. |
| `__tests__/health-route.test.ts` | Handler-layer test. |
| `app.json` | Expo config. Carries `web.output: "server"`. |
| `.env` | `FAKE_KEY=hunter2`. Untracked. |
| `.env.example` | `FAKE_KEY=replace_me`. Tracked. |
| `README.md` | Setup steps, the phase-0 expected value, the `web` key trap. |
| `CLAUDE.md` | Shared memory. Gains a `### Verified 17 Aug 2026` subsection. |

---

### Task 1: Scaffold the Expo app into the existing repo

**Files:**
- Create: `app/_layout.tsx`, `app/index.tsx`, `package.json`, `app.json`, `tsconfig.json` (all from scaffold)
- Modify: `.gitignore` (merge generated entries into ours)
- Preserve untouched: `CLAUDE.md`, `LICENSE`, `docs/`

**Interfaces:**
- Consumes: nothing.
- Produces: a booting Expo Router app. Later tasks add `app/api/health+api.ts` and rewrite `app/index.tsx`.

- [ ] **Step 1: Scaffold into a temp directory, not the repo root**

`create-expo-app` writes its own `.gitignore` and `README.md` and refuses to run in some non-empty directories. Scaffold outside, then merge.

```bash
cd /tmp && rm -rf faisal-scaffold
npx create-expo-app@latest faisal-scaffold --template default --no-install
```

- [ ] **Step 2: Verify the template actually includes expo-router**

```bash
grep -E '"expo-router"|"expo"|"typescript"' /tmp/faisal-scaffold/package.json
```

Expected: `expo-router` is present in `dependencies`.

**If `expo-router` is absent, STOP and report.** The `default` template changed and the plan needs revisiting — do not substitute a different template silently.

- [ ] **Step 3: Merge the scaffold into the repo, protecting tracked files**

```bash
cd /tmp/faisal-scaffold
rm -f README.md .gitignore
rm -rf .git
cp -R . /Users/yacine/Desktop/Faisal/
```

`README.md` and `.gitignore` are removed from the scaffold before copying so our tracked versions survive. `README.md` gets rewritten deliberately in Task 2.

- [ ] **Step 4: Merge the generated ignore entries into our `.gitignore`**

Append to `/Users/yacine/Desktop/Faisal/.gitignore`:

```gitignore

# Expo / build output
node_modules/
.expo/
dist/
web-build/
*.orig.*
ios/
android/
expo-env.d.ts
```

`dist/` matters specifically: Task 4 exports the bundle there and it must never be committed.

- [ ] **Step 5: Replace the template's example screens with a minimal pair**

The default template ships a tabs example. Phase 0 needs one screen. Delete the example routes and write the minimal replacements.

```bash
cd /Users/yacine/Desktop/Faisal
rm -rf app/\(tabs\) app/+not-found.tsx components/ constants/ hooks/ 2>/dev/null || true
```

Create `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

Create `app/index.tsx` (placeholder for now — Task 3 makes it fetch):

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Phase 0</Text>
    </View>
  );
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd /Users/yacine/Desktop/Faisal && npm install
```

- [ ] **Step 7: Verify the app boots in the Simulator**

```bash
cd /Users/yacine/Desktop/Faisal && npx expo start --ios
```

Expected: Metro starts, the iOS Simulator opens, the app renders "Phase 0".

Capture evidence:

```bash
xcrun simctl io booted screenshot /tmp/phase0-task1.png
```

Then stop the dev server.

**If the Simulator does not boot the app, STOP and report.** Nothing later in this plan is meaningful without this.

- [ ] **Step 8: Confirm no secret material is staged**

```bash
cd /Users/yacine/Desktop/Faisal && git status --short && git check-ignore -v .env 2>/dev/null || echo ".env absent (expected — created in Task 2)"
```

Expected: `node_modules/` and `dist/` do not appear in `git status`.

- [ ] **Step 9: Commit**

```bash
cd /Users/yacine/Desktop/Faisal
git add -A
git commit -m "phase 0: scaffold expo router app"
```

---

### Task 2: API route, env, and the handler + routing checks

**Files:**
- Create: `app/api/health+api.ts`, `__tests__/health-route.test.ts`, `.env`, `.env.example`
- Modify: `app.json` (set `web.output`), `package.json` (jest config + test script), `README.md` (rewrite)

**Interfaces:**
- Consumes: the scaffolded app from Task 1.
- Produces: `GET(): Response` exported from `app/api/health+api.ts`, returning JSON body `{ ok: true, keyLoaded: boolean }`. Task 3's screen fetches `/api/health` and depends on this shape.

- [ ] **Step 1: Install the test runner**

```bash
cd /Users/yacine/Desktop/Faisal
npx expo install --dev jest-expo jest @types/jest
```

If that flag form is rejected by the installed CLI, fall back to:

```bash
npm install --save-dev jest-expo jest @types/jest
```

- [ ] **Step 2: Add jest config and test script to `package.json`**

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

Merge these keys into the existing `scripts` block rather than replacing it.

- [ ] **Step 3: Write the failing test**

Create `__tests__/health-route.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { GET } from '../app/api/health+api';

describe('GET /api/health', () => {
  it('reports the server-side key as loaded', async () => {
    process.env.FAKE_KEY = 'hunter2';

    const response = GET();
    const body = await response.json();

    expect(body).toEqual({ ok: true, keyLoaded: true });
  });

  it('never echoes the secret value', async () => {
    process.env.FAKE_KEY = 'hunter2';

    const response = GET();
    const raw = await response.text();

    expect(raw).not.toContain('hunter2');
  });
});
```

The test sets `process.env.FAKE_KEY` directly rather than loading `.env`. This is deliberate: this layer tests the handler's logic. Whether `.env` loads is proven by the `curl` and Simulator layers.

- [ ] **Step 4: Run the test to verify it fails**

```bash
cd /Users/yacine/Desktop/Faisal && npx jest __tests__/health-route.test.ts
```

Expected: FAIL — cannot resolve `../app/api/health+api`.

- [ ] **Step 5: Write the minimal implementation**

Create `app/api/health+api.ts`:

```ts
// Reads the server-only secret. This file is the ONLY place FAKE_KEY is touched.
// It returns whether the key was readable — never the value itself.
export function GET(): Response {
  return Response.json({
    ok: true,
    keyLoaded: Boolean(process.env.FAKE_KEY),
  });
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd /Users/yacine/Desktop/Faisal && npx jest __tests__/health-route.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 7: Enable API routes in `app.json`**

Set `web.output` to `"server"`. The `web` key likely already exists with `"output": "static"` — change the value, keep the rest.

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "server"
    }
  }
}
```

**This gates API routes on native too, despite the key being named `web`.** JSON cannot carry a comment, so the warning lives in `README.md` (next step) and `CLAUDE.md` (Task 4).

- [ ] **Step 8: Create `.env` and `.env.example`**

`.env` (untracked):

```
FAKE_KEY=hunter2
```

`.env.example` (tracked):

```
FAKE_KEY=replace_me
```

**`.env.example` gets a placeholder, never the live value.** Harmless now because the secret is fake, but this sets the convention, and at Phase 2 a real provider key enters a public repo.

- [ ] **Step 9: Verify `.env` is ignored and `.env.example` is not**

```bash
cd /Users/yacine/Desktop/Faisal
git check-ignore -v .env && echo "OK: .env ignored"
git check-ignore .env.example && echo "PROBLEM: .env.example is ignored" || echo "OK: .env.example trackable"
```

Expected: `.env` ignored, `.env.example` trackable.

- [ ] **Step 10: Rewrite `README.md`**

```markdown
# Faisal

Food delivery decision assistant for Doha. See `CLAUDE.md` for the project brief.

## Setup

```bash
npm install
cp .env.example .env
```

Then edit `.env`. **Phase 0 expects `FAKE_KEY=hunter2` specifically** — the
health route reports whether it was readable, and the value is asserted during
verification.

`.env.example` holds placeholders only. Never mirror a live secret into it —
this repo is public.

## Run

```bash
npx expo start --ios
```

## Test

```bash
npm test
```

## Config trap

`app.json` sets `web.output: "server"`. Despite the key being named `web`, **this
gates Expo Router API routes on native as well.** Removing it because "we don't
ship a web build" silently breaks the iOS app. `app.json` is strict JSON and
cannot carry a comment, which is why this warning lives here.
```

- [ ] **Step 11: Routing check — `curl` against the running dev server**

Start the dev server in one shell:

```bash
cd /Users/yacine/Desktop/Faisal && npx expo start
```

In another:

```bash
curl -s http://localhost:8081/api/health
```

Expected output: `{"ok":true,"keyLoaded":true}`

If Metro reports a different port, use that port. **If the route 404s, STOP and report** — that is the `+api.ts` convention or `web.output` being wrong, and it is exactly the risk this phase exists to find.

- [ ] **Step 12: Commit**

```bash
cd /Users/yacine/Desktop/Faisal
git add app/api/health+api.ts __tests__/health-route.test.ts .env.example app.json package.json package-lock.json README.md
git commit -m "phase 0: health API route reading server-side env"
```

`.env` is deliberately absent from that list. Confirm with `git status --short` that it is not staged.

---

### Task 3: Screen fetches the route from the Simulator

**Files:**
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: `GET /api/health` from Task 2, body shape `{ ok: true, keyLoaded: boolean }`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Rewrite `app/index.tsx` to fetch on mount**

```tsx
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function Index() {
  const [body, setBody] = useState('loading…');

  useEffect(() => {
    // Relative URL on purpose. Expo resolves this to the dev server origin
    // on native — that resolution is the thing Phase 0 is proving.
    fetch('/api/health')
      .then((response) => response.text())
      .then(setBody)
      .catch((error) => setBody(`ERROR: ${String(error)}`));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text selectable style={{ fontSize: 16 }}>
        {body}
      </Text>
    </View>
  );
}
```

The screen renders the **raw** response text, not a parsed field, so a malformed or error response is visible rather than swallowed.

- [ ] **Step 2: Run in the Simulator**

```bash
cd /Users/yacine/Desktop/Faisal && npx expo start --ios
```

- [ ] **Step 3: Verify the render and capture evidence**

Expected on screen: `{"ok":true,"keyLoaded":true}`

```bash
xcrun simctl io booted screenshot /tmp/phase0-simulator.png
```

Read the screenshot back to confirm the text, rather than assuming.

**If the screen shows `ERROR:` — relative fetch is not resolving on native. STOP and report.** Do not add an absolute URL, an `origin` config entry, or the `:3001` Node server. That is the team's call, and it is the finding this phase exists to produce.

- [ ] **Step 4: Commit**

```bash
cd /Users/yacine/Desktop/Faisal
git add app/index.tsx
git commit -m "phase 0: screen fetches health route on mount"
```

---

### Task 4: Secret containment audit, CLAUDE.md, push

**Files:**
- Modify: `CLAUDE.md`
- Produces: `dist/` (gitignored, not committed)

**Interfaces:**
- Consumes: the working app from Tasks 1–3.
- Produces: the phase report.

- [ ] **Step 1: Export the iOS bundle**

```bash
cd /Users/yacine/Desktop/Faisal && rm -rf dist && npx expo export --platform ios
```

- [ ] **Step 2 (4a): Inspect what the export actually produced — before asserting anything**

```bash
cd /Users/yacine/Desktop/Faisal && find dist -maxdepth 2 -type d
```

Record the output verbatim in the phase report. Both branches of Step 4 key off it.

- [ ] **Step 3 (4b): Value grep — unscoped, unconditional. This is the check that matters.**

```bash
cd /Users/yacine/Desktop/Faisal
grep -r 'hunter2' dist/ && echo "FAIL: value present in bundle" || echo "PASS: value absent"
```

Expected: `PASS: value absent`. `grep` exits non-zero when it finds nothing, which is the passing case here — do not misread that exit code as an error.

The value must be absent from **all** output, client and server alike. A server bundle reading `process.env.FAKE_KEY` at runtime is correct; a server bundle containing the literal string `hunter2` is a build-time inlining bug and a genuine failure.

- [ ] **Step 4 (4c): Key-name grep — scoped to the client portion only. Secondary check.**

Apply whichever branch Step 2 established:

**Branch A — the export produced a server portion (e.g. `dist/server` exists):**

```bash
cd /Users/yacine/Desktop/Faisal
grep -r 'FAKE_KEY' dist/client/ && echo "FAIL: key name in client bundle" || echo "PASS: client clean"
```

A `FAKE_KEY` hit **inside the server portion is expected and correct.** The API route reads it there — that is the design. Do not "fix" it.

**Branch B — no server portion; all of `dist/` is client output:**

```bash
cd /Users/yacine/Desktop/Faisal
grep -r 'FAKE_KEY' dist/ && echo "FAIL: key name in client bundle" || echo "PASS: client clean"
```

Record which branch applied.

- [ ] **Step 5: Confirm `dist/` is not tracked**

```bash
cd /Users/yacine/Desktop/Faisal && git status --short && git check-ignore -v dist
```

Expected: `dist/` is ignored and absent from `git status`.

- [ ] **Step 6: Update `CLAUDE.md`**

Add a `### Verified 17 Aug 2026` subsection under **Stack**, after the existing `Verified on the build machine` line:

```markdown
### Verified 17 Aug 2026 — Expo Router API routes

Checked against current Expo docs and confirmed by running Phase 0. Recorded
here because this is shared memory across four people and across cleared
sessions; anything living only in a transcript costs someone an hour to
rediscover.

- **Relative `fetch` from native resolves to the dev server origin in
  development.** `app/api/health+api.ts` is reachable from the iOS Simulator
  with a plain `fetch('/api/health')`.
- **The `:3001` Node server fallback is RESOLVED as unnecessary.** Later phases
  must not hedge for it. It stays documented only as the contingency we ruled
  out.
- **`origin` in the `expo-router` plugin config is needed only for production
  native builds.** Forward note: the moment we produce a real build instead of
  running dev, setting it becomes mandatory.
- **Metro drops non-`EXPO_PUBLIC_` vars from the client bundle.** Mechanism, so
  nobody re-derives it: `@expo/metro-config/src/transform-worker/dot-env-development.ts`
  skips any key not prefixed `EXPO_PUBLIC_` when building for the client. API
  routes separately receive all env vars. Verified by exporting the bundle and
  grepping for the secret's value.
- **`web.output: "server"` gates API routes on native too.** Do not remove the
  `web` key from `app.json` because "we don't ship web" — it breaks iOS. The
  warning also lives in `README.md`; `app.json` is strict JSON and cannot carry
  a comment.
```

- [ ] **Step 7: Run the full test suite once more**

```bash
cd /Users/yacine/Desktop/Faisal && npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit and push**

```bash
cd /Users/yacine/Desktop/Faisal
git add CLAUDE.md
git commit -m "phase 0: expo skeleton + server-side API route"
git push origin main
git status -sb
```

Expected: `## main...origin/main` with no ahead/behind markers.

- [ ] **Step 9: Write the phase report**

Report, with evidence rather than assertions:

1. `find dist` output, and which of Branch A / B applied.
2. `curl` response.
3. Simulator screenshot confirmation.
4. Both grep results.
5. Test run output.
6. Anything that deviated from this plan.

---

## Done when

- Simulator renders `keyLoaded: true`
- `curl` against the dev server returns the same
- `npm test` passes
- `grep -r 'hunter2' dist/` returns zero hits
- Key-name grep clean in the client portion, per the branch that applied
- Nothing under `app/` references `FAKE_KEY` except `app/api/health+api.ts`
- `.env` untracked; `.env.example` tracked with a placeholder
- Pushed to `origin/main`
