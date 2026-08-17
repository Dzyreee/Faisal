# Phase 0 — resume here

Last updated: 2026-08-18. Read this first if you are picking up a fresh session.

## Read these, in order

1. `CLAUDE.md` — project brief
2. `docs/phase-0-spec.md` — what Phase 0 must prove
3. `docs/phase-0-plan.md` — the four tasks, with exact commands
4. `.superpowers/sdd/phase-0-plan/progress.md` — the SDD ledger (git-ignored, local to this machine; holds every ruling made so far)

## Process in use

Executing `docs/phase-0-plan.md` directly on `main` — the human partner
explicitly approved working on main and explicitly declined git worktrees. Do
not create a branch.

## Where things stand

| Task | State |
|---|---|
| 1 — Scaffold | Code complete (`5703f3c`). **Simulator render gate NOT passed** — blocked, see below. |
| 2 — API route + env | **DONE and verified** (`ee11f99`). |
| 3 — Screen fetches route | Code complete (`b1664da`). **Simulator render gate NOT passed** — same blocker. |
| 4 — Bundle audit + CLAUDE.md | Audit DONE and verified. `CLAUDE.md` update deliberately withheld — see below. |

Everything through `b1664da` is pushed to `origin/main`.

## What is verified, with evidence

- **`npm test` — 2 passed.** `__tests__/health-route.test.ts`, both cases.
- **`curl http://localhost:8081/api/health` → `{"ok":true,"keyLoaded":true}`, HTTP 200.**
  API routes resolve on the dev server, and `.env` loads into them. This is the
  single biggest thing Phase 0 existed to de-risk, and it works.
- **Secret containment — PASS.** `npx expo export --platform ios` produced:
  `dist`, `dist/_expo`, `dist/assets`, `dist/_expo/static`. **No `dist/server`
  or `dist/client`, so Task 4 Branch B applied** — the whole export is client
  output. `grep -r 'hunter2' dist/` → zero hits. `grep -r 'FAKE_KEY' dist/` →
  zero hits. The value never reaches the bundle, and neither does the key name.
- **Scope — PASS.** The only file under `app/` referencing `FAKE_KEY` is
  `app/api/health+api.ts`.
- **`.env` untracked, `.env.example` tracked** with `replace_me`.

## What is NOT verified

The app has still never been observed rendering in the Simulator. That gate
covers Task 1 Step 7 and Task 3 Steps 2–3. Everything else in Phase 0 is green.

`CLAUDE.md` has deliberately **not** been given its `### Verified 17 Aug 2026`
subsection yet. That text asserts "relative `fetch` from native resolves to the
dev server origin", which the curl check does *not* prove — curl proves the
server side only. Writing an unverified claim into shared memory is exactly the
failure that document exists to prevent. Add it once the Simulator renders.

## The blocker: iCloud is stamping the build products

`npx expo run:ios` fails at codesign:

```
ExpoModulesJSI.framework: resource fork, Finder information, or similar detritus not allowed
Command PhaseScriptExecution failed with a nonzero exit code
```

**Cause, proven not guessed.** This repo lives in `~/Desktop`, and "Desktop &
Documents Folders" iCloud sync is ON. iCloud's fileprovider stamps
`com.apple.FinderInfo` onto framework bundles, and `codesign` refuses to sign
anything carrying it.

The probe that settled it: a brand-new `probe.framework` directory created in
`~/Desktop/Faisal` had `com.apple.FinderInfo` and `com.apple.fileprovider.fpfs#P`
within **6 seconds**. The identical directory created in `/tmp` got only
`com.apple.provenance`, which is harmless.

**`xattr -cr` does not fix this.** It was tried; the build re-creates the
framework and iCloud re-stamps it mid-build. Any fix that strips attributes
before signing is racing a process that wins in under six seconds.

**Resolution chosen by the human partner: turn off iCloud "Desktop & Documents
Folders" sync**, keeping the repo at `~/Desktop/Faisal`. Options considered and
declined: moving the repo to a non-synced path, and patching Expo's build script
to strip attributes before signing (rejected as race-prone — intermittent build
failures are the worst possible failure mode before a live stage demo).

A backup was taken before the toggle, because disabling that setting can move
Desktop files into iCloud Drive: `~/faisal-backup-20260818` (git history, `.env`,
and the ledger; no `node_modules`/`ios`).

### Once sync is off, resume here

