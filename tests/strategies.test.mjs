import {test} from 'node:test';
import assert from 'node:assert/strict';
import {strategyHint} from '../dist/strategies.mjs';

const f=(a,sign,b)=>({a,b,sign,answer:sign==='+'?a+b:a-b});

test('bridge10 hints walk through ten in both directions',()=>{
  assert.deepEqual(strategyHint(f(8,'+',5)).lines,['8 + 2 = 10','10 + 3 = 13']);
  assert.deepEqual(strategyHint(f(5,'+',8)).lines,['8 + 2 = 10','10 + 3 = 13']);
  assert.deepEqual(strategyHint(f(13,'−',8)).lines,['13 − 3 = 10','10 − 5 = 5']);
});

test('make10 uses the ten frame and doubles or near doubles explain the pattern',()=>{
  const m=strategyHint(f(7,'+',3));assert.equal(m.strategy,'make10');assert.equal(m.frame,'ten');assert.deepEqual(m.dots,{total:10,from:7,mode:'added'});
  assert.equal(strategyHint(f(6,'+',6)).strategy,'double');assert.match(strategyHint(f(6,'+',6)).lines[0],/Gấp đôi 6/);
  assert.deepEqual(strategyHint(f(6,'+',7)).lines,['6 + 6 = 12, thêm 1 nữa.','12 + 1 = 13']);
  assert.match(strategyHint(f(13,'−',7)).lines[1],/13 − 7 = 6/);
});

test('facts outside the core pool fall back to counting dots',()=>{
  const h=strategyHint(f(12,'+',3));assert.equal(h.strategy,null);assert.equal(h.frame,'dots');
  assert.match(h.lines[0],/Đếm 12 chấm/);assert.deepEqual(h.dots,{total:15,from:12,mode:'added'});
  assert.deepEqual(strategyHint(f(15,'−',4)).dots,{total:15,from:11,mode:'removed'});
});
