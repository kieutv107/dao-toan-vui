import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCompareGame,unlockedCompareStage,compareStage,recordCompareAnswer,elapseCompare} from '../dist/compare-engine.mjs';

test('comparison stages open on attempts 1, 6 and 11',()=>{
  const g=createCompareGame();
  assert.equal(unlockedCompareStage(g),1);assert.equal(compareStage(g),1);
  g.attempts=5;assert.equal(unlockedCompareStage(g),2);assert.equal(compareStage(g),2);
  g.attempts=10;assert.equal(unlockedCompareStage(g),3);assert.equal(compareStage(g),3);
});

test('two misses lower a stage and three correct answers recover it',()=>{
  const g=createCompareGame();g.attempts=10;
  recordCompareAnswer(g,false);recordCompareAnswer(g,false);
  assert.equal(compareStage(g),2);assert.equal(g.score,0);assert.equal(g.streak,0);
  recordCompareAnswer(g,true);recordCompareAnswer(g,true);recordCompareAnswer(g,true);
  assert.equal(compareStage(g),3);
});

test('difficulty stays within opened stages',()=>{
  const g=createCompareGame();recordCompareAnswer(g,false);recordCompareAnswer(g,false);
  assert.equal(compareStage(g),1);assert.equal(g.stagePenalty,0);
  g.attempts=5;recordCompareAnswer(g,false);recordCompareAnswer(g,false);
  assert.equal(compareStage(g),1);
  recordCompareAnswer(g,true);recordCompareAnswer(g,true);recordCompareAnswer(g,true);
  assert.equal(compareStage(g),3);assert.ok(compareStage(g)<=unlockedCompareStage(g));
});

test('wrong answers keep score while correct streaks award up to forty points',()=>{
  const g=createCompareGame();assert.equal(recordCompareAnswer(g,false),0);assert.equal(g.score,0);
  for(let i=0;i<20;i++)recordCompareAnswer(g,true);
  assert.equal(g.bestStreak,20);assert.equal(recordCompareAnswer(g,true),40);
});

test('sixty active seconds ends the run and later answers do nothing',()=>{
  const g=createCompareGame();elapseCompare(g,59.9);assert.equal(g.over,false);
  elapseCompare(g,.1);assert.equal(g.remaining,0);assert.equal(g.over,true);
  assert.equal(recordCompareAnswer(g,true),0);assert.equal(g.attempts,0);
});
