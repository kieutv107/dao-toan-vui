import {mountRain} from './rain.mjs';
import {mountPractice} from './practice.mjs';
import {mountChallenge} from './challenge.mjs';
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
  {id:'mystery',icon:'🔎',title:'Số nào trốn mất?',desc:'Làm thám tử, tìm con số còn thiếu.',tag:'SUY LUẬN · TÌM TÒI',color:'pink',label:'Khám phá'}
];
function updateStars(){document.querySelector('#stars').textContent='⭐ '+total}
function award(){total++;updateStars();try{localStorage.setItem('toan-stars',total)}catch{}}
function beep(win=true){if(!sound)return;try{ctx??=new(window.AudioContext||window.webkitAudioContext)();ctx.resume();[0,.12,.24].forEach((t,i)=>{let o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=(win?520:220)*(1+i*.25);g.gain.setValueAtTime(.08,ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+t+.2);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+.2)})}catch{}}
document.querySelector('#sound').onclick=()=>{sound=!sound;document.querySelector('#sound').textContent=sound?'🔊':'🔇';document.querySelector('#sound').setAttribute('aria-label',sound?'Tắt âm thanh':'Bật âm thanh');if(sound)beep()};
document.querySelector('#brand').onclick=e=>{e.preventDefault();home()};
function home(){
  stopGame?.();stopGame=null;const p=learning.summary(),started=p.total-p.new;
  app.innerHTML=`<section class="welcome"><div><div class="eyebrow">XIN CHÀO, NHÀ THÁM HIỂM NHÍ!</div><h1>Hôm nay mình<br>chơi <span>toán</span> nhé<span class="spark">✦</span></h1><p>Mỗi lượt chơi nhỏ giúp bé nhanh thêm một chút.</p></div><div class="welcome-sticker" aria-hidden="true"><span>🌈</span><b>1 + 2 = <em>3</em></b><small>Thêm một chút giỏi mỗi ngày</small></div></section>
+  <section class="journey"><div><span class="journey-icon">🌱</span><div><small>HÀNH TRÌNH CỦA BÉ</small><h2>${p.due?`Hôm nay mình ôn ${Math.min(18,p.due)} phép nhé`:'Sẵn sàng cho một lượt luyện mới!'}</h2><p>${started?p.mastered+' phép đã thuộc · '+p.learning+' phép đang luyện':'Mình bắt đầu từ những phép tính thật dễ nhé.'}</p></div></div><button class="back" id="progress-details">Xem tiến độ</button><div class="journey-details" id="journey-details" hidden><b>${p.mastered}</b> đã thuộc · <b>${p.strong}</b> đang vững · <b>${p.learning}</b> đang học · <b>${p.new}</b> chưa khám phá <button class="reset-progress" id="reset-progress">Đặt lại dữ liệu</button></div></section>
+  <div class="section-head"><h2>Cả một đảo niềm vui</h2><span>Luôn luyện cộng & trừ trong phạm vi 20</span></div><section class="cards">${modes.map((m,i)=>`<button class="game-card ${m.color} ${i===0?'featured':''}" data-mode="${m.id}"><div class="card-top"><span class="game-icon">${m.icon}</span><span class="card-num">0${i+1}</span></div><span class="tag">${m.tag}</span><h3>${m.title}</h3><p>${m.desc}</p><span class="card-cta">${m.label} <span>↗</span></span></button>`).join('')}<aside class="tip"><span>✨</span><h3>Mỗi lần thử là<br>một lần tiến bộ.</h3><p>Chơi một lượt nhỏ,<br>học thêm một điều hay.</p><div>+ &nbsp; − &nbsp; = &nbsp; ♡</div></aside></section>`;
  app.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>start(b.dataset.mode));
  const details=app.querySelector('#journey-details');app.querySelector('#progress-details').onclick=()=>{details.hidden=!details.hidden};
  let confirmReset=false;app.querySelector('#reset-progress').onclick=e=>{if(!confirmReset){confirmReset=true;e.currentTarget.textContent='Bấm lần nữa để xác nhận';return}learning.reset();scores.reset();home()};
}
function start(id){stopGame?.();stopGame=null;const mode=modes.find(m=>m.id===id),common={settings,home,award,beep,learning,scores};stopGame=id==='rain'?mountRain(app,common):id==='practice'?mountPractice(app,{...common,startGame:start}):mountChallenge(app,{...common,mode})}
updateStars();home();
