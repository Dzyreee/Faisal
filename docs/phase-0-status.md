# Phase 0 — COMPLETE

Last updated: 2026-08-18. Phase 0 is done and verified. Kept as the record of
what was proven and what bit us, because the next person to set up a machine
will hit the same two traps.

## Result

All four tasks passed their gates. Every claim below was produced by running the
thing, not by reading docs.

| Check | Evidence |
|---|---|
| Simulator renders the route response | `{"ok":true,"keyLoaded":true}` on screen, nav title `index`, no Expo Go chrome |
| Dev server serves the route | `curl localhost:8081/api/health` → `{"ok":true,"keyLoaded":true}`, HTTP 200 |
| Tests | `npm test` → 2 passed |
| Secret value absent from bundle | `grep -r 'hunter2' dist/` → 0 hits |
| Key name absent from client bundle | `grep -r 'FAKE_KEY' dist/` → 0 hits |
| Secret scope | only `app/api/health+api.ts` references `FAKE_KEY` under `app/` |
| Env hygiene | `.env` untracked, `.env.example` tracked with `replace_me` |
| Clean build from scratch | `rm -rf ios && npx expo run:ios` → Build Succeeded in ~140s |

The export produced `dist`, `dist/_expo`, `dist/assets`, `dist/_expo/static` —
**no `dist/server` or `dist/client`, so Task 4 Branch B applied** and the key-name
grep ran over all of `dist/`.

## What this settles for later phases

- **Relative `fetch` from native works in development.** `fetch('/api/health')`
  from `app/index.tsx` reached the API route on the iOS Simulator.
- **The `:3001` Node server fallback is unnecessary.** Do not hedge for it.
- **The model API key can live in an API route.** That was the real question
  behind this phase, and the answer is yes.
- **Not proven:** the `origin` setting for *production* native builds. We only
  ran dev. See `CLAUDE.md`.

## Two traps that cost this phase a day

Both are recorded in `CLAUDE.md` as well, because that is the file everyone reads.

### 1. Never keep this repo in an iCloud-synced folder

With "Desktop & Documents Folders" sync on, iCloud's fileprovider stamps
`com.apple.FinderInfo` onto framework bundles seconds after they are created,
and `codesign` refuses to sign anything carrying it:

```
ExpoModulesJSI.framework: resource fork, Finder information, or similar detritus not allowed
Command PhaseScriptExecution failed with a nonzero exit code
```

`xattr -cr` does **not** fix it — the framework is re-created during the build
and re-stamped mid-build, so any strip-before-sign workaround is racing a
process that wins in under six seconds.

Resolved on this machine by turning that iCloud setting off. The repo lives at
`/Users/yacine/Desktop/Faisal` and builds fine now that sync is off.

**Diagnostic, ten seconds:**

```bash
mkdir -p probe.framework && sleep 10 && xattr -lr probe.framework && rm -rf probe.framework
```

`com.apple.provenance` alone is healthy. `com.apple.FinderInfo` means the build
cannot codesign, wherever that directory lives.

### 2. `patches/expo-modules-jsi+57.0.4.patch` is required on Xcode 26.2

ExpoModulesJSI does not compile under Swift 6.2.3 — in
`JavaScriptCodable+Date.swift` the bare `abs(_:)` is ambiguous because the module
builds with Swift/C++ interop and libc++ contributes its own `abs` overloads.
`Swift.abs` fixes it with identical behaviour. Applied by `patch-package` on
`postinstall`. 57.0.4 was the latest published version as of 18 Aug 2026, so
there is no upstream release to upgrade to instead.

Verified as genuinely upstream before patching: the file is byte-identical to
the published npm tarball, and the snippet type-checks standalone.

## How to run it

```bash
npm install                                        # postinstall applies the patch
cp .env.example .env                               # then set FAKE_KEY=hunter2
npx expo start                                     # Metro, leave running
npx expo run:ios --device "iPhone 17 Pro" --no-bundler
```

