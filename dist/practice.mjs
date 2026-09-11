import {choices} from './math.mjs';
import {createPractice,startSet,current,answer,nextSet} from './practice-engine.mjs';

export function mountPractice(app,{settings,home,beep}) {
  const g=createPractice({op:settings.op,limit:settings.limit}),$=s=>app.querySelector(s);
  let options=[],bad=[],locked=false,disposed=false,advanceTimer=null,message='',kind='';
  startSet(g);
  const opLabel=settings.op==='plus'?'Chỉ phép cộng':settings.op==='minus'?'Chỉ phép trừ':'Cộng và trừ';
  app.innerHTML=`<style>.practice-badge{font-size:13px;font-weight:800;color:#237249;background:#dff3e6;border:1px solid #b7e2c6;padding:6px 12px;border-radius:999px;white-space:nowrap}@media(max-width:520px){.practice-badge{font-size:11px;padding:5px 9px}}</style><div class="play-top"><button class="back" id="practice-back">← Đảo trò chơi</button><span>🌱 Vườn luyện tập</span><span class="practice-badge">Luyện tập · không tính điểm</span></div><section class="play green challenge"><div class="challenge-hud" id="practice-hud"></div><p class="challenge-rules">Luyện từng bộ theo tổng, từ dễ đến khó. ${opLabel}. Sai không sao cả — bé cứ thử lại tới khi đúng nhé!</p><div id="practice-body"></div></section>`;
  $('#practice-back').onclick=home;
  const total=()=>g.totals[g.setIndex];
  function hud(){$('#practice-hud').innerHTML=`<div><span>Bộ</span><b>${g.setIndex+1}/${g.totals.length}</b></div><div><span>Tổng</span><b>${total()}</b></div><div><span>Trong bộ</span><b>${Math.min(g.pos+1,g.questions.length)}/${g.questions.length}</b></div><div><span>Đã đúng</span><b>${g.correct}</b></div>`}
  function feedback(text,type=''){message=text;kind=type;const f=$('#feedback');if(f){f.textContent=text;f.className='challenge-feedback '+type}}
  function focusFirstAnswer(){app.querySelector('[data-answer]:not(:disabled)')?.focus()}
  function newQuestion(moveFocus=false){if(disposed||g.done)return;locked=false;bad=[];const q=current(g);options=choices(q.answer,Math.max(9,total()));message='Chọn đáp án của bé nhé!';kind='';render(q);if(moveFocus)focusFirstAnswer()}
  function render(q){
    $('#practice-body').innerHTML=`<div class="play-label">BỘ TỔNG ${total()} · CÂU ${Math.min(g.pos+1,g.questions.length)}/${g.questions.length}</div><h2>Mình cùng tính nhé!</h2><div class="equation">${q.a}<span>${q.sign}</span>${q.b}<span>=</span><b class="unknown">?</b></div><div class="answers">${options.map((v,i)=>`<button data-answer="${v}" style="--i:${i}">${v}</button>`).join('')}</div><div id="feedback" role="status" aria-live="polite" class="challenge-feedback"></div><button class="hint" id="hint">💡 Cho bé một gợi ý</button><div id="hint-content"></div>`;
    app.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.answer),b));
    $('#hint').onclick=()=>hint(q);feedback(message,kind);hud();
  }
  function hint(q){if(locked||disposed)return;$('#hint').disabled=true;$('#hint-content').innerHTML=`<p>${q.sign==='+'?`Đếm ${q.a} chấm, rồi thêm ${q.b} chấm.`:`Có ${q.a} chấm, bớt đi ${q.b} chấm bị gạch.`}</p><div class="dots">${Array.from({length:q.sign==='+'?q.answer:q.a},(_,i)=>`<i class="${q.sign==='+'?(i>=q.a?'added':''):(i>=q.answer?'removed':'')}"></i>`).join('')}</div>`;focusFirstAnswer()}
  function choose(value,button){if(locked||disposed||g.done||bad.includes(value))return;const q=current(g),result=answer(g,value);
    if(!result.correct){bad.push(value);button.disabled=true;button.classList.add('wrong','challenge-shake');beep(false);feedback('Chưa đúng. Bé thử lại nhé!','miss');return}
    locked=true;button.classList.add('right','challenge-pop');app.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);if($('#hint'))$('#hint').disabled=true;beep();
    feedback(`Chính xác! ${q.a} ${q.sign} ${q.b} = ${q.answer}`,'success');hud();
    advanceTimer=setTimeout(()=>result.setComplete?setDone():newQuestion(true),850);
  }
  function setDone(){if(disposed)return;const done=g.setIndex>=g.totals.length-1,finishedTotal=total();
    $('#practice-body').innerHTML=`<div class="finish-icon">${done?'🏆':'🌟'}</div><h2>${done?'Hoàn thành cả vườn luyện tập!':`Xong các cặp có tổng ${finishedTotal}!`}</h2><p>${done?`Bé đã luyện xong tất cả các bộ · ${g.correct} câu đúng. Giỏi lắm!`:`Bé làm đúng cả ${g.questions.length} câu của bộ này rồi.`}</p><div class="finish-actions">${done?'<button class="primary" id="practice-again">↻ Luyện lại từ đầu</button>':`<button class="primary" id="practice-next">Sang tổng ${g.totals[g.setIndex+1]} →</button>`}<button class="back" id="practice-home">Chọn trò khác</button></div>`;
    $('#practice-home').onclick=home;
    if(done){$('#practice-again').onclick=()=>{Object.assign(g,createPractice({op:settings.op,limit:settings.limit}));startSet(g);newQuestion(true)};$('#practice-again').focus()}
    else{$('#practice-next').onclick=()=>{nextSet(g);newQuestion(true)};$('#practice-next').focus()}
    hud();
  }
  newQuestion();
  return ()=>{disposed=true;clearTimeout(advanceTimer)};
}
