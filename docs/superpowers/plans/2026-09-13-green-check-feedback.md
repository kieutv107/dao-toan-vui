# Green Check Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phản hồi đúng/sai tức thời bằng dấu ✓/✗ ngay tại chỗ bé đang nhìn, câu mới đến sau 450 ms, trong bốn game Luyện tập, Bắt bong bóng, Số nào trốn mất, Số nào lớn hơn.

**Architecture:** Một module DOM thuần `dist/feedback.mjs` (không state, không engine) xuất `showCheck`, `showMiss`, `showStreak`, `announce`, `NEXT_DELAY_MS`; kiểu dáng và keyframes trong `dist/feedback.css`. Ba controller `practice.mjs`, `challenge.mjs`, `compare.mjs` gọi module thay cho dòng chữ "Chính xác!" và các số ms riêng lẻ. `beep` trong `app.js` rút ngắn để không dài hơn khoảnh khắc 450 ms.

**Tech Stack:** Vanilla ES modules, CSS animations, `node:test` với `mock.timers` (Node 25), test regex trên file nguồn theo mẫu `tests/home-ui.test.mjs`. Không có bundler: `dist/` là mã nguồn, chạy trực tiếp.

**Spec:** `docs/superpowers/specs/2026-09-13-green-check-feedback-design.md`

## Global Constraints

- `NEXT_DELAY_MS = 450`, dùng ở cả ba controller, không có số 450 rời rạc.
- ✓ phóng 180 ms; morph sang con số bắt đầu từ 200 ms; ✗ tồn tại 300 ms; pill chuỗi 600 ms.
- Mọi phần tử chèn vào DOM có `aria-hidden="true"`; thông báo đúng cho trình đọc màn hình qua `.sr-only` trong vùng `aria-live`.
- Gỡ phần tử tạm bằng `setTimeout`, không dùng `animationend`.
- Trạng thái cuối phải đúng khi `prefers-reduced-motion` tắt animation.
- Không đổi engine, cách ghi mastery, điểm, mạng. Không đổi Lật thẻ, Mưa, Phiếu.
- Chạy test bằng `node --test tests/*.test.mjs`. Toàn bộ 88 test hiện có phải còn pass sau mỗi task.
- Commit message tiếng Anh, dạng mệnh lệnh. Kết thúc bằng đúng một dòng `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. **Tuyệt đối không** ghi dòng `Claude-Session:` vào commit (yêu cầu của chủ dự án).

## File Structure

| File | Trách nhiệm |
| --- | --- |
| `dist/feedback.mjs` (mới) | Chèn/gỡ ✓, ✗, pill chuỗi và thông báo sr-only. Không biết gì về game. |
| `dist/feedback.css` (mới) | Kiểu dáng và keyframes của các phần tử trên, class `sr-only`, rule reduced-motion. |
| `dist/index.html` | Nạp `feedback.css`. |
| `dist/app.js` | `beep` ngắn hơn. |
| `dist/practice.mjs` | Gọi `showCheck`, `showMiss`, `announce`; sang câu sau `NEXT_DELAY_MS`. |
| `dist/challenge.mjs` | Như practice, thêm `showStreak`; chỉ nhánh bubble/mystery. |
| `dist/compare.mjs` | `showCheck` không `answer`, `showMiss`, `showStreak`, `announce`. |
| `tests/feedback.test.mjs` (mới) | Test hành vi module qua fake DOM + mock timers; test regex CSS và wiring của ba controller. |
| `tests/home-ui.test.mjs` | Thêm test `beep` ngắn. |
| `docs/FEATURES.md`, `docs/DESIGN_SYSTEM.md`, spec | Cập nhật mô tả. |

---

### Task 1: Module `feedback.mjs` với test hành vi

**Files:**
- Create: `dist/feedback.mjs`
- Test: `tests/feedback.test.mjs`

**Interfaces:**
- Produces:
  - `export const NEXT_DELAY_MS = 450`
  - `export function showCheck(target, answer)` — `target`: element; `answer` (tùy chọn): số hoặc chuỗi. Có `answer`: xóa nội dung `target`, thêm class `is-check`, chèn `<i class="fb-check fb-check-fill" aria-hidden>✓</i>` và `<b class="fb-answer" aria-hidden>answer</b>`; sau 200 ms gỡ `fb-check-fill`. Không có `answer`: thêm class `is-check`, chèn `<i class="fb-check fb-check-badge" aria-hidden>✓</i>`, giữ nguyên nội dung cũ, không gỡ.
  - `export function showMiss(button)` — thêm class `has-miss`, chèn `<i class="fb-miss" aria-hidden>✗</i>`; sau 300 ms gỡ phần tử và class.
  - `export function showStreak(anchor, n)` — thêm class `has-streak`, chèn `<span class="fb-streak" aria-hidden>Chuỗi n</span>`; sau 600 ms gỡ phần tử và class.
  - `export function announce(region, text)` — xóa nội dung `region`, chèn `<span class="sr-only">text</span>` (không `aria-hidden`).

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/feedback.test.mjs`:

