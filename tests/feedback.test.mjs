import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as feedback from '../src/feedback.mjs';
import {showCenterCheck,showMiss,showLevelUp,announce,NEXT_DELAY_MS,celebrateRecord} from '../src/feedback.mjs';

// Fake DOM tối thiểu: đủ cho className, children, textContent, attributes, style, remove.
function element(tag='div'){
  const node={tag,children:[],className:'',attrs:{},parent:null,text:''};
  node.style={setProperty:(k,v)=>{node.style[k]=v}};
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

test('showCenterCheck pops one big check in the middle of the play surface for 600 ms and leaves the ? box alone',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const surface=element('section'),box=surface.appendChild(element('b'));box.textContent='?';
  showCenterCheck(surface);
  const [check]=byClass(surface,'fb-check-center');
  assert.equal(check.textContent,'✓');assert.equal(check.getAttribute('aria-hidden'),'true');
  assert.equal(box.textContent,'?');assert.ok(!box.classList.contains('is-check'));
  t.mock.timers.tick(599);assert.equal(byClass(surface,'fb-check-center').length,1);
  t.mock.timers.tick(1);assert.equal(byClass(surface,'fb-check-center').length,0);
});

test('every game shares the centre check, so the corner check badge is gone',()=>{
  assert.equal(feedback.showCheck,undefined);
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

test('showLevelUp floats a "Lên cấp" pill centred on the HUD level cell for 600 ms then cleans up',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const surface=element('section'),cell=element('div');
  Object.assign(surface,{clientLeft:1,clientTop:1,getBoundingClientRect:()=>({left:100,top:50,width:600,height:500})});
  cell.getBoundingClientRect=()=>({left:340,top:70,width:100,height:40});
  showLevelUp(surface,2,cell);
  const [placed]=byClass(surface,'fb-levelup');
  assert.equal(placed.style.left,'289px');assert.equal(placed.style.top,'39px');
  const [pill]=byClass(surface,'fb-levelup');assert.equal(pill.textContent,'⬆ Lên cấp 2!');assert.equal(pill.getAttribute('aria-hidden'),'true');
  assert.ok(surface.classList.contains('has-levelup'));
  t.mock.timers.tick(599);assert.equal(byClass(surface,'fb-levelup').length,1);
  t.mock.timers.tick(1);assert.equal(byClass(surface,'fb-levelup').length,0);assert.ok(!surface.classList.contains('has-levelup'));
});

test('announce replaces the live region content with visually hidden text',()=>{
  const region=element('div');region.textContent='cũ';
  announce(region,'Chính xác, 7 + 5 = 12');
  assert.equal(region.text,'');
  const [sr]=byClass(region,'sr-only');
  assert.equal(sr.textContent,'Chính xác, 7 + 5 = 12');assert.equal(sr.getAttribute('aria-hidden'),null);
});

function pageWithConfetti(){
  const layer=element('div'),app=element('main');
  app.ownerDocument={createElement:t=>element(t),getElementById:id=>id==='confetti'?layer:null};
  return {layer,app};
}

test('celebrateRecord rains colored confetti from the page layer for 2.2 s then clears it',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {layer,app}=pageWithConfetti();
  celebrateRecord(app);
  assert.ok(layer.children.length>=20);
  for(const piece of layer.children){
    assert.equal(piece.tag,'i');
    assert.match(piece.style['--x'],/^\d+(\.\d+)?%$/);
    assert.match(piece.style['--delay'],/^\d+(\.\d+)?s$/);
    assert.match(piece.style['--r'],/^\d+deg$/);
    assert.match(piece.style.background,/^#[0-9a-f]{6}$/);
  }
  t.mock.timers.tick(2199);assert.ok(layer.children.length>0);
  t.mock.timers.tick(1);assert.equal(layer.children.length,0);
});

test('a second celebration replaces the confetti and is not cut short by the first timer',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {layer,app}=pageWithConfetti();
  celebrateRecord(app);const count=layer.children.length;
  t.mock.timers.tick(2000);celebrateRecord(app);
  assert.equal(layer.children.length,count);
  t.mock.timers.tick(300);assert.equal(layer.children.length,count);
  t.mock.timers.tick(1900);assert.equal(layer.children.length,0);
});

