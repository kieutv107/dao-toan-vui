import {test} from 'node:test';
import assert from 'node:assert/strict';
const engine=await import('../dist/challenge-engine.mjs').catch(()=>({}));
test('every mode increases arithmetic range while respecting lesson settings',()=>{
  for(const mode of ['practice','bubble','rocket','mystery','memory']) {
    const g=engine.createChallenge(mode,20);const low=engine.challengeDifficulty(g);g.correct=8;g.board=3;
    const high=engine.challengeDifficulty(g);assert.ok(high.limit>low.limit);assert.ok(high.limit<=20);
    g.limit=10;assert.ok(engine.challengeDifficulty(g).limit<=10);
  }
});
test('timed modes get faster, while practice and memory have no countdown',()=>{
  for(const mode of ['bubble','rocket','mystery']){const g=engine.createChallenge(mode);const low=engine.challengeDifficulty(g);g.correct=12;assert.ok(engine.challengeDifficulty(g).deadline<low.deadline)}
  for(const mode of ['practice','memory'])assert.equal(engine.challengeDifficulty(engine.createChallenge(mode)).deadline,null);
});
test('consecutive first-try answers grow combo; a mistake resets it and cannot create negative points',()=>{
  const g=engine.createChallenge('practice');for(let i=0;i<5;i++)engine.recordAnswer(g,true);
  assert.equal(g.streak,5);assert.equal(g.bestStreak,5);assert.ok(g.score>50);engine.recordAnswer(g,false);assert.equal(g.streak,0);assert.equal(g.lives,null);
  engine.recordAnswer(g,true);assert.equal(g.streak,0);assert.equal(g.correct,6);g.clean=true;engine.recordAnswer(g,true);assert.equal(g.streak,1);
  for(let i=0;i<100;i++)engine.recordAnswer(g,false);assert.ok(g.score>=0);
});
test('three mistakes finish lives modes; rocket mistakes cost time instead',()=>{
  for(const mode of ['bubble','mystery']){const g=engine.createChallenge(mode);for(let i=0;i<3;i++)engine.recordAnswer(g,false);assert.equal(g.over,true);assert.equal(g.lives,0);const score=g.score;engine.recordAnswer(g,true);assert.equal(g.score,score)}
  const g=engine.createChallenge('rocket');engine.recordAnswer(g,false);assert.equal(g.remaining,57);engine.elapse(g,57);assert.equal(g.over,true);
});
test('memory boards grow from three to six pairs with readable mismatch time',()=>{
  const g=engine.createChallenge('memory');const initial=engine.challengeDifficulty(g);g.board=3;const final=engine.challengeDifficulty(g);
  assert.equal(initial.pairs,3);assert.equal(final.pairs,6);assert.ok(final.reveal<initial.reveal);assert.ok(final.reveal>=900);
});
test('memory earns fixed pair points and never counts a streak',()=>{
  const g=engine.createChallenge('memory');
  engine.recordAnswer(g,true);engine.recordAnswer(g,true);assert.equal(g.score,40);
  engine.recordAnswer(g,false);assert.equal(g.score,40);
  engine.recordAnswer(g,true);assert.equal(g.score,60);assert.equal(g.streak,0);assert.equal(g.bestStreak,0);assert.equal(g.attempts,4);
});
test('memory completion bonus rewards fewer misses and is granted once per board',()=>{
  const g=engine.createChallenge('memory');assert.equal(engine.completeMemoryBoard(g),0);
  engine.recordAnswer(g,false);for(let i=0;i<3;i++)engine.recordAnswer(g,true);
  assert.equal(engine.completeMemoryBoard(g),25);assert.equal(g.score,85);assert.equal(engine.completeMemoryBoard(g),0);assert.equal(g.score,85);
  g.board=2;engine.beginMemoryBoard(g);for(let i=0;i<4;i++)engine.recordAnswer(g,true);
  assert.equal(engine.completeMemoryBoard(g),40);assert.equal(g.memoryBonus,65);assert.equal(g.attempts,8);
});
test('many memory misses cannot remove earned points or make bonus negative',()=>{
  const g=engine.createChallenge('memory');engine.recordAnswer(g,true);for(let i=0;i<50;i++)engine.recordAnswer(g,false);engine.recordAnswer(g,true);engine.recordAnswer(g,true);
  assert.equal(engine.completeMemoryBoard(g),0);assert.equal(g.score,60);
});
test('a third memory card immediately replaces the two-card mismatch',()=>{
  assert.deepEqual(engine.selectMemoryCard([1,2],3),[3]);
  assert.deepEqual(engine.selectMemoryCard([1],3),[1,3]);
});
test('mismatch timeout closes only the pair that originally scheduled it',()=>{
  assert.deepEqual(engine.closeMemoryMismatch([1,2],[1,2]),[]);
  assert.deepEqual(engine.closeMemoryMismatch([3],[1,2]),[3]);
  assert.deepEqual(engine.closeMemoryMismatch([1,3],[1,2]),[1,3]);
});
