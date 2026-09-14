# Placement quiz + adaptive fast-track — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an advanced child start higher via a short, skippable, re-runnable placement quiz, and let confident children advance faster during normal play — without adding profiles or a server.

**Architecture:** Keep the existing pure-engine + controller split. A new pure `placement-engine.mjs` runs a 3-question binary-search ladder; a new `placement.mjs` controller drives it and calls a new `learning.placeAt(level)` that seeds still-blank lower-stage forms as `strong`. Three fast-track knobs are tuned in `mastery-engine.mjs`/`adaptive-selector.mjs`. A new `toan-placement-v1` storage key (owned entirely by the learning service) records that placement ran.

**Tech Stack:** Vanilla ES modules (`dist/*.mjs`, `dist/app.js`), `node:test` + `node:assert/strict` (no DOM runner), localStorage. No build step, no dependencies.

## Global Constraints

- Do NOT change architecture or add complexity beyond what this plan states (spec §3). No new dependencies, no build step.
- Single profile per device — no multi-profile work.
- Learning profile schema (`toan-learning-v1`) is unchanged; `PROFILE_VERSION` stays `2`. Seeding uses existing fact-state fields only.
- `toan-placement-v1` schema is `{done: boolean, level: number, at: number}`, owned entirely by the learning service. The UI never reads or writes it directly — it goes through `learning.placeAt()`, `learning.skipPlacement()`, and `learning.placement()`.
- Placement is **non-demoting**: probe answers record no evidence; `seedForm` fills only still-`new` forms (never overwrites evidence); `target = max(requestedLevel, currentLevel(profile))`.
- `placeAt(target)` does NOT guarantee `currentLevel() === target` on an existing profile; equality holds only on a fresh profile. `currentLevel()` is always derived from real readiness.
- Fast-track constants (exact values): clean fast first-try → `strength +3`; `MASTERY_SESSIONS = 2`; `UNLOCK = 0.6`. Wrong-answer strength cap `4`, strength cap `6` — both unchanged.
- Seeded form state (exact): `{strength:3, status:'strong', correct:1, wrong:0, hints:0, reviews:0, fastSessions:[], lastSeen:now, dueAt:now}`.
- Vietnamese UI copy, matching existing tone.
- Content stays addition/subtraction within 20. No stage 6.
- Run `node --test` in full and see it green before every commit.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `dist/mastery-engine.mjs` | modify | Add `MASTERY_SESSIONS`, clean-fast-first-try `+3`, `seedForm()`. |
| `dist/adaptive-selector.mjs` | modify | Lower `UNLOCK` to `0.6`. |
| `dist/placement-engine.mjs` | create | Pure binary-search ladder state machine. |
| `dist/learning-service.mjs` | modify | Add `placeAt(level)`, `skipPlacement()`, `placement()`; own `toan-placement-v1`. |
| `dist/placement.mjs` | create | Quiz controller: one question per stage, drives the engine, calls `placeAt`. |
| `dist/app.js` | modify | First-run offer card + re-run button; register `placement` in `start()`. |
| `dist/style.css` | modify | Styles for the offer card, re-run button, quiz screen. |
| `tests/mastery-engine.test.mjs` | modify | Update for new strength/mastery rules; add `seedForm` tests. |
| `tests/adaptive-selector.test.mjs` | modify | Update unlock-threshold test to `0.6`. |
| `tests/placement-engine.test.mjs` | create | Ladder convergence, ≤3 questions, each stage once, deterministic. |
| `tests/learning-service.test.mjs` | modify | `placeAt`/`skipPlacement`/`placement` behavior + update one existing assertion. |
| `tests/home-ui.test.mjs` | modify | Offer card, skip handler, re-run button, dispatcher wiring, CSS. |
| `docs/ENGINE.md` | modify | Document placement engine, `placeAt`/`seedForm`, fast-track constants. |

---

## Task 1: Fast-track evidence rules (`mastery-engine.mjs`)

Adds the `MASTERY_SESSIONS` constant, the clean-fast-first-try `+3` gain, and updates the existing tests that assumed the old numbers. `UNLOCK` is NOT touched here (that is Task 2). `seedForm` is NOT added here (that is Task 3).

**Files:**
- Modify: `dist/mastery-engine.mjs:1` (add constant), `dist/mastery-engine.mjs:22-23` (`statusOf`/`schedule`), `dist/mastery-engine.mjs:27-31` (correct branch)
- Test: `tests/mastery-engine.test.mjs`, `tests/learning-service.test.mjs`, `tests/adaptive-selector.test.mjs`

**Interfaces:**
- Consumes: existing `recordEvidence`, `getFactState`, `statusOf`, `schedule`.
- Produces: `export const MASTERY_SESSIONS = 2` (consumed by Task 5 tests conceptually; not imported elsewhere). Behavior change only — no new function signatures.

- [ ] **Step 1: Update the existing mastery-engine tests to the new rules**

In `tests/mastery-engine.test.mjs`, replace the test named `'evidence changes strength and mastery requires three sessions'` (lines 23-33) with:

```js
test('a clean fast first try reaches strong, and two fast sessions master',()=>{
  const p=createProfile(),fact={a:8,b:7,sign:'+',answer:15};
  recordEvidence(p,{fact,result:'correct',elapsedMs:2000,context:'practice',sessionId:'a',now:1});
  assert.equal(getFactState(p,factId(fact)).strength,3);
  assert.equal(getFactState(p,factId(fact)).status,'strong');
  recordEvidence(p,{fact,result:'correct',elapsedMs:2000,context:'practice',sessionId:'b',now:2});
  assert.equal(getFactState(p,factId(fact)).status,'mastered');
  recordEvidence(p,{fact,result:'wrong',context:'practice',sessionId:'d',now:4});
  assert.equal(getFactState(p,factId(fact)).status,'strong');
});
```

