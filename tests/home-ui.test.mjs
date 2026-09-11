import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('home template has no stray patch markers between its sections',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\n\+\s+<(?:section|div)\b/);
});

test('home introduces the 11–15 starting level',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(source,/bắt đầu với các phép tính từ 11 đến 15/);
});
