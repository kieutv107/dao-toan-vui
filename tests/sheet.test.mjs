import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProfile,recordEvidence} from '../src/mastery-engine.mjs';
import {formsAtLevel,formOf} from '../src/core-facts.mjs';
import {createSheet,setAnswer,filledCount,grade,SHEET_SIZE} from '../src/sheet-engine.mjs';
import {currentLevel} from '../src/adaptive-selector.mjs';

test('a level-one sheet holds 12 distinct level-one questions',()=>{
  const profile=createProfile(),g=createSheet({profile,sessionId:'s',random:()=>.3});
  assert.equal(SHEET_SIZE,12);assert.equal(g.questions.length,12);assert.equal(g.answers.length,12);
  assert.equal(new Set(g.questions.map(q=>q.id)).size,12);
  assert.equal(g.questions.filter(q=>formOf(q).level===1).length,12);
  assert.equal(currentLevel(profile),1);
});

test('a longer unique sheet borrows from the next level instead of repeating',()=>{
  const profile=createProfile(),g=createSheet({profile,sessionId:'s',random:()=>.3,count:20});
  assert.equal(new Set(g.questions.map(q=>q.id)).size,20);
  assert.equal(g.questions.filter(q=>formOf(q).level===1).length,13);
  assert.equal(g.questions.filter(q=>formOf(q).level===2).length,7);
  assert.equal(currentLevel(profile),1);
});

test('no sheet ever repeats a question, whatever the random draw',()=>{
  const draws=[()=>0,()=>.999,()=>.5,...Array.from({length:30},()=>Math.random)];
  for(const random of draws){
    const g=createSheet({profile:createProfile(),sessionId:'s',random});
    assert.equal(new Set(g.questions.map(q=>q.id)).size,12);
  }
});

test('at a later level the sheet mixes the focus level with review',()=>{
  const p=createProfile();
  for(const level of [1,2])for(const form of formsAtLevel(level))for(const sessionId of ['a','b'])recordEvidence(p,{fact:form.questions[0],result:'correct',elapsedMs:1000,context:'practice',sessionId});
  let i=0;const g=createSheet({profile:p,sessionId:'s',random:()=>[.1,.5,.1,.5,.1,.5,.8,.5][i++%8]});
  assert.equal(new Set(g.questions.map(q=>q.id)).size,12);
  assert.ok(g.questions.filter(q=>formOf(q).level===3).length>=7);
});

test('answers accept integers only and can be cleared',()=>{
  const g=createSheet({profile:createProfile(),sessionId:'s',random:()=>.3});
  assert.equal(setAnswer(g,0,'13'),true);assert.equal(g.answers[0],13);
  setAnswer(g,1,'');assert.equal(g.answers[1],null);
  setAnswer(g,2,'abc');assert.equal(g.answers[2],null);
  setAnswer(g,3,'1.5');assert.equal(g.answers[3],null);
  assert.equal(setAnswer(g,99,'1'),false);
  assert.equal(filledCount(g),1);
});

test('grading marks each question once, counts blanks as wrong and records evidence',()=>{
  const events=[],g=createSheet({profile:createProfile(),sessionId:'s',random:()=>.3,record:e=>events.push(e)});
  g.questions.forEach((q,i)=>{if(i<8)setAnswer(g,i,q.answer);else if(i<10)setAnswer(g,i,q.answer+1)});
  const r=grade(g);
  assert.deepEqual(r,{correct:8,wrong:2,blank:2});
  assert.equal(g.marks[0].correct,true);assert.equal(g.marks[8].correct,false);assert.equal(g.marks[8].given,g.questions[8].answer+1);
  assert.equal(g.marks[10].blank,true);assert.equal(g.marks[10].expected,g.questions[10].answer);
  assert.equal(events.length,12);assert.ok(events.every(e=>e.context==='sheet'&&e.sessionId==='s'&&e.elapsedMs===undefined));
  assert.equal(events.filter(e=>e.result==='correct').length,8);assert.equal(events.filter(e=>e.result==='wrong').length,4);
  assert.equal(setAnswer(g,11,'1'),false);
  assert.equal(grade(g),r);assert.equal(events.length,12);
});

test('sheet mode is registered and styled',async()=>{
  const [app,index]=await Promise.all([
    readFile(new URL('../src/app.js',import.meta.url),'utf8'),
    readFile(new URL('../src/index.html',import.meta.url),'utf8')
  ]);
  assert.match(app,/id:'sheet'/);assert.match(app,/mountSheet/);
  assert.match(index,/sheet\.css/);assert.match(index,/8 trò chơi/);
});

test('rows carry no question number',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../src/sheet.mjs',import.meta.url),'utf8'),
    readFile(new URL('../src/sheet.css',import.meta.url),'utf8')
  ]);
  assert.doesNotMatch(ui,/sheet-num/);
  assert.doesNotMatch(css,/sheet-num/);
});

test('equation spreads its terms and operators evenly with flex',async()=>{
  const css=await readFile(new URL('../src/sheet.css',import.meta.url),'utf8');
  const eq=css.match(/\.sheet-eq\{[^}]*\}/)[0];
  assert.match(eq,/display:flex/);
  assert.match(eq,/justify-content:space-evenly/);
  assert.doesNotMatch(eq,/grid-template-columns/);
  assert.match(eq,/white-space:nowrap/);
  const row=css.match(/\.sheet-row\{[^}]*\}/)[0];
  assert.match(row,/grid-template-columns:minmax\(0,1fr\) var\(--box\) auto/);
  const label=css.match(/\.sheet-row label\{[^}]*\}/)[0];
  assert.match(label,/min-width:0/);
});
