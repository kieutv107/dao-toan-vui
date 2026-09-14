import {createTrueFalseGame,createTrueFalseRound,recordTrueFalseAnswer,elapseTrueFalse,reviewFacts} from './truefalse-engine.mjs';
import {showCenterCheck,showMiss,announce,NEXT_DELAY_MS,celebrateRecord} from './feedback.mjs';

const MISS_DELAY_MS=1000;
// An expression carries its real result, hidden until a miss; a plain number has none.
const side=part=>part.kind==='fact'?`<span class="tf-part tf-expression"><span class="tf-result" hidden>${part.value}</span>${part.label}</span>`:`<span class="tf-part">${part.label}</span>`;

export function mountTrueFalse(app,{home,award,beep,learning,scores}){
  const g=createTrueFalseGame(),$=selector=>app.querySelector(selector);
  let playing=false,paused=false,disposed=false,locked=false,scoreSaved=false,round=null,frame=0,last=0,delayAction=null,delayLeft=0,bestAtStart=scores.top('truefalse')[0]||0,sessionId=learning.newSessionId();
  app.innerHTML=`<div class="play-top"><button class="back" id="tf-back">← Đảo trò chơi</button><span>✅ Đúng hay sai?</span><button class="back" id="tf-pause" disabled>Tạm dừng</button></div>
    <section class="play yellow tf-game" aria-label="Đúng hay sai">
      <div class="tf-hud" id="tf-hud"></div>
      <div id="tf-body"></div>
      <div class="challenge-overlay tf-overlay" id="tf-overlay"><span class="tf-symbol">✅</span><h1>Đúng hay sai?</h1><p>Nhìn phép tính rồi chọn <strong>Đúng</strong> hoặc <strong>Sai</strong>.</p><button class="primary" id="tf-begin">Bắt đầu →</button><small>← Đúng · → Sai · Esc để tạm dừng</small></div>
    </section>`;
  const overlay=$('#tf-overlay'),pauseButton=$('#tf-pause');

  function hud(){
    $('#tf-hud').innerHTML=`<div><span>Điểm</span><b>${g.score}</b></div><div><span>Kỷ lục</span><b>${bestAtStart}</b></div><div><span>Thời gian</span><b>${Math.ceil(g.remaining)}s</b></div><div><span>Chuỗi đúng</span><b>${g.streak}</b></div>`;
  }

  function newRound(){
    if(disposed||g.over)return;locked=false;delayAction=null;round=createTrueFalseRound(g,{fact:()=>learning.nextFact({context:'truefalse'})});
    $('#tf-body').innerHTML=`<div class="play-label">LƯỢT ${g.attempts+1}</div><h2>Phép tính này đúng hay sai?</h2><div class="tf-card${round.right.kind==='fact'?' two-sided':''}">${side(round.left)}<span class="tf-equals">=</span>${side(round.right)}</div><div class="tf-choices"><button class="tf-choice" data-tf-choice="true"><b aria-hidden="true">✓</b> Đúng</button><button class="tf-choice" data-tf-choice="false"><b aria-hidden="true">✗</b> Sai</button></div><div class="sr-only" id="tf-feedback" role="status" aria-live="polite"></div>`;
    app.querySelectorAll('[data-tf-choice]').forEach(button=>button.onclick=()=>choose(button.dataset.tfChoice==='true'));hud();
  }

  function choose(saidTrue){
    if(!playing||paused||locked||disposed||g.over)return;
    const correct=saidTrue===round.truth,points=recordTrueFalseAnswer(g,correct),region=$('#tf-feedback');
    locked=true;hud();
    app.querySelectorAll('[data-tf-choice]').forEach(button=>{
      const value=button.dataset.tfChoice==='true';button.disabled=true;
      if(value===round.truth)button.classList.add('right');else if(value===saidTrue){button.classList.add('wrong');showMiss(button)}
    });
    if(correct){
      reviewFacts(round,true).forEach(fact=>learning.record({fact,result:'review',context:'truefalse',sessionId}));award();beep();showCenterCheck($('.tf-game'));
      announce(region,`Chính xác, +${points} điểm`);delayLeft=NEXT_DELAY_MS/1000;
    }else{
      beep(false);app.querySelectorAll('.tf-result').forEach(result=>result.hidden=false);
      announce(region,`Chưa đúng. ${[round.left,round.right].filter(part=>part.kind==='fact').map(part=>`${part.label} = ${part.value}`).join(', ')}`);delayLeft=MISS_DELAY_MS/1000;
    }
    delayAction=newRound;
  }

  function finish(){
    if(disposed||scoreSaved)return;playing=false;locked=true;delayAction=null;pauseButton.disabled=true;
    const result=scores.record('truefalse',g.score);scoreSaved=true;bestAtStart=result.scores[0]||0;overlay.hidden=false;
    overlay.innerHTML=`<span class="tf-symbol${result.newRecord?' record-trophy':''}">${result.newRecord?'🏆':'🌟'}</span><h2${result.newRecord?' class="record-title"':''}>${result.newRecord?'Kỷ lục mới!':'Hết giờ!'}</h2><p>${result.newRecord?`Bé vừa vượt kỷ lục ${result.previousBest} điểm!<br>`:''}<strong>${g.score} điểm</strong> · ${g.correct} lượt đúng<br>Chuỗi tốt nhất: ${g.bestStreak}</p><div class="score-board"><h3>5 điểm cao nhất</h3>${result.scores.map((score,index)=>index===result.rank?`<span class="current-run"><b>${index+1}</b><small>Lượt chơi hiện tại</small>${score} điểm</span>`:`<span><b>${index+1}</b> ${score} điểm</span>`).join('')}</div><div class="finish-actions"><button class="primary" id="tf-again">↻ Chơi lại</button><button class="back" id="tf-home">Chọn trò khác</button></div>`;
    $('#tf-again').onclick=restart;$('#tf-home').onclick=home;$('#tf-again').focus();hud();if(result.newRecord)celebrateRecord(app);
  }

  function tick(now){
    if(disposed||!playing)return;const dt=last?(now-last)/1000:0;last=now;
    if(!paused){
      elapseTrueFalse(g,dt);if(g.over){finish();return}
      if(delayAction){delayLeft-=dt;if(delayLeft<=0){const action=delayAction;delayAction=null;action()}}
      hud();
    }
    frame=requestAnimationFrame(tick);
  }

  function begin(){playing=true;paused=false;last=0;overlay.hidden=true;pauseButton.disabled=false;pauseButton.textContent='Tạm dừng';newRound();frame=requestAnimationFrame(tick)}
  function restart(){Object.assign(g,createTrueFalseGame());scoreSaved=false;bestAtStart=scores.top('truefalse')[0]||0;sessionId=learning.newSessionId();begin()}
  function togglePause(){
    if(!playing||g.over)return;paused=!paused;last=performance.now();overlay.hidden=!paused;pauseButton.textContent=paused?'Tiếp tục':'Tạm dừng';
    if(paused){overlay.innerHTML='<span class="tf-symbol">⏸️</span><h2>Mình nghỉ một chút nhé</h2><p>Đồng hồ đã dừng.</p><button class="primary" id="tf-resume">Tiếp tục →</button>';$('#tf-resume').onclick=togglePause;$('#tf-resume').focus()}else pauseButton.focus();
  }
  function key(event){
    if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;if(event.key==='Escape'){event.preventDefault();togglePause();return}
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();choose(event.key==='ArrowLeft')}
  }
  function visibility(){if(document.hidden&&playing&&!paused)togglePause()}
  function cleanup(){disposed=true;cancelAnimationFrame(frame);delayAction=null;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)}

  $('#tf-back').onclick=home;$('#tf-begin').onclick=begin;pauseButton.onclick=togglePause;document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);hud();return cleanup;
}
