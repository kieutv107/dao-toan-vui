import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLearningService} from '../dist/learning-service.mjs';
import {getFactState,formKey,recordEvidence} from '../dist/mastery-engine.mjs';
import {formsAtLevel,formsBelowLevel} from '../dist/core-facts.mjs';
import {currentLevel} from '../dist/adaptive-selector.mjs';

function storage(){const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}
function master(profile,forms){for(const form of forms)for(const sessionId of ['a','b'])recordEvidence(profile,{fact:form.questions[0],result:'correct',elapsedMs:1000,context:'practice',sessionId,now:1})}

test('service persists evidence and exposes refreshed summary',()=>{
  const s=storage(),learning=createLearningService({storage:s,now:()=>100,random:()=>0}),fact={a:1,b:9,sign:'+',answer:10};
  learning.record({fact,result:'correct',elapsedMs:1000,context:'practice',sessionId:'a'});
  assert.equal(learning.summary().strong,1);assert.equal(learning.summary().level,1);
  assert.equal(getFactState(createLearningService({storage:s}).profile,fact).strength,3);
});

test('service creates unique session ids and can reset',()=>{
  const learning=createLearningService({storage:storage(),now:()=>100});
  assert.notEqual(learning.newSessionId(),learning.newSessionId());
  learning.record({fact:{a:1,b:1,sign:'+',answer:2},result:'wrong',context:'practice',sessionId:'a'});learning.reset();
  assert.deepEqual(learning.profile.facts,{});
});

test('service supplies normal and hardest adaptive facts',()=>{
  const learning=createLearningService({storage:storage(),random:()=>0}),weak={a:2,b:8,sign:'+',answer:10};
  learning.record({fact:weak,result:'wrong',context:'practice',sessionId:'a'});
  assert.ok(learning.nextFact({context:'bubble'}).id);assert.equal(formKey(learning.hardestFact({context:'rain'})),formKey(weak));
});

test('a game never poses the same equation twice in a row within one context',()=>{
  // random:()=>0 makes the weighted pick fully deterministic, so without the guard every draw
  // would return the very same fact.
  const learning=createLearningService({storage:storage(),random:()=>0});
  let prev=null;
  for(let i=0;i<12;i++){const q=learning.nextFact({context:'bubble'});assert.ok(q?.id);assert.notEqual(q.id,prev,'no consecutive repeat');prev=q.id}
});

test('the no-repeat guard is scoped per context',()=>{
  const learning=createLearningService({storage:storage(),random:()=>0});
  // independent memory per context: two different games may each open on the same first fact
  assert.equal(learning.nextFact({context:'rain'}).id,learning.nextFact({context:'compare'}).id);
});

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