In the same file, in the test `'commuted addition shares one progress record while subtraction keeps its own'`, change the first assertion from `strength,2` to `strength,3` (the fact is new + fast, so it now gains 3):

```js
  assert.equal(getFactState(p,'5+8').strength,3);assert.equal(getFactState(p,{a:5,b:8,sign:'+'}).correct,1);
```

- [ ] **Step 2: Update the learning-service and adaptive-selector tests the new rules touch**

In `tests/learning-service.test.mjs`, replace the body of the test `'service persists evidence and exposes refreshed summary'` (lines 8-13) with:

```js
test('service persists evidence and exposes refreshed summary',()=>{
  const s=storage(),learning=createLearningService({storage:s,now:()=>100,random:()=>0}),fact={a:1,b:9,sign:'+',answer:10};
  learning.record({fact,result:'correct',elapsedMs:1000,context:'practice',sessionId:'a'});
  assert.equal(learning.summary().strong,1);assert.equal(learning.summary().level,1);
  assert.equal(getFactState(createLearningService({storage:s}).profile,fact).strength,3);
});
```

In `tests/adaptive-selector.test.mjs`, in the test `'progress summary counts open forms and reports every level'`, change the final assertion (line 87) from `'strong'` to `'mastered'` (the `master` helper now records 2 fast sessions, which masters a fact):

```js
  assert.equal(getFactState(p,{a:9,b:1,sign:'+',answer:10}).status,'mastered');
```

- [ ] **Step 3: Run the updated tests to verify they fail against current code**

Run: `node --test tests/mastery-engine.test.mjs tests/learning-service.test.mjs tests/adaptive-selector.test.mjs`
Expected: FAIL — new assertions (`strength,3`, `status 'strong'`/`'mastered'`, `summary().strong`) do not match current `+2`/3-session behavior.

- [ ] **Step 4: Add the `MASTERY_SESSIONS` constant**

In `dist/mastery-engine.mjs:1`, add the constant to the existing top line. Change:

```js
const MAX=20,BANDS=[[0,5],[6,10],[11,15],[16,20]],PROFILE_VERSION=2;
```

to:

```js
const MAX=20,BANDS=[[0,5],[6,10],[11,15],[16,20]],PROFILE_VERSION=2;
export const MASTERY_SESSIONS=2;
```

- [ ] **Step 5: Use `MASTERY_SESSIONS` in `statusOf` and `schedule`**

In `dist/mastery-engine.mjs`, replace lines 22-23:

```js
function statusOf(s){if(!s.correct&&!s.wrong&&!s.hints&&!s.reviews)return'new';if(s.strength<=2)return'learning';if(s.strength<=4||s.fastSessions.length<3)return'strong';return'mastered'}
function schedule(s,now){s.dueAt=now+([0,0,86400000,259200000][Math.min(3,s.strength>=5&&s.fastSessions.length>=3?3:s.strength>=3?2:1)]||0);s.status=statusOf(s);return s}
```

with:

```js
function statusOf(s){if(!s.correct&&!s.wrong&&!s.hints&&!s.reviews)return'new';if(s.strength<=2)return'learning';if(s.strength<=4||s.fastSessions.length<MASTERY_SESSIONS)return'strong';return'mastered'}
function schedule(s,now){s.dueAt=now+([0,0,86400000,259200000][Math.min(3,s.strength>=5&&s.fastSessions.length>=MASTERY_SESSIONS?3:s.strength>=3?2:1)]||0);s.status=statusOf(s);return s}
```

- [ ] **Step 6: Reward a clean fast first try with `+3`**

In `dist/mastery-engine.mjs`, in `recordEvidence`, replace the correct branch (lines 27-31):

```js
  if(event.result==='correct'){
    s.correct++;const timed=Number.isFinite(elapsed)&&elapsed>=0,fast=timed&&elapsed<=benchmark;
    s.strength=Math.min(6,s.strength+(fast?2:1));
    if(fast&&event.sessionId&&!s.fastSessions.includes(event.sessionId))s.fastSessions.push(event.sessionId);
    if(timed){const list=[...(profile.timings[tkey]||[]),elapsed].slice(-12);profile.timings[tkey]=list}
```

with (note `cleanFirstTry` is captured BEFORE `s.correct++`):

```js
  if(event.result==='correct'){
    const cleanFirstTry=s.correct===0&&s.wrong===0&&s.hints===0;
    s.correct++;const timed=Number.isFinite(elapsed)&&elapsed>=0,fast=timed&&elapsed<=benchmark;
    s.strength=Math.min(6,s.strength+(fast?(cleanFirstTry?3:2):1));
    if(fast&&event.sessionId&&!s.fastSessions.includes(event.sessionId))s.fastSessions.push(event.sessionId);
    if(timed){const list=[...(profile.timings[tkey]||[]),elapsed].slice(-12);profile.timings[tkey]=list}
```

- [ ] **Step 7: Run the full suite to verify green**

Run: `node --test`
Expected: PASS — all tests (previously 134, same count) pass. If any other test asserts an old strength/status value, fix that assertion to the new rule (clean fast first-try = `+3`; mastery at `MASTERY_SESSIONS` fast sessions) and re-run.

- [ ] **Step 8: Commit**

```bash
git add dist/mastery-engine.mjs tests/mastery-engine.test.mjs tests/learning-service.test.mjs tests/adaptive-selector.test.mjs
git commit -m "Fast-track: clean first-try +3 and mastery at 2 fast sessions"
```

---

## Task 2: Lower the unlock threshold (`adaptive-selector.mjs`)

