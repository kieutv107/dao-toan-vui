import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProfile} from '../src/mastery-engine.mjs';
import {readFile} from 'node:fs/promises';
import {createPractice,current,answer,markHint,pickGame} from '../src/practice-engine.mjs';
import {formOf} from '../src/core-facts.mjs';
import {currentLevel} from '../src/adaptive-selector.mjs';

test('a chosen topic keeps the whole session on that level, records into shared progress and leaves the curriculum alone',()=>{
  const profile=createProfile(),events=[];
  const g=createPractice({profile,sessionId:'s1',random:()=>.4,focusLevel:3,record:e=>events.push(e)});
  assert.equal(g.focusLevel,3);assert.equal(g.questions.length,18);
  assert.ok(g.questions.every(q=>formOf(q).level===3),'only "Cộng qua 10" questions');
  answer(g,-1);answer(g,current(g).answer);
  assert.equal(events.length,2);assert.ok(events.every(e=>e.context==='practice'&&formOf(e.fact).level===3));
  assert.equal(currentLevel(profile),1);
});

test('pickGame spreads the finish-screen suggestion across every game it is given',()=>{
  const games=[{id:'rain'},{id:'bubble'},{id:'sheet'}];
  assert.equal(pickGame(games,()=>0).id,'rain');
  assert.equal(pickGame(games,()=>.5).id,'bubble');
  assert.equal(pickGame(games,()=>.999).id,'sheet');
});

test('practice finish suggests a random game from the game zone instead of always Bubble',async()=>{
  const [app,practice]=await Promise.all(['app.js','practice.mjs'].map(f=>readFile(new URL(`../src/${f}`,import.meta.url),'utf8')));
  assert.match(app,/gameModes=modes\.filter\(m=>m\.zone==='game'\)/);
  assert.match(app,/mountPractice\(app,\{\.\.\.common,startGame:start,games:gameModes,focusLevel\}\)/);
  assert.match(practice,/suggestion=pickGame\(games\)/);
  assert.match(practice,/id="practice-recommend">\$\{suggestion\.icon\} Chơi \$\{suggestion\.title\}</);
  assert.match(practice,/\$\('#practice-recommend'\)\.onclick=\(\)=>startGame\(suggestion\.id\)/);
  assert.doesNotMatch(practice,/startGame\('bubble'\)|Chơi Bắt bong bóng/);
});

test('practice creates an 18-question session from the current level without adjacent duplicates',()=>{
  const g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>.2});
  assert.equal(g.questions.length,18);assert.ok(g.questions.every(q=>q.sign==='+'));
  for(let i=1;i<g.questions.length;i++)assert.notEqual(g.questions[i].id,g.questions[i-1].id);
});

test('wrong answer requeues fact three to five places later and correct advances',()=>{
  const events=[],g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>0,record:e=>events.push(e)}),q=current(g),before=g.questions.length;
  const bad=answer(g,q.answer+1,{elapsedMs:1000});assert.equal(bad.correct,false);assert.equal(g.pos,0);assert.equal(g.questions.length,before+1);assert.equal(g.questions[3].id,q.id);
  const good=answer(g,q.answer,{elapsedMs:1000});assert.equal(good.correct,true);assert.equal(g.pos,1);assert.deepEqual(events.map(e=>e.result),['wrong','correct']);
});

test('hint records evidence and schedules review without advancing',()=>{
  const events=[],g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>.5,record:e=>events.push(e)}),q=current(g),before=g.questions.length;
  markHint(g);assert.equal(current(g).id,q.id);assert.equal(g.questions.length,before+1);assert.equal(events[0].result,'hint');
});

test('session completes after every queued question is answered correctly',()=>{
  const g=createPractice({profile:createProfile(),sessionId:'s1',random:()=>.3});
  while(current(g))answer(g,current(g).answer,{elapsedMs:1000});
  assert.equal(g.done,true);assert.equal(g.results.correct,18);
});
