import {test} from 'node:test';
import assert from 'node:assert/strict';
const engine=await import('../dist/practice-engine.mjs').catch(()=>({}));

test('practice engine is available',()=>assert.equal(typeof engine.createPractice,'function'));

test('practice totals respect the selected lesson range',()=>{
  assert.deepEqual(engine.practiceTotals(10),[5,6,7,8,9,10]);
  assert.deepEqual(engine.practiceTotals(20),[5,6,7,8,9,10,11,12,13,14,15,16,17,18]);
});

test('every total lists ordered addend pairs with both addends between 1 and 9',()=>{
  for(const total of engine.practiceTotals(20)){
    const ps=engine.pairs(total);
    for(const [a,b] of ps){assert.ok(a>=1&&a<=9);assert.ok(b>=1&&b<=9);assert.equal(a+b,total)}
    assert.deepEqual(ps.map(([a])=>a),[...ps.map(([a])=>a)].sort((x,y)=>x-y));
    if(total===5)assert.deepEqual(ps,[[1,4],[2,3],[3,2],[4,1]]);
    if(total===18)assert.deepEqual(ps,[[9,9]]);
  }
});

test('addition and subtraction sets stay in the selected fact family',()=>{
  for(const total of engine.practiceTotals(20)){
    for(const q of engine.buildSet(total,'plus')){assert.equal(q.sign,'+');assert.equal(q.a+q.b,total);assert.equal(q.answer,total)}
    for(const q of engine.buildSet(total,'minus')){assert.equal(q.sign,'−');assert.equal(q.a,total);assert.equal(q.a-q.b,q.answer);assert.ok(q.answer<10)}
  }
});

test('mixed sets can contain both addition and subtraction facts',()=>{
  const values=[.1,.9,.1,.9,0,0,0],qs=engine.buildSet(5,'mix',()=>values.shift()??0);
  assert.equal(qs.filter(q=>q.sign==='+').length,2);
  assert.equal(qs.filter(q=>q.sign==='−').length,2);
});

test('wrong answers retry the same question and correct answers advance',()=>{
  const g=engine.createPractice({op:'plus',limit:10});engine.startSet(g,()=>0);const q=engine.current(g);
  assert.deepEqual(engine.answer(g,q.answer+100),{correct:false,setComplete:false});assert.equal(g.pos,0);assert.equal(g.correct,0);
  assert.deepEqual(engine.answer(g,q.answer),{correct:true,setComplete:false});assert.equal(g.pos,1);assert.equal(g.correct,1);
});

test('completing a set unlocks the next total and the final set ends practice',()=>{
  const g=engine.createPractice({op:'plus',limit:10});engine.startSet(g,()=>0);
  while(engine.current(g))engine.answer(g,engine.current(g).answer);
  assert.equal(g.setDone,true);assert.equal(engine.nextSet(g,()=>0),true);assert.equal(g.totals[g.setIndex],6);
  g.setIndex=g.totals.length-1;engine.startSet(g,()=>0);while(engine.current(g))engine.answer(g,engine.current(g).answer);
  assert.equal(engine.nextSet(g,()=>0),false);assert.equal(g.done,true);
});