**Files:**
- Modify: `dist/adaptive-selector.mjs:4`
- Test: `tests/adaptive-selector.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `UNLOCK` is now `0.6` (module-private; behavior change only).

- [ ] **Step 1: Update the unlock-threshold test to `0.6`**

In `tests/adaptive-selector.test.mjs`, replace the test `'seventy percent of a level unlocks the next one'` (lines 39-46) with:

```js
test('sixty percent of a level unlocks the next one',()=>{
  const p=createProfile();master(p,formsAtLevel(1),.5);
  assert.equal(currentLevel(p),1);
  master(p,formsAtLevel(1),.6);assert.ok(levelReadiness(p,1)>=.6);assert.equal(currentLevel(p),2);
  master(p,formsAtLevel(2));assert.equal(currentLevel(p),3);
  master(p,formsAtLevel(3));assert.equal(currentLevel(p),4);
  master(p,formsAtLevel(4));assert.equal(currentLevel(p),5);
});
```

(Level 1 has 9 forms: mastering 5/9 ≈ 0.556 stays locked; 6/9 ≈ 0.667 clears 0.6.)

- [ ] **Step 2: Run the test to verify it fails against current code**

Run: `node --test tests/adaptive-selector.test.mjs`
Expected: FAIL — with `UNLOCK=0.7`, `master(...,.6)` leaves `currentLevel` at 1, so `assert.equal(currentLevel(p),2)` fails.

- [ ] **Step 3: Lower `UNLOCK`**

In `dist/adaptive-selector.mjs:4`, change:

```js
const UNLOCK=.7,FOCUS_SHARE=.75;
```

to:

```js
const UNLOCK=.6,FOCUS_SHARE=.75;
```

- [ ] **Step 4: Run the full suite to verify green**

Run: `node --test`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add dist/adaptive-selector.mjs tests/adaptive-selector.test.mjs
git commit -m "Fast-track: unlock a stage at 0.6 readiness"
```

---

## Task 3: `seedForm()` — fill-blanks-only seeding (`mastery-engine.mjs`)

**Files:**
- Modify: `dist/mastery-engine.mjs` (add `seedForm` near `recordEvidence`)
- Test: `tests/mastery-engine.test.mjs`

**Interfaces:**
- Consumes: existing `formKey`, `getFactState`, module-private `blank`-shaped state.
- Produces: `export function seedForm(profile, fact, now=Date.now())` → returns the fact-state object. `fact` is a question/fact (same contract as `getFactState`), e.g. a form's `questions[0]`. Seeds ONLY if the form is still `new`; otherwise returns the existing state untouched. Consumed by Task 5 (`placeAt`).

- [ ] **Step 1: Write the failing tests**

Append to `tests/mastery-engine.test.mjs` (`seedForm` is already exportable from the module under test; add it to the import on line 3):

Change the import line 3 to include `seedForm`:

```js
import {factCatalog,factId,factFamilyId,formKey,createProfile,getFactState,recordEvidence,migrateProfile,responseBenchmark,seedForm} from '../dist/mastery-engine.mjs';
```

Then append:

```js
test('seedForm fills a blank form as strong and immediately due',()=>{
  const p=createProfile(),fact={a:1,b:9,sign:'+',answer:10};
  const s=seedForm(p,fact,500);
  assert.deepEqual(s,{strength:3,status:'strong',correct:1,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:500,dueAt:500});
  assert.equal(getFactState(p,factId(fact)).status,'strong');
  assert.equal(p.updatedAt,500);
});

test('seedForm never overwrites existing evidence',()=>{
  const p=createProfile(),fact={a:1,b:9,sign:'+',answer:10};
  recordEvidence(p,{fact,result:'wrong',context:'practice',sessionId:'a',now:1}); // weak, status learning
  const before={...getFactState(p,fact)};
  const s=seedForm(p,fact,999);
  assert.deepEqual(s,before);
  assert.equal(getFactState(p,fact).status,'learning');
  assert.equal(getFactState(p,fact).strength,0);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/mastery-engine.test.mjs`
Expected: FAIL with "seedForm is not a function" / "seedForm is not defined".

- [ ] **Step 3: Implement `seedForm`**

In `dist/mastery-engine.mjs`, add after `recordEvidence` (after line 37, before `migrateProfile`):

```js
// Fill a still-blank form with strong-but-reviewable evidence. Never touches a form that already
// carries evidence, so seeding can only add to blanks — it never overwrites or demotes real progress.
export function seedForm(profile,fact,now=Date.now()){
  const key=formKey(fact),cur=getFactState(profile,fact);
  if(cur.correct+cur.wrong+cur.hints+cur.reviews>0)return cur;
  const s={strength:3,status:'strong',correct:1,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:now,dueAt:now};
  profile.facts[key]=s;profile.updatedAt=now;return s;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/mastery-engine.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add dist/mastery-engine.mjs tests/mastery-engine.test.mjs
git commit -m "Add seedForm: fill-blanks-only strong seeding for placement"
```

---

## Task 4: Placement engine (`placement-engine.mjs`)

**Files:**
- Create: `dist/placement-engine.mjs`
- Test: `tests/placement-engine.test.mjs`

**Interfaces:**
- Consumes: nothing (pure, zero imports).
- Produces:
  - `createPlacement()` → `{lo:1, hi:5, place:1, step:0, done:false, level:null}`
  - `placementStage(state)` → number (the stage to probe next, `floor((lo+hi)/2)`) or `null` if `state.done`
  - `recordPlacement(state, correct)` → the same `state`, mutated: on `correct` `place=mid; lo=mid+1`, else `hi=mid-1`; `step++`; when `lo>hi` sets `done=true, level=place`
  - `placementResult(state)` → `{done: boolean, level: number|null}`

- [ ] **Step 1: Write the failing test**

