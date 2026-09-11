import {test} from 'node:test';
import assert from 'node:assert/strict';
import {factCatalog,factId,factFamilyId,createProfile,getFactState,recordEvidence,progressSummary,responseBenchmark} from '../dist/mastery-engine.mjs';

test('catalog contains stable valid mixed facts through 20',()=>{
  const facts=factCatalog();
  assert.equal(facts.length,462);
  assert.equal(new Set(facts.map(f=>f.id)).size,facts.length);
  for(const f of facts){
    assert.equal(f.id,factId(f));
    if(f.sign==='+'){assert.equal(f.answer,f.a+f.b);assert.ok(f.answer<=20)}
    else{assert.equal(f.answer,f.a-f.b);assert.ok(f.a<=20);assert.ok(f.answer>=0)}
  }
});

test('commuted addition and inverse subtraction share a family',()=>{
  const family=factFamilyId({a:8,b:7,sign:'+',answer:15});
  assert.equal(factFamilyId({a:7,b:8,sign:'+',answer:15}),family);
  assert.equal(factFamilyId({a:15,b:7,sign:'−',answer:8}),family);
  assert.equal(factFamilyId({a:15,b:8,sign:'−',answer:7}),family);
});

test('evidence changes strength and mastery requires three sessions',()=>{
  const p=createProfile(),fact={a:8,b:7,sign:'+',answer:15};
  recordEvidence(p,{fact,result:'correct',elapsedMs:2000,context:'practice',sessionId:'a',now:1});
  assert.equal(getFactState(p,factId(fact)).strength,2);
  recordEvidence(p,{fact,result:'correct',elapsedMs:2000,context:'practice',sessionId:'b',now:2});
  assert.equal(getFactState(p,factId(fact)).status,'strong');
  recordEvidence(p,{fact,result:'correct',elapsedMs:2000,context:'practice',sessionId:'c',now:3});
  assert.equal(getFactState(p,factId(fact)).status,'mastered');
  recordEvidence(p,{fact,result:'wrong',context:'practice',sessionId:'d',now:4});
  assert.equal(getFactState(p,factId(fact)).status,'strong');
});

test('slow correct adds one while hint and review do not add strength',()=>{
  const p=createProfile(),fact={a:9,b:8,sign:'+',answer:17},id=factId(fact);
  recordEvidence(p,{fact,result:'correct',elapsedMs:9000,context:'practice',sessionId:'a'});
  assert.equal(getFactState(p,id).strength,1);
  recordEvidence(p,{fact,result:'hint',context:'practice',sessionId:'a'});
  recordEvidence(p,{fact,result:'review',context:'memory',sessionId:'b'});
  assert.equal(getFactState(p,id).strength,1);
});

test('benchmark uses recent median after four samples',()=>{
  const p=createProfile(),facts=factCatalog().filter(f=>f.band===0).slice(0,5);
  assert.equal(responseBenchmark(p,'practice',0),8000);
  [1000,2000,3000,10000].forEach((elapsedMs,i)=>recordEvidence(p,{fact:facts[i],result:'correct',elapsedMs,context:'practice',sessionId:String(i)}));
  assert.equal(responseBenchmark(p,'practice',0),2500);
});

test('progress summary counts statuses without creating stored facts',()=>{
  const p=createProfile(),fact={a:2,b:3,sign:'+',answer:5};
  assert.equal(Object.keys(p.facts).length,0);
  assert.equal(getFactState(p,factId(fact)).status,'new');
  assert.equal(Object.keys(p.facts).length,0);
  recordEvidence(p,{fact,result:'correct',elapsedMs:1000,context:'practice',sessionId:'a'});
  const s=progressSummary(p);
  assert.equal(s.learning,1);assert.equal(s.mastered,0);assert.equal(s.total,462);
});
