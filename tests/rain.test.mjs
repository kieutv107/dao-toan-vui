import {test} from 'node:test';
import assert from 'node:assert/strict';
const engine = await import('../dist/rain-engine.mjs').catch(()=>({}));
test('rain engine is available',()=>assert.equal(typeof engine.createGame,'function'));
test('all generated sums and differences stay inside the chosen range',()=>{
  for(const limit of [10,20]) for(const op of ['mix','plus','minus']) {
    const g=engine.createGame({limit,op});
    for(let i=0;i<1000;i++) {
      g.drops=[];engine.advance(g,1);
      for(const d of g.drops){assert.ok(d.a>=0&&d.a<=limit);assert.ok(d.b>=0&&d.b<=limit);assert.ok(d.answer>=0&&d.answer<=limit);assert.equal(d.answer,d.sign==='+'?d.a+d.b:d.a-d.b);if(op!=='mix')assert.equal(d.sign,op==='plus'?'+':'−');}
      g.spawnIn=0;
    }
  }
});
test('correct answer clears only the lowest matching drop and rewards a streak',()=>{
  const g=engine.createGame();g.drops=[{id:1,answer:5,y:.2},{id:2,answer:5,y:.8}];
  assert.equal(engine.submit(g,'5').drop.id,2);assert.equal(g.drops.length,1);assert.equal(g.streak,1);assert.ok(g.score>0);
  engine.submit(g,'5');assert.equal(g.streak,2);assert.equal(g.bestStreak,2);
});
test('blank input does nothing; wrong answers reset streak without costing lives',()=>{
  const g=engine.createGame();g.streak=4;g.drops=[{id:1,answer:0,y:.1}];
  assert.equal(engine.submit(g,'').type,'empty');assert.equal(g.streak,4);
  assert.equal(engine.submit(g,'19').type,'wrong');assert.equal(g.streak,0);assert.equal(g.lives,3);
  assert.equal(engine.submit(g,'0').type,'correct');
});
test('three missed drops end the game and later input cannot award points',()=>{
  const g=engine.createGame();g.drops=[1,2,3].map(id=>({id,y:.999,answer:1}));engine.advance(g,.2);
  assert.equal(g.lives,0);assert.equal(g.over,true);const score=g.score;engine.submit(g,'1');assert.equal(g.score,score);
});
test('higher levels increase speed and concurrent drops within a playable cap',()=>{
  const g=engine.createGame();const first=engine.difficulty(g);g.solved=80;const high=engine.difficulty(g);
  assert.ok(high.speed>first.speed);assert.ok(high.maxDrops>first.maxDrops);assert.ok(high.maxDrops<=4);
  for(let i=0;i<200;i++){engine.advance(g,.1);assert.ok(g.drops.length<=4)}
});
