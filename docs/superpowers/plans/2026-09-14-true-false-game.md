# True or False Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 90-second “Đúng hay sai?” game where the child marks an equation true or false, with clock-driven stages, adaptive step-down/recovery, review evidence and per-game high scores.

**Architecture:** Rules and question generation live in a pure `dist/truefalse-engine.mjs`. DOM, clock, input, feedback, learning evidence and high scores live in `dist/truefalse.mjs`, styled by `dist/truefalse.css`, both modelled line-for-line on `compare.mjs`/`compare.css`. `app.js` registers and routes the mode; `sw.js` precaches the new files. The home tip card becomes a full-width band because six games no longer leave it a cell.

**Tech Stack:** Browser ES modules, hand-written minified-style CSS, Node.js built-in test runner (`node:test`, `node:assert/strict`), localStorage-backed learning and high-score services. No bundler, no dependencies; `dist/` is both source and deploy output.

**Spec:** `docs/superpowers/specs/2026-09-14-true-false-game-design.md`

## Global Constraints

- A run lasts 90 active seconds; pause freezes the clock and any pending transition.
- Stages open by elapsed time `90 − remaining`: `< 30` → 1, `< 60` → 2, otherwise 3.
- 50% of rounds are true. False gaps: stage 1 → 3–5, stage 2 → 1–2, stage 3 one-sided → exactly 1, stage 3 two-sided → 1–2. Stage 3 is 50% one-sided `a ± b = c`, 50% two-sided `a ± b = c ± d`.
- Every operand and value shown stays within 0–20. The right side of a two-sided round never has the same fact id as the left side.
- Two consecutive misses lower one stage (not below 1); after a lowering, three consecutive correct answers recover one; never above the stage the clock has opened.
- Correct: `10 × min(4, 1 + floor(streak / 5))` points. Wrong: streak resets; no score or time penalty.
- Correct feedback: chosen card green, `showCenterCheck`, next round after `NEXT_DELAY_MS` (450 ms), no result shown.
- Wrong feedback: ✗ on the chosen card, the other card green, a small result badge centred above each expression, no visible sentence, next round after 1000 ms.
- Only the left fact is recorded, as `review` with context `truefalse`, and only on correct answers.
- High scores are stored under game id `truefalse`.
- Keys: `ArrowLeft` = Đúng, `ArrowRight` = Sai, `Escape` = pause. Hidden tab auto-pauses.
- Menu and intro never mention the duration. HUD has no stage cell.
- Existing games keep their behaviour.
- Commit messages carry no `Co-Authored-By` or `Claude-Session` lines. Stage only the files listed in the task; the working tree may hold unrelated uncommitted changes (for example the compare 90-second change).
- Run all tests with `node --test tests/*.test.mjs` from the repo root.

---

### Task 1: Engine state, stages and scoring

**Files:**
- Create: `dist/truefalse-engine.mjs`
- Test: `tests/truefalse.test.mjs`

**Interfaces:**
- Produces: `createTrueFalseGame(): State`, `unlockedTrueFalseStage(state): 1|2|3`, `trueFalseStage(state): 1|2|3`, `recordTrueFalseAnswer(state, good: boolean): number` (points earned), `elapseTrueFalse(state, seconds: number): void`.
- `State` = `{attempts, correct, score, streak, bestStreak, wrongRun, recoveryRun, stagePenalty, remaining, over}`; `remaining` starts at 90.

- [ ] **Step 1: Write the failing tests**

Create `tests/truefalse.test.mjs`:

```js
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrueFalseGame,unlockedTrueFalseStage,trueFalseStage,recordTrueFalseAnswer,elapseTrueFalse} from '../dist/truefalse-engine.mjs';

const at=remaining=>Object.assign(createTrueFalseGame(),{remaining});

test('stages open after 0, 30 and 60 active seconds',()=>{
  for(const [remaining,stage] of [[90,1],[60.5,1],[60,2],[30.5,2],[30,3],[.5,3]]){
    const g=at(remaining);assert.equal(unlockedTrueFalseStage(g),stage,`remaining ${remaining}`);assert.equal(trueFalseStage(g),stage);
  }
});

test('two misses lower a stage and three correct answers recover it',()=>{
  const g=at(30);
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),2);assert.equal(g.score,0);assert.equal(g.streak,0);
  recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);
  assert.equal(trueFalseStage(g),3);
});

test('a lowered stage rises with the clock but stays one below it until recovery',()=>{
  const g=at(31);
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),1);
  elapseTrueFalse(g,1);
  assert.equal(unlockedTrueFalseStage(g),3);assert.equal(trueFalseStage(g),2);
  recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);
  assert.equal(trueFalseStage(g),3);
});

test('difficulty never drops below stage 1 or rises above the clock',()=>{
  const g=createTrueFalseGame();
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),1);assert.equal(g.stagePenalty,0);
  g.remaining=60;
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),1);assert.equal(g.stagePenalty,1);
  for(let i=0;i<6;i++)recordTrueFalseAnswer(g,true);
  assert.equal(trueFalseStage(g),2);assert.equal(g.stagePenalty,0);
});

test('wrong answers keep score while correct streaks award up to forty points',()=>{
  const g=createTrueFalseGame();assert.equal(recordTrueFalseAnswer(g,false),0);assert.equal(g.score,0);
  assert.equal(recordTrueFalseAnswer(g,true),10);
  for(let i=0;i<19;i++)recordTrueFalseAnswer(g,true);
  assert.equal(g.bestStreak,20);assert.equal(recordTrueFalseAnswer(g,true),40);
});

test('ninety active seconds end the run and later answers do nothing',()=>{
  const g=createTrueFalseGame();assert.equal(g.remaining,90);
  elapseTrueFalse(g,89.9);assert.equal(g.over,false);
  elapseTrueFalse(g,.1);assert.equal(g.remaining,0);assert.equal(g.over,true);
  assert.equal(recordTrueFalseAnswer(g,true),0);assert.equal(g.attempts,0);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/truefalse.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `dist/truefalse-engine.mjs`.

- [ ] **Step 3: Write the engine state**

Create `dist/truefalse-engine.mjs`:

```js
const DURATION=90;