```bash
# 1. Confirm the stamping actually stopped
mkdir -p /Users/yacine/Desktop/Faisal/.xatest/probe.framework
sleep 6
xattr -lr /Users/yacine/Desktop/Faisal/.xatest    # must NOT list com.apple.FinderInfo
rm -rf /Users/yacine/Desktop/Faisal/.xatest

# 2. Clear the attributes already on disk, then build
cd /Users/yacine/Desktop/Faisal
xattr -cr node_modules/expo-modules-jsi ios
npx expo start                                    # Metro, separate shell
npx expo run:ios --device "iPhone 17 Pro" --no-bundler

# 3. Evidence
xcrun simctl io booted screenshot /tmp/phase0-simulator.png
```

Expected on screen: `{"ok":true,"keyLoaded":true}`. **Read the screenshot back
rather than assuming.** If it shows `ERROR:`, relative `fetch` is not resolving
on native — STOP and report. Do not add an absolute URL, an `origin` config
entry, or the `:3001` Node server; that is the team's call and is precisely the
finding this phase exists to produce.

Then: add the `CLAUDE.md` subsection (Task 4 Step 6), `npm test`, commit
`phase 0: expo skeleton + server-side API route`, push.

## Second toolchain fix, already applied

`patches/expo-modules-jsi+57.0.4.patch`, applied by `patch-package` on
`postinstall`. ExpoModulesJSI does not compile under Xcode 26.2 / Swift 6.2.3:
in `JavaScriptCodable+Date.swift` the bare `abs(_:)` is ambiguous because the
module builds with Swift/C++ interop and libc++ contributes its own `abs`
overloads. `Swift.abs` disambiguates it, same behaviour. 57.0.4 is the latest
published version — there is no upstream fix to move to.

**Correction to the previous handoff.** It recorded "the native build SUCCEEDS"
with a path to `faisal.app`. That was wrong: the bundle at that path contained
only an empty `Frameworks/` directory — no binary, no `Info.plist` — which is
why `simctl install` reported "Missing bundle ID". The build had never succeeded.

## Hard-won constraints — do not relearn these

1. **Use `npx expo run:ios`, never `npx expo start --ios`.** `start --ios` runs
   the project inside Expo Go, whose one-time onboarding overlay must be tapped
   away. This machine has **no attached display** — `screencapture` fails with
   "could not create image from rect" — so coordinate clicks cannot dismiss it.
   `xcrun simctl io booted screenshot` works because it reads the CoreSimulator
   framebuffer directly, so the Simulator is **observable but not touchable**.
2. **Never attempt GUI automation** against the Simulator, and **never edit any
   app's internal storage** to clear UI flags. An earlier agent started doing
   this and was killed for it — it produces a green result that proves nothing.
3. **Bound every wait.** Poll; never sit in an open-ended wait on a build. A
   BLOCKED report with a real error is a useful result.
4. **Watch the shell's working directory.** It persists between commands. One
   build failed with `ConfigError: The expected package.json path:
   .../node_modules/expo-modules-jsi/apple/Sources/package.json does not exist`
   purely because an earlier `cd` was still in effect.
5. **When regenerating the patch, delete the generated directories first**
   (`apple/.DerivedData`, `apple/Products`, `apple/.generated`). Otherwise
   `patch-package` sweeps build output into the patch — the first attempt
   produced 7.8 MB, including a modulemap with an absolute local path. The
   correct patch is ~1 KB and touches exactly one file.
6. If tools suddenly return `EPERM` / "Operation not permitted" on this
   directory, macOS TCC has revoked Desktop access. Fix: System Settings →
   Privacy & Security → Files and Folders → grant the terminal app Desktop
   access, then restart the terminal. It is not a code problem.

## Rulings made so far

- **`.superpowers/` added to `.gitignore`** (`a5247c6`) — agent scratch, public remote.
- **Four commits instead of the spec's two** — a phase that dies mid-execution leaves banked, reviewable state. Raised with the human partner, not countermanded.
- **`run:ios` replaces `start --ios`** in Task 1 Step 7 and Task 3 Step 2 — approved by the human partner as a plan deviation.
- **Scaffold committed before its gate passed** — banked rather than left dirty.
- **`app.json` cannot carry the comment the spec wanted** at the `web.output` config site (strict JSON). That warning lives in `README.md` and `CLAUDE.md` instead.
- **`patch-package` added as a dependency and a `postinstall` script** — the Xcode 26.2 fix has to survive `npm install` for all four of us, so it cannot live only in one machine's `node_modules`. Cost if wrong: one devDependency and a postinstall step.
- **iCloud Desktop sync turned off rather than relocating the repo** — the human partner's call, made against the alternatives above.

## Still blocked on the human partner (not Phase 0, but upcoming)

- **Persona voice sample lines** — `[ASK US]` in `CLAUDE.md`. Blocks all four prompt blocks.
- **Real Doha restaurant data** — `[ASK US]`. Use `TEST_RESTAURANT_1`-style fakes until supplied.