Create `tests/placement-engine.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlacement,placementStage,recordPlacement,placementResult} from '../dist/placement-engine.mjs';

// Drive the ladder with a fixed answer script. Returns the resulting level, the number of
// questions asked, and the stages probed (in order).
function run(answers){
  const s=createPlacement(),stages=[];let i=0;
  while(!s.done){stages.push(placementStage(s));recordPlacement(s,answers[i++]);}
  return {level:placementResult(s).level,count:i,stages};
}

test('all correct places at the top stage in at most three questions',()=>{
  const r=run([true,true,true]);
  assert.equal(r.level,5);
  assert.ok(r.count<=3,`asked ${r.count}`);
});

test('all wrong places at the first stage',()=>{
  const r=run([false,false,false]);
  assert.equal(r.level,1);
  assert.ok(r.count<=3,`asked ${r.count}`);
});

test('every answer sequence converges in at most three questions, each stage probed once',()=>{
  for(const a of [false,true])for(const b of [false,true])for(const c of [false,true]){
    const r=run([a,b,c]);
    assert.ok(r.count<=3,`sequence ${a},${b},${c} asked ${r.count}`);
    assert.ok(r.level>=1&&r.level<=5,`level ${r.level}`);
    assert.equal(new Set(r.stages).size,r.stages.length,`stage repeated in ${a},${b},${c}: ${r.stages}`);
  }
});

test('placementStage is null and result is stable once done',()=>{
  const s=createPlacement();
  while(!s.done)recordPlacement(s,true);
  assert.equal(placementStage(s),null);
  recordPlacement(s,false); // no-op after done
  assert.deepEqual(placementResult(s),{done:true,level:5});
});

test('the ladder starts by probing stage three',()=>{
  assert.equal(placementStage(createPlacement()),3);
});

test('a mixed sequence lands on the exact stage',()=>{
  // correct, wrong -> mid 3 ok (place 3, lo 4), mid 4 wrong (hi 3) -> lo 4 > hi 3 -> level 3
  assert.equal(run([true,false]).level,3);
  // wrong, correct, correct -> mid 3 wrong (hi 2), mid 1 ok (place1,lo2), mid 2 ok (place2,lo3>hi2) -> 2
  assert.equal(run([false,true,true]).level,2);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/placement-engine.test.mjs`
