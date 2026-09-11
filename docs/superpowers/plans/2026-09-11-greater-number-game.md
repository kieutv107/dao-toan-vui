# Greater Number Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive 60-second “Số nào lớn hơn” game with three comparison stages, adaptive step-down/recovery, progress review evidence, and per-game high scores.

**Architecture:** Keep comparison rules and question generation in a pure `compare-engine.mjs` module. Put DOM, timing, input, persistence, and feedback in `compare.mjs`, with isolated styles in `compare.css`; `app.js` only registers and routes the mode.

**Tech Stack:** Browser ES modules, DOM/CSS, Node.js built-in test runner, localStorage-backed learning and high-score services, OpenAI Sites static hosting.

Spec:** `docs/superpowers/specs/2026-09-11-greater-number-game-design.md`

## Global Constraints

- Each run lasts 60 active seconds; pause freezes the clock and pending feedback.
- Attempts 1–5 show number/number, 6–10 expression/number, and 11+ expression/expression.
- Two consecutive wrong answers lower one stage; three consecutive correct answers recover one stage, never above the stage unlocked by attempt count.
- Wrong answers do not reduce score, but reset the score streak and show the correct choice for one second.
- About 20% of generated rounds are ties; all values stay in 0–20.
- Expression facts come from the adaptive learning service; correct comparisons record `review`, wrong comparisons record no learning evidence.
- Keep all current modes and their behavior unchanged.

---

### Task 1: Pure comparison state and scoring

**Files:**
- Create: `dist/compare-engine.mjs`
- Create: `tests/compare.test.mjs`

**Interfaces:**
- Produces: `createCompareGame(): CompareState`, `unlockedCompareStage(state): 1|2|3`, `compareStage(state): 1|2|3`, `recordCompareAnswer(state, correct): number`, and `elapseCompare(state, seconds): void`.
- `CompareState` contains `attempts`, `correct`, `score`, `streak`, `bestStreak`, `wrongRun`, `recoveryRun`, `stagePenalty`, `remaining`, and `over`.

- [ ] **Step 1: Write failing state tests**

```js
test('comparison stages open on attempts 1, 6 and 11',()=>{
  const g=createCompareGame();
  assert.equal(compareStage(g),1);
  g.attempts=5;assert.equal(compareStage(g),2);
  g.attempts=10;assert.equal(compareStage(g),3);
});

test('two misses lower a stage and three correct answers recover it',()=>{
  const g=createCompareGame();g.attempts=10;
  recordCompareAnswer(g,false);recordCompareAnswer(g,false);
  assert.equal(compareStage(g),2);assert.equal(g.score,0);
  recordCompareAnswer(g,true);recordCompareAnswer(g,true);recordCompareAnswer(g,true);
  assert.equal(compareStage(g),3);
});

test('sixty active seconds ends the run',()=>{
  const g=createCompareGame();elapseCompare(g,59.9);assert.equal(g.over,false);
  elapseCompare(g,.1);assert.equal(g.remaining,0);assert.equal(g.over,true);
});
```

- [ ] **Step 2: Run the state tests and verify RED**

Run: `node --test tests/compare.test.mjs`

Expected: FAIL because `dist/compare-engine.mjs` does not exist.

- [ ] **Step 3: Implement minimal state transitions**

```js
export function createCompareGame(){
  return {attempts:0,correct:0,score:0,streak:0,bestStreak:0,wrongRun:0,recoveryRun:0,stagePenalty:0,remaining:60,over:false};
}
export function unlockedCompareStage(g){return g.attempts<5?1:g.attempts<10?2:3}
export function compareStage(g){return Math.max(1,unlockedCompareStage(g)-g.stagePenalty)}
export function recordCompareAnswer(g,good){
  if(g.over)return 0;g.attempts++;
  if(!good){g.streak=0;g.recoveryRun=0;if(++g.wrongRun===2){if(compareStage(g)>1)g.stagePenalty++;g.wrongRun=0}return 0}
  g.correct++;g.wrongRun=0;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);g.recoveryRun++;
  if(g.stagePenalty&&g.recoveryRun===3){g.stagePenalty--;g.recoveryRun=0}
  const points=10*Math.min(4,1+Math.floor(g.streak/5));g.score+=points;return points;
}
export function elapseCompare(g,seconds){if(!g.over){g.remaining=Math.max(0,g.remaining-seconds);if(!g.remaining)g.over=true}}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/compare.test.mjs`

