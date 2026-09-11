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

test('in-game new-record highlights do not animate',async()=>{
  const files=await Promise.all([
    readFile(new URL('../dist/challenge.css',import.meta.url),'utf8'),
    readFile(new URL('../dist/rain.css',import.meta.url),'utf8')
  ]);
  for(const css of files){
    const rule=css.match(/\.new-record\s*\{([^}]*)\}/)?.[1]??'';
    assert.ok(rule.includes('background:#fff0bd'));
    assert.doesNotMatch(rule,/animation\s*:/);
  }
});

test('greater-number game is registered and styled',async()=>{
  const [app,index]=await Promise.all([
    readFile(new URL('../dist/app.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/index.html',import.meta.url),'utf8')
  ]);
  assert.match(app,/id:'compare'/);assert.match(app,/mountCompare/);
  assert.match(index,/compare\.css/);assert.match(index,/6 trò chơi/);
});

test('greater-number game advertises a two-minute round',async()=>{
  const [app,game]=await Promise.all([
    readFile(new URL('../dist/app.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/compare.mjs',import.meta.url),'utf8')
  ]);
  assert.match(app,/trong 2 phút/);
  assert.match(game,/Bắt đầu 2 phút/);
  assert.doesNotMatch(app+game,/60 giây/);
});

test('greater-number HUD stays focused without a difficulty counter',async()=>{
  const source=await readFile(new URL('../dist/compare.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/<span>Độ khó<\/span>/);
  assert.doesNotMatch(source,/BẬC \$\{compareStage\(g\)\}/);
});

test('greater-number record celebration appears only after the game',async()=>{
  const source=await readFile(new URL('../dist/compare.mjs',import.meta.url),'utf8');
  const hud=source.match(/function hud\(\)\{([\s\S]*?)\n  \}/)?.[1]||'';
  assert.doesNotMatch(hud,/new-record|Kỷ lục mới/);
  assert.match(source,/function finish\(\)[\s\S]*Kỷ lục mới!/);
});

test('greater-number timer counts the full active frame interval',async()=>{
  const source=await readFile(new URL('../dist/compare.mjs',import.meta.url),'utf8');
  assert.match(source,/const dt=last\?\(now-last\)\/1000:0/);
  assert.doesNotMatch(source,/Math\.min\(\.25,\(now-last\)\/1000\)/);
});