Expected: FAIL — module `dist/placement-engine.mjs` does not exist (ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Implement the engine**

Create `dist/placement-engine.mjs`:

```js
// Adaptive-ladder placement over the 5 curriculum stages. Pure: no DOM, timer, audio, or storage.
// Binary search finds the highest stage the child answers correctly in at most 3 questions; each
// stage is probed at most once. `place` is the best stage answered correctly (defaults to 1).
export function createPlacement(){return {lo:1,hi:5,place:1,step:0,done:false,level:null}}

export function placementStage(state){return state.done?null:Math.floor((state.lo+state.hi)/2)}

export function recordPlacement(state,correct){
  if(state.done)return state;
  const mid=Math.floor((state.lo+state.hi)/2);
  if(correct){state.place=mid;state.lo=mid+1}else{state.hi=mid-1}
  state.step++;
  if(state.lo>state.hi){state.done=true;state.level=state.place}
  return state;
}

export function placementResult(state){return {done:state.done,level:state.level}}
```

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/placement-engine.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add dist/placement-engine.mjs tests/placement-engine.test.mjs
git commit -m "Add pure placement engine (3-question adaptive ladder)"
```

---

## Task 5: `placeAt`, `skipPlacement`, `placement` (`learning-service.mjs`)

**Files:**
- Modify: `dist/learning-service.mjs:1-3` (imports), `dist/learning-service.mjs:5-6` (add placement key helpers), `dist/learning-service.mjs:19-28` (add methods)
- Test: `tests/learning-service.test.mjs`

**Interfaces:**
- Consumes: `seedForm` (Task 3), `currentLevel` (Task 2/existing), `formsBelowLevel` (`core-facts.mjs`).
- Produces (on the object returned by `createLearningService`):
  - `placeAt(level)` → `{done:true, level:number, at:number}`. Computes `target=max(level, currentLevel(profile))`, seeds every still-`new` form in `formsBelowLevel(target)` via `seedForm`, persists the profile, then writes/returns the placement record with `level = max(target, previouslyStoredLevel)`.
  - `skipPlacement()` → `{done:true, level:1, at:number}`. Writes the placement record; mutates no fact state.
  - `placement()` → the stored `toan-placement-v1` record `{done,level,at}` or `null` if never set.

- [ ] **Step 1: Write the failing tests**

In `tests/learning-service.test.mjs`, extend the imports (lines 3-4) to:

```js
import {createLearningService} from '../dist/learning-service.mjs';
import {getFactState,formKey,recordEvidence} from '../dist/mastery-engine.mjs';
import {formsAtLevel,formsBelowLevel} from '../dist/core-facts.mjs';
import {currentLevel} from '../dist/adaptive-selector.mjs';
```

Add a `master` helper below the existing `storage()` helper (line 6):

```js
function master(profile,forms){for(const form of forms)for(const sessionId of ['a','b'])recordEvidence(profile,{fact:form.questions[0],result:'correct',elapsedMs:1000,context:'practice',sessionId,now:1})}
```

Then append these tests:

```js
test('placeAt on a fresh profile seeds lower stages and lands exactly at the target',()=>{
  const s=storage(),learning=createLearningService({storage:s,now:()=>1000});
  const rec=learning.placeAt(4);
  assert.equal(currentLevel(learning.profile),4);
  for(const form of formsBelowLevel(4)){const st=getFactState(learning.profile,form.questions[0]);assert.equal(st.status,'strong');assert.equal(st.strength,3);assert.equal(st.dueAt,1000)}
  for(const form of formsAtLevel(4))assert.equal(getFactState(learning.profile,form.questions[0]).status,'new');
  assert.deepEqual(rec,{done:true,level:4,at:1000});
  assert.deepEqual(JSON.parse(s.getItem('toan-placement-v1')),{done:true,level:4,at:1000});
});

test('placeAt(1) on a fresh profile seeds nothing',()=>{
  const learning=createLearningService({storage:storage(),now:()=>1});
  learning.placeAt(1);
  assert.deepEqual(learning.profile.facts,{});
});

test('placeAt never overwrites existing evidence',()=>{
  const learning=createLearningService({storage:storage(),now:()=>5});
  const mastered=formsAtLevel(1)[0].questions[0],weak=formsAtLevel(1)[1].questions[0];
  for(const id of ['a','b'])recordEvidence(learning.profile,{fact:mastered,result:'correct',elapsedMs:1000,context:'practice',sessionId:id,now:1});
  recordEvidence(learning.profile,{fact:weak,result:'wrong',context:'practice',sessionId:'a',now:1});
  const beforeM={...getFactState(learning.profile,mastered)},beforeW={...getFactState(learning.profile,weak)};
  learning.placeAt(5);
  assert.deepEqual(getFactState(learning.profile,mastered),beforeM);
  assert.deepEqual(getFactState(learning.profile,weak),beforeW);
  assert.equal(getFactState(learning.profile,weak).status,'learning');
});

test('placeAt on an existing profile does not force the level past real readiness',()=>{
  const learning=createLearningService({storage:storage(),now:()=>1});
  const forms1=formsAtLevel(1);
  for(let i=0;i<4;i++)recordEvidence(learning.profile,{fact:forms1[i].questions[0],result:'wrong',context:'practice',sessionId:'a',now:1});
  learning.placeAt(5);
  assert.ok(currentLevel(learning.profile)<5);
  assert.equal(currentLevel(learning.profile),1);
  for(let i=0;i<4;i++)assert.equal(getFactState(learning.profile,forms1[i].questions[0]).status,'learning');
  for(let i=4;i<forms1.length;i++)assert.equal(getFactState(learning.profile,forms1[i].questions[0]).status,'strong');
});

test('re-run placement is monotonic: never demotes, only fills blanks up',()=>{
  const learning=createLearningService({storage:storage(),now:()=>1});
  [1,2,3].forEach(l=>master(learning.profile,formsAtLevel(l)));
  assert.equal(currentLevel(learning.profile),4);
  const before=JSON.stringify(learning.profile.facts);
  learning.placeAt(2);
  assert.equal(currentLevel(learning.profile),4);
  assert.equal(JSON.stringify(learning.profile.facts),before);
  learning.placeAt(5);
  assert.equal(currentLevel(learning.profile),5);
});

test('probe fetch works at every stage even when no new facts remain',()=>{
  const learning=createLearningService({storage:storage(),random:()=>0});
  [1,2,3,4].forEach(l=>master(learning.profile,formsAtLevel(l)));
  for(let s=1;s<=5;s++){const q=learning.nextFact({focusLevel:s,context:'placement'});assert.ok(q&&q.id,`stage ${s}`)}
});

test('skipPlacement records completion at level one without touching facts',()=>{
  const s=storage(),learning=createLearningService({storage:s,now:()=>7});
  assert.equal(learning.placement(),null);
  const rec=learning.skipPlacement();
  assert.deepEqual(rec,{done:true,level:1,at:7});
  assert.deepEqual(JSON.parse(s.getItem('toan-placement-v1')),{done:true,level:1,at:7});
  assert.deepEqual(learning.placement(),{done:true,level:1,at:7});
  assert.deepEqual(learning.profile.facts,{});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/learning-service.test.mjs`
Expected: FAIL — `learning.placeAt`, `learning.skipPlacement`, `learning.placement` are not functions.

- [ ] **Step 3: Add imports and placement-key helpers**

In `dist/learning-service.mjs`, replace the import block (lines 1-3):

```js
import {createLearningStore} from './learning-store.mjs';
import {recordEvidence} from './mastery-engine.mjs';
import {selectFact,progressSummary} from './adaptive-selector.mjs';
```

with:

```js
import {createLearningStore} from './learning-store.mjs';
import {recordEvidence,seedForm} from './mastery-engine.mjs';
import {selectFact,progressSummary,currentLevel} from './adaptive-selector.mjs';
import {formsBelowLevel} from './core-facts.mjs';

const PLACEMENT_KEY='toan-placement-v1';
```

- [ ] **Step 4: Add placement read/write helpers inside the service**

In `dist/learning-service.mjs`, after the `draw` function closes (after line 18, `}`), and before the `return {` (line 19), add:

```js
  function readPlacement(){try{const raw=storage?.getItem(PLACEMENT_KEY);if(raw){const v=JSON.parse(raw);if(v&&typeof v==='object')return v}}catch{}return null}
  function writePlacement(rec){try{storage?.setItem(PLACEMENT_KEY,JSON.stringify(rec))}catch{}return rec}
```

- [ ] **Step 5: Add the three methods to the returned object**

In `dist/learning-service.mjs`, in the returned object, replace the `newSessionId` line (line 27) — which is the last property — so the object gains the new methods. Change:

```js
    newSessionId(){return `${now()}-${++sequence}`}
```

to:

```js
    newSessionId(){return `${now()}-${++sequence}`},
    placement(){return readPlacement()},
    placeAt(level){
      const at=now(),target=Math.max(level,currentLevel(profile));
      for(const form of formsBelowLevel(target))seedForm(profile,form.questions[0],at);
      store.save(profile);
      const prevLevel=readPlacement()?.level||0;
      return writePlacement({done:true,level:Math.max(target,prevLevel),at});
    },
    skipPlacement(){return writePlacement({done:true,level:1,at:now()})}
```

- [ ] **Step 6: Run to verify pass**

Run: `node --test tests/learning-service.test.mjs`
Expected: PASS.

- [ ] **Step 7: Run the full suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add dist/learning-service.mjs tests/learning-service.test.mjs
git commit -m "Add placeAt/skipPlacement/placement to the learning service"
```

---

## Task 6: Placement quiz controller (`placement.mjs`)

**Files:**
- Create: `dist/placement.mjs`

**Interfaces:**
- Consumes: `choices` (`math.mjs`); `createPlacement`/`placementStage`/`recordPlacement`/`placementResult` (Task 4); `showCenterCheck`/`showMiss`/`NEXT_DELAY_MS` (`feedback.mjs`); `learning.nextFact`, `learning.placeAt`, `learning.summary` (Task 5); `home`, `beep` from the common mount context.
- Produces: `export function mountPlacement(app,{home,beep,learning})` → returns a `cleanup()` disposer (matches the other `mount*` controllers). Probe answers do NOT call `learning.record()`.

This controller has no unit test (it is DOM/timer glue, consistent with the other `mount*` controllers, which are covered only by source-text assertions in `home-ui.test.mjs`). Its wiring is asserted in Task 7.

- [ ] **Step 1: Create the controller**

Create `dist/placement.mjs`:

```js
import {choices} from './math.mjs';
import {createPlacement,placementStage,recordPlacement,placementResult} from './placement-engine.mjs';
import {showCenterCheck,showMiss,NEXT_DELAY_MS} from './feedback.mjs';

export function mountPlacement(app,{home,beep,learning}){
  const state=createPlacement(),$=s=>app.querySelector(s);
  let q,options=[],locked=false,disposed=false,timer=null,step=0;
  app.innerHTML=`<div class="play-top"><button class="back" id="placement-back">← Về đảo</button><span>🧭 Kiểm tra trình độ</span></div><section class="play blue challenge placement"><p class="challenge-rules">Vài câu ngắn để tìm đúng chỗ bắt đầu cho bé. Không tính điểm, không đếm giờ.</p><div id="placement-body"></div></section>`;
  $('#placement-back').onclick=home;
  function ask(){
    if(disposed)return;
    const stage=placementStage(state);
    if(stage==null){finish();return}
    step++;locked=false;
    q=learning.nextFact({focusLevel:stage,context:'placement'});
    options=choices(q.answer,20);
    render();
  }
  function render(){
    $('#placement-body').innerHTML=`<div class="play-label">CÂU ${step} / 3</div><h2>Mình cùng tính nhé!</h2><div class="equation">${q.a}<span>${q.sign}</span>${q.b}<span>=</span><b class="unknown">?</b></div><div class="answers">${options.map((v,i)=>`<button data-answer="${v}" style="--i:${i}">${v}</button>`).join('')}</div><div id="feedback" role="status" aria-live="polite" class="challenge-feedback"></div>`;
    app.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.answer),b));
  }
  function choose(value,button){
    if(locked||disposed)return;locked=true;
    const correct=value===q.answer;
    app.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);
    if(correct){button.classList.add('right','challenge-pop');beep();showCenterCheck($('.play'))}
    else{button.classList.add('wrong','challenge-shake');beep(false);showMiss(button)}
    recordPlacement(state,correct); // drives the ladder only — no learning.record()
    timer=setTimeout(ask,NEXT_DELAY_MS);
  }
  function finish(){
    if(disposed)return;
    learning.placeAt(placementResult(state).level);
    const landed=learning.summary().level;
    $('#placement-body').innerHTML=`<div class="finish-icon">🎉</div><h2>Bắt đầu ở Chặng ${landed}!</h2><p>Mình đã tìm được chỗ bắt đầu vừa sức cho bé. Cùng luyện nhé!</p><div class="finish-actions"><button class="primary" id="placement-done">Bắt đầu →</button></div>`;
    $('#placement-done').onclick=home;$('#placement-done').focus();
  }
  ask();
  return ()=>{disposed=true;clearTimeout(timer)};
}
```

Note: the celebration shows `learning.summary().level` (the real landing stage), which equals the ladder result on a fresh profile and is honest on a re-run where readiness may differ from the target.

- [ ] **Step 2: Verify the module imports cleanly**

Run: `node --input-type=module -e "import('./dist/placement.mjs').then(m=>console.log(typeof m.mountPlacement))"`
Expected: prints `function`.

- [ ] **Step 3: Run the full suite (nothing should break)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add dist/placement.mjs
git commit -m "Add placement quiz controller"
```

---

## Task 7: UI integration (`app.js`, `style.css`)

**Files:**
- Modify: `dist/app.js:6` (import), `dist/app.js:34` (offer card + re-run button in template), `dist/app.js:39-49` (handlers), `dist/app.js:51` (dispatcher)
- Modify: `dist/style.css` (append styles)
- Test: `tests/home-ui.test.mjs`

**Interfaces:**
- Consumes: `mountPlacement` (Task 6); `learning.placement`, `learning.skipPlacement` (Task 5).
- Produces: first-run offer card (`#placement-start`, `#placement-skip`), re-run button (`#placement-rerun`), and a `placement` branch in `start()`. No new exports (`app.js` is the shell).

- [ ] **Step 1: Write the failing source-text tests**

Append to `tests/home-ui.test.mjs`:

```js
test('a first-run placement offer invites, starts or is skipped through the service',async()=>{
  const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  // registered in the dispatcher
  assert.match(app,/import \{mountPlacement\} from '\.\/placement\.mjs'/);
  assert.match(app,/id==='placement'\?mountPlacement\(app,common\)/);
  // offer only on a fresh profile that has not placed or skipped yet
  assert.match(app,/const showOffer=started===0&&!learning\.placement\(\)/);
  assert.match(app,/id="placement-start">Bắt đầu<\/button>/);
  assert.match(app,/id="placement-skip">Bỏ qua<\/button>/);
  assert.match(app,/Con muốn thử vài câu để bắt đầu đúng chỗ không\?/);
  // start runs the quiz; skip goes through the service, never writing storage directly
  assert.match(app,/#placement-start'\)\.onclick=\(\)=>start\('placement'\)/);
  assert.match(app,/#placement-skip'\)\.onclick=\(\)=>\{learning\.skipPlacement\(\);home\(\)\}/);
  assert.doesNotMatch(app,/setItem\('toan-placement-v1'/);
});

test('the journey details modal offers a re-run of the placement check',async()=>{
  const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(app,/id="placement-rerun">🧭 Kiểm tra trình độ<\/button>/);
  assert.match(app,/#placement-rerun'\)\.onclick=\(\)=>start\('placement'\)/);
});

test('placement styles exist for the offer card and quiz screen',async()=>{
  const style=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');
  assert.match(style,/\.placement-offer\{/);
  assert.match(style,/\.placement-offer-actions\{/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/home-ui.test.mjs`
Expected: FAIL — none of these strings exist yet.

- [ ] **Step 3: Import the controller**

In `dist/app.js:6`, after the `createLearningService` import line, the imports block runs lines 1-8. Change line 6:

```js
import {createLearningService} from './learning-service.mjs';
```

to:

```js
import {createLearningService} from './learning-service.mjs';
import {mountPlacement} from './placement.mjs';
```

- [ ] **Step 4: Compute the offer flag in `home()`**

In `dist/app.js:32`, extend the first line of `home()`. Change:

```js
  stopGame?.();stopGame=null;const p=learning.summary(),started=p.total-p.new,stage=p.levels.find(l=>l.id===p.level)||p.levels[0];
```

to:

```js
  stopGame?.();stopGame=null;const p=learning.summary(),started=p.total-p.new,stage=p.levels.find(l=>l.id===p.level)||p.levels[0],showOffer=started===0&&!learning.placement();
```

- [ ] **Step 5: Render the offer card in the template**

In `dist/app.js:33`, the `home()` template opens with the `<section class="welcome">...</section>` line. Insert the offer card immediately after that welcome section's closing `</section>` and before the ``<section class="journey">`` that begins line 34. Change the start of line 34 from:

```js
  <section class="journey">
```

to:

```js
  ${showOffer?`<section class="placement-offer"><div class="placement-offer-body"><span class="placement-offer-icon" aria-hidden="true">🧭</span><div><strong>Con muốn thử vài câu để bắt đầu đúng chỗ không?</strong><p>Vài phép tính ngắn giúp mình chọn chặng vừa sức cho bé.</p></div></div><div class="placement-offer-actions"><button class="primary" id="placement-start">Bắt đầu</button><button class="back" id="placement-skip">Bỏ qua</button></div></section>`:''}
  <section class="journey">
```

- [ ] **Step 6: Add the re-run button inside the journey-details modal**

In `dist/app.js:34`, within the `#journey-details` dialog, the details body ends with the level list `</ul></div></dialog>`. Add the re-run button right after the `</ul>`. Find this fragment in the template:

```js
`<li class="${l.unlocked?'':'locked'} ${l.id===p.level?'current':''}"><span>${l.id}. ${l.title}</span><div class="progress"><div style="width:${l.total?Math.round(l.ready/l.total*100):0}%"></div></div><b>${l.ready}/${l.total}</b><button class="level-practice" data-level="${l.id}" aria-label="Luyện riêng chặng ${l.id}: ${l.title}">Luyện</button></li>`).join('')}</ul></div></dialog>
```

and change the trailing `</ul></div></dialog>` to insert the button:

```js
`<li class="${l.unlocked?'':'locked'} ${l.id===p.level?'current':''}"><span>${l.id}. ${l.title}</span><div class="progress"><div style="width:${l.total?Math.round(l.ready/l.total*100):0}%"></div></div><b>${l.ready}/${l.total}</b><button class="level-practice" data-level="${l.id}" aria-label="Luyện riêng chặng ${l.id}: ${l.title}">Luyện</button></li>`).join('')}</ul><button class="level-check" id="placement-rerun">🧭 Kiểm tra trình độ</button></div></dialog>
```

- [ ] **Step 7: Wire the offer and re-run handlers**

In `dist/app.js`, in the handler block of `home()` (lines 39-49), add the placement handlers. After the `#details-close` handler line (line 44):

```js
  app.querySelector('#details-close').onclick=()=>details.close();
```

add:

```js
  app.querySelector('#placement-rerun').onclick=()=>start('placement');
  if(showOffer){app.querySelector('#placement-start').onclick=()=>start('placement');app.querySelector('#placement-skip').onclick=()=>{learning.skipPlacement();home()}}
```

- [ ] **Step 8: Register `placement` in the `start()` dispatcher**

In `dist/app.js:51`, add the placement branch before the `mountChallenge` fallback. Change:

```js
function start(id,{focusLevel}={}){stopGame?.();stopGame=null;const mode=modes.find(m=>m.id===id),common={settings,home,award,beep,learning,scores};stopGame=id==='rain'?mountRain(app,common):id==='practice'?mountPractice(app,{...common,startGame:start,games:gameModes,focusLevel}):id==='sheet'?mountSheet(app,{...common,startGame:start}):id==='compare'?mountCompare(app,common):mountChallenge(app,{...common,mode})}
```

to:

```js
function start(id,{focusLevel}={}){stopGame?.();stopGame=null;const mode=modes.find(m=>m.id===id),common={settings,home,award,beep,learning,scores};stopGame=id==='rain'?mountRain(app,common):id==='practice'?mountPractice(app,{...common,startGame:start,games:gameModes,focusLevel}):id==='sheet'?mountSheet(app,{...common,startGame:start}):id==='compare'?mountCompare(app,common):id==='placement'?mountPlacement(app,common):mountChallenge(app,{...common,mode})}
```

- [ ] **Step 9: Append the styles**

Read the end of `dist/style.css` (`Read` the last ~15 lines to find a unique anchor), then append this block to the very end of the file:

```css
.placement-offer{background:linear-gradient(135deg,#e8f4ff,#f3ecff);border:2px solid #cfe0ff;border-radius:20px;padding:18px 20px;margin:0 0 18px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between}
.placement-offer-body{display:flex;gap:12px;align-items:center;flex:1 1 260px}
.placement-offer-icon{font-size:2rem}
.placement-offer strong{display:block;font-size:1.05rem}
.placement-offer p{margin:4px 0 0;color:#4a5568;font-size:.95rem}
.placement-offer-actions{display:flex;gap:10px;flex-wrap:wrap}
.level-check{margin-top:14px;width:100%;padding:12px;border:2px dashed #cfe0ff;border-radius:14px;background:#f7faff;font-weight:700;cursor:pointer}
.level-check:hover{background:#eef4ff}
.play.placement .equation{margin:12px 0}
```

- [ ] **Step 10: Run the UI tests, then the full suite**

Run: `node --test tests/home-ui.test.mjs`
Expected: PASS.

Run: `node --test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add dist/app.js dist/style.css tests/home-ui.test.mjs
git commit -m "Wire placement offer, re-run and quiz screen into the home shell"
```

---

## Task 8: Documentation (`docs/ENGINE.md`)

**Files:**
- Modify: `docs/ENGINE.md`

**Interfaces:** None (docs only).

- [ ] **Step 1: Read the target sections**

`Read` `docs/ENGINE.md` and locate: the fast-track-relevant mastery sections (strength/mastery, roughly §5–6), the learning-service section (roughly §7), and the engine list / testing section (roughly §8). Confirm the exact heading numbers before editing.

- [ ] **Step 2: Document the fast-track constant changes**

In the mastery/selection sections, update the prose to the new rules with exact values:
- A clean fast first try (a `new` form answered fast on its first attempt: `correct===0 && wrong===0 && hints===0`) grants `strength +3` (reaches `strong` in one rep). Non-clean fast correct still `+2`; slow correct `+1`.
- Mastery needs `MASTERY_SESSIONS = 2` distinct fast sessions (was 3); the constant is exported from `mastery-engine.mjs` and used by both `statusOf` and `schedule`.
- A stage unlocks at `UNLOCK = 0.6` readiness (was 0.7).
- Wrong-answer strength cap `4` and overall cap `6` are unchanged.

- [ ] **Step 3: Document `seedForm` and `placeAt`/`skipPlacement`/`placement`**

In the learning-service section, add:
- `seedForm(profile, fact, now)` (mastery-engine): fills a still-`new` form with `{strength:3,status:'strong',correct:1,dueAt:now,lastSeen:now,...}`; returns the existing state untouched if the form already has evidence.
- `placeAt(level)`: `target=max(level,currentLevel(profile))`, seeds still-`new` forms in `formsBelowLevel(target)`, persists, and records `toan-placement-v1={done:true,level:max(target,prevStoredLevel),at}`. Does not guarantee `currentLevel()===target` on an existing profile.
- `skipPlacement()`: records `toan-placement-v1={done:true,level:1,at}` without touching facts.
- `placement()`: returns the stored record or `null`. The `toan-placement-v1` schema is owned entirely by the learning service.

- [ ] **Step 4: Document the placement engine**

In the engine list / architecture section, add `placement-engine.mjs` (pure) and `placement.mjs` (controller): a binary-search adaptive ladder over the 5 stages, at most 3 questions, each stage probed at most once, probe answers record no evidence. API: `createPlacement`, `placementStage`, `recordPlacement`, `placementResult`. In the testing section, add `tests/placement-engine.test.mjs` to the list.

- [ ] **Step 5: Commit**

```bash
git add docs/ENGINE.md
git commit -m "Document placement engine and fast-track changes"
```

---

## Self-Review

**Spec coverage (spec §1–§10):**
- §2 placement quiz (≤3 questions, skippable, re-runnable) → Tasks 4, 6, 7.
- §2/§6 adaptive fast-track (three knobs) → Tasks 1, 2.
- §3 architecture (new `placement-engine.mjs`, `placement.mjs`; edits to mastery/selector/service/app; `toan-placement-v1` owned by service) → Tasks 3–7.
- §4 placement engine (state, algorithm, ≤3 questions, no `asked`/`excludeIds`, no `kind:'new'`, probes record no evidence) → Task 4 (engine) + Task 6 (probe fetch uses `{focusLevel,context:'placement'}`, no `learning.record`).
- §5 seeding (`seedForm` fill-blanks-only; `placeAt` target/monotonic; edge cases) → Tasks 3, 5.
- §5.5 four invariants → covered by Task 5 tests (fresh lands at target; existing not overwritten; non-demoting re-run; derived progression not forced).
- §6 fast-track constants → Tasks 1, 2.
- §7 UI (first-run offer gated on `started===0` & no placement record; "Bỏ qua"→`skipPlacement()`; re-run button; dispatcher) → Task 7.
- §8 testing (placement-engine, learning-service, mastery-engine, adaptive-selector, home-ui) → Tasks 1–7.
- §10 docs → Task 8.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has expected output.

**Type/name consistency:** `seedForm(profile,fact,now)` defined in Task 3, called with `form.questions[0]` in Task 5. `placeAt`/`skipPlacement`/`placement` defined in Task 5, consumed in Tasks 6–7. `createPlacement`/`placementStage`/`recordPlacement`/`placementResult` defined in Task 4, consumed in Task 6 and tested in Task 4. `mountPlacement(app,{home,beep,learning})` defined in Task 6, dispatched in Task 7 with `common` (which includes `home`, `beep`, `learning`). `MASTERY_SESSIONS` defined and used in Task 1. Ladder starts at stage 3 (`floor((1+5)/2)`), consistent across engine and tests.