test('celebrateRecord does nothing when the page has no confetti layer',()=>{
  const app=element('main');app.ownerDocument={createElement:t=>element(t),getElementById:()=>null};
  assert.doesNotThrow(()=>celebrateRecord(app));
});

test('record celebration pops the trophy and title and stays calm with reduced motion',async()=>{
  const [css,style]=await Promise.all([
    readFile(new URL('../src/feedback.css',import.meta.url),'utf8'),
    readFile(new URL('../src/style.css',import.meta.url),'utf8')
  ]);
  assert.match(css,/\.record-trophy\{[^}]*animation:record-trophy /);
  assert.match(css,/\.record-trophy:before\{[^}]*animation:record-glow /);
  assert.match(css,/\.record-title\{[^}]*animation:record-title /);
  for(const kf of ['record-trophy','record-glow','record-title'])assert.match(css,new RegExp(`@keyframes ${kf}\\{`),kf);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^@]*\.record-trophy:before\{display:none\}/);
  assert.match(style,/@media\(prefers-reduced-motion:reduce\)\{[^@]*#confetti\{display:none\}/);
});

test('feedback stylesheet defines the check, miss, streak and sr-only styles and is loaded',async()=>{
  const [css,index]=await Promise.all([
    readFile(new URL('../src/feedback.css',import.meta.url),'utf8'),
    readFile(new URL('../src/index.html',import.meta.url),'utf8')
  ]);
  for(const cls of ['fb-check-center','fb-miss','fb-levelup','sr-only'])assert.match(css,new RegExp(`\\.${cls}\\b`),cls);
  for(const kf of ['fb-pop','fb-center','fb-rise'])assert.match(css,new RegExp(`@keyframes ${kf}\\{`),kf);
  assert.match(css,/\.has-miss,\.has-levelup\{position:relative/);
  assert.doesNotMatch(css,/fb-check-badge|fb-badge|is-check/);
  // the level-up pill is placed over the HUD level cell by script; CSS only centres it on that point
  // the CSS rise and the removal timer (LEVELUP_MS) share one 600 ms beat, so the pill never vanishes mid-flight
  assert.match(css,/\.fb-levelup\{[^}]*margin-top:-18px[^}]*animation:fb-rise \.6s/);
  assert.doesNotMatch(css,/\.play>\.fb-levelup|\.rain-field>\.fb-levelup/);
  assert.doesNotMatch(css,/fb-streak|has-streak/);
  assert.match(css,/\.fb-check-center\{[^}]*position:absolute;left:50%;top:50%[^}]*pointer-events:none[^}]*animation:fb-center \.6s/);
  assert.doesNotMatch(css,/fb-check-fill|fb-answer|fb-fade-in|\.unknown\.is-check/);
  assert.match(css,/\.answers button\.wrong\.has-miss\{opacity:1\}/);
  assert.match(css,/\.answers button\.wrong\{transition:opacity \.2s/);
  assert.match(index,/<link rel="stylesheet" href="feedback\.css\?v=2">/);
});

