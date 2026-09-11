import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRunnerGame,runnerDifficulty,createRunnerRound,recordRunnerAnswer,elapseRunner} from '../dist/runner-engine.mjs';

test('runner gives 75 active seconds and ignores answers after time expires',()=>{
  const g=createRunnerGame();
  assert.equal(g.remaining,75);elapseRunner(g,74.9);assert.equal(g.over,false);
  elapseRunner(g,.1);assert.equal(g.remaining,0);assert.equal(g.over,true);
  assert.equal(recordRunnerAnswer(g,true),0);assert.equal(g.attempts,0);
});

test('runner combo multipliers unlock at streaks 3, 5 and 10',()=>{
  const g=createRunnerGame(),points=[];
  for(let i=0;i<10;i++)points.push(recordRunnerAnswer(g,true));
  assert.deepEqual(points,[10,10,12,12,15,15,15,15,15,20]);
  assert.equal(g.score,139);assert.equal(g.bestStreak,10);
  recordRunnerAnswer(g,false);assert.equal(g.streak,0);assert.equal(g.score,139);
});

test('runner gets faster while keeping enough decision time for a child',()=>{
  const g=createRunnerGame(),first=runnerDifficulty(g);
  g.correct=18;const later=runnerDifficulty(g);
  assert.ok(later.level>first.level);assert.ok(later.deadline<first.deadline);
  assert.ok(later.deadline>=4.2);assert.ok(later.travelSeconds<first.travelSeconds);
  assert.equal(first.travelSeconds,first.deadline);assert.equal(later.travelSeconds,later.deadline);
});

test('every runner round has three unique gates and exactly one correct gate',()=>{
  const fact={a:8,b:7,sign:'+',answer:15,id:'8+7'},g=createRunnerGame();
  for(const attempts of [0,7,18]){
    g.attempts=attempts;const round=createRunnerRound(g,{fact:()=>fact,random:()=>.42});
    assert.equal(round.fact,fact);assert.equal(round.gates.length,3);
    assert.equal(new Set(round.gates.map(x=>x.value)).size,3);
    assert.equal(round.gates.filter(x=>x.correct).length,1);
    assert.equal(round.gates.find(x=>x.correct).value,15);
    assert.ok(round.gates.every(x=>x.value>=0&&x.value<=20));
  }
});

test('early runner distractors are wider and later distractors become adjacent',()=>{
  const fact={a:9,b:6,sign:'+',answer:15,id:'9+6'},random=()=>0;
  const early=createRunnerRound(createRunnerGame(),{fact:()=>fact,random});
  const late=createRunnerRound(Object.assign(createRunnerGame(),{attempts:15}),{fact:()=>fact,random});
  assert.ok(early.gates.filter(x=>!x.correct).every(x=>Math.abs(x.value-15)>=2));
  assert.ok(late.gates.some(x=>!x.correct&&Math.abs(x.value-15)===1));
});

test('runner falls back to a valid arithmetic fact when the learning source is empty',()=>{
  const round=createRunnerRound(createRunnerGame(),{fact:()=>null,random:()=>.25});
  assert.ok(Number.isFinite(round.fact.answer));assert.ok(round.fact.answer>=0&&round.fact.answer<=20);
  assert.equal(round.gates.filter(x=>x.correct).length,1);
});
