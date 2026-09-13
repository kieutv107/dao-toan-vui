import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProfile} from '../dist/mastery-engine.mjs';
import {createPractice,current,answer,markHint} from '../dist/practice-engine.mjs';

test('practice creates an 18-question session from the current level without adjacent duplicates',()=>{
  const g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>.2});
  assert.equal(g.questions.length,18);assert.ok(g.questions.every(q=>q.sign==='+'));
  for(let i=1;i<g.questions.length;i++)assert.notEqual(g.questions[i].id,g.questions[i-1].id);
});

test('wrong answer requeues fact three to five places later and correct advances',()=>{
  const events=[],g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>0,record:e=>events.push(e)}),q=current(g),before=g.questions.length;
  const bad=answer(g,q.answer+1,{elapsedMs:1000});assert.equal(bad.correct,false);assert.equal(g.pos,0);assert.equal(g.questions.length,before+1);assert.equal(g.questions[3].id,q.id);
  const good=answer(g,q.answer,{elapsedMs:1000});assert.equal(good.correct,true);assert.equal(g.pos,1);assert.deepEqual(events.map(e=>e.result),['wrong','correct']);
});

test('hint records evidence and schedules review without advancing',()=>{
  const events=[],g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>.5,record:e=>events.push(e)}),q=current(g),before=g.questions.length;
  markHint(g);assert.equal(current(g).id,q.id);assert.equal(g.questions.length,before+1);assert.equal(events[0].result,'hint');
});

test('session completes after every queued question is answered correctly',()=>{
  const g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>.3});
  while(current(g))answer(g,current(g).answer,{elapsedMs:1000});
  assert.equal(g.done,true);assert.equal(g.results.correct,18);
});
