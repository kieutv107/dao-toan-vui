import {test} from 'node:test';
import assert from 'node:assert/strict';
const engine = await import('../src/rain-engine.mjs').catch(()=>({}));
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
test('gold probability starts low, rises with level, and remains capped',()=>{
  const g=engine.createGame();assert.equal(engine.difficulty(g).goldChance,0);
  g.solved=6;const low=engine.difficulty(g).goldChance;assert.equal(low,.06);
  g.solved=18;assert.ok(engine.difficulty(g).goldChance>low);
  g.solved=1000;assert.ok(engine.difficulty(g).goldChance<=.2);
});
test('gold is a chance event with a spawn gap and no simultaneous gold cards',()=>{
  const g=engine.createGame();g.solved=6;
  engine.advance(g,0,()=>0);assert.equal(g.drops[0].special,false);
  g.spawnIn=0;engine.advance(g,0,()=>.99);assert.equal(g.drops.filter(d=>d.special).length,0);
  g.drops.pop();g.spawnIn=0;engine.advance(g,0,()=>0);assert.equal(g.drops.filter(d=>d.special).length,1);
  g.solved=80;g.spawnIn=0;engine.advance(g,0,()=>0);assert.equal(g.drops.filter(d=>d.special).length,1);
  g.drops=g.drops.filter(d=>!d.special);g.spawnIn=0;engine.advance(g,0,()=>0);assert.equal(g.drops.filter(d=>d.special).length,0);
});
test('blank input does nothing; wrong answers reset streak without costing lives',()=>{
  const g=engine.createGame();g.streak=4;g.drops=[{id:1,answer:0,y:.1}];
  assert.equal(engine.submit(g,'').type,'empty');assert.equal(g.streak,4);
  assert.equal(engine.submit(g,'19').type,'wrong');assert.equal(g.streak,0);assert.equal(g.lives,3);
  assert.equal(engine.submit(g,'0').type,'correct');
});
test('one crossing clears the field, costs one life, and grants a short breathing space',()=>{
  const g=engine.createGame();g.drops=[{id:1,y:.999,answer:1},{id:2,y:.5,answer:4,special:true},{id:3,y:.999,answer:9}];
  engine.advance(g,.2);assert.equal(g.lives,2);assert.equal(g.drops.length,0);assert.ok(g.spawnIn>=1);assert.equal(g.streak,0);
  engine.advance(g,.1);assert.equal(g.drops.length,0);
});
test('three separate misses end the game and later input cannot award points',()=>{
  const g=engine.createGame();for(let i=0;i<3;i++){g.drops=[{id:i,y:.999,answer:1}];engine.advance(g,.2)}
  assert.equal(g.lives,0);assert.equal(g.over,true);const score=g.score;engine.submit(g,'1');assert.equal(g.score,score);
});
test('higher levels increase concurrent drops without accelerating fall or spawn cadence',()=>{
  const g=engine.createGame();const first=engine.difficulty(g);g.solved=80;const high=engine.difficulty(g);
  assert.equal(high.speed,first.speed);assert.equal(high.interval,first.interval);assert.ok(high.maxDrops>first.maxDrops);assert.ok(high.maxDrops<=4);
  for(let i=0;i<200;i++){engine.advance(g,.1);assert.ok(g.drops.length<=4)}
});

test('a drop travels the same distance at every level over the same elapsed time',()=>{
  const positions=[];
  for(const solved of [0,6,18,60,600]){const g=engine.createGame();g.solved=solved;g.drops=[{id:1,lane:0,y:.1,answer:3}];engine.advance(g,2);positions.push(g.drops[0].y)}
  for(const y of positions)assert.equal(y,positions[0]);
});

test('adaptive suppliers create normal drops and hardest gold drops',()=>{
  const normal={a:1,b:2,sign:'+',answer:3,id:'normal'},hard={a:9,b:8,sign:'+',answer:17,id:'hard'};
  const g=engine.createGame();g.spawnIn=0;engine.advance(g,.1,()=>.9,{normalFact:()=>normal,hardestFact:()=>hard});assert.equal(g.drops[0].factId,'normal');
  g.solved=6;g.spawnIn=0;g.goldGap=0;engine.advance(g,.1,()=>0,{normalFact:()=>normal,hardestFact:()=>hard});assert.equal(g.drops.find(x=>x.special).factId,'hard');
});

test('a new drop never duplicates an equation already falling',()=>{
  const facts=[{a:1,b:1,sign:'+',answer:2,id:'a'},{a:1,b:2,sign:'+',answer:3,id:'b'},{a:1,b:3,sign:'+',answer:4,id:'c'}];
  const supplier=exclude=>facts.find(f=>!(exclude||[]).includes(f.id))||facts[0];
  const g=engine.createGame();g.solved=18; // level 4 lets three drops share the field
  for(let i=0;i<3;i++){g.spawnIn=0;engine.advance(g,0,()=>.9,{normalFact:supplier,hardestFact:supplier})}
  const ids=g.drops.map(d=>d.factId);
  assert.ok(ids.length>1,'several drops coexist at this level');
  assert.equal(new Set(ids).size,ids.length,'no two on-screen drops share an equation');
});

test('learning evidence returns only the correctly targeted drop',()=>{
  const g=engine.createGame();g.drops=[{id:1,answer:5,y:.8},{id:2,answer:5,y:.2},{id:3,answer:9,y:.1,special:true}];
  const ordinary=engine.submit(g,'5');assert.equal(engine.learningFact(ordinary).id,1);
  assert.equal(engine.learningFact({type:'wrong'}),null);
  const h=engine.createGame();h.drops=[{id:4,answer:4,y:.2},{id:5,answer:9,y:.3,special:true}];const gold=engine.submit(h,'9');assert.equal(engine.learningFact(gold).id,5);
});
