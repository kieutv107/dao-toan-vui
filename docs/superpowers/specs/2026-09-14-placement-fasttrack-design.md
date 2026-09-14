# Placement quiz + adaptive fast-track — Design

**Date:** 2026-09-14
**Status:** Approved for planning
**Scope:** Fill gap (4) from the adaptivity review — every child currently starts identically at stage 1 and must grind through it to unlock later stages. Give an advanced child a way to start higher, and let confident children advance faster during normal play. Single profile per device is retained by design (no multi-profile work here).

## 1. Problem

`currentLevel(profile)` (`dist/adaptive-selector.mjs:9`) starts every child at stage 1 and advances a stage only when ≥70% of the current stage's forms reach `strong`/`mastered`. Progression is purely evidence-driven, so:

- An advanced child must answer many stage-1 facts before the app stops treating them as a beginner.
- There is no placement, no skip-ahead, and no faster path for a child who clearly already knows the material.

Kids can already *practice* a locked stage via the journey "Luyện" buttons (`focusLevel`, `dist/app.js:43`), but that does not move `currentLevel`, the default "Luyện tập ngay" flow, or the progress display.

## 2. Solution overview

Two complementary mechanisms:

1. **Placement quiz (first run, skippable, re-runnable)** — a short adaptive ladder that finds the child's edge in ~3–4 questions and seeds the profile so `currentLevel` jumps to the right stage.
2. **Adaptive fast-track** — tune the mastery/unlock rules so a child who keeps answering cleanly advances faster during ongoing play.

The quiz handles the initial jump; the fast-track handles the pace afterward.

## 3. Architecture

Follows the existing pure-engine + controller split (mirrors `challenge-engine.mjs` / `challenge.mjs`).

| Module | Change | Purpose |
| --- | --- | --- |
| `dist/placement-engine.mjs` | **new (pure)** | Adaptive ladder state machine. No DOM/timer/audio. Fully unit-testable. |
| `dist/placement.mjs` | **new (controller)** | Mounts quiz UI, fetches a question per stage via the learning service, drives the engine, calls `learning.placeAt(level)` on completion. |
| `dist/mastery-engine.mjs` | edit | Fast-track evidence rules + `seedForm()` helper + `MASTERY_SESSIONS` constant. |
| `dist/adaptive-selector.mjs` | edit | Lower `UNLOCK` constant. |
| `dist/learning-service.mjs` | edit | Add `placeAt(level)` (seeds lower stages, persists). |
| `dist/app.js` | edit | First-run offer + re-run button in journey-details modal. |

**Storage:** new key `toan-placement-v1` = `{done: boolean, level: number, at: number}`. Follows the existing multi-key convention (`toan-stars`, `toan-sound`, `toan-high-scores-v1`). The learning profile schema (`toan-learning-v1`) is **not** changed and `PROFILE_VERSION` is **not** bumped — seeding uses existing fact-state fields.

## 4. Placement engine (adaptive ladder)

Binary search over the 5 stages (`LEVELS`, `dist/core-facts.mjs:3`), starting mid.

State: `{lo:1, hi:5, place:1, step, done:false, level:null, asked:[]}`.

Algorithm per answer:

```
mid = floor((lo + hi) / 2)          // the stage currently being probed
correct → place = mid; lo = mid + 1
wrong   → hi = mid - 1
done when lo > hi → level = place
```

- Starts by probing `mid = 3`.
- `place` = highest stage answered correctly (defaults to 1 if the child misses everything).
- Terminates in ⌈log2(5)⌉ ≈ 3 questions, at most 4.

Engine API (pure functions, mirrors other engines):

| Function | Role |
| --- | --- |
| `createPlacement()` | Initial ladder state. |
| `placementStage(state)` | The stage to probe next (`mid`), or `null` if done. |
| `recordPlacement(state, correct)` | Advance the ladder; returns updated state (mutated in place, matching engine convention). |
| `placementResult(state)` | `{done, level}`. |

The controller supplies the actual questions:

