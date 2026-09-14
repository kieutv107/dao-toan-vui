import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlacement,placementStage,recordPlacement,placementResult} from '../dist/placement-engine.mjs';

// Drive the ladder with a fixed answer script. Returns the resulting level, the number of
// questions asked, and the stages probed (in order).
function run(answers){
  const s=createPlacement(),stages=[];let i=0;
  while(!s.done){stages.push(placementStage(s));recordPlacement(s,answers[i++]);}
  return {level:placementResult(s).level,count:i,stages};
}

test('all correct places at the top stage in at most three questions',()=>{
  const r=run([true,true,true]);
  assert.equal(r.level,5);
  assert.ok(r.count<=3,`asked ${r.count}`);
});

test('all wrong places at the first stage',()=>{
  const r=run([false,false,false]);
  assert.equal(r.level,1);
  assert.ok(r.count<=3,`asked ${r.count}`);
});

test('every answer sequence converges in at most three questions, each stage probed once',()=>{
  for(const a of [false,true])for(const b of [false,true])for(const c of [false,true]){
    const r=run([a,b,c]);
    assert.ok(r.count<=3,`sequence ${a},${b},${c} asked ${r.count}`);
    assert.ok(r.level>=1&&r.level<=5,`level ${r.level}`);
    assert.equal(new Set(r.stages).size,r.stages.length,`stage repeated in ${a},${b},${c}: ${r.stages}`);
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

test('a mixed sequence lands on the exact stage',()=>{
  // correct, wrong -> mid 3 ok (place 3, lo 4), mid 4 wrong (hi 3) -> lo 4 > hi 3 -> level 3
  assert.equal(run([true,false]).level,3);
  // wrong, correct, correct -> mid 3 wrong (hi 2), mid 1 ok (place1,lo2), mid 2 ok (place2,lo3>hi2) -> 2
  assert.equal(run([false,true,true]).level,2);
});