**`run:ios`, never `start --ios`.** `start --ios` runs the project inside Expo
Go, whose one-time onboarding overlay must be tapped away, and this machine has
no attached display — `screencapture` fails with "could not create image from
rect", so coordinate clicks are impossible. `xcrun simctl io booted screenshot`
still works because it reads the CoreSimulator framebuffer directly. The
Simulator is **observable but not touchable.**

### The deep-link dialog

`run:ios` finishes by opening `com.anonymous.faisal://expo-development-client/?url=...`,
which makes iOS show an **"Open in 'faisal'?"** confirmation that covers the app
and cannot be tapped away here. It is not a failure — the app is installed and
running behind it.

To get a clean screen without touching the UI:

```bash
xcrun simctl shutdown booted && xcrun simctl boot <DEVICE_UDID>
xcrun simctl launch booted com.anonymous.faisal
xcrun simctl io booted screenshot /tmp/phase0-simulator.png
```

Rebooting clears the pending URL, so the dialog does not reappear. Then read the
screenshot back rather than assuming.

## Constraints worth keeping

1. **Never attempt GUI automation** against the Simulator, and **never edit any
   app's internal storage** to clear UI flags. An earlier agent started doing
   this and was stopped — it produces a green result that proves nothing.
2. **Bound every wait.** Poll; never sit in an open-ended wait on a build. A
   BLOCKED report with a real error is a useful result.
3. **Watch the shell's working directory.** It persists between commands. One
   build failed with `ConfigError: The expected package.json path:
   .../expo-modules-jsi/apple/Sources/package.json does not exist` purely
   because an earlier `cd` was still in effect.
4. **When regenerating the patch, delete the generated directories first**
   (`apple/.DerivedData`, `apple/Products`, `apple/.generated`). Otherwise
   `patch-package` sweeps build output in — the first attempt produced 7.8 MB
   including a modulemap with an absolute local path. The correct patch is ~1 KB
   and touches one file.
5. If tools return `EPERM` / "Operation not permitted" on this directory, macOS
   TCC has revoked Desktop access. System Settings → Privacy & Security → Files
   and Folders → grant the terminal Desktop access, then restart it.

## Correction to the earlier handoff

The previous status document recorded "the native build **succeeds**" with a
path to `faisal.app`. That was wrong. The bundle at that path contained only an
empty `Frameworks/` directory — no binary, no `Info.plist` — which is why
`simctl install` reported "Missing bundle ID". The build had never succeeded,
and two real failures (the Swift error, then the codesign error) were hidden
behind that claim.

## Rulings made across Phase 0

- **`.superpowers/` added to `.gitignore`** (`a5247c6`) — agent scratch, public remote.
- **Four commits instead of the spec's two** — a phase that dies mid-execution leaves banked, reviewable state. Raised with the human partner, not countermanded.
- **`run:ios` replaces `start --ios`** in Task 1 Step 7 and Task 3 Step 2 — approved as a plan deviation.
- **Scaffold committed before its gate passed** — banked rather than left dirty; the outstanding gate was recorded until it passed.
- **`app.json` cannot carry the comment the spec wanted** (strict JSON). The warning lives in `README.md` and `CLAUDE.md` instead.
- **`patch-package` added with a `postinstall` script** — the Xcode 26.2 fix has to survive `npm install` on four machines, so it cannot live only in one `node_modules`.
- **iCloud Desktop sync turned off rather than relocating the repo** — the human partner's call. The repo was briefly moved to `~/Downloads` and moved back once sync was off.
- **`CLAUDE.md`'s verified section was withheld until the Simulator rendered.** Its text asserts that relative `fetch` resolves *from native*; `curl` proves only the server side. Writing an unverified claim into shared memory is the exact failure that document exists to prevent.

## Still blocked on the human partner — this is now the critical path

- **Persona voice sample lines** — `[ASK US]` in `CLAUDE.md`. Blocks all four
  prompt blocks, which are the actual product.
- **Real Doha restaurant data** — `[ASK US]`. Use `TEST_RESTAURANT_1`-style
  fakes until supplied; never invent plausible-looking restaurants or prices.
- **`BRUTAL + OVERRIDING` needs testing against Qwen on day one of Phase 2.**
  `CLAUDE.md` calls this out as where model alignment bites. Finding it on
  Aug 26 is too late to switch models.