```js
learning.nextFact({ focusLevel: placementStage(state), context: 'placement', excludeIds: asked })
```

- `focusLevel` restricts selection to that stage, including locked ones (`dist/adaptive-selector.mjs:22-25`); every stage 1–5 always has forms, so a probe is always available.
- **No `kind: 'new'`.** On a re-run the child has already played, so a stage may have zero `new` facts; `selectFact` with `focusLevel` is strict (no fallback outside the focus level) and would return `undefined`. Dropping `kind` draws any fact at that stage — seen or not — so placement works at any point in the profile's life.
- `excludeIds: asked` (the ids probed so far this quiz) plus a dedicated `context: 'placement'` avoid repeats within the quiz.
- **Probe answers do NOT record evidence.** The controller never calls `learning.record()` for a probe; probe results drive the ladder only. This keeps the quiz side-effect-free except for the final seeding, and it is what makes a wrong probe answer unable to lower any existing fact (see §5, monotonic re-run).

## 5. Seeding (`placeAt(level)`)

New learning-service method. Two guarantees drive its definition: **never overwrite real evidence** and **re-run is monotonic (only fast-tracks up, never resets or lowers)**.

### 5.1 `seedForm(profile, form, now)` — fill blanks only

`seedForm` seeds a form **only if it has no prior evidence** (`seen(state) === false`, i.e. status `new`). If the form already carries any evidence — weak or strong — it is **left untouched**. When it does seed, it writes:

```js
{ strength: 3, status: 'strong', correct: 1, wrong: 0, hints: 0,
  reviews: 0, fastSessions: [], lastSeen: now, dueAt: now }
```

This means seeding can only *add* strong evidence to previously-blank facts; it can never reduce a mastered fact to strength 3, and it never fabricates over a fact the child has genuinely struggled with (that fact stays `learning`, and honestly so).

### 5.2 `placeAt(level)` — monotonic placement

```
effective = max(level, currentLevel(profile))     // never below where the child already is
for each form in formsBelowLevel(effective): seedForm(form)   // fills blanks only
persist profile
toan-placement-v1 = { done: true, level: max(effective, prevStoredLevel), at: now }
```

`effective` clamps the requested level up to at least the current earned level, so a careless or unlucky re-run that computes a *lower* place is a no-op rather than a demotion.

### 5.3 Consequences (verified against current logic)

- `ready(state)` is true for `strong`/`mastered`, so `levelReadiness` of a fully-seeded stage = 100% ≥ `UNLOCK`.
- `currentLevel()` walks up while readiness ≥ `UNLOCK` and therefore **returns `effective` with no new field or floor logic** — placement falls out of the existing readiness walk. The stage at `effective` itself is not seeded, so the child actually practices it.
- `dueAt: now` makes each seeded fact **strong (unlocks the stage) but immediately due**, so the selector's review weighting (`+3 if due & seen`, `dist/adaptive-selector.mjs:36`) resurfaces it. A mis-placement self-corrects: a wrong answer during play drops strength and the fact falls back to `learning`.
- **Monotonicity, end to end:** probe answers record no evidence (§4), seeding only fills blanks (§5.1), and `effective` never dips below `currentLevel` (§5.2). Together these make it impossible for a re-run to lower `currentLevel` or clobber any fact — it can only raise the level or do nothing.

### 5.4 Edge cases

- `place === 1` and `currentLevel === 1` → `formsBelowLevel(1)` is empty → nothing seeded, normal stage-1 start.
- `place === 5` (`MIXED_LEVEL`) → seed blanks in stages 1–4; `currentLevel` caps at 5 as today.
- Re-run after real play where a lower stage has weak (non-blank) evidence → those facts are preserved; the rest of that stage is filled, and if readiness still clears `UNLOCK` the level rises, otherwise it honestly stays (never drops).

## 6. Adaptive fast-track

All three knobs, in `dist/mastery-engine.mjs` and `dist/adaptive-selector.mjs`.

