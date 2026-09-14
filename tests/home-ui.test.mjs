import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('home template has no stray patch markers between its sections',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\n\+\s+<(?:section|div)\b/);
});

test('home introduces the current curriculum stage and lists every level',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/từ 11 đến 15/);
  assert.match(source,/Chặng \$\{p\.level\} · \$\{stage\.title\}/);
  assert.match(source,/p\.levels\.map\(/);
});

test('home splits practice and worksheet into a practice zone above the game zone',async()=>{
  const [app,style]=await Promise.all(['app.js','style.css'].map(f=>readFile(new URL(`../dist/${f}`,import.meta.url),'utf8')));
  const zones=Object.fromEntries([...app.matchAll(/\{id:'(\w+)',zone:'(\w+)'/g)].map(m=>[m[1],m[2]]));
  assert.deepEqual(zones,{practice:'practice',sheet:'practice',rain:'game',bubble:'game',memory:'game',mystery:'game',compare:'game',truefalse:'game'});
  const practiceZone=app.indexOf('KHU LUYỆN TẬP'),gameZone=app.indexOf('KHU TRÒ CHƠI');
  assert.ok(practiceZone>0&&gameZone>practiceZone,'practice zone renders first');
  // zone heads show only the small label and the title, no side subtitle
  assert.doesNotMatch(app,/Không đếm giờ, không áp lực|Luôn luyện cộng & trừ trong phạm vi 20/);
  assert.match(app,/<section class="cards zone-practice" aria-label="Khu luyện tập">\$\{practiceModes\.map\(card\)\.join\(''\)\}<\/section>/);
  assert.match(app,/<section class="cards" aria-label="Khu trò chơi">\$\{gameModes\.map\(card\)\.join\(''\)\}<aside class="tip">/);
  assert.match(style,/\.cards\.zone-practice\{grid-template-columns:repeat\(2,1fr\)\}/);
  assert.match(style,/\.zone-games\{[^}]*border-top:2px dashed/);
  // on phones every card, in both zones, takes a full row; equal-height padding from the 2-column layout goes away
  assert.match(style,/@media\(max-width:520px\)\{\.cards,\.cards\.zone-practice\{grid-template-columns:1fr\}\.game-card h3,\.game-card p\{min-height:0\}\}\s*$/);
  // six games leave the tip alone on the last row, so it spans the row as a slim band
  assert.match(style,/\.cards>\.tip\{grid-column:1\/-1;/);
});

test('home links to a non-profit, no-warranty disclaimer that opens in a modal',async()=>{
  const [app,index,style]=await Promise.all(['app.js','index.html','style.css'].map(f=>readFile(new URL(`../dist/${f}`,import.meta.url),'utf8')));
  const home=app.match(/function home\(\)\{[\s\S]*?\n\}/)?.[0]??'';
  const dialog=home.match(/<dialog class="disclaimer-modal"[\s\S]*?<\/dialog>/)?.[0]??'';
  assert.ok(home.indexOf('id="disclaimer-open"')>home.indexOf('aria-label="Khu trò chơi"'),'the trigger sits after the game zone');
  assert.match(home,/id="disclaimer-open">Tuyên bố trách nhiệm<\/button>/,'a link, not a wall of text');
  assert.match(dialog,/aria-labelledby="disclaimer-title"[\s\S]*<b id="disclaimer-title">Tuyên bố trách nhiệm<\/b>/);
  for(const phrase of ['dự án cá nhân','phi lợi nhuận','một người bố có con đang học tiểu học','như hiện có','không chịu trách nhiệm','đồng ý với tuyên bố trách nhiệm'])assert.ok(dialog.includes(phrase),phrase);
  assert.match(home,/#disclaimer-open'\)\.onclick=\(\)=>\w+\.showModal\(\)/,'clicking the link opens the modal');
  assert.doesNotMatch(index,/disclaimer/,'home only, not the shared footer');
  assert.match(style,/\.disclaimer-modal::backdrop\{/);
});

test('progress details open in a modal that closes with a button, backdrop or Esc',async()=>{
  const [app,style]=await Promise.all(['app.js','style.css'].map(f=>readFile(new URL(`../dist/${f}`,import.meta.url),'utf8')));
  assert.match(app,/<dialog class="journey-modal" id="journey-details" aria-labelledby="journey-details-title"><div class="details-head"><strong id="journey-details-title">Chi tiết hành trình<\/strong><button class="details-close" id="details-close" aria-label="Đóng chi tiết">✕<\/button><\/div><div class="journey-details-body">/);
  assert.match(app,/more\.onclick=\(\)=>\{details\.showModal\(\);more\.setAttribute\('aria-expanded','true'\)\}/,'the link opens the modal');
  assert.match(app,/details\.addEventListener\('close',\(\)=>\{more\.setAttribute\('aria-expanded','false'\);more\.focus\(\)\}\)/,'every close path resets the trigger and returns focus');
  assert.match(app,/app\.querySelector\('#details-close'\)\.onclick=\(\)=>details\.close\(\)/);
  assert.match(app,/details\.onclick=e=>\{if\(e\.target===details\)details\.close\(\)\}/,'a backdrop click closes it');
  assert.doesNotMatch(app,/reset-progress|Đặt lại dữ liệu|learning\.reset\(\)|scores\.reset\(\)/);
  assert.match(style,/\.journey-modal::backdrop\{/);
  assert.match(style,/\.details-close\{/);
  assert.doesNotMatch(style,/\.reset-progress/);
});

test('progress details let the child practice any level now, for that session only',async()=>{
  const [app,practice,style]=await Promise.all(['app.js','practice.mjs','style.css'].map(f=>readFile(new URL(`../dist/${f}`,import.meta.url),'utf8')));
  assert.match(app,/<button class="level-practice" data-level="\$\{l\.id\}"[^>]*>Luyện<\/button>/);
  assert.match(app,/app\.querySelectorAll\('\[data-level\]'\)\.forEach\(b=>b\.onclick=\(\)=>start\('practice',\{focusLevel:Number\(b\.dataset\.level\)\}\)\)/);
  assert.match(app,/function start\(id,\{focusLevel\}=\{\}\)/);
  assert.match(practice,/createPractice\(\{[^}]*focusLevel:topic\?\.id\}\)/);
  assert.match(practice,/Chặng \$\{topic\.id\} · \$\{topic\.title\}/);
  assert.match(practice,/startGame\('practice',topic\?\{focusLevel:topic\.id\}:\{\}\)/);
  // locked levels still look locked, but their practice button stays fully visible
  assert.match(style,/\.level-list li\.locked>:not\(\.level-practice\)\{opacity:\.45\}/);
});

test('journey card invites the child to practice with an animated CTA',async()=>{
  const [app,css]=await Promise.all([
    readFile(new URL('../dist/app.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/style.css',import.meta.url),'utf8')
  ]);
  assert.doesNotMatch(app,/>Xem tiến độ</);
  assert.match(app,/id="practice-now"[^>]*>[\s\S]*?Luyện tập ngay/);
  assert.match(app,/#practice-now'\)\.onclick=\(\)=>start\('practice'\)/);
  const rule=css.match(/\.journey-cta\s*\{([^}]*)\}/)?.[1]??'';
  assert.match(rule,/animation\s*:\s*cta-breathe/);
  assert.match(css,/@keyframes cta-breathe/);
  assert.match(css,/@keyframes cta-hop/);
  assert.match(css,/@keyframes cta-ripple/);
  assert.match(css,/@keyframes cta-nudge/);
  // the idle motion stays calm: the button itself never bounces, and the
  // rocket hop, arrow nudge and ripple share one 5s cycle so they read as a single gesture
  assert.doesNotMatch(css,/@keyframes cta-(?:bounce|ring|arrow)/);
  const icon=css.match(/\.journey-cta-icon\s*\{([^}]*)\}/)?.[1]??'';
  const arrow=css.match(/\.journey-cta-arrow\s*\{([^}]*)\}/)?.[1]??'';
  const ripple=css.match(/\.journey-cta:before\s*\{([^}]*)\}/)?.[1]??'';
  assert.match(icon,/animation\s*:\s*cta-hop 5s/);
  assert.match(arrow,/animation\s*:\s*cta-nudge 5s/);
  assert.match(ripple,/animation\s*:\s*cta-ripple 5s/);
  // the cycle is phase-shifted so the first gesture greets the child within a second of landing
  const button=css.match(/\.journey-cta\s*\{([^}]*)\}/)?.[1]??'';
  assert.match(button,/--cta-phase:-3\.5s/);
  assert.match(css,/@keyframes cta-sheen/);
  assert.match(css,/@keyframes cta-lift/);
});

const read=file=>readFile(new URL(`../dist/${file}`,import.meta.url),'utf8');

test('in-game HUDs show only the best score from before the run',async()=>{
  const [challenge,rain,...css]=await Promise.all(['challenge.mjs','rain.mjs','challenge.css','rain.css','compare.css','truefalse.css'].map(read));
  const hud=challenge.match(/function hud\(\)\{[^\n]*/)?.[0]??'',stats=rain.match(/function stats\(\)\{[^\n]*/)?.[0]??'';
  assert.match(hud,/<span>Kỷ lục<\/span><b>\$\{bestAtStart\}<\/b>/);
  assert.match(stats,/\$\('#rain-record'\)\.textContent=bestAtStart;/);
  for(const source of [hud,stats]){
    assert.doesNotMatch(source,/new-record|Kỷ lục mới|Math\.max\(bestAtStart/);
  }
  for(const sheet of css)assert.doesNotMatch(sheet,/\.new-record/);
});

test('every game celebrates a new record only on its finish screen',async()=>{
  for(const [file,fn] of [['challenge.mjs','finish'],['compare.mjs','finish'],['truefalse.mjs','finish'],['rain.mjs','end']]){
    const source=await read(file);
    const body=source.match(new RegExp(`function ${fn}\\(\\)\\{[\\s\\S]*?\\n  (?:\\}|function|//)`))?.[0]??'';
    assert.match(source,/import \{[^}]*celebrateRecord[^}]*\} from '\.\/feedback\.mjs'/,file);
    assert.match(body,/record-trophy/,file);
    assert.match(body,/record-title/,file);
    assert.match(body,/if\(\w+\.newRecord\)celebrateRecord\(app\)/,file);
    // after the run the HUD catches up with the saved best
    assert.match(body,/bestAtStart=\w+\.scores\[0\]\|\|0/,file);
  }
});

test('finish screens highlight this run in the top five with a "Lượt chơi hiện tại" label',async()=>{
  for(const [file,fn,index] of [['challenge.mjs','finish','i'],['compare.mjs','finish','index'],['truefalse.mjs','finish','index'],['rain.mjs','end','i']]){
    const source=await read(file);
    const body=source.match(new RegExp(`function ${fn}\\(\\)\\{[\\s\\S]*?\\n  (?:\\}|function|//)`))?.[0]??'';
    assert.match(body,new RegExp(`${index}===\\w+\\.rank\\?\`<span class="current-run">`),file);
    assert.match(body,/<small>Lượt chơi hiện tại<\/small>/,file);
  }
  const [challengeCss,rainCss]=await Promise.all(['challenge.css','rain.css'].map(read));
  assert.match(challengeCss,/\.score-board \.current-run\{[^}]*background:#fff0bd/);
  assert.match(rainCss,/\.rain-score-board \.current-run\{[^}]*background:#fff0bd/);
});

test('greater-number game is registered and styled',async()=>{
  const [app,index]=await Promise.all([
    readFile(new URL('../dist/app.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/index.html',import.meta.url),'utf8')
  ]);
  assert.match(app,/id:'compare'/);assert.match(app,/mountCompare/);
  assert.match(index,/compare\.css/);assert.match(index,/8 trò chơi/);
});

test('obstacle runner is absent from the island',async()=>{
  const [app,index]=await Promise.all([
    readFile(new URL('../dist/app.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/index.html',import.meta.url),'utf8')
  ]);
  assert.doesNotMatch(app,/id:'runner'|mountRunner/);
  assert.doesNotMatch(index,/runner\.css/);
});

test('greater-number game keeps duration out of its menu and intro labels',async()=>{
  const [app,game]=await Promise.all([
    readFile(new URL('../dist/app.js',import.meta.url),'utf8'),
    readFile(new URL('../dist/compare.mjs',import.meta.url),'utf8')
  ]);
  assert.match(game,/>Bắt đầu →<\/button>/);
  assert.doesNotMatch(app,/So sánh hai thẻ thật nhanh trong (?:2 phút|60 giây)/);
  assert.doesNotMatch(game,/Bắt đầu (?:2 phút|60 giây)/);
});

test('greater-number cards omit positional labels',async()=>{
  const game=await readFile(new URL('../dist/compare.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(game,/THẺ TRÊN|THẺ DƯỚI/);
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

test('true-or-false game is registered and styled',async()=>{
  const [app,index]=await Promise.all(['app.js','index.html'].map(read));
  assert.match(app,/\{id:'truefalse',zone:'game',icon:'✅',title:'Đúng hay sai\?'[^}]*color:'yellow'/);
  assert.match(app,/import \{mountTrueFalse\} from '\.\/truefalse\.mjs';/);
  assert.match(app,/id==='truefalse'\?mountTrueFalse\(app,common\)/);
  assert.match(index,/<link rel="stylesheet" href="truefalse\.css\?v=2">/);
});

test('true-or-false intro and HUD leave out duration and stage',async()=>{
  const [app,game]=await Promise.all(['app.js','truefalse.mjs'].map(read));
  assert.match(game,/>Bắt đầu →<\/button>/);
  assert.doesNotMatch(game,/90 giây|Bắt đầu 90/);
  assert.doesNotMatch(app,/thật nhanh trong/);
  const hud=game.match(/function hud\(\)\{([\s\S]*?)\n  \}/)?.[1]||'';
  assert.match(hud,/<span>Kỷ lục<\/span><b>\$\{bestAtStart\}<\/b>/);
  assert.doesNotMatch(hud,/Chặng|Độ khó|BẬC|new-record|Kỷ lục mới/);
  assert.match(game,/id="tf-statement" role="group" aria-label="\$\{round\.left\.label\} = \$\{round\.right\.label\}"/);
  assert.equal((game.match(/aria-describedby="tf-statement"/g)||[]).length,2);
});

test('true-or-false shows the real result only on a miss and holds for one second',async()=>{
  const game=await read('truefalse.mjs');
  assert.match(game,/const MISS_DELAY_MS=1000;/);
  assert.match(game,/<span class="tf-result" hidden>\$\{part\.value\}<\/span>/);
  const choose=game.match(/function choose\(saidTrue\)\{([\s\S]*?)\n  \}/)?.[1]||'';
  const [hit,miss='']=choose.split('}else{');
  assert.doesNotMatch(hit,/tf-result/);
  assert.match(hit,/delayLeft=NEXT_DELAY_MS\/1000/);
  assert.match(miss,/\.tf-result'\)\.forEach\(result=>result\.hidden=false\)/);
  assert.match(miss,/delayLeft=MISS_DELAY_MS\/1000/);
  assert.doesNotMatch(game,/Mình thử câu tiếp|Mình giảm một bậc/);
});

test('true-or-false counts the full frame interval and maps ArrowRight to true',async()=>{
  const game=await read('truefalse.mjs');
  assert.match(game,/const dt=last\?\(now-last\)\/1000:0/);
  assert.match(game,/choose\(event\.key==='ArrowRight'\)/);
});

test('Nunito starts from HTML preconnects instead of a CSS import',async()=>{
  const [index,css]=await Promise.all([
    readFile(new URL('../dist/index.html',import.meta.url),'utf8'),
    readFile(new URL('../dist/style.css',import.meta.url),'utf8')
  ]);
  assert.match(index,/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/);
  assert.match(index,/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/);
  assert.match(index,/href="https:\/\/fonts\.googleapis\.com\/css2\?family=Nunito:wght@400;600;700;800;900;1000&display=swap"/);
  assert.ok(index.indexOf('fonts.googleapis.com')<index.indexOf('style.css'));
  assert.doesNotMatch(css,/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com/);
  assert.match(css,/font-family:'Nunito'/);
});

test('sound is on by default and the speaker button says so',async()=>{
  const [app,index]=await Promise.all(['app.js','index.html'].map(f=>readFile(new URL(`../dist/${f}`,import.meta.url),'utf8')));
  assert.match(app,/let stopGame=null,sound=true,/);
  assert.match(index,/<button id="sound" aria-label="Tắt âm thanh" title="Bật hoặc tắt âm thanh">🔊<\/button>/);
});

test('the sound choice is saved in localStorage and restored on the next visit',async()=>{
  const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  // only an explicit "off" mutes, so first visits and blocked storage keep sound on
  assert.match(app,/sound=localStorage\.getItem\('toan-sound'\)!=='off'/);
  assert.match(app,/sound=!sound;updateSound\(\);try\{localStorage\.setItem\('toan-sound',sound\?'on':'off'\)\}catch\{\}/);
  assert.match(app,/updateStars\(\);updateSound\(\);home\(\);/);
});

test('answer beep is a short ding, not a three-note fanfare',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  const fn=source.match(/function beep\(win=true\)\{[\s\S]*?\n/)[0];
  assert.doesNotMatch(fn,/\[0,\.12,\.24\]/);
  assert.match(fn,/520/);assert.match(fn,/780/);assert.match(fn,/200/);
});

test('a first-run placement offer invites, starts or is skipped through the service',async()=>{
  const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  // registered in the dispatcher
  assert.match(app,/import \{mountPlacement\} from '\.\/placement\.mjs'/);
  assert.match(app,/id==='placement'\?mountPlacement\(app,common\)/);
  // offer only on a fresh profile that has not placed or skipped yet
  assert.match(app,/const showOffer=started===0&&!learning\.placement\(\)/);
  assert.match(app,/id="placement-start">Bắt đầu<\/button>/);
  assert.match(app,/id="placement-skip">Bỏ qua<\/button>/);
  assert.match(app,/Con muốn thử vài câu để bắt đầu đúng chỗ không\?/);
  // start runs the quiz; skip goes through the service, never writing storage directly
  assert.match(app,/#placement-start'\)\.onclick=\(\)=>start\('placement'\)/);
  assert.match(app,/#placement-skip'\)\.onclick=\(\)=>\{learning\.skipPlacement\(\);home\(\)\}/);
  assert.doesNotMatch(app,/setItem\('toan-placement-v1'/);
});

test('the journey details modal offers a re-run of the placement check',async()=>{
  const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(app,/id="placement-rerun">🧭 Kiểm tra trình độ<\/button>/);
  assert.match(app,/#placement-rerun'\)\.onclick=\(\)=>start\('placement'\)/);
});

test('placement styles exist for the offer card and quiz screen',async()=>{
  const style=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');
  assert.match(style,/\.placement-offer\{/);
  assert.match(style,/\.placement-offer-actions\{/);
});
