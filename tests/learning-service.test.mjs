import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLearningService} from '../dist/learning-service.mjs';
import {factId} from '../dist/mastery-engine.mjs';

function storage(){const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}

test('service persists evidence and exposes refreshed summary',()=>{
  const s=storage(),learning=createLearningService({storage:s,now:()=>100,random:()=>0}),fact={a:2,b:3,sign:'+',answer:5};
  learning.record({fact,result:'correct',elapsedMs:1000,context:'practice',sessionId:'a'});
  assert.equal(learning.summary().learning,1);
  assert.equal(createLearningService({storage:s}).profile.facts[factId(fact)].strength,2);
});

test('service creates unique session ids and can reset',()=>{
  const learning=createLearningService({storage:storage(),now:()=>100});
  assert.notEqual(learning.newSessionId(),learning.newSessionId());
  learning.record({fact:{a:1,b:1,sign:'+',answer:2},result:'wrong',context:'practice',sessionId:'a'});learning.reset();
  assert.deepEqual(learning.profile.facts,{});
});

test('service supplies normal and hardest adaptive facts',()=>{
  const learning=createLearningService({storage:storage(),random:()=>0}),weak={a:0,b:11,sign:'+',answer:11};
  learning.record({fact:weak,result:'wrong',context:'practice',sessionId:'a'});
  assert.ok(learning.nextFact({context:'bubble'}).id);assert.equal(learning.hardestFact({context:'rain'}).id,factId(weak));
});
