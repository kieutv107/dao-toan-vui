import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {showCheck,showMiss,showStreak,announce,NEXT_DELAY_MS} from '../dist/feedback.mjs';

// Fake DOM tối thiểu: đủ cho className, children, textContent, attributes, remove.
function element(tag='div'){
  const node={tag,children:[],className:'',attrs:{},parent:null,text:''};
  node.classList={
    add:(...c)=>{node.className=[...new Set([...node.className.split(' ').filter(Boolean),...c])].join(' ')},
    remove:(...c)=>{node.className=node.className.split(' ').filter(x=>!c.includes(x)).join(' ')},
    contains:c=>node.className.split(' ').includes(c)
  };
  node.setAttribute=(k,v)=>{node.attrs[k]=v};
  node.getAttribute=k=>node.attrs[k]??null;
  node.appendChild=child=>{node.children.push(child);child.parent=node;return child};
  node.remove=()=>{if(node.parent){node.parent.children.splice(node.parent.children.indexOf(node),1);node.parent=null}};
  Object.defineProperty(node,'textContent',{
    get:()=>node.text+node.children.map(c=>c.textContent).join(''),
    set:v=>{node.text=String(v);node.children.forEach(c=>{c.parent=null});node.children=[]}
  });
  node.ownerDocument={createElement:t=>element(t)};
  return node;
}
const byClass=(node,c)=>node.children.filter(ch=>ch.classList.contains(c));

test('NEXT_DELAY_MS is the shared 450 ms beat',()=>{assert.equal(NEXT_DELAY_MS,450)});

test('showCheck with an answer fills the box with a check that morphs into the number after 200 ms',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const box=element('b');box.textContent='?';
  showCheck(box,12);
  assert.ok(box.classList.contains('is-check'));
  assert.equal(box.text,'');
  const [check]=byClass(box,'fb-check-fill'),[answer]=byClass(box,'fb-answer');
  assert.equal(check.textContent,'✓');assert.equal(check.getAttribute('aria-hidden'),'true');
  assert.equal(answer.textContent,'12');assert.equal(answer.getAttribute('aria-hidden'),'true');
  t.mock.timers.tick(199);assert.equal(byClass(box,'fb-check-fill').length,1);
  t.mock.timers.tick(1);assert.equal(byClass(box,'fb-check-fill').length,0);
  assert.equal(byClass(box,'fb-answer').length,1);
});

test('showCheck without an answer pins a check badge and keeps the existing content',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const card=element('button'),label=card.appendChild(element('b'));label.textContent='7 + 5';
  showCheck(card);
  assert.ok(card.classList.contains('is-check'));
  assert.equal(card.children[0],label);
  const [badge]=byClass(card,'fb-check-badge');
  assert.equal(badge.textContent,'✓');assert.equal(badge.getAttribute('aria-hidden'),'true');
  t.mock.timers.tick(5000);assert.equal(byClass(card,'fb-check-badge').length,1);
});

test('showMiss shows a red cross for 300 ms then cleans up',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const button=element('button');button.textContent='9';
  showMiss(button);
  assert.ok(button.classList.contains('has-miss'));
  const [miss]=byClass(button,'fb-miss');assert.equal(miss.textContent,'✗');assert.equal(miss.getAttribute('aria-hidden'),'true');
  assert.equal(button.text,'9');
  t.mock.timers.tick(299);assert.equal(byClass(button,'fb-miss').length,1);
  t.mock.timers.tick(1);assert.equal(byClass(button,'fb-miss').length,0);assert.ok(!button.classList.contains('has-miss'));
});

test('showStreak floats a pill for 600 ms and survives the check morph on the same box',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const box=element('b');box.textContent='?';
  showCheck(box,12);showStreak(box,3);
  const [pill]=byClass(box,'fb-streak');assert.equal(pill.textContent,'Chuỗi 3');assert.equal(pill.getAttribute('aria-hidden'),'true');
  assert.ok(box.classList.contains('has-streak'));
  t.mock.timers.tick(200);assert.equal(byClass(box,'fb-streak').length,1,'morph must not wipe the pill');
  t.mock.timers.tick(399);assert.equal(byClass(box,'fb-streak').length,1);
  t.mock.timers.tick(1);assert.equal(byClass(box,'fb-streak').length,0);assert.ok(!box.classList.contains('has-streak'));
});