```js
import {test,mock} from 'node:test';
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
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `node --test tests/feedback.test.mjs`
Expected: FAIL ở bước import, thông báo kiểu `Cannot find module '.../dist/feedback.mjs'`.

- [ ] **Step 3: Viết module tối thiểu**

Tạo `dist/feedback.mjs`:

```js
export const NEXT_DELAY_MS=450;
const MORPH_MS=200,MISS_MS=300,STREAK_MS=600;

function insert(target,tag,className,text,hidden=true){
  const el=target.ownerDocument.createElement(tag);
  el.className=className;el.textContent=text;
  if(hidden)el.setAttribute('aria-hidden','true');
  target.appendChild(el);return el;
}

export function showCheck(target,answer){
  target.classList.add('is-check');
  if(answer===undefined){insert(target,'i','fb-check fb-check-badge','✓');return}
  target.textContent='';
  const check=insert(target,'i','fb-check fb-check-fill','✓');
  insert(target,'b','fb-answer',String(answer));
  setTimeout(()=>check.remove(),MORPH_MS);
}

export function showMiss(button){
  button.classList.add('has-miss');
  const miss=insert(button,'i','fb-miss','✗');
  setTimeout(()=>{miss.remove();button.classList.remove('has-miss')},MISS_MS);
}

export function showStreak(anchor,n){
  anchor.classList.add('has-streak');
  const pill=insert(anchor,'span','fb-streak',`Chuỗi ${n}`);
  setTimeout(()=>{pill.remove();anchor.classList.remove('has-streak')},STREAK_MS);
}

