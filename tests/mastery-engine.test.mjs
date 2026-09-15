import {test} from 'node:test';
import assert from 'node:assert/strict';
import {factCatalog,factId,factFamilyId,formKey,createProfile,getFactState,recordEvidence,migrateProfile,responseBenchmark,seedForm} from '../src/mastery-engine.mjs';

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

test('a clean fast first try reaches strong, and two fast sessions master',()=>{
  const p=createProfile(),fact={a:8,b:7,sign:'+',answer:15};
  recordEvidence(p,{fact,result:'correct',elapsedMs:2000,context:'practice',sessionId:'a',now:1});
  assert.equal(getFactState(p,factId(fact)).strength,3);
  assert.equal(getFactState(p,factId(fact)).status,'strong');
  recordEvidence(p,{fact,result:'correct',elapsedMs:2000,context:'practice',sessionId:'b',now:2});
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

test('reading state never creates stored facts',()=>{
  const p=createProfile(),fact={a:2,b:3,sign:'+',answer:5};
  assert.equal(getFactState(p,factId(fact)).status,'new');
  assert.equal(Object.keys(p.facts).length,0);
});

test('commuted addition shares one progress record while subtraction keeps its own',()=>{
  const p=createProfile();
  recordEvidence(p,{fact:{a:8,b:5,sign:'+',answer:13},result:'correct',elapsedMs:1000,context:'practice',sessionId:'a'});
  assert.equal(getFactState(p,'5+8').strength,3);assert.equal(getFactState(p,{a:5,b:8,sign:'+'}).correct,1);
  assert.equal(getFactState(p,'13−8').status,'new');
  assert.equal(formKey('8+5'),'5+8=13:+');assert.equal(formKey('13−5'),'5+8=13:−');
  assert.deepEqual(Object.keys(p.facts),['5+8=13:+']);
});

test('seedForm fills a blank form as strong and immediately due',()=>{
  const p=createProfile(),fact={a:1,b:9,sign:'+',answer:10};
  const s=seedForm(p,fact,500);
  assert.deepEqual(s,{strength:3,status:'strong',correct:1,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:500,dueAt:500});
  assert.equal(getFactState(p,factId(fact)).status,'strong');
  assert.equal(p.updatedAt,500);
});

test('seedForm never overwrites existing evidence',()=>{
  const p=createProfile(),fact={a:1,b:9,sign:'+',answer:10};
  recordEvidence(p,{fact,result:'wrong',context:'practice',sessionId:'a',now:1}); // weak, status learning
  const before={...getFactState(p,fact)};
  const s=seedForm(p,fact,999);
  assert.deepEqual(s,before);
  assert.equal(getFactState(p,fact).status,'learning');
  assert.equal(getFactState(p,fact).strength,0);
});

test('version one profiles merge per-question states into form states',()=>{
  const old={version:1,createdAt:5,updatedAt:9,timings:{'practice:2':[1000]},facts:{
    '8+5':{strength:2,status:'learning',correct:1,wrong:1,hints:0,reviews:0,fastSessions:['a'],lastSeen:3,dueAt:3},
    '5+8':{strength:4,status:'strong',correct:3,wrong:0,hints:1,reviews:0,fastSessions:['a','b'],lastSeen:7,dueAt:99},
    '13−8':{strength:1,status:'learning',correct:1,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:2,dueAt:2},
    'junk':{strength:9}
  }};
  const p=migrateProfile(old);
  assert.equal(p.version,2);assert.deepEqual(p.timings,{'practice:2':[1000]});assert.equal(p.createdAt,5);
  const add=p.facts['5+8=13:+'];
  assert.equal(add.strength,4);assert.equal(add.correct,4);assert.equal(add.wrong,1);assert.equal(add.hints,1);
  assert.deepEqual(add.fastSessions,['a','b']);assert.equal(add.lastSeen,7);assert.equal(add.dueAt,99);assert.equal(add.status,'strong');
  assert.equal(p.facts['5+8=13:−'].strength,1);assert.equal(Object.keys(p.facts).length,2);
  assert.equal(migrateProfile(p),p);
});