Expected: all comparison state tests pass.

- [ ] **Step 5: Commit the engine state**

```bash
git add dist/compare-engine.mjs tests/compare.test.mjs
git commit -m "Add greater number game state"
```

### Task 2: Comparison round generation

**Files:**
- Modify: `dist/compare-engine.mjs`
- Modify: `tests/compare.test.mjs`

**Interfaces:**
- Consumes: an injected `fact(options)` supplier returning `{a,b,sign,answer,id}` and `random(): number`.
- Produces: `createCompareRound(state, {fact, random}): {top, bottom, answer}` where each card is `{kind:'number'|'fact', value, label, fact?}` and `answer` is `'top'|'bottom'|'equal'`.

- [ ] **Step 1: Write failing generator tests**

```js
test('generator follows the three display stages',()=>{
  const fact=()=>({a:7,b:6,sign:'+',answer:13,id:'7+6'}),g=createCompareGame();
  assert.deepEqual(createCompareRound(g,{fact,random:()=>.9}).cards.map(x=>x.kind),['number','number']);
  g.attempts=5;assert.deepEqual(createCompareRound(g,{fact,random:()=>.9}).cards.map(x=>x.kind).sort(),['fact','number']);
  g.attempts=10;assert.deepEqual(createCompareRound(g,{fact,random:()=>.9}).cards.map(x=>x.kind),['fact','fact']);
});

test('tie rolls create equal values and every value stays through 20',()=>{
  const facts=[{a:7,b:6,sign:'+',answer:13,id:'7+6'},{a:8,b:5,sign:'+',answer:13,id:'8+5'}];
  const round=createCompareRound(Object.assign(createCompareGame(),{attempts:10}),{fact:()=>facts.shift(),random:()=>.1});
  assert.equal(round.answer,'equal');assert.ok(round.cards.every(x=>x.value>=0&&x.value<=20));
});
```

- [ ] **Step 2: Run generator tests and verify RED**

Run: `node --test tests/compare.test.mjs`

Expected: FAIL because `createCompareRound` is missing.

- [ ] **Step 3: Implement generation with bounded retries**

Implement helpers `numberCard`, `factCard`, `winner`, and `gapFor`. Use `random()<.2` for a tie. For non-ties, retry the second value/fact no more than 30 times to meet the stage-3 gap target; then choose the closest valid candidate already seen. Alternate the fact card position in stage 2 from the random value. Never use an unbounded `while` loop.

```js
const numberCard=value=>({kind:'number',value,label:String(value)});
const factCard=fact=>({kind:'fact',value:fact.answer,label:`${fact.a} ${fact.sign} ${fact.b}`,fact});
const winner=cards=>cards[0].value===cards[1].value?'equal':cards[0].value>cards[1].value?'top':'bottom';
export function compareGap(g){return g.attempts<15?[3,6]:g.attempts<20?[2,4]:[1,2]}
export function createCompareRound(g,{fact,random=Math.random}){
  const stage=compareStage(g),tie=random()<.2;
  // Build the stage-specific card kinds, make equal values for ties, and use
  // at most 30 candidates to meet compareGap(g) for non-ties.
  return {cards,answer:winner(cards)};
}
```

- [ ] **Step 4: Add and pass narrowing-gap tests**

Assert stage-3 gap targets are 3–6 for attempts 10–14, 2–4 for attempts 15–19, and 1–2 from attempt 20 onward. Run `node --test tests/compare.test.mjs` and expect all tests to pass.

```js
for(const [attempts,expected] of [[10,[3,6]],[15,[2,4]],[20,[1,2]]]){
  const g=Object.assign(createCompareGame(),{attempts});
  assert.deepEqual(compareGap(g),expected);
}
```

- [ ] **Step 5: Commit round generation**

```bash
git add dist/compare-engine.mjs tests/compare.test.mjs
git commit -m "Generate progressive comparison rounds"
```

### Task 3: Game controller and learning integration

