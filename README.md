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
npx expo start          # Metro
npx expo run:ios        # native dev build onto the iOS Simulator
```

`run:ios`, not `start --ios`. `start --ios` runs the project inside Expo Go,
whose one-time onboarding overlay must be tapped away — and the build machine
has no attached display, so it cannot be tapped.

## Test

```bash
npm test
```

## Config trap

`app.json` sets `web.output: "server"`. Despite the key being named `web`, **this
gates Expo Router API routes on native as well.** Removing it because "we don't
ship a web build" silently breaks the iOS app. `app.json` is strict JSON and
cannot carry a comment, which is why this warning lives here.

## Toolchain patch

`patches/expo-modules-jsi+57.0.4.patch` is applied on `npm install` by
`patch-package`. It is required to build on Xcode 26.2 — see the patch header
and `CLAUDE.md` for why. Do not delete it without re-testing the iOS build.
