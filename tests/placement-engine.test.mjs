import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlacement,placementStage,recordPlacement,placementResult,PER_STAGE,PASS} from '../dist/placement-engine.mjs';

// Drive the ladder with a fixed answer script. Returns the resulting level, the number of
// questions asked, and the stage probed for each question (in order).
function run(answers){
  const s=createPlacement(),probes=[];let i=0;
  while(!s.done){probes.push(placementStage(s));recordPlacement(s,answers[i++]);}
  return {level:placementResult(s).level,count:i,probes};
}

test('each probed stage asks PER_STAGE questions before the ladder moves',()=>{
  const s=createPlacement();
  assert.equal(placementStage(s),3);
  for(let k=1;k<PER_STAGE;k++){recordPlacement(s,true);assert.equal(placementStage(s),3,`still stage 3 after ${k}`)}
  recordPlacement(s,true); // PER_STAGE-th answer decides the stage and advances
  assert.notEqual(placementStage(s),3);
});

test('all correct climbs to the top stage; three stages probed x PER_STAGE each',()=>{
  const r=run(Array(PER_STAGE*3).fill(true));
  assert.equal(r.level,5);
  assert.equal(r.count,PER_STAGE*3);
  assert.deepEqual([...new Set(r.probes)],[3,4,5]);
});

test('all wrong lands on the first stage',()=>{
  const r=run(Array(PER_STAGE*3).fill(false));
  assert.equal(r.level,1);
  assert.deepEqual([...new Set(r.probes)],[3,1]);
});

test('a stage passes on a majority and fails below it',()=>{
  // stage 3: two right of three -> passed -> climb to stage 4
  const pass=createPlacement();recordPlacement(pass,true);recordPlacement(pass,true);recordPlacement(pass,false);
  assert.equal(placementStage(pass),4);
  // stage 3: one right of three -> failed -> drop toward stage 1
  const fail=createPlacement();recordPlacement(fail,true);recordPlacement(fail,false);recordPlacement(fail,false);
  assert.ok(placementStage(fail)<3);
});

test('every stage is probed at most once and the count stays within bounds',()=>{
  const opts=[true,false];
  for(const a of opts)for(const b of opts)for(const c of opts)for(const d of opts)for(const e of opts)for(const f of opts)for(const g of opts)for(const h of opts)for(const j of opts){
    const r=run([a,b,c,d,e,f,g,h,j]);
    const distinct=[...new Set(r.probes)];
    assert.equal(distinct.length*PER_STAGE,r.probes.length,`stage repeated: ${r.probes}`);
    assert.ok(r.count>=PER_STAGE*2&&r.count<=PER_STAGE*3,`count ${r.count}`);
    assert.ok(r.level>=1&&r.level<=5,`level ${r.level}`);
  }
});

test('placementStage is null and result is stable once done',()=>{
  const s=createPlacement();
  while(!s.done)recordPlacement(s,true);
  assert.equal(placementStage(s),null);
  recordPlacement(s,false); // no-op after done
  assert.deepEqual(placementResult(s),{done:true,level:5});
});

test('the ladder starts by probing stage three',()=>{
  assert.equal(placementStage(createPlacement()),3);
});

test('PER_STAGE and PASS are a sensible majority',()=>{
  assert.equal(PER_STAGE,3);
  assert.equal(PASS,2);
  assert.ok(PASS>PER_STAGE/2,'pass must be a strict majority');
});
