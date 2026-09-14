import {choices} from './math.mjs';
import {createPlacement,placementStage,recordPlacement,placementResult} from './placement-engine.mjs';
import {showCenterCheck,showMiss,announce,NEXT_DELAY_MS} from './feedback.mjs';

export function mountPlacement(app,{home,beep,learning}){
  let state=createPlacement(),q,options=[],locked=false,disposed=false,timer=null,step=0;
  const $=s=>app.querySelector(s);
  app.innerHTML=`<div class="play-top"><button class="back" id="placement-back">← Về đảo</button><span>🧭 Kiểm tra trình độ</span></div><section class="play blue challenge placement"><p class="challenge-rules">Vài câu ngắn để tìm đúng chỗ bắt đầu cho bé. Không tính điểm, không đếm giờ.</p><div id="placement-body"></div></section>`;
  $('#placement-back').onclick=home;
  function feedback(text,type=''){const f=$('#feedback');if(f){f.textContent=text;f.className='challenge-feedback '+type}}
  function ask(){
    if(disposed)return;
    const stage=placementStage(state);
    if(stage==null){finish();return}
    step++;locked=false;
    q=learning.nextFact({focusLevel:stage,context:'placement'});
    options=choices(q.answer,20);
    render();
  }
  function render(){
    $('#placement-body').innerHTML=`<div class="play-label">CÂU ${step}</div><h2>Mình cùng tính nhé!</h2><div class="equation">${q.a}<span>${q.sign}</span>${q.b}<span>=</span><b class="unknown">?</b></div><div class="answers">${options.map((v,i)=>`<button data-answer="${v}" style="--i:${i}">${v}</button>`).join('')}</div><div id="feedback" role="status" aria-live="polite" class="challenge-feedback"></div>`;
    app.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.answer),b));
    feedback('Chọn đáp án của bé nhé!');
  }
  function choose(value,button){
    if(locked||disposed)return;locked=true;
    const correct=value===q.answer;
    app.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);
    if(correct){button.classList.add('right','challenge-pop');beep();showCenterCheck($('.play'),$('.equation'));feedback('','success');announce($('#feedback'),`Chính xác, ${q.a} ${q.sign} ${q.b} = ${q.answer}`)}
    else{button.classList.add('wrong','challenge-shake');beep(false);showMiss(button);feedback('Chưa đúng, mình xem câu tiếp nhé!','miss')}
    recordPlacement(state,correct); // drives the ladder only — no learning.record()
    timer=setTimeout(ask,NEXT_DELAY_MS);
  }
  function restart(){clearTimeout(timer);state=createPlacement();step=0;locked=false;ask()}
  function finish(){
    if(disposed)return;
    learning.placeAt(placementResult(state).level);
    const landed=learning.summary().level;
    $('#placement-body').innerHTML=`<div class="finish-icon">🎉</div><h2>Bắt đầu ở Chặng ${landed}!</h2><p>Đã tìm được chỗ bắt đầu vừa sức cho bé. Cùng luyện nhé!</p><div class="finish-actions"><button class="back" id="placement-redo">↻ Làm lại bài test</button><button class="primary" id="placement-done">Bắt đầu →</button></div>`;
    $('#placement-done').onclick=home;$('#placement-redo').onclick=restart;$('#placement-done').focus();
  }
  ask();
  return ()=>{disposed=true;clearTimeout(timer)};
}