| Knob | Now | Proposed |
| --- | --- | --- |
| Clean first-try | fast correct = `strength +2` | if the fact was `new` at answer time (no prior `correct`/`wrong`/`hints`) **and** the answer is fast: `strength +3` → reaches `strong` in one clean rep |
| Faster mastery | needs 3 distinct fast sessions | needs **2** — `MASTERY_SESSIONS = 2`, referenced by both `statusOf` and `schedule` (which currently both hardcode `3`) |
| Quicker unlock | `UNLOCK = 0.7` | `UNLOCK = 0.6` |

"Clean first-try" test: at the moment of recording, `s.correct === 0 && s.wrong === 0 && s.hints === 0` (i.e. status `new`). Strength stays capped at 6; the wrong-answer cap of 4 is unchanged.

**Retroactive effect (accepted):** lowering `UNLOCK` re-evaluates `currentLevel` live on next load, so an existing child already near 70% on a stage may jump ahead one stage once. This is intended. The `MASTERY_SESSIONS` change only affects stored status on the next recorded evidence, so existing profiles converge naturally.

## 7. UI & integration (`app.js`)

**First-run offer:** in `home()`, when `started === 0` (`dist/app.js:32`) **and** `toan-placement-v1` is absent, render a gentle offer card above the journey section:

- Copy: "Con muốn thử vài câu để bắt đầu đúng chỗ không?"
- Buttons: **"Bắt đầu"** → `start('placement')`; **"Bỏ qua"** → write `{done:true, level:1}` and re-render home.

**Re-run:** a small **"Kiểm tra trình độ"** button inside the existing journey-details modal (`#journey-details`), available anytime.

**Quiz screen (`placement.mjs`):** reuses existing card/feedback styling; shows one question at a time with large answer buttons; ~3–4 questions; ends on a celebratory screen ("Bắt đầu ở Chặng N!") then returns to `home()`. Registered in the `start()` dispatcher (`dist/app.js:51`) alongside the other mounts, receiving the common context `{settings, home, award, beep, learning, scores}`.

## 8. Testing (`node:test`, no DOM runner — per `docs/ENGINE.md` §10)

- `tests/placement-engine.test.mjs` — ladder converges: all-correct → 5, all-wrong → 1, scripted mixed patterns → exact stage; question count ≤ 4; deterministic.
- `tests/learning-service.test.mjs`:
  - `placeAt(4)` ⇒ `currentLevel === 4`; blank forms below 4 are `strong` and due; stage-4 forms remain `new`; `placeAt(1)` on a fresh profile seeds nothing.
  - **Non-overwrite:** a lower-stage fact pre-set to `mastered` (strength 6) is unchanged after `placeAt`; a lower-stage fact with weak real evidence (`learning`) is left as `learning`, not raised to `strong`.
  - **Monotonic re-run:** with `currentLevel === 4` from real play, `placeAt(2)` leaves `currentLevel === 4` (no demotion) and mutates no existing fact; `placeAt(5)` raises to 5 by filling only the blanks.
  - **Probe fetch on a played profile:** `nextFact({focusLevel: s, context:'placement', excludeIds})` returns a fact for every stage 1–5 even when that stage has no `new` facts left.
- `tests/mastery-engine.test.mjs` — clean first-try fast correct → `strong` in one rep; mastery reached at 2 fast sessions; wrong still caps strength at 4; non-clean fast correct still `+2`.
- `tests/adaptive-selector.test.mjs` — stage unlocks at 0.6 readiness.
- `tests/home-ui.test.mjs` — offer present on a fresh profile, hidden once `toan-placement-v1.done`, re-run button present in details.

Run `node --test` in full before deploy.

## 9. Out of scope

- Multiple profiles per device (single profile retained by design).
- Content beyond addition/subtraction within 20.
- Stage 6 "Speed" (still product-vision only).
- Cross-device sync.

## 10. Documentation

Update `docs/ENGINE.md` after implementation: add the placement engine to §8, note `placeAt`/`seedForm` in §7, and record the fast-track constant changes in §5–6.
