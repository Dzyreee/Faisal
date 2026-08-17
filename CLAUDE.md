# Faisal — Project Brief

## How to work with us

Think with us, don't just execute. If a decision has a trade-off we haven't
considered, say so before writing code. If something in this brief is
underspecified, contradictory, or a bad idea, push back — we would rather argue
for two minutes than rebuild for two hours.

**Ask instead of inventing.** Where this brief marks something as `[ASK US]`, do
not fill it in yourself. Stop and ask. That applies especially to persona voice
and to any real-world data (restaurants, prices, offers) — inventing those is
the single worst failure mode this project has.

If a technical constraint blocks something described here, tell us what the
constraint is and what the options are. Don't silently substitute.

---

## Context

Hackathon submission for the ZAKA AI Fun Challenge. Team of four. Category:
**Useful but Unhinged** — "solves a real problem in a completely unexpected way."

Deliverables: working link or 1–3 min demo video, max 5 slides, public source
code. Submission Aug 22. Practice demo Aug 26, live demo on stage Aug 29.

We run locally only (see Stack), so **the demo video is the submission artifact,
not a live link.** Someone owns recording it before Aug 22. Public source code:
`https://github.com/Dzyreee/Faisal`.

The live stage demo matters for architecture: response latency is visible and
unforgiving, and the product must be demoable by someone driving a UI in front
of an audience.

---

## The product

Faisal is a food delivery decision assistant for Doha. You tell him your
constraints — budget, cuisine, hunger level, dietary preference — and he
narrows a real menu database down to a small set of concrete options.

Two things make it more than a recommender:

1. **Discount awareness.** Doha diners check Entertainer, Urban Point, MyBook
   and Classmate separately to find offers. Faisal knows which of your
   subscriptions apply to which restaurants.

2. **The sliders.** Faisal has two personality dials. At high settings he stops
   being an assistant and starts being an obstacle — he argues, he overrides
   your request, and he can refuse outright.

The rule being broken: *an assistant does what you tell it.* Faisal doesn't.
That is the whole reason we are in this category, and it must never get sanded
off in the name of usability.

---

## The 2×2

Two independent axes. Keeping them orthogonal is a hard requirement — if they
bleed into each other we have one dial wearing a costume.

**HONESTY governs disclosure** — what Faisal volunteers about a pick.
- `DIPLOMATIC` — states the pick, omits unflattering facts (price sting,
  calorie load, order history, unused subscriptions).
- `BRUTAL` — volunteers the numbers *and* the pattern. Order history, what you
  said you wanted last week, the subscription you pay for and never use.

**JUDGMENT governs compliance** — how much Faisal's opinion overrides yours.
- `NEUTRAL` — gives you what you asked for, in the count you asked for.
- `OVERRIDING` — ignores your parameters when he disagrees. Cuts the count,
  substitutes items, or refuses outright.

### The four cells

| | NEUTRAL | OVERRIDING |
|---|---|---|
| **BRUTAL** | Blunt but obedient — your options, every uncomfortable fact attached | **Full Faisal** — refuses, and explains exactly why you deserve it |
| **DIPLOMATIC** | Baseline — a normal, forgettable food bot. Our contrast shot | **Sweetly authoritarian** — decides for you, cheerfully, and won't say why |

`DIPLOMATIC + OVERRIDING` is the sleeper. It only exists because the axes are
genuinely independent, and it is more unsettling than outright rudeness. Do not
let it collapse into a milder version of Full Faisal.

### Implementation

**Author four prompt blocks, not four cells.** Two honesty blocks, two judgment
blocks, composed at runtime. Nine — or four — hand-written cells drift out of
sync the moment one is edited.

Test all four combinations. Composed blocks sometimes fight each other and
produce mush; we need to find that early, not on stage.

**Test `BRUTAL + OVERRIDING` on day one.** That is where model alignment bites —
if the model is going to soften the insults or refuse to refuse, it shows up
there first. Finding it Aug 26 is too late to change models.

