import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,recordEvidence,getFactState} from '../dist/mastery-engine.mjs';
import {formsAtLevel,coreFactOf,formOf} from '../dist/core-facts.mjs';
import {currentLevel,levelReadiness,selectFact,buildPracticeSession,progressSummary} from '../dist/adaptive-selector.mjs';

function master(profile,forms,share=1){
  const count=Math.ceil(forms.length*share);
  for(const form of forms.slice(0,count))for(const sessionId of ['a','b'])recordEvidence(profile,{fact:form.questions[0],result:'correct',elapsedMs:1000,context:'practice',sessionId});
}
function cycle(values){let i=0;return ()=>values[i++%values.length]}

test('a chosen topic serves only that level, even when it is still locked',()=>{
  const p=createProfile(),session=buildPracticeSession({profile:p,random:cycle([.1,.6,.9,.3]),focusLevel:4});
  assert.equal(currentLevel(p),1);
  assert.equal(session.length,18);
  assert.ok(session.every(q=>formOf(q).level===4));
  for(let i=1;i<session.length;i++)assert.notEqual(session[i].id,session[i-1].id);
});

test('a chosen topic skips review from lower levels and never borrows from other topics',()=>{
  const p=createProfile();master(p,formsAtLevel(1));master(p,formsAtLevel(2));
  assert.equal(currentLevel(p),3);
  const random=cycle([.95,.2,.8,.5,.99,.1]);
  for(let i=0;i<40;i++)assert.equal(formOf(selectFact({profile:p,focusLevel:2,random})).level,2);
  const levelOne=formsAtLevel(1).flatMap(f=>f.questions).map(q=>q.id);
  assert.equal(selectFact({profile:createProfile(),focusLevel:1,excludeIds:levelOne}),undefined);
  assert.notEqual(selectFact({profile:createProfile(),excludeIds:levelOne}),undefined,'without a topic the selector still widens');
});

test('new profile starts at level one with addition only',()=>{
  const p=createProfile();assert.equal(currentLevel(p),1);
  const qs=buildPracticeSession({profile:p,random:()=>.1});
  assert.equal(qs.length,18);
  assert.ok(qs.every(q=>q.sign==='+'&&formOf(q).level===1));
  for(let i=1;i<qs.length;i++)assert.notEqual(qs[i].id,qs[i-1].id);
});

test('seventy percent of a level unlocks the next one',()=>{
  const p=createProfile();master(p,formsAtLevel(1),.6);
  assert.equal(currentLevel(p),1);
  master(p,formsAtLevel(1),.7);assert.ok(levelReadiness(p,1)>=.7);assert.equal(currentLevel(p),2);
  master(p,formsAtLevel(2));assert.equal(currentLevel(p),3);
  master(p,formsAtLevel(3));assert.equal(currentLevel(p),4);
  master(p,formsAtLevel(4));assert.equal(currentLevel(p),5);
});

test('bridge level sessions focus on bridge10 with roughly a quarter review of earlier levels',()=>{
  const p=createProfile();master(p,formsAtLevel(1));master(p,formsAtLevel(2));assert.equal(currentLevel(p),3);
  // each pick draws twice: once for focus-vs-review, once for the weighted choice
  const qs=buildPracticeSession({profile:p,random:cycle([.1,.5,.1,.5,.1,.5,.8,.5])});
  const focus=qs.filter(q=>coreFactOf(q).strategy==='bridge10');
  assert.ok(focus.length>=12,`focus ${focus.length}`);assert.ok(focus.length<18);
  assert.ok(qs.every(q=>q.sign==='+'));
  assert.ok(qs.filter(q=>!focus.includes(q)).every(q=>formOf(q).level<3));
});

test('level four introduces subtraction through ten',()=>{
  const p=createProfile();[1,2,3].forEach(l=>master(p,formsAtLevel(l)));
  const q=selectFact({profile:p,random:()=>.1});
  assert.equal(q.sign,'−');assert.ok(q.a>=10);
});

test('selector widens to the whole core pool only when the open pool is exhausted',()=>{
  const p=createProfile(),chosen=[];
  for(let i=0;i<6;i++){const q=selectFact({profile:p,excludeAnswers:chosen.map(x=>x.answer),random:()=>i/6});chosen.push(q)}
  assert.equal(new Set(chosen.map(q=>q.answer)).size,6);
  assert.ok(chosen.slice(0,5).every(q=>formOf(q).level===1));
  assert.equal(selectFact({profile:p,excludeAnswers:[2,4,6,8,10],strict:true,random:()=>0}),undefined);
});

test('hardest selection prefers a weak previously missed fact',()=>{
  const p=createProfile(),forms=formsAtLevel(1),weak=forms[2].questions[0],strong=forms[3].questions[0];
  recordEvidence(p,{fact:weak,result:'wrong',context:'practice',sessionId:'a'});
  for(const sessionId of ['a','b'])recordEvidence(p,{fact:strong,result:'correct',elapsedMs:1000,context:'practice',sessionId});
  assert.equal(formOf(selectFact({profile:p,kind:'hardest',random:()=>0})),formOf(weak));
});

test('progress summary counts open forms and reports every level',()=>{
  const p=createProfile(),s0=progressSummary(p);
  assert.equal(s0.level,1);assert.equal(s0.total,9);assert.equal(s0.new,9);
  assert.equal(s0.levels.length,5);assert.deepEqual(s0.levels.map(l=>l.unlocked),[true,false,false,false,false]);
  recordEvidence(p,{fact:{a:1,b:9,sign:'+',answer:10},result:'correct',elapsedMs:1000,context:'practice',sessionId:'a'});
  const s1=progressSummary(p);assert.equal(s1.strong,1);assert.equal(s1.levels[0].ready,1);
  master(p,formsAtLevel(1));const s2=progressSummary(p);
  assert.equal(s2.level,2);assert.equal(s2.levels[0].ready,9);assert.equal(s2.total,23);
  assert.equal(getFactState(p,{a:9,b:1,sign:'+',answer:10}).status,'mastered');
});
