# Phase 0 — resume here

Last updated: 2026-08-17. Read this first if you are picking up a fresh session.

## Read these, in order

1. `CLAUDE.md` — project brief
2. `docs/phase-0-spec.md` — what Phase 0 must prove
3. `docs/phase-0-plan.md` — the four tasks, with exact commands
4. `.superpowers/sdd/phase-0-plan/progress.md` — the SDD ledger (git-ignored, local to this machine; holds every ruling made so far)

## Process in use

Superpowers `subagent-driven-development`, executing `docs/phase-0-plan.md`.
Working directly on `main` — the human partner explicitly approved this and
explicitly declined git worktrees. Do not create a branch.

Briefs for all four tasks are already extracted to
`.superpowers/sdd/phase-0-plan/task-<N>-brief.md`. Regenerate one with:

```bash
bash ~/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/scripts/task-brief docs/phase-0-plan.md <N>
```

## Where things stand

| Task | State |
|---|---|
| 1 — Scaffold | Code complete and pushed (`5703f3c`). **Acceptance gate NOT passed.** |
| 2 — API route + env | Not started |
| 3 — Screen fetches route | Not started |
| 4 — Bundle audit + CLAUDE.md | Not started |

Everything through `5703f3c` is pushed to `origin/main`. Working tree clean.

## The one thing blocking Task 1

The app has never been confirmed rendering in the Simulator. That render is
Task 1's entire acceptance gate, so Task 1 is not done.

**What is already true — do not redo it:**

- Expo SDK 57 + expo-router, TypeScript, scaffolded and committed
- `ios/` prebuild succeeded; `ios/Pods` installed
- The native build **succeeds**. Built app:
  `~/Library/Developer/Xcode/DerivedData/faisal-*/Build/Products/Debug-iphonesimulator/faisal.app`
- Bundle identifier: `com.anonymous.faisal`

**What has not happened:** install + launch onto the Simulator. `xcrun simctl
listapps booted` shows only `host.exp.Exponent` (Expo Go). Our app is not
installed.

**Do not be fooled by the Simulator's current screen.** It shows Expo Go's
error — "There was a problem running the requested project. Could not connect
to the server." That is stale, left over from an earlier attempt, and has
nothing to do with our build.

### Next concrete steps

```bash
xcrun simctl terminate booted host.exp.Exponent   # ignore failure if not running
npx expo start                                     # Metro must run; a Debug build loads JS from it
npx expo run:ios                                   # warm now, does install + launch itself
```

If `run:ios` again exits without installing, do it explicitly:

```bash
xcrun simctl install booted "$(find ~/Library/Developer/Xcode/DerivedData -name 'faisal.app' -path '*Debug-iphonesimulator*' | head -1)"
xcrun simctl launch booted com.anonymous.faisal
xcrun simctl io booted screenshot /tmp/phase0-task1.png
```

Then **read the screenshot back**. Pass = our app rendering `Phase 0`. Any Expo
Go chrome on screen means the wrong app is in the foreground.

## Hard-won constraints — three attempts died on these

1. **Use `npx expo run:ios`, never `npx expo start --ios`.** `start --ios` runs
   the project inside Expo Go, whose one-time onboarding overlay must be tapped
   away. This machine has **no attached display** — `screencapture` fails with
   "could not create image from rect" — so coordinate clicks cannot dismiss it.
   `xcrun simctl io booted screenshot` works because it reads the CoreSimulator
   framebuffer directly, so the Simulator is **observable but not touchable**.
2. **Never attempt GUI automation** against the Simulator, and **never edit any
   app's internal storage** to clear UI flags. An earlier agent started doing
   this and was killed for it — it produces a green result that proves nothing.
3. **Bound every wait.** Poll; never sit in an open-ended wait on a build. Two
   attempts stalled this way. A BLOCKED report with a real error is a useful
   result.
4. If tools suddenly return `EPERM` / "Operation not permitted" on this
   directory, macOS TCC has revoked Desktop access. Fix: System Settings →
   Privacy & Security → Files and Folders → grant the terminal app Desktop
   access, then restart the terminal. It is not a code problem.

## Rulings made so far

- **`.superpowers/` added to `.gitignore`** (`a5247c6`) — agent scratch, public remote.
- **Four commits instead of the spec's two** — a phase that dies mid-execution leaves banked, reviewable state. Raised with the human partner, not countermanded.
- **`run:ios` replaces `start --ios`** in Task 1 Step 7 and Task 3 Step 2 — approved by the human partner as a plan deviation. Cost if wrong: build minutes plus a generated `ios/`, already gitignored.
- **Scaffold committed before its gate passed** — banked rather than left dirty. The gate is recorded as outstanding here and in the ledger.
- **`app.json` cannot carry the comment the spec wanted** at the `web.output` config site (strict JSON). That warning goes to `README.md` and `CLAUDE.md` instead. Recorded in the plan.

## Still blocked on the human partner (not Phase 0, but upcoming)

- **Persona voice sample lines** — `[ASK US]` in `CLAUDE.md`. Blocks all four prompt blocks.
- **Real Doha restaurant data** — `[ASK US]`. Use `TEST_RESTAURANT_1`-style fakes until supplied.