export function createTrueFalseGame(){
  return {attempts:0,correct:0,score:0,streak:0,bestStreak:0,wrongRun:0,recoveryRun:0,stagePenalty:0,remaining:DURATION,over:false};
}

export function unlockedTrueFalseStage(g){const elapsed=DURATION-g.remaining;return elapsed<30?1:elapsed<60?2:3}

export function trueFalseStage(g){return Math.max(1,unlockedTrueFalseStage(g)-g.stagePenalty)}

export function recordTrueFalseAnswer(g,good){
  if(g.over)return 0;
  const stageBefore=trueFalseStage(g);
  g.attempts++;
  if(!good){
    g.streak=0;g.recoveryRun=0;g.wrongRun++;
    if(g.wrongRun===2){
      if(stageBefore>1)g.stagePenalty=unlockedTrueFalseStage(g)-(stageBefore-1);
      g.wrongRun=0;
    }
    return 0;
  }
  g.correct++;g.wrongRun=0;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);g.recoveryRun++;
  if(g.stagePenalty&&g.recoveryRun===3){g.stagePenalty--;g.recoveryRun=0}
  const points=10*Math.min(4,1+Math.floor(g.streak/5));g.score+=points;return points;
}

export function elapseTrueFalse(g,seconds){
  if(g.over)return;g.remaining=Math.max(0,g.remaining-seconds);if(g.remaining<.000001){g.remaining=0;g.over=true}
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test tests/truefalse.test.mjs`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add dist/truefalse-engine.mjs tests/truefalse.test.mjs
git commit -m "Add true or false game state"
```

---

### Task 2: Round generation and review facts

**Files:**
- Modify: `dist/truefalse-engine.mjs` (append)
- Test: `tests/truefalse.test.mjs` (extend import, append tests)

**Interfaces:**
- Consumes: `createTrueFalseGame`, `trueFalseStage` from Task 1.
- Produces: `createTrueFalseRound(state, {fact?: () => Fact|undefined, random?: () => number}): Round` and `reviewFacts(round, correct: boolean): Fact[]`.
- `Fact` = `{a, b, sign: '+'|'−', answer, id}` (the minus sign is U+2212, as in `mastery-engine.mjs`; `id` is `` `${a}${sign}${b}` ``).
- `Round` = `{stage, truth: boolean, left: Part, right: Part}`.
- `Part` = `{kind: 'fact', value, label, fact}` or `{kind: 'number', value, label}`; `label` is `"7 + 5"` for facts and `"13"` for numbers. `left` is always a fact. `truth === (left.value === right.value)`.

- [ ] **Step 1: Write the failing tests**

In `tests/truefalse.test.mjs` replace the import line with:

```js
import {createTrueFalseGame,unlockedTrueFalseStage,trueFalseStage,recordTrueFalseAnswer,elapseTrueFalse,createTrueFalseRound,reviewFacts} from '../dist/truefalse-engine.mjs';
```

Append:

```js
const FACTS=[{a:7,b:6,sign:'+',answer:13,id:'7+6'},{a:9,b:9,sign:'+',answer:18,id:'9+9'},{a:2,b:1,sign:'+',answer:3,id:'2+1'},{a:12,b:10,sign:'−',answer:2,id:'12−10'},{a:20,b:0,sign:'−',answer:20,id:'20−0'},{a:0,b:0,sign:'+',answer:0,id:'0+0'}];
const rotating=()=>{let i=0;return ()=>FACTS[i++%FACTS.length]};
// mulberry32: a fixed, well-mixed sequence so the statistical checks below are deterministic
const seeded=seed=>()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const roundsAt=(remaining,count=400)=>{const g=at(remaining),fact=rotating(),random=seeded(Math.round(remaining)+1);return Array.from({length:count},()=>createTrueFalseRound(g,{fact,random}))};
const gaps=rounds=>rounds.filter(r=>!r.truth).map(r=>Math.abs(r.left.value-r.right.value));
const distinct=list=>[...new Set(list)].sort((x,y)=>x-y);

test('rounds are consistent and every number stays within 0 to 20',()=>{
  for(const remaining of [90,60,30]){
    for(const round of roundsAt(remaining)){
      assert.equal(round.left.kind,'fact');
      assert.equal(round.truth,round.left.value===round.right.value);
      for(const part of [round.left,round.right]){
        const numbers=part.kind==='fact'?[part.fact.a,part.fact.b,part.value]:[part.value];
        assert.ok(numbers.every(n=>Number.isInteger(n)&&n>=0&&n<=20),JSON.stringify(round));
        if(part.kind==='fact'){
          assert.equal(part.value,part.fact.sign==='+'?part.fact.a+part.fact.b:part.fact.a-part.fact.b);
          assert.equal(part.label,`${part.fact.a} ${part.fact.sign} ${part.fact.b}`);
        }else assert.equal(part.label,String(part.value));
      }
    }
  }
});

test('false rounds miss the real value by the gap of their stage',()=>{
  assert.deepEqual(distinct(gaps(roundsAt(90))),[3,4,5]);
  assert.deepEqual(distinct(gaps(roundsAt(60))),[1,2]);
  const late=roundsAt(30);
  assert.deepEqual(distinct(gaps(late.filter(r=>r.right.kind==='number'))),[1]);
  assert.deepEqual(distinct(gaps(late.filter(r=>r.right.kind==='fact'))),[1,2]);
});

test('about half the rounds are true and only stage three has two sides',()=>{
  for(const remaining of [90,60,30]){
    const rounds=roundsAt(remaining),trueShare=rounds.filter(r=>r.truth).length/rounds.length,twoSided=rounds.filter(r=>r.right.kind==='fact');
    assert.ok(trueShare>.4&&trueShare<.6,`remaining ${remaining}: true share ${trueShare}`);
    if(remaining>30){assert.equal(twoSided.length,0);continue}
    const share=twoSided.length/rounds.length;
    assert.ok(share>.4&&share<.6,`two-sided share ${share}`);
    assert.ok(twoSided.some(r=>r.truth)&&twoSided.some(r=>!r.truth));
  }
});

test('the right side of a two-sided round is a different fact',()=>{
  const twoSided=roundsAt(30).filter(r=>r.right.kind==='fact');
  assert.ok(twoSided.length>0);
  for(const round of twoSided)assert.notEqual(round.right.fact.id,round.left.fact.id);
});

test('rounds still come out when the supplier has no usable fact',()=>{
  const g=createTrueFalseGame();
  for(const fact of [()=>undefined,()=>null,()=>({a:15,b:9,sign:'+',answer:24,id:'15+9'})]){
    const round=createTrueFalseRound(g,{fact,random:seeded(7)});
    assert.equal(round.left.kind,'fact');assert.notEqual(round.left.fact.id,'15+9');
    assert.ok(round.left.value>=0&&round.left.value<=20);
  }
  assert.equal(createTrueFalseRound(g,{random:seeded(7)}).left.kind,'fact');
});

test('only correct rounds expose the left fact for review',()=>{
  const right={kind:'fact',value:13,label:'8 + 5',fact:{a:8,b:5,sign:'+',answer:13,id:'8+5'}};
  const round={stage:3,truth:true,left:{kind:'fact',value:13,label:'7 + 6',fact:FACTS[0]},right};
  assert.deepEqual(reviewFacts(round,true),[FACTS[0]]);
  assert.deepEqual(reviewFacts(round,false),[]);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test tests/truefalse.test.mjs`
Expected: FAIL with a `SyntaxError` that `truefalse-engine.mjs` does not provide an export named `createTrueFalseRound`.

- [ ] **Step 3: Write the generator**

Append to `dist/truefalse-engine.mjs`:

```js
const MAX=20,FALSE_GAPS={1:[3,5],2:[1,2],3:[1,1]};
const randomInt=(low,high,random)=>low+Math.floor(random()*(high-low+1));
const pick=(list,random)=>list[Math.floor(random()*list.length)];
const inRange=n=>Number.isInteger(n)&&n>=0&&n<=MAX;
const valueOf=({a,b,sign})=>sign==='+'?a+b:a-b;
const usable=f=>!!f&&(f.sign==='+'||f.sign==='−')&&inRange(f.a)&&inRange(f.b)&&inRange(valueOf(f))&&f.answer===valueOf(f);
const expression=fact=>({kind:'fact',value:fact.answer,label:`${fact.a} ${fact.sign} ${fact.b}`,fact});
const number=value=>({kind:'number',value,label:String(value)});

function factsForValue(value){
  const out=[];
  for(let a=0;a<=value;a++)out.push({a,b:value-a,sign:'+',answer:value,id:`${a}+${value-a}`});
  for(let b=1;value+b<=MAX;b++)out.push({a:value+b,b,sign:'−',answer:value,id:`${value+b}−${b}`});
  return out;
}

// Moves away by a gap in [low, high]; flips direction when the preferred one would leave 0–20.
function shifted(value,[low,high],random){
  const gap=randomInt(low,high,random),up=random()<.5;
  if(up&&value+gap<=MAX)return value+gap;
  return value-gap>=0?value-gap:value+gap;
}

export function createTrueFalseRound(g,{fact,random=Math.random}={}){
  const stage=trueFalseStage(g),truth=random()<.5,twoSided=stage===3&&random()<.5,supplied=fact?.();
  const left=expression(usable(supplied)?supplied:pick(factsForValue(randomInt(0,MAX,random)),random));
  const target=truth?left.value:shifted(left.value,twoSided?[1,2]:FALSE_GAPS[stage],random);
  const right=twoSided?expression(pick(factsForValue(target).filter(f=>f.id!==left.fact.id),random)):number(target);
  return {stage,truth,left,right};
}

export function reviewFacts(round,correct){return correct?[round.left.fact]:[]}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test tests/truefalse.test.mjs`
Expected: PASS, 12 tests. If a share check fails by a hair, the generator is drawing `random()` in a different order than above — match the order rather than changing the seed.

- [ ] **Step 5: Commit**

```bash
git add dist/truefalse-engine.mjs tests/truefalse.test.mjs
git commit -m "Generate true or false rounds by stage"
```

---

### Task 3: Controller, styles, registration and docs

**Files:**
- Create: `dist/truefalse.mjs`
- Create: `dist/truefalse.css`
- Modify: `dist/app.js:1-8` (imports), `dist/app.js:14-22` (modes), `dist/app.js:44` (router)
- Modify: `dist/index.html` (stylesheet link, game count)
- Modify: `dist/sw.js:4` (`ASSETS`)
- Modify: `tests/home-ui.test.mjs:20,100,111,124,141` and append tests
- Modify: `docs/FEATURES.md`, `docs/ENGINE.md`, `docs/README.md`, `docs/DESIGN_SYSTEM.md`

**Interfaces:**
- Consumes: `createTrueFalseGame`, `createTrueFalseRound`, `recordTrueFalseAnswer`, `elapseTrueFalse`, `reviewFacts` (Tasks 1–2); `showCenterCheck`, `showMiss`, `announce`, `NEXT_DELAY_MS`, `celebrateRecord` from `dist/feedback.mjs`; `learning.nextFact`, `learning.record`, `learning.newSessionId`; `scores.top`, `scores.record`.
- Produces: `mountTrueFalse(app, {home, award, beep, learning, scores}): () => void` (cleanup).

- [ ] **Step 1: Write the failing UI guards**

In `tests/home-ui.test.mjs`:

Line 20, add the new zone:

```js
  assert.deepEqual(zones,{practice:'practice',sheet:'practice',rain:'game',bubble:'game',memory:'game',mystery:'game',compare:'game',truefalse:'game'});
```

Line 100, add the stylesheet to the HUD guard:

```js
  const [challenge,rain,...css]=await Promise.all(['challenge.mjs','rain.mjs','challenge.css','rain.css','compare.css','truefalse.css'].map(read));
```

Line 111, add the game to the record-celebration loop:

```js
  for(const [file,fn] of [['challenge.mjs','finish'],['compare.mjs','finish'],['truefalse.mjs','finish'],['rain.mjs','end']]){
```

Line 124, add it to the top-five loop:

```js
  for(const [file,fn,index] of [['challenge.mjs','finish','i'],['compare.mjs','finish','index'],['truefalse.mjs','finish','index'],['rain.mjs','end','i']]){
```

Line 141, the page now advertises eight games:

```js
  assert.match(index,/compare\.css/);assert.match(index,/8 trò chơi/);
```

Append after the test `greater-number timer counts the full active frame interval`:

```js
test('true-or-false game is registered and styled',async()=>{
  const [app,index]=await Promise.all(['app.js','index.html'].map(read));
  assert.match(app,/\{id:'truefalse',zone:'game',icon:'✅',title:'Đúng hay sai\?'[^}]*color:'yellow'/);
  assert.match(app,/import \{mountTrueFalse\} from '\.\/truefalse\.mjs';/);
  assert.match(app,/id==='truefalse'\?mountTrueFalse\(app,common\)/);
  assert.match(index,/<link rel="stylesheet" href="truefalse\.css\?v=2">/);
});

test('true-or-false intro and HUD leave out duration and stage',async()=>{
  const [app,game]=await Promise.all(['app.js','truefalse.mjs'].map(read));
  assert.match(game,/>Bắt đầu →<\/button>/);
  assert.doesNotMatch(game,/90 giây|Bắt đầu 90/);
  assert.doesNotMatch(app,/thật nhanh trong/);
  const hud=game.match(/function hud\(\)\{([\s\S]*?)\n  \}/)?.[1]||'';
  assert.match(hud,/<span>Kỷ lục<\/span><b>\$\{bestAtStart\}<\/b>/);
  assert.doesNotMatch(hud,/Chặng|Độ khó|BẬC|new-record|Kỷ lục mới/);
});

test('true-or-false shows the real result only on a miss and holds for one second',async()=>{
  const game=await read('truefalse.mjs');
  assert.match(game,/const MISS_DELAY_MS=1000;/);
  assert.match(game,/<span class="tf-result" hidden>\$\{part\.value\}<\/span>/);
  const choose=game.match(/function choose\(saidTrue\)\{([\s\S]*?)\n  \}/)?.[1]||'';
  const [hit,miss='']=choose.split('}else{');
  assert.doesNotMatch(hit,/tf-result/);
  assert.match(hit,/delayLeft=NEXT_DELAY_MS\/1000/);
  assert.match(miss,/\.tf-result'\)\.forEach\(result=>result\.hidden=false\)/);
  assert.match(miss,/delayLeft=MISS_DELAY_MS\/1000/);
  assert.doesNotMatch(game,/Mình thử câu tiếp|Mình giảm một bậc/);
});

test('true-or-false counts the full frame interval and maps ArrowLeft to true',async()=>{
  const game=await read('truefalse.mjs');
  assert.match(game,/const dt=last\?\(now-last\)\/1000:0/);
  assert.match(game,/choose\(event\.key==='ArrowLeft'\)/);
});
```

- [ ] **Step 2: Run the guards to see them fail**

Run: `node --test tests/home-ui.test.mjs`
Expected: FAIL — `ENOENT` for `truefalse.mjs`/`truefalse.css`, the zones `deepEqual`, and the `8 trò chơi` match.

- [ ] **Step 3: Write the controller**

Create `dist/truefalse.mjs`:

```js
import {createTrueFalseGame,createTrueFalseRound,recordTrueFalseAnswer,elapseTrueFalse,reviewFacts} from './truefalse-engine.mjs';
import {showCenterCheck,showMiss,announce,NEXT_DELAY_MS,celebrateRecord} from './feedback.mjs';

const MISS_DELAY_MS=1000;
// An expression carries its real result, hidden until a miss; a plain number has none.
const side=part=>part.kind==='fact'?`<span class="tf-part tf-expression"><span class="tf-result" hidden>${part.value}</span>${part.label}</span>`:`<span class="tf-part">${part.label}</span>`;

export function mountTrueFalse(app,{home,award,beep,learning,scores}){
  const g=createTrueFalseGame(),$=selector=>app.querySelector(selector);
  let playing=false,paused=false,disposed=false,locked=false,scoreSaved=false,round=null,frame=0,last=0,delayAction=null,delayLeft=0,bestAtStart=scores.top('truefalse')[0]||0,sessionId=learning.newSessionId();
  app.innerHTML=`<div class="play-top"><button class="back" id="tf-back">← Đảo trò chơi</button><span>✅ Đúng hay sai?</span><button class="back" id="tf-pause" disabled>Tạm dừng</button></div>
    <section class="play yellow tf-game" aria-label="Đúng hay sai">
      <div class="tf-hud" id="tf-hud"></div>
      <div id="tf-body"></div>
      <div class="challenge-overlay tf-overlay" id="tf-overlay"><span class="tf-symbol">✅</span><h1>Đúng hay sai?</h1><p>Nhìn phép tính rồi chọn <strong>Đúng</strong> hoặc <strong>Sai</strong>.</p><button class="primary" id="tf-begin">Bắt đầu →</button><small>← Đúng · → Sai · Esc để tạm dừng</small></div>
    </section>`;
  const overlay=$('#tf-overlay'),pauseButton=$('#tf-pause');

  function hud(){
    $('#tf-hud').innerHTML=`<div><span>Điểm</span><b>${g.score}</b></div><div><span>Kỷ lục</span><b>${bestAtStart}</b></div><div><span>Thời gian</span><b>${Math.ceil(g.remaining)}s</b></div><div><span>Chuỗi đúng</span><b>${g.streak}</b></div>`;
  }

  function newRound(){
    if(disposed||g.over)return;locked=false;delayAction=null;round=createTrueFalseRound(g,{fact:()=>learning.nextFact({context:'truefalse'})});
    $('#tf-body').innerHTML=`<div class="play-label">LƯỢT ${g.attempts+1}</div><h2>Phép tính này đúng hay sai?</h2><div class="tf-card${round.right.kind==='fact'?' two-sided':''}">${side(round.left)}<span class="tf-equals">=</span>${side(round.right)}</div><div class="tf-choices"><button class="tf-choice" data-tf-choice="true"><b aria-hidden="true">✓</b> Đúng</button><button class="tf-choice" data-tf-choice="false"><b aria-hidden="true">✗</b> Sai</button></div><div class="sr-only" id="tf-feedback" role="status" aria-live="polite"></div>`;
    app.querySelectorAll('[data-tf-choice]').forEach(button=>button.onclick=()=>choose(button.dataset.tfChoice==='true'));hud();
  }

  function choose(saidTrue){
    if(!playing||paused||locked||disposed||g.over)return;
    const correct=saidTrue===round.truth,points=recordTrueFalseAnswer(g,correct),region=$('#tf-feedback');
    locked=true;hud();
    app.querySelectorAll('[data-tf-choice]').forEach(button=>{
      const value=button.dataset.tfChoice==='true';button.disabled=true;
      if(value===round.truth)button.classList.add('right');else if(value===saidTrue){button.classList.add('wrong');showMiss(button)}
    });
    if(correct){
      reviewFacts(round,true).forEach(fact=>learning.record({fact,result:'review',context:'truefalse',sessionId}));award();beep();showCenterCheck($('.tf-game'));
      announce(region,`Chính xác, +${points} điểm`);delayLeft=NEXT_DELAY_MS/1000;
    }else{
      beep(false);app.querySelectorAll('.tf-result').forEach(result=>result.hidden=false);
      announce(region,`Chưa đúng. ${[round.left,round.right].filter(part=>part.kind==='fact').map(part=>`${part.label} = ${part.value}`).join(', ')}`);delayLeft=MISS_DELAY_MS/1000;
    }
    delayAction=newRound;
  }

  function finish(){
    if(disposed||scoreSaved)return;playing=false;locked=true;delayAction=null;pauseButton.disabled=true;
    const result=scores.record('truefalse',g.score);scoreSaved=true;bestAtStart=result.scores[0]||0;overlay.hidden=false;
    overlay.innerHTML=`<span class="tf-symbol${result.newRecord?' record-trophy':''}">${result.newRecord?'🏆':'🌟'}</span><h2${result.newRecord?' class="record-title"':''}>${result.newRecord?'Kỷ lục mới!':'Hết giờ!'}</h2><p>${result.newRecord?`Bé vừa vượt kỷ lục ${result.previousBest} điểm!<br>`:''}<strong>${g.score} điểm</strong> · ${g.correct} lượt đúng<br>Chuỗi tốt nhất: ${g.bestStreak}</p><div class="score-board"><h3>5 điểm cao nhất</h3>${result.scores.map((score,index)=>index===result.rank?`<span class="current-run"><b>${index+1}</b><small>Lượt chơi hiện tại</small>${score} điểm</span>`:`<span><b>${index+1}</b> ${score} điểm</span>`).join('')}</div><div class="finish-actions"><button class="primary" id="tf-again">↻ Chơi lại</button><button class="back" id="tf-home">Chọn trò khác</button></div>`;
    $('#tf-again').onclick=restart;$('#tf-home').onclick=home;$('#tf-again').focus();hud();if(result.newRecord)celebrateRecord(app);
  }

  function tick(now){
    if(disposed||!playing)return;const dt=last?(now-last)/1000:0;last=now;
    if(!paused){
      elapseTrueFalse(g,dt);if(g.over){finish();return}
      if(delayAction){delayLeft-=dt;if(delayLeft<=0){const action=delayAction;delayAction=null;action()}}
      hud();
    }
    frame=requestAnimationFrame(tick);
  }

  function begin(){playing=true;paused=false;last=0;overlay.hidden=true;pauseButton.disabled=false;pauseButton.textContent='Tạm dừng';newRound();frame=requestAnimationFrame(tick)}
  function restart(){Object.assign(g,createTrueFalseGame());scoreSaved=false;bestAtStart=scores.top('truefalse')[0]||0;sessionId=learning.newSessionId();begin()}
  function togglePause(){
    if(!playing||g.over)return;paused=!paused;last=performance.now();overlay.hidden=!paused;pauseButton.textContent=paused?'Tiếp tục':'Tạm dừng';
    if(paused){overlay.innerHTML='<span class="tf-symbol">⏸️</span><h2>Mình nghỉ một chút nhé</h2><p>Đồng hồ đã dừng.</p><button class="primary" id="tf-resume">Tiếp tục →</button>';$('#tf-resume').onclick=togglePause;$('#tf-resume').focus()}else pauseButton.focus();
  }
  function key(event){
    if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;if(event.key==='Escape'){event.preventDefault();togglePause();return}
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();choose(event.key==='ArrowLeft')}
  }
  function visibility(){if(document.hidden&&playing&&!paused)togglePause()}
  function cleanup(){disposed=true;cancelAnimationFrame(frame);delayAction=null;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)}

  $('#tf-back').onclick=home;$('#tf-begin').onclick=begin;pauseButton.onclick=togglePause;document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);hud();return cleanup;
}
```

Every line inside `choose` and `finish` must be indented at least four spaces except the closing `  }` — the source guards cut the function body at the first line that starts with exactly two spaces and `}`.

- [ ] **Step 4: Write the styles**

Create `dist/truefalse.css` (two lines, same style as `compare.css`). The result badge centres with `left:0;right:0;margin:auto;width:max-content` instead of a `transform`, because `fb-pop` animates `transform`:

```css
.tf-game{min-height:620px;position:relative}.tf-hud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}.tf-hud>div{background:#fffd;padding:8px;border-radius:12px}.tf-hud span{display:block;font-size:13px;color:#625b72;font-weight:800}.tf-hud b{font-size:24px;color:var(--accent);font-variant-numeric:tabular-nums}.tf-card{max-width:640px;margin:22px auto;padding:54px 20px 30px;background:#fff;border:2px solid var(--border);border-bottom-width:5px;border-radius:22px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;column-gap:16px;row-gap:46px;font-size:58px;font-weight:1000;line-height:1.1;color:#3d3552;font-variant-numeric:tabular-nums}.tf-card.two-sided{font-size:44px}.tf-part{white-space:nowrap}.tf-expression{position:relative}.tf-equals{color:#998aaf}.tf-result{position:absolute;left:0;right:0;bottom:100%;width:max-content;margin:0 auto 8px;background:#fff0bd;color:#5f4500;border:2px solid #f0c94c;border-radius:999px;padding:0 12px;font-size:22px;line-height:1.5;animation:fb-pop .18s ease-out both}.tf-result[hidden]{display:none}.tf-choices{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:560px;margin:0 auto}.tf-choice{position:relative;min-height:96px;border:2px solid var(--border);border-bottom-width:5px;border-radius:20px;background:#fff;color:var(--accent);font-size:26px;font-weight:1000;display:flex;align-items:center;justify-content:center;gap:10px}.tf-choice b{font-size:36px}.tf-choice:disabled{cursor:default}.tf-choice.right{background:#d9efd8;border-color:#82bd85;color:#34713d}.tf-choice.wrong{background:#f7dce4;border-color:#d89aaa;color:#9a405a}.tf-overlay{gap:10px}.tf-overlay[hidden]{display:none}.tf-symbol{font-size:62px}.tf-overlay small{color:#77758d;font-weight:800}.tf-overlay .score-board{width:min(100%,360px)}
@media(max-width:650px){.tf-game{min-height:560px;padding:22px 14px}.tf-hud{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.tf-hud>div{padding:7px 3px}.tf-hud span{font-size:10px}.tf-hud b{font-size:19px}.tf-card{font-size:42px;padding:44px 10px 22px;column-gap:8px;row-gap:40px;border-radius:16px}.tf-card.two-sided{font-size:30px}.tf-result{font-size:18px;padding:0 9px}.tf-choices{gap:10px}.tf-choice{min-height:80px;font-size:22px;border-radius:16px}.tf-choice b{font-size:30px}.tf-symbol{font-size:46px}}
```

- [ ] **Step 5: Register, route and precache**

`dist/app.js` — after `import {mountCompare} from './compare.mjs';` add:

```js
import {mountTrueFalse} from './truefalse.mjs';
```

After the `compare` mode entry (and add the missing comma after it):

```js
  {id:'compare',zone:'game',icon:'⚖️',title:'Số nào lớn hơn?',desc:'So sánh hai thẻ và tính thật nhanh!',tag:'SO SÁNH · TÍNH NHẨM',color:'purple',label:'So tài'},
  {id:'truefalse',zone:'game',icon:'✅',title:'Đúng hay sai?',desc:'Nhìn phép tính, chọn Đúng hoặc Sai thật nhanh!',tag:'KIỂM TRA · TÍNH NHẨM',color:'yellow',label:'Thử tài'}
```

In `start`, replace `id==='compare'?mountCompare(app,common):` with:

```js
id==='compare'?mountCompare(app,common):id==='truefalse'?mountTrueFalse(app,common):
```

`dist/index.html` — after `<link rel="stylesheet" href="compare.css?v=2">` add `<link rel="stylesheet" href="truefalse.css?v=2">`, and change `7 trò chơi` to `8 trò chơi` in the description meta.

`dist/sw.js` — in `ASSETS` add `'truefalse.css'` after `'sheet.css'`, and `'truefalse-engine.mjs','truefalse.mjs'` after `'strategies.mjs'`.

- [ ] **Step 6: Run the whole suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 0 failures (the offline test `the service worker precaches every file the app ships` proves `ASSETS` matches `dist/`).

- [ ] **Step 7: Update the docs**

`docs/FEATURES.md`:

- Section 1 “Danh sách game”, Khu trò chơi bullet: list becomes `Mưa phép tính, Bắt bong bóng, Lật thẻ thần kỳ, Số nào trốn mất?, Số nào lớn hơn?, Đúng hay sai?`.
- Router table, after the `compare` row: `| \`truefalse\` | \`mountTrueFalse\` |`.
- “Kỷ lục” first bullet: add `Đúng hay sai?` to the list of games with scores.
- Renumber `## 8. Phiếu 20 phép` → `## 9.`, `## 9. Học thích ứng…` → `## 10.`, `## 10. Khả năng engine…` → `## 11.`.
- Insert before the (now) `## 9. Phiếu 20 phép`:

```markdown
## 8. Đúng hay sai?

Mục tiêu: nhìn một phép tính và chọn thật nhanh thẻ Đúng hoặc Sai.

### Thời lượng và chặng

- Mỗi lượt kéo dài 90 giây hoạt động; tạm dừng không làm giảm giờ.
- Chặng mở theo thời gian đã chơi: 0–30 giây là chặng 1, 30–60 giây là chặng 2, từ giây 60 là chặng 3.
- Mỗi round có xác suất 50% là phép tính đúng.
- Chặng 1: `a ± b = c`, câu sai lệch 3–5. Chặng 2: câu sai lệch 1–2. Chặng 3: nửa số câu một vế lệch đúng 1, nửa còn lại hai vế `a ± b = c ± d` chênh 1–2.
- Mọi số trong 0–20. Vế trái lấy từ learning service (context `truefalse`); vế phải của dạng hai vế do engine tạo và không trùng vế trái.

### Thích ứng trong game

- Hai câu sai liên tiếp hạ một chặng nếu có thể; sau khi bị hạ, ba câu đúng liên tiếp hồi một chặng.
- Chặng không vượt chặng đồng hồ đã mở. Khi đồng hồ mở chặng mới trong lúc đang bị hạ, chặng thực tế tăng theo nhưng vẫn thấp hơn đúng mức đang bị hạ.

### Điểm và feedback

- Sai không trừ điểm, không trừ giờ, chỉ reset streak.
- Đúng nhận 10 điểm, multiplier tăng mỗi 5 streak và tối đa 40 điểm.
- Top 5 điểm được lưu riêng cho mode `truefalse`. Phép tính vế trái được ghi `review` khi round trả lời đúng.
- Đúng: thẻ vừa chọn xanh, ✓ xanh lớn bật lên giữa ô chơi rồi mờ trong 600 ms; không hiện kết quả; lượt mới sau 450 ms.
- Sai: ✗ trên thẻ đã chọn, thẻ còn lại xanh, một ô vàng nhỏ hiện kết quả thật ở giữa phía trên mỗi phép tính (dạng hai vế có hai ô). Không có dòng chữ; trình đọc màn hình nghe “Chưa đúng. 7 + 5 = 12”. Lượt mới sau 1 giây. Hạ chặng không có thông báo.
- HUD có Điểm, Kỷ lục, Thời gian, Chuỗi đúng; không có ô chặng.

### Input

- Click/chạm thẻ Đúng hoặc Sai.
- `ArrowLeft`: Đúng. `ArrowRight`: Sai.
- `Escape`: tạm dừng.
- Tab bị ẩn sẽ tự tạm dừng.
```

- In `## 10. Học thích ứng…`, after `- Số nào lớn hơn ghi \`review\` cho phép tính trong round đúng.` add `- Đúng hay sai ghi \`review\` cho phép tính vế trái trong round đúng.`

`docs/ENGINE.md`:

- Mermaid: after `Shell --> Compare[compare.mjs]` add `  Shell --> TrueFalse[truefalse.mjs]`; after `Compare --> CompareEngine[compare-engine.mjs]` add `  TrueFalse --> TrueFalseEngine[truefalse-engine.mjs]`; after `Compare --> Learning` add `  TrueFalse --> Learning`.
- Controller table, after the `compare.mjs` row: `| \`truefalse.mjs\` | \`requestAnimationFrame\` | cancel frame, pending delay, keyboard và visibility listener |`.
- After the Compare engine table (before `## 9. Timer và pause`):

```markdown
### True/false engine

| Hàm | Vai trò |
| --- | --- |
| `createTrueFalseGame()` | Khởi tạo run 90 giây |
| `unlockedTrueFalseStage(g)` | Stage mở theo thời gian đã chơi 0/30/60 giây |
| `trueFalseStage(g)` | Stage thực tế sau penalty |
| `recordTrueFalseAnswer(g, good)` | Score, streak, hạ/hồi stage |
| `elapseTrueFalse(g, seconds)` | Đếm active time |
| `createTrueFalseRound(g, suppliers)` | Vế trái từ fact supplier, vế phải là số hoặc phép tính, và `truth` |
| `reviewFacts(round, correct)` | Phép tính vế trái khi round đúng |
```

- Timer section: `- Compare cố ý dùng…` becomes `- Compare và Đúng hay sai cố ý dùng toàn bộ active frame delta để đồng hồ 90 giây không bị kéo dài khi tab/frame chậm.`; `- Khi document bị ẩn, Rain, Challenge và Compare tự pause.` becomes `- Khi document bị ẩn, Rain, Challenge, Compare và Đúng hay sai tự pause.`

`docs/README.md`: `App hiện có 6 game` → `App hiện có 7 game`, add `7. Đúng hay sai?` after `6. Số nào lớn hơn?`, and after the `Số nào lớn hơn` row of the source map add `| Đúng hay sai | \`dist/truefalse-engine.mjs\`, \`dist/truefalse.mjs\`, \`dist/truefalse.css\` |`.

`docs/DESIGN_SYSTEM.md`:

- Palette table, after `Teal / Rain`: `| Yellow / Sheet, Đúng hay sai | \`#fff9e3\` | \`#efe1ae\` | \`#8a6512\` | \`#ffeeb5\` |`.
- Breakpoints `max-width: 650px` row: `Rain chuyển sang một cột; HUD của Compare và Đúng hay sai còn 2 cột`.
- Motion table, after `Compare transition`: `| Đúng hay sai transition | 450 ms đúng, 1 s sai | ô kết quả chỉ hiện khi sai |`.
- Accessibility list, after `- Compare có mapping hướng vị trí rõ ràng.`: `- Đúng hay sai: \`ArrowLeft\` là Đúng, \`ArrowRight\` là Sai, khớp vị trí hai thẻ.`

- [ ] **Step 8: Commit**

```bash
git add dist/truefalse.mjs dist/truefalse.css dist/app.js dist/index.html dist/sw.js tests/home-ui.test.mjs docs/FEATURES.md docs/ENGINE.md docs/README.md docs/DESIGN_SYSTEM.md
git commit -m "Add true or false game to the island"
```

---

### Task 4: Tip card becomes a full-width band

**Files:**
- Modify: `dist/style.css` (new line before the last line)
- Modify: `tests/home-ui.test.mjs:18,31-32`
- Modify: `docs/FEATURES.md` (Khu trò chơi bullet), `docs/DESIGN_SYSTEM.md:76`

**Interfaces:**
- Consumes: the six-game grid from Task 3.
- Produces: nothing other tasks use.

- [ ] **Step 1: Flip the guard**

In `tests/home-ui.test.mjs`, test `home splits practice and worksheet into a practice zone above the game zone`:

Line 18 no longer needs `rain.css`:

```js
  const [app,style]=await Promise.all(['app.js','style.css'].map(f=>readFile(new URL(`../dist/${f}`,import.meta.url),'utf8')));
```

Replace lines 31–32 with:

```js
  // six games leave the tip alone on the last row, so it spans the row as a slim band
  assert.match(style,/\.cards>\.tip\{grid-column:1\/-1;/);
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/home-ui.test.mjs`
Expected: FAIL on the `.cards>.tip{grid-column:1/-1;` match.

- [ ] **Step 3: Add the band style**

In `dist/style.css`, insert this line directly above the final line `@media(max-width:520px){.cards,.cards.zone-practice{grid-template-columns:1fr}…}` (that media rule must stay last — another guard anchors it to the end of the file):

```css
.cards>.tip{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;column-gap:22px;row-gap:4px;padding:16px 24px}.cards>.tip br{display:none}.cards>.tip h3{font-size:20px;margin:0}.cards>.tip p{margin:0}.cards>.tip>div{margin-top:0}
```

- [ ] **Step 4: Run the whole suite**

Run: `node --test tests/*.test.mjs`
Expected: PASS, 0 failures.

- [ ] **Step 5: Update the docs**

`docs/FEATURES.md`, section 1, Khu trò chơi bullet: replace `kèm thẻ lời khuyên lấp ô cuối lưới 3 cột` with `kèm thẻ lời khuyên trải hết một hàng thành dải ngang dưới các game`.

`docs/DESIGN_SYSTEM.md` line 76: `Khu trò chơi 3 cột với 5 game và thẻ lời khuyên lấp ô cuối.` → `Khu trò chơi 3 cột với 6 game; thẻ lời khuyên trải hết một hàng (\`grid-column:1/-1\`) thành dải ngang, chữ xếp một dòng và bỏ ngắt dòng.`

- [ ] **Step 6: Commit**

```bash
git add dist/style.css tests/home-ui.test.mjs docs/FEATURES.md docs/DESIGN_SYSTEM.md
git commit -m "Stretch the home tip into a band under six games"
```

---

### Task 5: Verify in the browser

**Files:**
- Modify only if a check fails; commit fixes with the file they touch.

- [ ] **Step 1: Serve the app**

Run (background): `python3 -m http.server 8000 -d dist`
Open `http://localhost:8000/` in a fresh tab. Clear `localStorage` key `toan-high-scores-v1` only if a clean record run is needed.

- [ ] **Step 2: Desktop (≥ 1000 px) checks**

- Home: six game cards in two rows of three, tip as a one-line band below; card “✅ Đúng hay sai?” is yellow and opens the game.
- Intro shows no duration; “Bắt đầu →” starts the clock at 90s.
- Tap Đúng/Sai on a few rounds: correct → chosen card green, big ✓, next round quickly, no badge; wrong → ✗ on the chosen card, other card green, yellow badge centred above `a ± b`, next round after about a second.
- `ArrowLeft` answers Đúng, `ArrowRight` answers Sai, `Escape` pauses and the clock stops; resume continues.
- After second 60, two-sided rounds appear; on a miss both expressions show a badge; the equation does not jump when badges appear.
- Let the clock run out: “Hết giờ!” (or “Kỷ lục mới!” with confetti), top-five list highlights this run, “↻ Chơi lại” restarts, “Chọn trò khác” goes home.
- Console has no errors or warnings.

- [ ] **Step 3: Phone width (400 px) checks**

- Home: cards one per row, tip band wraps cleanly.
- Game: HUD two columns; the two choice cards stay side by side; a two-sided round like `20 − 10 = 10 + 10` fits or wraps without horizontal scroll, badges sit above their own expression.

- [ ] **Step 4: Tablet width (700 px) check**

- Home: two-column grid, tip band spans both columns.

- [ ] **Step 5: Stop the server and report**

Stop the background server. If any check needed a fix, run `node --test tests/*.test.mjs`, then commit the touched files with a message describing the fix.