export function announce(region,text){
  region.textContent='';
  insert(region,'span','sr-only',text,false);
}
```

- [ ] **Step 4: Chạy test để thấy pass**

Run: `node --test tests/feedback.test.mjs`
Expected: 6 pass, 0 fail. Rồi `node --test tests/*.test.mjs` → 94 pass.

- [ ] **Step 5: Commit**

```bash
git add dist/feedback.mjs tests/feedback.test.mjs
git commit -m "Add shared green check feedback module"
```

---

### Task 2: `feedback.css` và nạp vào `index.html`

**Files:**
- Create: `dist/feedback.css`
- Modify: `dist/index.html` (thẻ `<link>` sau `sheet.css?v=2`)
- Test: `tests/feedback.test.mjs`

**Interfaces:**
- Consumes: class `is-check`, `fb-check`, `fb-check-fill`, `fb-check-badge`, `fb-answer`, `has-miss`, `fb-miss`, `has-streak`, `fb-streak`, `sr-only` từ Task 1.
- Produces: keyframes `fb-pop`, `fb-fade-in`, `fb-badge`, `fb-rise`.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `tests/feedback.test.mjs`:

```js
test('feedback stylesheet defines the check, miss, streak and sr-only styles and is loaded',async()=>{
  const [css,index]=await Promise.all([
    readFile(new URL('../dist/feedback.css',import.meta.url),'utf8'),
    readFile(new URL('../dist/index.html',import.meta.url),'utf8')
  ]);
  for(const cls of ['is-check','fb-check-fill','fb-check-badge','fb-answer','fb-miss','fb-streak','sr-only'])assert.match(css,new RegExp(`\\.${cls}\\b`),cls);
  for(const kf of ['fb-pop','fb-fade-in','fb-badge','fb-rise'])assert.match(css,new RegExp(`@keyframes ${kf}\\{`),kf);
  assert.match(css,/\.is-check,\.has-miss,\.has-streak\{position:relative/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]*\.fb-check-fill\{display:none\}/);
  assert.match(index,/<link rel="stylesheet" href="feedback\.css\?v=2">/);
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `node --test tests/feedback.test.mjs`
Expected: 1 fail với `ENOENT ... feedback.css`.

- [ ] **Step 3: Viết CSS và thêm link**

Tạo `dist/feedback.css`:

```css
.is-check,.has-miss,.has-streak{position:relative}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.unknown.is-check{background:#51a978;border-color:#3e9864;border-style:solid;color:#fff;display:inline-grid;place-items:center}
.fb-check-fill{grid-area:1/1;font-style:normal;font-weight:1000;line-height:1;animation:fb-pop .18s ease-out both}
.fb-answer{grid-area:1/1;font-weight:1000;animation:fb-fade-in .2s ease-out .2s both}
.fb-check-badge{position:absolute;top:-10px;right:-10px;width:30px;height:30px;border-radius:50%;background:#51a978;color:#fff;border:2px solid #fff;font-style:normal;font-size:18px;font-weight:1000;line-height:26px;text-align:center;box-shadow:0 2px 6px #2e805644;animation:fb-badge .3s ease-out both}
.fb-miss{position:absolute;top:-10px;right:-10px;width:26px;height:26px;border-radius:50%;background:#e0526c;color:#fff;border:2px solid #fff;font-style:normal;font-size:15px;font-weight:1000;line-height:22px;text-align:center;animation:fb-pop .18s ease-out both}
.fb-streak{position:absolute;left:50%;top:-16px;transform:translate(-50%,0);background:#ffe58a;color:#7a5a00;border:1px solid #f0c94c;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:1000;white-space:nowrap;pointer-events:none;animation:fb-rise .6s ease-out both}
@keyframes fb-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
@keyframes fb-fade-in{0%{opacity:0}100%{opacity:1}}
@keyframes fb-badge{0%{top:50%;right:50%;transform:translate(50%,-50%) scale(2.4);opacity:0}30%{opacity:1}100%{top:-10px;right:-10px;transform:translate(0,0) scale(1)}}
@keyframes fb-rise{0%{opacity:0;transform:translate(-50%,6px)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-24px)}}
@media(prefers-reduced-motion:reduce){.fb-check-fill{display:none}}
```

Trong `dist/index.html`, ngay sau `<link rel="stylesheet" href="sheet.css?v=2">` thêm `<link rel="stylesheet" href="feedback.css?v=2">`.

Lưu ý: rule reduced-motion toàn cục trong `style.css` đã đặt `animation:none!important`, nên `.fb-answer` hiện ngay và `.fb-check-fill` ẩn để không chồng chữ.

- [ ] **Step 4: Chạy test để thấy pass**

Run: `node --test tests/*.test.mjs`
Expected: 95 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add dist/feedback.css dist/index.html tests/feedback.test.mjs
git commit -m "Style green check, miss badge and streak pill"
```

---

### Task 3: Rút ngắn `beep` trong `app.js`

**Files:**
- Modify: `dist/app.js:24`
- Test: `tests/home-ui.test.mjs`

**Interfaces:**
- Consumes: không.
- Produces: `beep(win=true)` giữ nguyên chữ ký; đúng phát hai nốt 520 Hz và 780 Hz trong khoảng 150 ms, sai một nốt 200 Hz khoảng 100 ms.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `tests/home-ui.test.mjs`:

```js
test('answer beep is a short ding, not a three-note fanfare',async()=>{
  const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  const fn=source.match(/function beep\(win=true\)\{[\s\S]*?\n/)[0];
  assert.doesNotMatch(fn,/\[0,\.12,\.24\]/);
  assert.match(fn,/520/);assert.match(fn,/780/);assert.match(fn,/200/);
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `node --test tests/home-ui.test.mjs`
Expected: 1 fail, `The input was expected to not match ... [0,.12,.24]`.

- [ ] **Step 3: Viết lại `beep`**

Thay dòng 24 của `dist/app.js` (bắt đầu `function beep(win=true){`) bằng:

```js
function beep(win=true){if(!sound)return;try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();const notes=win?[[520,0,.08],[780,.07,.08]]:[[200,0,.1]];notes.forEach(([hz,at,len])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=hz;const t=ctx.currentTime+at;g.gain.setValueAtTime(win?.08:.05,t);g.gain.exponentialRampToValueAtTime(.001,t+len);o.start(t);o.stop(t+len)})}catch{}}
```

- [ ] **Step 4: Chạy test để thấy pass**

Run: `node --test tests/*.test.mjs`
Expected: 96 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add dist/app.js tests/home-ui.test.mjs
git commit -m "Shorten answer beep to a quick ding"
```

---

### Task 4: Vườn luyện tập dùng module

**Files:**
- Modify: `dist/practice.mjs:1,21-22`
- Test: `tests/feedback.test.mjs`

**Interfaces:**
- Consumes: `showCheck(target, answer)`, `showMiss(button)`, `announce(region, text)`, `NEXT_DELAY_MS` từ Task 1.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `tests/feedback.test.mjs`:

```js
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
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `node --test tests/feedback.test.mjs`
Expected: 1 fail ở assert import.

- [ ] **Step 3: Sửa `practice.mjs`**

Dòng 1 hiện là import từ `practice-engine.mjs` và `strategies.mjs`; thêm dòng ngay sau các import hiện có:

```js
import {showCheck,showMiss,announce,NEXT_DELAY_MS} from './feedback.mjs';
```

Thay dòng 21:

```js
    if(!result.correct){bad.push(value);button.disabled=true;button.classList.add('wrong','challenge-shake');showMiss(button);beep(false);feedback('Chưa đúng. Bé thử lại nhé!','miss');hud();return}
```

Thay dòng 22:

```js
    locked=true;button.classList.add('right','challenge-pop');app.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);$('#hint').disabled=true;beep();showCheck($('.unknown'),q.answer);feedback('','success');announce($('#feedback'),`Chính xác, ${q.a} ${q.sign} ${q.b} = ${q.answer}`);hud();advanceTimer=setTimeout(()=>result.complete?finish():newQuestion(true),NEXT_DELAY_MS);
```

Ghi chú: `feedback('','success')` đặt `message=''` để nếu render lại trước khi sang câu thì không hiện chữ cũ; `announce` chèn span sr-only vào vùng `aria-live` để trình đọc màn hình vẫn nghe "Chính xác".

- [ ] **Step 4: Chạy test để thấy pass**

Run: `node --test tests/*.test.mjs`
Expected: 97 pass, 0 fail.

- [ ] **Step 5: Kiểm tra trực quan**

Mở `dist/index.html` bằng server tĩnh (ví dụ `npx serve dist` hoặc `python3 -m http.server -d dist 8080`), vào Vườn luyện tập, trả lời đúng một câu: ô `?` chuyển xanh, ✓ phóng lên rồi thành số, câu mới sau chưa tới nửa giây. Trả lời sai: ✗ đỏ ở góc nút, tan sau khoảng 0,3 s.

- [ ] **Step 6: Commit**

```bash
git add dist/practice.mjs tests/feedback.test.mjs
git commit -m "Use green check feedback in practice garden"
```

---

### Task 5: Bắt bong bóng và Số nào trốn mất dùng module

**Files:**
- Modify: `dist/challenge.mjs:1,23-26`
- Test: `tests/feedback.test.mjs`

**Interfaces:**
- Consumes: `showCheck`, `showMiss`, `showStreak(anchor, n)`, `announce`, `NEXT_DELAY_MS` từ Task 1.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `tests/feedback.test.mjs`:

```js
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
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `node --test tests/feedback.test.mjs`
Expected: 1 fail ở assert import.

- [ ] **Step 3: Sửa `challenge.mjs`**

Thêm sau dòng import đầu tiên:

```js
import {showCheck,showMiss,showStreak,announce,NEXT_DELAY_MS} from './feedback.mjs';
```

Thay dòng 23:

```js
    if(value!==expected){bad.push(value);recordAnswer(g,false);learning.record({fact:q,result:'wrong',elapsedMs:performance.now()-questionStarted,context:mode.id,sessionId});button.disabled=true;button.classList.add('wrong','challenge-shake');showMiss(button);beep(false);feedback(g.lives!==null?'Chưa đúng. Mất 1 mạng — bé thử lại nhé!':mode.id==='rocket'?'Chưa đúng. −3 giây — bé thử lại nhé!':'Chưa đúng. Bé thử lại nhé!','miss');hud();if(g.over){locked=true;freezeAnswers();later(1000,finish)}return}
```

Thay dòng 24:

```js
    locked=true;const points=recordAnswer(g,true);learning.record({fact:q,result:'correct',elapsedMs:performance.now()-questionStarted,context:mode.id,sessionId});award();beep();button.classList.add('right','challenge-pop');freezeAnswers();showCheck($('.unknown'),expected);if(g.streak>0&&g.streak%3===0)showStreak($('.unknown'),g.streak);feedback('','success');announce($('#feedback'),`Chính xác, +${points} điểm`);hud();
```

Thay dòng 26:

```js
    if(mode.id==='practice'){$('#challenge-next').innerHTML='<button class="primary" id="next">Tiếp theo →</button>';$('#next').onclick=()=>{if(!paused)go()};$('#next').focus()}else later(NEXT_DELAY_MS,go);
```

Ghi chú: `expected` là `q.b` ở mystery và `q.answer` ở bubble, đúng con số phải hiện trong ô `?`. Nhánh `memory` (`flip`) không đụng. Hàm `timeout` không đổi.

- [ ] **Step 4: Chạy test để thấy pass**

Run: `node --test tests/*.test.mjs`
Expected: 98 pass, 0 fail.

- [ ] **Step 5: Kiểm tra trực quan**

Vào Bắt bong bóng: đúng 3 câu liên tiếp thấy pill "Chuỗi 3" bay lên từ ô kết quả. Vào Số nào trốn mất: ✓ vào ô `?` ở vị trí số hạng, rồi thành số. Cả hai sang câu mới nhanh, không đổi theo cấp.

- [ ] **Step 6: Commit**

```bash
git add dist/challenge.mjs tests/feedback.test.mjs
git commit -m "Use green check feedback in bubble and mystery games"
```

---

### Task 6: Số nào lớn hơn dùng module

**Files:**
- Modify: `dist/compare.mjs:1,25-43`
- Test: `tests/feedback.test.mjs`

**Interfaces:**
- Consumes: `showCheck(target)` (không `answer`), `showMiss`, `showStreak`, `announce`, `NEXT_DELAY_MS` từ Task 1.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `tests/feedback.test.mjs`:

```js
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
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `node --test tests/feedback.test.mjs`
Expected: 1 fail ở assert import.

- [ ] **Step 3: Sửa `compare.mjs`**

Thêm sau dòng 1:

```js
import {showCheck,showMiss,showStreak,announce,NEXT_DELAY_MS} from './feedback.mjs';
```

Thay hàm `highlight` (dòng 25–27):

```js
  function highlight(answer,choice){
    app.querySelectorAll('[data-compare-choice]').forEach(button=>{button.disabled=true;if(button.dataset.compareChoice===answer){button.classList.add('right');showCheck(button)}else if(button.dataset.compareChoice===choice){button.classList.add('wrong');showMiss(button)}});
  }
```

Thay hàm `choose` (dòng 29–43):

```js
  function choose(choice){
    if(!playing||paused||locked||disposed||g.over)return;
    const correct=choice===round.answer,beforeStage=compareStage(g),points=recordCompareAnswer(g,correct),afterStage=compareStage(g);
    locked=true;highlight(round.answer,choice);hud();
    const chosen=app.querySelector(`[data-compare-choice="${choice}"]`),region=$('#compare-feedback');
    if(correct){
      reviewFacts(round,true).forEach(fact=>learning.record({fact,result:'review',context:'compare',sessionId}));award();beep();
      if(g.streak>0&&g.streak%3===0)showStreak(chosen,g.streak);
      if(afterStage>beforeStage)region.textContent='Tuyệt! Bé đã tăng một bậc.';else announce(region,`Chính xác, +${points} điểm`);
      region.className='compare-feedback success';delayLeft=NEXT_DELAY_MS/1000;
    }else{
      beep(false);const answerText=round.answer==='equal'?'Hai thẻ bằng nhau':round.answer==='top'?'Thẻ trên lớn hơn':'Thẻ dưới lớn hơn';
      region.textContent=afterStage<beforeStage?`${answerText}. Mình giảm một bậc để luyện chắc hơn nhé!`:`${answerText}. Mình xem lại rồi thử câu tiếp nhé!`;
      region.className='compare-feedback miss';delayLeft=1;
    }
    delayAction=newRound;
  }
```

Ghi chú: khi sai, `highlight` đã gắn ✓ lên thẻ đúng và ✗ lên thẻ bé chọn; nếu bé chọn sai nhưng đáp án là "bằng nhau" thì ✓ nằm trên nút "Hai thẻ bằng nhau", đúng ý spec.

- [ ] **Step 4: Chạy test để thấy pass**

Run: `node --test tests/*.test.mjs`
Expected: 99 pass, 0 fail.

- [ ] **Step 5: Kiểm tra trực quan**

Vào Số nào lớn hơn: chọn đúng thấy ✓ phóng giữa thẻ rồi thu về góc, giá trị thẻ vẫn đọc được, lượt mới sau chưa tới nửa giây. Chọn sai: ✗ trên thẻ đã chọn, ✓ trên thẻ đúng, chờ 1 giây như cũ. Thu hẹp cửa sổ xuống ~400 px và kiểm tra huy hiệu không bị cắt.

- [ ] **Step 6: Commit**

```bash
git add dist/compare.mjs tests/feedback.test.mjs
git commit -m "Use green check feedback in greater number game"
```

---

### Task 7: Tài liệu và kiểm tra reduced-motion

**Files:**
- Modify: `docs/FEATURES.md` (mục 2 "Input và feedback", mục 4, mục 5, mục 7 "Điểm và feedback")
- Modify: `docs/DESIGN_SYSTEM.md` (thêm mục "Phản hồi đúng/sai" gần phần Play surface)
- Modify: `docs/superpowers/specs/2026-09-13-green-check-feedback-design.md` (mục Module: thêm `announce`)

- [ ] **Step 1: Cập nhật FEATURES.md**

Mục 2, phần "Input và feedback", thay hai dòng "Đúng:" và "Sai:" bằng:

```markdown
- Đúng: nút xanh và pop; ô `?` chuyển xanh, dấu ✓ phóng lên trong 180 ms rồi hóa thành đáp án từ 200 ms. Không có dòng chữ; trình đọc màn hình vẫn nghe "Chính xác, a + b = c" qua `.sr-only`. Câu mới sau 450 ms (`NEXT_DELAY_MS` trong `feedback.mjs`).
- Sai: nút rung, hiện ✗ đỏ ở góc trong 300 ms rồi mờ; dòng "Chưa đúng. Bé thử lại nhé!" giữ nguyên.
```

Mục 4 "Bắt bong bóng", thay dòng "Sau câu đúng, câu mới xuất hiện sau khoảng 650–1.020 ms tùy cấp." bằng:

```markdown
- Sau câu đúng, ✓ điền vào ô kết quả rồi thành số; câu mới sau 450 ms ở mọi cấp. Mỗi 3 câu đúng liên tiếp có pill "Chuỗi n" bay lên từ ô kết quả.
```

Mục 5 "Số nào trốn mất", thêm dòng cuối phần Luật:

```markdown
- Phản hồi giống Bắt bong bóng: ✓ điền vào ô số hạng còn thiếu, câu mới sau 450 ms, pill chuỗi mỗi 3 câu đúng.
```

Mục 7 "Điểm và feedback", thêm:

```markdown
- Đúng: thẻ (hoặc nút "Hai thẻ bằng nhau") xanh, ✓ phóng giữa thẻ rồi thu về góc; lượt mới sau 450 ms. Sai: ✗ trên thẻ đã chọn, ✓ trên thẻ đúng, chờ 1 giây để bé đọc lời giải thích.
```

- [ ] **Step 2: Cập nhật DESIGN_SYSTEM.md**

Thêm sau phần "Play surface":

```markdown
### Phản hồi đúng/sai (`feedback.css`)

- ✓ xanh `#51a978` trên nền trắng, ✗ đỏ `#e0526c`. Luôn kèm ký hiệu, không chỉ đổi màu.
- Ô `?` khi đúng: nền xanh, viền liền, ✓ trắng phóng 180 ms (`fb-pop`), con số hiện từ 200 ms (`fb-fade-in`).
- Huy hiệu góc 30 px (`fb-check-badge`) và 26 px (`fb-miss`), viền trắng 2 px.
- Pill chuỗi vàng `#ffe58a`, bay lên 24 px và tan trong 600 ms (`fb-rise`).
- Nhịp chuyển câu 450 ms. Với `prefers-reduced-motion`, animation tắt và `fb-check-fill` ẩn để trạng thái cuối vẫn đúng.
```

- [ ] **Step 3: Cập nhật spec**

Trong mục "Module `feedback.mjs`" của spec, thêm gạch đầu dòng sau `showStreak`:

```markdown
- `announce(region, text)`. Xóa nội dung vùng `aria-live` và chèn `<span class="sr-only">text</span>` để trình đọc màn hình đọc câu đúng dù màn hình không hiện chữ.
```

Đổi câu mở đầu "Ba hàm thuần DOM" thành "Bốn hàm thuần DOM".

- [ ] **Step 4: Kiểm tra reduced-motion**

Trong Chrome DevTools: Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Chơi một câu đúng ở Luyện tập: ô `?` xanh có số ngay, không thấy ✓ chồng lên số. Một câu sai: ✗ hiện tĩnh 0,3 s rồi mất.

- [ ] **Step 5: Chạy toàn bộ test lần cuối**

Run: `node --test tests/*.test.mjs`
Expected: 99 pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add docs/FEATURES.md docs/DESIGN_SYSTEM.md docs/superpowers/specs/2026-09-13-green-check-feedback-design.md
git commit -m "Document green check feedback"
```