Discrete levels only. No 0–100 continuous slider — the model does not behave
measurably differently at 60 vs 65, and a control that does nothing will be
discovered live. The UI may look like a slider if it snaps to positions.

---

## Architecture

```
user input
  → deterministic filter (code)      ← budget, cuisine, calorie band, tags
  → candidate set (~10-15 items)
  → LLM call (persona blocks + candidates)
  → response
```

**The model never retrieves and never invents.** It selects from and performs
on a candidate set the code hands it. This is what makes the demo safe and what
answers the "isn't this just a system prompt?" critique — the selection logic is
deterministic, the model only does judgment and voice.

At our data scale (~200 items) do not reach for a vector database. Filter in
code.

### Data layer

Abstract it behind an interface — `MenuSource` with a `getItems()` method, or
your preferred equivalent. Ship a `LocalJsonSource` reading a curated file.

This matters beyond hygiene: we investigated the delivery-app APIs (Talabat,
Snoonu, Rafeeq, Keeta) and none expose consumer-side menu reads — they are
merchant-side integrations, and Keeta's requires an NDA and a multi-week
onboarding process. Partnership is our roadmap. The architecture should make
that a config change, not a rewrite.

Schema per item (extend if useful, tell us why):
`name, restaurant, cuisine, price_qar, calorie_band, protein_level, tags[]`

Offers are a separate curated layer:
`restaurant, offer_app, offer_description, valid_as_of`

`[ASK US]` for the actual data. We are hand-curating ~15–20 real Doha
restaurants, 8–12 items each, plus current offers. **Do not generate placeholder
restaurants or prices that could survive into the demo.** If you need something
to code against, use obviously-fake names (`TEST_RESTAURANT_1`) that cannot be
mistaken for real.

### Model layer — settled 17 Aug 2026

Abstract this: one `ModelClient` interface, swappable implementation, provider
picked by a single config line.

**Qwen 3 (MoE variant) is the model.** Apache 2.0, steerable, decent Arabic. The
MoE variant matters for the stage — low active parameter count answers
noticeably faster than a dense model of comparable quality, and response latency
is visible in front of an audience.

**Kimi K2 (modified MIT) is the documented fallback.** Not wired by default. It
is the swap target if Qwen's `BRUTAL + OVERRIDING` cell comes out limp — K2 has
better comedic instincts. Because the interface exists, switching is a config
line, not a rewrite.

**Fanar is out.** Explicitly aligned to Islamic values and Arab culture, which
fights a persona whose core function is refusing and mocking the user. We
considered keeping it wired purely to answer the near-certain "did you try the
Qatari model?" question on stage; decided against. The interface means we can
add it back for the cost of one config entry if we change our minds.

Ruled out for the same steerability reason: **Gemma 3** (heavily safety-tuned).
Ruled out on licence: **Llama 4** (Meta community licence carries usage
restrictions — not OSI open source).

Hosted inference, not local. Exact model ID strings get verified against the
provider catalogue at wire-up time, not guessed from memory.

**Selection criterion is steerability, not benchmarks.** A model that softens the
insults makes the *product* look broken, not the model look polite.

**Prompt framing is the first lever, before switching models.** Aligned models
comply far better with "you are a comedy character in a food app who refuses
orders" than with "be rude to the user." Same behaviour, different frame. Try
that before blaming Qwen.

---

## Conversation behaviour

**Default to 3 options and answer immediately.** Do not open by asking how many
options the user wants — the product exists to end decision paralysis, and
handing the decision straight back is the opposite. Let the user adjust after
("more", "just pick one").

**One clarifying question maximum,** and only when it genuinely blocks a decent
answer. Budget usually does. Cuisine usually doesn't.

**Subscription setup is one-time, not per-query.** Ask once which discount apps
the user has, store it. Faisal knowing you own an unused Entertainer
subscription is material at BRUTAL honesty.

