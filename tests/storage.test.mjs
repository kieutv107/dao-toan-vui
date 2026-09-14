import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLearningStore} from '../dist/learning-store.mjs';
import {createHighScoreStore} from '../dist/high-scores.mjs';

function memoryStorage(seed={}){const data=new Map(Object.entries(seed));return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}

test('learning store round trips and recovers from corrupt data',()=>{
  const storage=memoryStorage(),store=createLearningStore(storage),profile=store.load();profile.facts.x={strength:2};store.save(profile);
  assert.equal(createLearningStore(storage).load().facts.x.strength,2);
  storage.setItem('toan-learning-v1','bad json');
  assert.deepEqual(createLearningStore(storage).load().facts,{});
});

test('learning store upgrades a stored version one profile and writes it back',()=>{
  const storage=memoryStorage({'toan-learning-v1':JSON.stringify({version:1,facts:{'8+5':{strength:2,correct:1,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:1,dueAt:1}},timings:{}})});
  const p=createLearningStore(storage).load();
  assert.equal(p.version,2);assert.equal(p.facts['5+8=13:+'].strength,2);assert.equal(p.facts['8+5'],undefined);
  assert.equal(JSON.parse(storage.getItem('toan-learning-v1')).version,2);
});

test('learning store remains usable when browser storage throws',()=>{
  const storage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
  const store=createLearningStore(storage),p=store.load();p.facts.x={strength:1};assert.doesNotThrow(()=>store.save(p));assert.equal(store.load().facts.x.strength,1);assert.doesNotThrow(()=>store.reset());
});

test('high scores keep five descending scores per game',()=>{
  const store=createHighScoreStore(memoryStorage());
  assert.deepEqual(store.record('rain',10),{scores:[10],newRecord:true,previousBest:0,rank:0});
  [40,20,50,30,5].forEach(x=>store.record('rain',x));
  assert.deepEqual(store.top('rain'),[50,40,30,20,10]);
  assert.deepEqual(store.top('bubble'),[]);
});

test('record ranks this run after equal older scores and returns -1 when it misses the top five',()=>{
  const store=createHighScoreStore(memoryStorage());
  [50,40,30,20,10].forEach(x=>store.record('bubble',x));
  const tie=store.record('bubble',30);
  assert.deepEqual(tie.scores,[50,40,30,30,20]);assert.equal(tie.rank,3);
  assert.equal(store.record('bubble',5).rank,-1);
  const bumped=store.record('bubble',20);
  assert.equal(bumped.rank,-1);assert.deepEqual(bumped.scores,[50,40,30,30,20]);
  assert.equal(store.record('bubble',60).rank,0);
});

test('equal best and zero are not new records',()=>{
  const store=createHighScoreStore(memoryStorage());store.record('memory',100);
  assert.equal(store.record('memory',100).newRecord,false);
  assert.equal(store.record('mystery',0).newRecord,false);
});

test('score reset clears every game',()=>{
  const store=createHighScoreStore(memoryStorage());store.record('rain',20);store.record('memory',30);store.reset();
  assert.deepEqual(store.top('rain'),[]);assert.deepEqual(store.top('memory'),[]);
});
