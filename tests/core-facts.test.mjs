import {test} from 'node:test';
import assert from 'node:assert/strict';
import {factCatalog} from '../dist/mastery-engine.mjs';
import {LEVELS,MIXED_LEVEL,coreFacts,coreForms,coreFactOf,formOf,formsAtLevel,formsBelowLevel} from '../dist/core-facts.mjs';

const q=id=>factCatalog().find(f=>f.id===id);

test('core pool holds the strategy families and every one of their variants',()=>{
  const facts=coreFacts(),by=s=>facts.filter(f=>f.strategy===s).length;
  assert.equal(facts.length,35);
  assert.equal(by('make10'),5);assert.equal(by('double'),9);assert.equal(by('nearDouble'),9);assert.equal(by('bridge10'),12);
  assert.equal(coreForms().length,70);
  assert.equal(coreForms().reduce((n,f)=>n+f.questions.length,0),120);
});

test('one family gets one strategy, with make10 and doubles taking precedence',()=>{
  assert.equal(coreFactOf(q('5+5')).strategy,'make10');
  assert.equal(coreFactOf(q('6+6')).strategy,'double');
  assert.equal(coreFactOf(q('7+6')).strategy,'nearDouble');
  assert.equal(coreFactOf(q('8+5')).strategy,'bridge10');
  assert.equal(coreFactOf(q('13−8')).strategy,'bridge10');
  assert.equal(coreFactOf(q('12+3')),null);
  assert.equal(coreFactOf(q('0+10')),null);
});

test('commuted addition shares a form while subtraction is its own form',()=>{
  assert.equal(formOf(q('8+5')),formOf(q('5+8')));
  assert.notEqual(formOf(q('8+5')),formOf(q('13−8')));
  assert.equal(formOf(q('13−8')),formOf(q('13−5')));
  assert.deepEqual(coreFactOf(q('8+5')).variants,{'+':['5+8','8+5'],'−':['13−5','13−8']});
});

test('levels introduce addition first and subtraction from level four',()=>{
  assert.equal(LEVELS.length,5);assert.equal(MIXED_LEVEL,5);
  const sizes=[1,2,3,4].map(l=>formsAtLevel(l).length);
  assert.deepEqual(sizes,[9,14,12,27]);
  for(const l of [1,2,3])assert.ok(formsAtLevel(l).every(f=>f.sign==='+'));
  assert.ok(formsAtLevel(4).every(f=>f.sign==='−'&&f.fact.sum>=10));
  assert.equal(formsAtLevel(5).length,70);
  assert.equal(formsBelowLevel(3).length,23);
  assert.equal(formsBelowLevel(5).length,0);
  assert.ok(formsAtLevel(3).every(f=>f.fact.strategy==='bridge10'));
});