**Files:**
- Create: `dist/compare.mjs`
- Modify: `tests/compare.test.mjs`

**Interfaces:**
- Consumes: `mountCompare(app,{home,award,beep,learning,scores})`; `learning.nextFact`, `learning.record`, `learning.newSessionId`; `scores.top`, `scores.record`.
- Produces: a cleanup function that clears animation frames, pending feedback, and keyboard/visibility listeners.

- [ ] **Step 1: Add a failing evidence helper test**

```js
test('only correct rounds expose expression facts for review',()=>{
  const fact={a:7,b:6,sign:'+',answer:13,id:'7+6'};
  const round={cards:[{kind:'fact',value:13,fact},{kind:'number',value:12}],answer:'top'};
  assert.deepEqual(reviewFacts(round,true),[fact]);
  assert.deepEqual(reviewFacts(round,false),[]);
});
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `node --test tests/compare.test.mjs`

Expected: FAIL because `reviewFacts` is missing.

- [ ] **Step 3: Implement `reviewFacts` and `mountCompare`**

Export `reviewFacts(round,correct)` from the engine. In the controller, render an intro overlay, start only after the button is pressed, subtract active `requestAnimationFrame` time through `elapseCompare`, and pause automatically when the document becomes hidden. Generate rounds with `learning.nextFact({context:'compare'})`.

```js
export function reviewFacts(round,correct){
  return correct?round.cards.filter(x=>x.kind==='fact').map(x=>x.fact):[];
}