test('practice wires check, miss and the shared delay but no streak',async()=>{
  const src=await readFile(new URL('../src/practice.mjs',import.meta.url),'utf8');
  assert.match(src,/import \{showCenterCheck,showMiss,announce,NEXT_DELAY_MS\} from '\.\/feedback\.mjs'/);
  assert.match(src,/showCenterCheck\(\$\('\.play'\)\)/);
  assert.doesNotMatch(src,/showCheck\(/);
  assert.match(src,/showMiss\(button\)/);
  assert.match(src,/announce\(\$\('#feedback'\),`Chính xác, \$\{q\.a\} \$\{q\.sign\} \$\{q\.b\} = \$\{q\.answer\}`\)/);
  assert.match(src,/,NEXT_DELAY_MS\)/);
  assert.doesNotMatch(src,/,700\)/);
  assert.doesNotMatch(src,/showStreak|showLevelUp/);
  assert.doesNotMatch(src,/feedback\(`Chính xác!/);
});

test('challenge games wire check, miss, streak and the shared delay',async()=>{
  const src=await readFile(new URL('../src/challenge.mjs',import.meta.url),'utf8');
  assert.match(src,/import \{showCenterCheck,showMiss,showLevelUp,announce,NEXT_DELAY_MS,celebrateRecord\} from '\.\/feedback\.mjs'/);
  assert.match(src,/showCenterCheck\(\$\('\.challenge'\)\)/);
  assert.doesNotMatch(src,/showCheck\(/);
  assert.match(src,/showMiss\(button\)/);
  assert.match(src,/const levelBefore=difficulty\(\)\.level,points=recordAnswer\(g,true\)/);
  assert.match(src,/<div class="hud-level"><span>Cấp độ<\/span><b>\$\{d\.level\}<\/b><\/div>/);
  assert.match(src,/if\(difficulty\(\)\.level>levelBefore\)showLevelUp\(\$\('\.challenge'\),difficulty\(\)\.level,\$\('\.hud-level'\)\)/);
  // memory moves to the next board without a level-up pill
  assert.match(src,/\$\('#next-board'\)\.onclick=\(\)=>\{if\(!paused\)\{g\.board\+\+;memoryBoard\(\)\}\}/);
  assert.equal(src.match(/showLevelUp\(/g).length,1);
  assert.doesNotMatch(src,/showStreak|g\.streak%3/);
  assert.match(src,/later\(NEXT_DELAY_MS,go\)/);
  assert.doesNotMatch(src,/1100-difficulty\(\)\.level\*80/);
  assert.doesNotMatch(src,/feedback\(`Chính xác! \+/);
});

test('compare game pops the shared centre check on a correct answer and uses the shared delay',async()=>{
  const src=await readFile(new URL('../src/compare.mjs',import.meta.url),'utf8');
  assert.match(src,/import \{showCenterCheck,showMiss,announce,NEXT_DELAY_MS,celebrateRecord\} from '\.\/feedback\.mjs'/);
  assert.match(src,/award\(\);beep\(\);showCenterCheck\(\$\('\.compare-game'\)\);/);
  // the right card still turns green, but no corner badge on it (also after a wrong answer)
  assert.match(src,/if\(button\.dataset\.compareChoice===answer\)button\.classList\.add\('right'\);else if/);
  assert.doesNotMatch(src,/showCheck\(/);
  assert.match(src,/else if\(button\.dataset\.compareChoice===choice\)\{button\.classList\.add\('wrong'\);showMiss\(button\)\}/);
  // the compare HUD has no level cell, so there is no level-up pill
  assert.doesNotMatch(src,/showLevelUp/);
  assert.doesNotMatch(src,/showStreak|g\.streak%3/);
  assert.match(src,/delayLeft=NEXT_DELAY_MS\/1000/);
  assert.doesNotMatch(src,/delayLeft=\.65/);
  assert.doesNotMatch(src,/`Chính xác! \+\$\{points\}/);
  assert.match(src,/delayLeft=1;/);
});

test('rain shows the level-up pill on its field when a correct answer raises the level',async()=>{
  const src=await readFile(new URL('../src/rain.mjs',import.meta.url),'utf8');
  assert.match(src,/import \{celebrateRecord,showLevelUp\} from '\.\/feedback\.mjs'/);
  assert.match(src,/const levelBefore=difficulty\(g\)\.level,result=submit\(g,input\)/);
  assert.match(src,/if\(difficulty\(g\)\.level>levelBefore\)showLevelUp\(\$\('\.rain-game'\),difficulty\(g\)\.level,\$\('#rain-level'\)\.parentElement\)/);
});
