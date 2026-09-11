import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCompareGame,unlockedCompareStage,compareStage,recordCompareAnswer,elapseCompare,createCompareRound,compareGap,reviewFacts} from '../dist/compare-engine.mjs';

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

test('two misses lower the displayed stage even across an unlock boundary',()=>{
  const g=createCompareGame();g.attempts=8;
  recordCompareAnswer(g,false);recordCompareAnswer(g,false);
  assert.equal(unlockedCompareStage(g),3);
  assert.equal(compareStage(g),1);
  recordCompareAnswer(g,true);recordCompareAnswer(g,true);recordCompareAnswer(g,true);
  assert.equal(compareStage(g),2);
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
  assert.ok(round.cards.every(x=>x.kind==='fact'));
});

test('winner matches the greater card for non-ties',()=>{
  const g=createCompareGame(),round=createCompareRound(g,{fact:()=>null,random:()=>.9});
  assert.notEqual(round.cards[0].value,round.cards[1].value);
  assert.equal(round.answer,round.cards[0].value>round.cards[1].value?'top':'bottom');
});

test('stage-three target gaps narrow after every five attempts',()=>{
  for(const [attempts,expected] of [[10,[3,6]],[15,[2,4]],[20,[1,2]]]){
    const g=Object.assign(createCompareGame(),{attempts});assert.deepEqual(compareGap(g),expected);
  }
});

test('only correct rounds expose expression facts for review',()=>{
  const fact={a:7,b:6,sign:'+',answer:13,id:'7+6'};
  const round={cards:[{kind:'fact',value:13,fact},{kind:'number',value:12}],answer:'top'};
  assert.deepEqual(reviewFacts(round,true),[fact]);
  assert.deepEqual(reviewFacts(round,false),[]);
});