export function mountCompare(app,{home,award,beep,learning,scores}){
  const g=createCompareGame(),sessionId=learning.newSessionId();
  const nextRound=()=>createCompareRound(g,{fact:()=>learning.nextFact({context:'compare'})});
  // Render intro, start requestAnimationFrame only after Start, and return cleanup.
}
```

- [ ] **Step 4: Implement answer flow and finish flow**

On selection, call `recordCompareAnswer`, disable all three choices, apply `right` to the correct choice, and wait 650ms after correct or 1000ms after wrong. For correct rounds, record every result of `reviewFacts` using `{fact,result:'review',context:'compare',sessionId}`. At 60 seconds, cancel pending feedback, save `scores.record('compare',g.score)` once, and render the top-five/new-record result screen.

```js
function choose(choice){
  if(locked||paused||g.over)return;
  const correct=choice===round.answer,points=recordCompareAnswer(g,correct);
  reviewFacts(round,correct).forEach(fact=>learning.record({fact,result:'review',context:'compare',sessionId}));
  locked=true;highlightCorrect(round.answer);
  transition=setTimeout(()=>newRound(),correct?650:1000);
}
function finish(){
  if(scoreSaved)return;g.over=true;clearTimeout(transition);
  const result=scores.record('compare',g.score);scoreSaved=true;renderResults(result);
}
```

- [ ] **Step 5: Add keyboard and cleanup behavior**

Map `ArrowUp` to top, `ArrowDown` to bottom, and `=` or `Enter` to equal. Ignore repeats and modified keys. `Escape` toggles pause. Cleanup must cancel the frame and timeout and remove both listeners.

```js
function key(e){
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
  const choice={ArrowUp:'top',ArrowDown:'bottom','=':'equal',Enter:'equal'}[e.key];
  if(choice){e.preventDefault();choose(choice)}else if(e.key==='Escape'){e.preventDefault();togglePause()}
}
return ()=>{disposed=true;cancelAnimationFrame(frame);clearTimeout(transition);document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)};
```

- [ ] **Step 6: Run engine tests and syntax checks**

Run: `node --test tests/compare.test.mjs && node --check dist/compare.mjs`

Expected: PASS with no warnings.

- [ ] **Step 7: Commit controller integration**

```bash
git add dist/compare.mjs dist/compare-engine.mjs tests/compare.test.mjs
git commit -m "Build greater number game controller"
```

### Task 4: Responsive UI and menu registration

**Files:**
- Create: `dist/compare.css`
- Modify: `dist/index.html`
- Modify: `dist/app.js`
- Modify: `tests/home-ui.test.mjs`

**Interfaces:**
- Consumes: `mountCompare` from `compare.mjs`.
- Produces: a `compare` mode card and route, plus `.compare-game`, `.compare-card`, `.compare-equal`, `.compare-feedback`, and responsive rules.

- [ ] **Step 1: Write failing static integration tests**

```js
test('greater-number game is registered and styled',async()=>{
  const [app,index]=await Promise.all([
    readFile(new URL('../dist/app.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/index.html',import.meta.url),'utf8')
  ]);
  assert.match(app,/id:'compare'/);assert.match(app,/mountCompare/);
  assert.match(index,/compare\.css/);assert.match(index,/6 trò chơi/);
});
```

- [ ] **Step 2: Run static integration tests and verify RED**

Run: `node --test tests/home-ui.test.mjs`

Expected: FAIL because the mode and stylesheet are absent.

- [ ] **Step 3: Add menu registration and routing**

Import `mountCompare`, add a card named “Số nào lớn hơn?” with a distinct icon/color, and route `id==='compare'` to `mountCompare`. Update the metadata description from five to six games and load `compare.css` after `challenge.css`.

```js
import {mountCompare} from './compare.mjs';
const compareMode={id:'compare',icon:'⚖️',title:'Số nào lớn hơn?',desc:'So sánh thật nhanh trong 60 giây!',tag:'SO SÁNH · TÍNH NHẨM',color:'purple',label:'So tài'};
// In start(id): id==='compare' ? mountCompare(app,common) : existing routes.
```

- [ ] **Step 4: Add responsive styles**

Use two vertically stacked buttons with at least 96px height on desktop and 78px on narrow mobile. Keep the equal button separate and at least 48px high. Style `.right` in green, `.wrong` in muted rose, and `.new-record` as a static yellow highlight. Avoid continuous movement.

```css
.compare-stack{display:grid;gap:14px;max-width:560px;margin:20px auto}
.compare-card{min-height:96px;border:2px solid var(--border);border-radius:20px;background:#fff;font-size:36px;font-weight:1000}
.compare-equal{min-height:48px}.compare-card.right,.compare-equal.right{background:#d9efd8}.compare-card.wrong,.compare-equal.wrong{background:#f7dce4}
@media(max-width:520px){.compare-card{min-height:78px;font-size:28px}}
```

- [ ] **Step 5: Run static tests and all syntax checks**

Run: `node --test tests/home-ui.test.mjs && for file in dist/*.mjs dist/app.js; do node --check "$file" || exit 1; done`

Expected: PASS.

- [ ] **Step 6: Commit UI registration**

```bash
git add dist/compare.css dist/index.html dist/app.js tests/home-ui.test.mjs
git commit -m "Add greater number game to the island"
```

### Task 5: Full verification and private deployment

**Files:**
- Modify only files required by failures found during verification.

**Interfaces:**
- Consumes: the complete game and existing Sites project configuration.
- Produces: a verified, owner-private production deployment.

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run source checks**

Run: `for file in dist/*.mjs dist/app.js; do node --check "$file" || exit 1; done && git diff --check`

Expected: exit code 0 and no output.

- [ ] **Step 3: Perform desktop browser QA**

Run a local static server. Verify intro, all three choices, correct and wrong feedback, two-wrong step-down, three-correct recovery, pause, keyboard controls, 60-second finish, score list, and no console warnings/errors.

- [ ] **Step 4: Perform mobile browser QA**

Use a 390×844 viewport. Verify both comparison cards and the equal button fit, remain readable, and respond to touch without horizontal scrolling. Reset the viewport afterward.

- [ ] **Step 5: Commit any QA fixes, then verify again**

If QA requires a fix, add a failing regression test first, make the smallest correction, rerun the full suite and syntax checks, and commit only after they pass.

- [ ] **Step 6: Push and deploy the exact verified commit**

Push the current full SHA to the configured Sites source branch, package `dist` with `.openai/hosting.json`, save a new Site version with that exact SHA, privately deploy the saved version, and poll until deployment status is `succeeded`.

- [ ] **Step 7: Verify production and report**

Open `https://dao-toan-vui.kieutv107.chatgpt.site`, confirm the private sign-in boundary or loaded game, and report the live URL, test count, and material behavior delivered.
