import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLearningService} from '../dist/learning-service.mjs';
import {getFactState,formKey} from '../dist/mastery-engine.mjs';

function storage(){const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}}

test('service persists evidence and exposes refreshed summary',()=>{
  const s=storage(),learning=createLearningService({storage:s,now:()=>100,random:()=>0}),fact={a:1,b:9,sign:'+',answer:10};
  learning.record({fact,result:'correct',elapsedMs:1000,context:'practice',sessionId:'a'});
  assert.equal(learning.summary().learning,1);assert.equal(learning.summary().level,1);
  assert.equal(getFactState(createLearningService({storage:s}).profile,fact).strength,2);
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
