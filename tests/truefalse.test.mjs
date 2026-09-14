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