test('announce replaces the live region content with visually hidden text',()=>{
  const region=element('div');region.textContent='cũ';
  announce(region,'Chính xác, 7 + 5 = 12');
  assert.equal(region.text,'');
  const [sr]=byClass(region,'sr-only');
  assert.equal(sr.textContent,'Chính xác, 7 + 5 = 12');assert.equal(sr.getAttribute('aria-hidden'),null);
});

test('feedback stylesheet defines the check, miss, streak and sr-only styles and is loaded',async()=>{
  const [css,index]=await Promise.all([
    readFile(new URL('../dist/feedback.css',import.meta.url),'utf8'),
    readFile(new URL('../dist/index.html',import.meta.url),'utf8')
  ]);
  for(const cls of ['is-check','fb-check-fill','fb-check-badge','fb-answer','fb-miss','fb-streak','sr-only'])assert.match(css,new RegExp(`\\.${cls}\\b`),cls);
  for(const kf of ['fb-pop','fb-fade-in','fb-badge','fb-rise'])assert.match(css,new RegExp(`@keyframes ${kf}\\{`),kf);
  assert.match(css,/\.is-check,\.has-miss,\.has-streak\{position:relative/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]*\.fb-check-fill\{display:none\}/);
  assert.match(css,/\.answers button\.wrong\.has-miss\{opacity:1\}/);
  assert.match(css,/\.answers button\.wrong\{transition:opacity \.2s/);
  assert.match(index,/<link rel="stylesheet" href="feedback\.css\?v=2">/);
});

test('practice wires check, miss and the shared delay but no streak',async()=>{
  const src=await readFile(new URL('../dist/practice.mjs',import.meta.url),'utf8');
  assert.match(src,/import \{showCheck,showMiss,announce,NEXT_DELAY_MS\} from '\.\/feedback\.mjs'/);
  assert.match(src,/showCheck\(\$\('\.unknown'\),q\.answer\)/);
  assert.match(src,/showMiss\(button\)/);
  assert.match(src,/announce\(\$\('#feedback'\),`Chính xác, \$\{q\.a\} \$\{q\.sign\} \$\{q\.b\} = \$\{q\.answer\}`\)/);
  assert.match(src,/,NEXT_DELAY_MS\)/);
  assert.doesNotMatch(src,/,700\)/);
  assert.doesNotMatch(src,/showStreak/);
  assert.doesNotMatch(src,/feedback\(`Chính xác!/);
});

test('challenge games wire check, miss, streak and the shared delay',async()=>{
  const src=await readFile(new URL('../dist/challenge.mjs',import.meta.url),'utf8');
  assert.match(src,/import \{showCheck,showMiss,showStreak,announce,NEXT_DELAY_MS\} from '\.\/feedback\.mjs'/);
  assert.match(src,/showCheck\(\$\('\.unknown'\),expected\)/);
  assert.match(src,/showMiss\(button\)/);
  assert.match(src,/if\(g\.streak>0&&g\.streak%3===0\)showStreak\(\$\('\.unknown'\),g\.streak\)/);
  assert.match(src,/later\(NEXT_DELAY_MS,go\)/);
  assert.doesNotMatch(src,/1100-difficulty\(\)\.level\*80/);
  assert.doesNotMatch(src,/feedback\(`Chính xác! \+/);
});

test('compare game pins the check on the chosen card and uses the shared delay',async()=>{
  const src=await readFile(new URL('../dist/compare.mjs',import.meta.url),'utf8');
  assert.match(src,/import \{showCheck,showMiss,showStreak,announce,NEXT_DELAY_MS\} from '\.\/feedback\.mjs'/);
  assert.match(src,/if\(button\.dataset\.compareChoice===answer\)\{button\.classList\.add\('right'\);showCheck\(button\)\}/);
  assert.match(src,/else if\(button\.dataset\.compareChoice===choice\)\{button\.classList\.add\('wrong'\);showMiss\(button\)\}/);
  assert.match(src,/if\(g\.streak>0&&g\.streak%3===0\)showStreak\(chosen,g\.streak\)/);
  assert.match(src,/delayLeft=NEXT_DELAY_MS\/1000/);
  assert.doesNotMatch(src,/delayLeft=\.65/);
  assert.doesNotMatch(src,/`Chính xác! \+\$\{points\}/);
  assert.match(src,/delayLeft=1;/);
});
