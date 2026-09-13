import {choices} from './math.mjs';
import {createPractice,current,answer,markHint} from './practice-engine.mjs';
import {strategyHint} from './strategies.mjs';
import {showCheck,showMiss,announce,NEXT_DELAY_MS} from './feedback.mjs';

export function mountPractice(app,{home,beep,learning,startGame}){
  const before=learning.summary(),g=createPractice({profile:learning.profile,sessionId:learning.newSessionId(),record:e=>learning.record(e)}),$=s=>app.querySelector(s);
  let options=[],bad=[],locked=false,disposed=false,advanceTimer=null,message='',kind='',startedAt=performance.now();
  app.innerHTML=`<div class="play-top"><button class="back" id="practice-back">← Đảo trò chơi</button><span>🌱 Vườn luyện tập</span><span class="practice-badge">Một lượt nhỏ · 18 câu chính</span></div><section class="play green challenge"><div class="challenge-hud" id="practice-hud"></div><p class="challenge-rules">Game sẽ chọn đúng phần bé đang cần. Câu chưa vững sẽ được ôn lại sau vài câu. Không tính giờ, không trừ điểm!</p><div id="practice-body"></div></section>`;
  $('#practice-back').onclick=home;
  function hud(){$('#practice-hud').innerHTML=`<div><span>Câu hiện tại</span><b>${Math.min(g.pos+1,g.questions.length)}</b></div><div><span>Còn lại</span><b>${Math.max(0,g.questions.length-g.pos)}</b></div><div><span>Đang luyện</span><b>${learning.summary().learning}</b></div><div><span>Đã thuộc</span><b>${learning.summary().mastered}</b></div>`}
  function feedback(text,type=''){message=text;kind=type;const f=$('#feedback');if(f){f.textContent=text;f.className='challenge-feedback '+type}}
  function focusFirst(){app.querySelector('[data-answer]:not(:disabled)')?.focus()}
  function newQuestion(moveFocus=false){if(disposed||g.done)return;locked=false;bad=[];const q=current(g);options=choices(q.answer,20);message='Chọn đáp án của bé nhé!';kind='';startedAt=performance.now();render(q);if(moveFocus)focusFirst()}
  function render(q){
    $('#practice-body').innerHTML=`<div class="play-label">CÂU ${Math.min(g.pos+1,g.questions.length)}</div><h2>Mình cùng tính nhé!</h2><div class="equation">${q.a}<span>${q.sign}</span>${q.b}<span>=</span><b class="unknown">?</b></div><div class="answers">${options.map((v,i)=>`<button data-answer="${v}" style="--i:${i}">${v}</button>`).join('')}</div><div id="feedback" role="status" aria-live="polite" class="challenge-feedback"></div><button class="hint" id="hint">💡 Cho bé một gợi ý</button><div id="hint-content"></div>`;
    app.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.answer),b));$('#hint').onclick=()=>hint(q);feedback(message,kind);hud();
  }
  function hint(q){if(locked||disposed)return;markHint(g);$('#hint').disabled=true;const h=strategyHint(q),{total,from,mode}=h.dots;
    $('#hint-content').innerHTML=`<div class="hint-steps">${h.lines.map(l=>`<p>${l}</p>`).join('')}</div><div class="dots ${h.frame==='ten'?'ten-frame':''}">${Array.from({length:total},(_,i)=>`<i class="${i>=from?mode:''}"></i>`).join('')||'<b>Không còn chấm nào: 0</b>'}</div>`;focusFirst()}
  function choose(value,button){if(locked||disposed||g.done||bad.includes(value))return;const q=current(g),result=answer(g,value,{elapsedMs:performance.now()-startedAt});
    if(!result.correct){bad.push(value);button.disabled=true;button.classList.add('wrong','challenge-shake');showMiss(button);beep(false);feedback('Chưa đúng. Bé thử lại nhé!','miss');hud();return}
    locked=true;button.classList.add('right','challenge-pop');app.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);$('#hint').disabled=true;beep();showCheck($('.unknown'),q.answer);feedback('','success');announce($('#feedback'),`Chính xác, ${q.a} ${q.sign} ${q.b} = ${q.answer}`);hud();advanceTimer=setTimeout(()=>result.complete?finish():newQuestion(true),NEXT_DELAY_MS);
  }
  function finish(){if(disposed)return;const after=learning.summary(),gained=Math.max(0,after.mastered-before.mastered);
    $('#practice-body').innerHTML=`<div class="finish-icon">${gained?'🏆':'🌟'}</div><h2>${gained?`Bé vừa thuộc thêm ${gained} phép tính!`:'Hoàn thành một lượt luyện!'}</h2><p>Bé đã làm đúng ${g.results.correct} câu. Hiện có ${after.learning} phép đang luyện và ${after.mastered} phép đã thuộc.</p><div class="finish-actions"><button class="primary" id="practice-again">↻ Luyện thêm</button><button class="primary secondary" id="practice-recommend">Chơi Bắt bong bóng</button><button class="back" id="practice-home">Nghỉ một chút</button></div>`;
    $('#practice-home').onclick=home;$('#practice-recommend').onclick=()=>startGame('bubble');$('#practice-again').onclick=()=>startGame('practice');$('#practice-again').focus();hud();
  }
  function key(e){if(disposed||locked||e.repeat)return;if(/^\d$/.test(e.key)){const b=[...app.querySelectorAll('[data-answer]:not(:disabled)')].find(x=>x.dataset.answer===e.key);if(b){e.preventDefault();b.click()}}}
  function cleanup(){disposed=true;clearTimeout(advanceTimer);document.removeEventListener('keydown',key)}
  document.addEventListener('keydown',key);newQuestion();return cleanup;
}