**At OVERRIDING judgment, Faisal ignores the requested count.** Ask for five,
get one. This should fall out of the mechanic rather than being special-cased.

**Macros are bands, not grams.** Delivery menus don't publish nutrition data and
we will not invent numbers. Faisal is openly contemptuous about the imprecision
rather than hiding it — a stated limitation reads as confidence.

**Date-stamp offers.** If asked whether data is live, "curated as of August
2026" is a confident answer.

---

## Three behaviours that need real design

### 1. Refusal must be beatable

If Faisal refuses and the conversation dead-ends, he's broken. If he caves the
instant you push back, the refusal was theatre. What we want is a negotiation
with an exit: he relents when given a reason he accepts, and the comedy lives in
*which* reasons he accepts.

Rough shape — "it's my birthday" works, "I'm hungry" does not. Propose a
concrete mechanic for this and we'll argue about it. This only exists at
`OVERRIDING`.

### 2. Out-of-dataset requests

Someone will ask for sushi at 3am, or a restaurant we didn't enter. Never
hallucinate. But Faisal has a personality, so a miss can be *in character* —
contempt for the request rather than an apology for the gap. "No. Here's what
you're actually having." Handled well, our worst moment becomes a good one.

### 3. Safety boundary — non-negotiable

If a user mentions an allergy, a medical condition (diabetes, etc.), pregnancy,
an eating disorder, or any genuine distress, **Faisal drops the persona
completely and immediately**, handles it straight, and only resumes the act
afterwards if appropriate. The mockery is about laziness and indecision, never
about someone's health.

This overrides every persona block at every slider setting. Build it as a rule
that cannot be composed away.

---

## Persona voice — `[ASK US]`

The four prompt blocks need an actual voice: a specific Khaleeji character, not
"bold and sarcastic."

**Do not write this yourself.** We are writing the sample lines as a team. Ask
us for them, then build the blocks around what we give you. A persona written
from outside reads generic, and generic loses this category.

To be clear about what we owe you: **raw sample lines, not prompt text.** Things
Faisal actually says, in his voice — a few per cell of the 2×2, including at
least one refusal and one relent. Turning those into the four composable prompt
blocks is your job, not ours.

If we haven't supplied lines yet, build everything else with obvious
placeholders and tell us it's blocking.

---

## Stack — settled 17 Aug 2026

**Expo (React Native) + TypeScript, running locally.**

- **Expo Router** for navigation — file-based, same mental model as Next.js.
- **Expo Router API routes** (`app/api/*+api.ts`) hold the model API key and run
  the deterministic filter server-side. A React Native app is a client — anything
  bundled ships to the device — so the key never lives in app code. Fallback if
  API routes get awkward on native: a separate small Node server on `:3001`, same
  shape, two processes instead of one.
- **No deploy.** Prototype runs on `npx expo start`. No Vercel, no hosting.
- **No TestFlight.** It needs a paid Apple Developer account and a signed build
  uploaded to App Store Connect. Wrong tool for a five-day local prototype.

We know React and TypeScript. The earlier note in this brief about the team being
Kotlin/C#/embedded-only was wrong and drove a worse recommendation.

### How we demo it

- **Building:** Expo Go on a physical phone — fastest hot reload.
- **Recording and stage:** iOS Simulator (Xcode) on the laptop. It is a genuine
  native app in a window, so it projects and screen-records like any other
  window — no phone mirroring, no AirPlay handshake, no cable dependency in a
  venue we do not control.

Verified on the build machine 17 Aug 2026: Xcode 26.2, iPhone 17 Pro simulator,
Node 24.13.0.

### Why not a web app

We considered Next.js rendering into a phone-frame div. Expo won because we want
a real app, and the Simulator removes the stage-mirroring risk that was the only
argument against native.

### UI note

The two dials render as **segmented pills** — `DIPLOMATIC | BRUTAL` and
`NEUTRAL | OVERRIDING` — not drag handles. Discrete levels are already required
above; at projector distance a two-position drag slider reads as broken.