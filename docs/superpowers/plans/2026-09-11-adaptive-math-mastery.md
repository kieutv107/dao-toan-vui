# Adaptive Math Mastery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build persistent adaptive practice for addition and subtraction through 20, connect every active game to it, and add per-game top-five scores with new-record celebrations.

**Architecture:** Add focused modules for the fact catalog, mastery updates, adaptive selection, local persistence, and high scores. UI controllers receive a shared learning service and report explicit evidence; they do not access browser storage directly. Practice becomes an 18-question session, while each scored game keeps its own rules.

**Tech Stack:** Browser ES modules, DOM/CSS, `localStorage`, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-11-adaptive-math-mastery-design.md`

## Global Constraints

- One child per device; no account or profile picker.
- Always use mixed addition and subtraction in the range 0–20; remove operation and range controls.
- Response timing is hidden from the child.
- Practice has 18 questions and no score, lives, streak, or high-score table.
- Rain records only correct target equations; wrong input and missed drops never reduce mastery.
- A gold rain equation is selected from the child's hardest eligible facts and only it receives learning credit.
- Each scored game stores its five highest completed-run scores in one table.
- Keep all current modes and behavior fixes; Space Rocket remains hidden.

---

### Task 1: Fact catalog and mastery state transitions

**Files:**
- Create: `dist/mastery-engine.mjs`
- Create: `tests/mastery-engine.test.mjs`

**Interfaces:**
- Produces: `factId(fact)`, `factCatalog()`, `factFamilyId(fact)`, `createProfile()`, `getFactState(profile,id)`, `recordEvidence(profile,event)`, `progressSummary(profile)`, `responseBenchmark(profile,context,band)`.
- `event` is `{fact, result:'correct'|'wrong'|'hint'|'review', elapsedMs?, context, sessionId, now?}`.

- [x] **Step 1: Write catalog tests** proving all generated additions have `a+b<=20`, all subtractions have `a<=20` and `a-b>=0`, IDs are stable, and inverse/commuted equations share a family.
- [x] **Step 2: Run `node --test tests/mastery-engine.test.mjs`** and confirm failure because the module does not exist.
- [x] **Step 3: Implement catalog helpers** with canonical facts shaped `{a,b,sign,answer,id,familyId,band}` and bands `0-5`, `6-10`, `11-15`, `16-20`.
- [x] **Step 4: Add failing state tests** for `+2` fast correct, `+1` slow correct, `-1` wrong, no strength for hint/review, clamping 0–6, and mastery requiring three distinct session IDs.
- [x] **Step 5: Implement profile and evidence updates** using a rolling list of at most 12 unaided correct durations per context and band, with its median as the benchmark and an 8000ms bootstrap until four samples exist.
- [x] **Step 6: Add and pass tests** for mastered-to-strong regression after an error, family isolation, summary counts, and safe fact defaults.
- [x] **Step 7: Commit** with `git commit -m "Add adaptive math mastery model"`.

### Task 2: Versioned local storage and high scores

**Files:**
- Create: `dist/learning-store.mjs`
- Create: `dist/high-scores.mjs`
- Create: `tests/learning-store.test.mjs`
- Create: `tests/high-scores.test.mjs`

**Interfaces:**
- Produces: `createLearningStore(storage)` returning `{load,save,reset}`.
- Produces: `createHighScoreStore(storage)` returning `{top(gameId),record(gameId,score),reset}`.
- `record` returns `{scores,newRecord,previousBest}` and keeps five descending numeric scores.

- [x] **Step 1: Write failing storage tests** with a memory-backed Storage double for missing data, valid round-trip, corrupt JSON fallback, version mismatch, write failure, and reset.
- [x] **Step 2: Run the two new test files** and confirm failure because the modules do not exist.
- [x] **Step 3: Implement learning storage** under one versioned key, validate parsed containers, preserve an in-memory profile when browser reads or writes fail, and never throw into a game controller.
- [x] **Step 4: Write failing score tests** for first positive score as a record, descending top five, equal score not a record, per-game separation, zero score, and reset.
- [x] **Step 5: Implement high-score storage** under a separate versioned key with the same safe fallback behavior.
- [x] **Step 6: Run both test files and the full suite**; confirm all pass.
- [x] **Step 7: Commit** with `git commit -m "Persist learning progress and game records"`.

### Task 3: Adaptive selection and 18-question practice sessions

**Files:**
- Create: `dist/adaptive-selector.mjs`
- Modify: `dist/practice-engine.mjs`
- Modify: `tests/practice.test.mjs`
- Create: `tests/adaptive-selector.test.mjs`

**Interfaces:**
- Produces: `selectFact({profile,context,excludeIds,kind,random,now})` and `buildPracticeSession({profile,sessionId,random,now})`.
- Practice state exposes `{questions,pos,sessionId,results,done}`; answering returns `{correct,requeueAt?,complete}`.

- [x] **Step 1: Replace old total-set tests with failing session tests** for exactly 18 initial questions, mixed operations, 7/5/4/2 bucket targets when pools are sufficient, fallback filling, and no consecutive identical IDs.
- [x] **Step 2: Add failing selector tests** for due/weak weighting, frontier bands, 70% unlock threshold, two preview facts from the next band, distinct-answer choices, and hardest-fact selection.
- [x] **Step 3: Run the two test files** and verify the new expectations fail.
- [x] **Step 4: Implement the weighted selector** with deterministic random injection and candidate filtering by context.
- [x] **Step 5: Rebuild the practice engine** around one 18-question queue; reinsert wrong or hinted facts at a random offset of 3–5 and report evidence through injected callbacks.
- [x] **Step 6: Run focused and full tests** and confirm passing behavior.
- [x] **Step 7: Commit** with `git commit -m "Build adaptive practice sessions"`.

### Task 4: Shared learning service and home progress UI

**Files:**
- Create: `dist/learning-service.mjs`
- Modify: `dist/app.js`
- Modify: `dist/app.css`
- Create: `tests/learning-service.test.mjs`

**Interfaces:**
- Produces: `createLearningService({storage,now,random})` returning `{profile,summary,nextFact,hardestFact,record,save,reset,newSessionId}`.
- Pass `learning` and `scores` into each game mount function.

- [x] **Step 1: Write failing service tests** for load-on-create, save after evidence, unique session IDs, summary refresh, and safe reset.
- [x] **Step 2: Implement the service** as the only composition root coordinating profile, selector, and persistence.
- [x] **Step 3: Remove settings controls and hard-code `{limit:20,op:'mix'}`** in `app.js`; add a progress card with mastered, learning, and suggested review counts.
- [x] **Step 4: Add a parent progress panel** with detailed counts and a two-click reset confirmation; refresh home data after every game unmount.
- [x] **Step 5: Add responsive styles** for the progress card and parent actions without changing existing game card layouts.
- [x] **Step 6: Run syntax checks and full tests**; verify no code path reads an operation/range control.
- [x] **Step 7: Commit** with `git commit -m "Show persistent learning journey"`.

### Task 5: Rebuild Practice UI around mastery sessions

**Files:**
- Modify: `dist/practice.mjs`
- Modify: `dist/challenge.css`

**Interfaces:**
- Consumes `learning.newSessionId()`, adaptive practice state, and `learning.record(event)`.
- Produces no score events and returns an unmount function that cancels all timers.

- [x] **Step 1: Keep engine behavior under Node tests and add explicit browser QA cases** for hidden timing, hint evidence, retry spacing, 18-question completion, and focus restoration; the project has no DOM unit-test dependency.
- [x] **Step 2: Replace set/total HUD** with question progress and mastery copy; retain four choices, keyboard focus, hints, and positive feedback.
- [x] **Step 3: Measure elapsed time from each question render** and submit correct, wrong, and hint events without displaying duration.
- [x] **Step 4: Build the finish screen** showing newly mastered facts, remaining learning facts, and buttons to stop, practice again, or play the recommended mini-game.
- [x] **Step 5: Run focused tests, syntax checks, and the full suite**.
- [x] **Step 6: Commit** with `git commit -m "Redesign practice for adaptive mastery"`.

### Task 6: Integrate adaptive facts and records into challenge games

**Files:**
- Modify: `dist/challenge.mjs`
- Modify: `dist/challenge-engine.mjs`
- Modify: `tests/challenge.test.mjs`
- Modify: `dist/challenge.css`

**Interfaces:**
- Challenge mount receives `{learning,scores}`.
- Bubble and Mystery record correct, wrong, and timeout evidence.
- Memory records `review` evidence only for matched equation cards.

- [x] **Step 1: Add failing engine tests** showing games accept supplied facts, keep existing scoring/difficulty behavior, and expose one completed run.
- [x] **Step 2: Route Bubble and Mystery through `learning.nextFact`** while retaining distinct presentation, motion, and deadlines.
- [x] **Step 3: Build Memory boards from adaptive facts with distinct answers**; record only successful matches as review evidence.
- [x] **Step 4: Add high-score HUD** showing the pre-run best and changing inline to “Kỷ lục mới!” after it is exceeded.
- [x] **Step 5: Record score exactly once after completion**; render top five and a short new-record celebration; never record an early exit.
- [x] **Step 6: Run challenge and full tests** and verify prior memory-card timing behavior remains covered.
- [x] **Step 7: Commit** with `git commit -m "Connect challenge games to progress and records"`.

### Task 7: Integrate adaptive rain and hardest gold facts

**Files:**
- Modify: `dist/rain-engine.mjs`
- Modify: `dist/rain.mjs`
- Modify: `tests/rain.test.mjs`
- Modify: `dist/rain.css`

**Interfaces:**
- `advance` receives injected `normalFact()` and `hardestFact()` suppliers.
- `submit` continues returning `{type,drop,cleared,special,points}`; the controller records only `drop` on a correct result.

- [x] **Step 1: Add failing rain tests** proving normal drops use supplied facts, gold uses the hardest supplier, gold stays rare and level-gated, and identical-answer clearing still works.
- [x] **Step 2: Refactor spawning** while preserving constant fall speed, increasing simultaneous drops, off-screen entry, lane separation, gold gap, and clear-on-line-hit behavior.
- [x] **Step 3: Record only correct target drops** as positive no-timing evidence; verify all other drops and miss paths produce no mastery events.
- [x] **Step 4: Add record HUD and finish behavior** matching Task 6, including top five and one-time new-record celebration.
- [x] **Step 5: Run rain and full test suites**.
- [x] **Step 6: Commit** with `git commit -m "Adapt rain questions to child progress"`.

### Task 8: End-to-end verification and publication

**Files:**
- Modify only files required by issues found during verification.

**Interfaces:**
- Consumes the completed application and `.openai/hosting.json` publication flow.

- [x] **Step 1: Run `node --test tests/*.test.mjs`**, syntax checks for all changed modules, and `git diff --check`; fix and rerun failures.
- [x] **Step 2: Preview locally** and verify desktop practice, all four scored games, hidden settings, persistence after reload, reset confirmation, pause/resume, and navigation cleanup.
- [x] **Step 3: Verify mobile layout and touch keypad**, focus behavior, reduced motion, and sound-off record behavior.
- [x] **Step 4: Seed progress states** to verify weak/due selection and that every gold equation comes from the hardest eligible pool.
- [x] **Step 5: Exercise scores** for first record, equal record, new record, top-five truncation, reload persistence, and early exit.
- [x] **Step 6: Inspect `git status`; when verification changed files, commit them** with `git commit -m "Polish adaptive learning experience"`; when it did not, record that no verification-fix commit is required.
- [x] **Step 7: Package and publish through the configured Sites project**, then verify the live URL loads the new version.
