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
test('one answer clears every matching drop and rewards one streak step',()=>{
  const g=engine.createGame();g.drops=[{id:1,answer:5,y:.2},{id:2,answer:5,y:.8},{id:3,answer:9,y:.4}];
  const result=engine.submit(g,'5');assert.equal(result.cleared.length,2);assert.deepEqual(g.drops.map(d=>d.id),[3]);assert.equal(g.streak,1);assert.equal(g.solved,1);assert.equal(g.score,10);
});
test('matching a gold drop clears the entire field even if an ordinary match is lower',()=>{
  const g=engine.createGame();g.drops=[{id:1,answer:5,y:.9},{id:2,answer:5,y:.2,special:true},{id:3,answer:9,y:.4}];
  const result=engine.submit(g,'5');assert.equal(result.special,true);assert.equal(result.cleared.length,3);assert.equal(g.drops.length,0);assert.equal(g.streak,1);assert.equal(g.solved,1);
});
test('ordinary answer leaves a nonmatching gold drop intact; wrong answer clears nothing',()=>{
  const g=engine.createGame();g.drops=[{id:1,answer:5,y:.2},{id:2,answer:9,y:.4,special:true}];
  engine.submit(g,'4');assert.equal(g.drops.length,2);engine.submit(g,'5');assert.deepEqual(g.drops.map(d=>d.id),[2]);
});
test('multi-drop levels spawn a gold card alongside an ordinary card, never two gold cards',()=>{
  const g=engine.createGame();engine.advance(g,0);assert.equal(g.drops[0].special,false);
  g.solved=6;g.spawnIn=0;engine.advance(g,0);assert.equal(g.drops.filter(d=>d.special).length,1);
  g.solved=80;for(let i=0;i<10;i++){g.spawnIn=0;engine.advance(g,0);assert.ok(g.drops.filter(d=>d.special).length<=1)}
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
