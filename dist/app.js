import {mountRain} from './rain.mjs';
import {mountPractice} from './practice.mjs';
import {mountChallenge} from './challenge.mjs';
import {mountCompare} from './compare.mjs';
import {mountSheet} from './sheet.mjs';
import {createLearningService} from './learning-service.mjs';
import {createHighScoreStore} from './high-scores.mjs';

const app=document.querySelector('#app'),settings={limit:20,op:'mix'};
const learning=createLearningService(),scores=createHighScoreStore();
let stopGame=null,sound=false,ctx,total=0;
try{total=Number(localStorage.getItem('toan-stars'))||0}catch{}
const modes=[
  {id:'practice',icon:'🌱',title:'Vườn luyện tập',desc:'Một lượt nhỏ dành riêng cho phần bé đang cần luyện.',tag:'LUYỆN THÍCH ỨNG · KHÔNG ÁP LỰC',color:'green',label:'Luyện hôm nay'},
  {id:'rain',icon:'🌦️',title:'Mưa phép tính',desc:'Tính nhẩm, hứng điểm! Đừng để phép tính chạm đáy.',tag:'TÍNH NHẨM NHANH',color:'teal',label:'Đón cơn mưa'},
  {id:'bubble',icon:'🫧',title:'Bắt bong bóng',desc:'Tìm đáp án đúng, chạm và… bụp!',tag:'NHANH TAY · TINH MẮT',color:'blue',label:'Chơi ngay'},
  {id:'memory',icon:'🧩',title:'Lật thẻ thần kỳ',desc:'Ghép phép tính với đáp án. Thử tài trí nhớ!',tag:'GHI NHỚ · KHÁM PHÁ',color:'orange',label:'Lật thẻ'},
  {id:'mystery',icon:'🔎',title:'Số nào trốn mất?',desc:'Làm thám tử, tìm con số còn thiếu.',tag:'SUY LUẬN · TÌM TÒI',color:'pink',label:'Khám phá'},
  {id:'compare',icon:'⚖️',title:'Số nào lớn hơn?',desc:'So sánh hai thẻ và tính thật nhanh!',tag:'SO SÁNH · TÍNH NHẨM',color:'purple',label:'So tài'},
  {id:'sheet',icon:'📝',title:'Phiếu 20 phép',desc:'Điền kết quả cả phiếu rồi chấm một lượt, như bài tập về nhà.',tag:'ĐIỀN KẾT QUẢ · KHÔNG ĐẾM GIỜ',color:'yellow',label:'Làm phiếu'}
];
function updateStars(){document.querySelector('#stars').textContent='⭐ '+total}
function award(){total++;updateStars();try{localStorage.setItem('toan-stars',total)}catch{}}
function beep(win=true){if(!sound)return;try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();const notes=win?[[520,0,.08],[780,.07,.08]]:[[200,0,.1]];notes.forEach(([hz,at,len])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=hz;const t=ctx.currentTime+at;g.gain.setValueAtTime(win?.08:.05,t);g.gain.exponentialRampToValueAtTime(.001,t+len);o.start(t);o.stop(t+len)})}catch{}}
document.querySelector('#sound').onclick=()=>{sound=!sound;document.querySelector('#sound').textContent=sound?'🔊':'🔇';document.querySelector('#sound').setAttribute('aria-label',sound?'Tắt âm thanh':'Bật âm thanh');if(sound)beep()};
document.querySelector('#brand').onclick=e=>{e.preventDefault();home()};
function home(){
  stopGame?.();stopGame=null;const p=learning.summary(),started=p.total-p.new,stage=p.levels.find(l=>l.id===p.level)||p.levels[0];
  app.innerHTML=`<section class="welcome"><div><div class="eyebrow">XIN CHÀO, NHÀ THÁM HIỂM NHÍ!</div><h1>Hôm nay mình<br>chơi <span>toán</span> nhé<span class="spark">✦</span></h1><p>Mỗi lượt chơi nhỏ giúp bé nhanh thêm một chút.</p></div><div class="welcome-sticker" aria-hidden="true"><span>🌈</span><b>1 + 2 = <em>3</em></b><small>Thêm một chút giỏi mỗi ngày</small></div></section>
  <section class="journey"><div><span class="journey-icon">🌱</span><div><small>HÀNH TRÌNH CỦA BÉ</small><h2>${p.due?`Hôm nay mình ôn ${Math.min(18,p.due)} phép nhé`:'Sẵn sàng cho một lượt luyện mới!'}</h2><p>Chặng ${p.level} · ${stage.title}${started?' · '+p.mastered+' phép đã thuộc, '+p.learning+' đang luyện':''} <button class="journey-more" id="progress-details" aria-expanded="false">Chi tiết ›</button></p></div></div><button class="journey-cta" id="practice-now"><span class="journey-cta-icon" aria-hidden="true">🚀</span>Luyện tập ngay<span class="journey-cta-arrow" aria-hidden="true">→</span></button><div class="journey-details" id="journey-details" hidden><b>${p.mastered}</b> đã thuộc · <b>${p.strong}</b> đang vững · <b>${p.learning}</b> đang học · <b>${p.new}</b> chưa khám phá<ul class="level-list">${p.levels.map(l=>`<li class="${l.unlocked?'':'locked'} ${l.id===p.level?'current':''}"><span>${l.id}. ${l.title}</span><div class="progress"><div style="width:${l.total?Math.round(l.ready/l.total*100):0}%"></div></div><b>${l.ready}/${l.total}</b></li>`).join('')}</ul><button class="reset-progress" id="reset-progress">Đặt lại dữ liệu</button></div></section>
  <div class="section-head"><h2>Cả một đảo niềm vui</h2><span>Luôn luyện cộng & trừ trong phạm vi 20</span></div><section class="cards">${modes.map((m,i)=>`<button class="game-card ${m.color} ${i===0?'featured':''}" data-mode="${m.id}"><div class="card-top"><span class="game-icon">${m.icon}</span><span class="card-num">0${i+1}</span></div><span class="tag">${m.tag}</span><h3>${m.title}</h3><p>${m.desc}</p><span class="card-cta">${m.label} <span>↗</span></span></button>`).join('')}<aside class="tip"><span>✨</span><h3>Mỗi lần thử là <br>một lần tiến bộ.</h3><p>Chơi một lượt nhỏ,<br>học thêm một điều hay.</p><div>+ &nbsp; − &nbsp; = &nbsp; ♡</div></aside></section>`;
  app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));
  app.querySelector('#practice-now').onclick=()=>start('practice');
  const details=app.querySelector('#journey-details'),more=app.querySelector('#progress-details');more.onclick=()=>{details.hidden=!details.hidden;more.setAttribute('aria-expanded',String(!details.hidden))};
  let confirmReset=false;app.querySelector('#reset-progress').onclick=e=>{if(!confirmReset){confirmReset=true;e.currentTarget.textContent='Bấm lần nữa để xác nhận';return}learning.reset();scores.reset();total=0;try{localStorage.removeItem('toan-stars')}catch{}updateStars();home()};
}
function start(id){stopGame?.();stopGame=null;const mode=modes.find(m=>m.id===id),common={settings,home,award,beep,learning,scores};stopGame=id==='rain'?mountRain(app,common):id==='practice'?mountPractice(app,{...common,startGame:start}):id==='sheet'?mountSheet(app,{...common,startGame:start}):id==='compare'?mountCompare(app,common):mountChallenge(app,{...common,mode})}
updateStars();home();
