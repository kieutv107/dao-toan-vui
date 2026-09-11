import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,factCatalog,recordEvidence,getFactState} from '../dist/mastery-engine.mjs';
import {unlockedBand,selectFact,buildPracticeSession} from '../dist/adaptive-selector.mjs';

test('new profile starts in first band and session previews at most two next-band facts',()=>{
  const p=createProfile();assert.equal(unlockedBand(p),0);
  const qs=buildPracticeSession({profile:p,sessionId:'s',random:()=>.1});
  assert.equal(qs.length,18);assert.ok(qs.filter(q=>q.band===1).length<=2);assert.ok(qs.every(q=>q.band<=1));
});

test('seventy percent strong facts unlock next band',()=>{
  const p=createProfile(),band=factCatalog().filter(f=>f.band===0),count=Math.ceil(band.length*.7);
  for(const f of band.slice(0,count))for(const sessionId of ['a','b'])recordEvidence(p,{fact:f,result:'correct',elapsedMs:1000,context:'practice',sessionId});
  assert.equal(getFactState(p,band[0].id).status,'strong');assert.equal(unlockedBand(p),1);
});

test('hardest selection prefers weak previously missed fact',()=>{
  const p=createProfile(),candidates=factCatalog().filter(f=>f.band===0),weak=candidates[4],strong=candidates[5];
  recordEvidence(p,{fact:weak,result:'wrong',context:'practice',sessionId:'a'});
  for(const sessionId of ['a','b'])recordEvidence(p,{fact:strong,result:'correct',elapsedMs:1000,context:'practice',sessionId});
  assert.equal(selectFact({profile:p,kind:'hardest',random:()=>0}).id,weak.id);
});

test('selector can require distinct answers',()=>{
  const p=createProfile(),chosen=[];
  for(let i=0;i<6;i++){const q=selectFact({profile:p,excludeAnswers:chosen.map(x=>x.answer),random:()=>i/6});chosen.push(q)}
  assert.equal(new Set(chosen.map(q=>q.answer)).size,chosen.length);
});
