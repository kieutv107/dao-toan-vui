import {createCompareGame,compareStage,createCompareRound,recordCompareAnswer,elapseCompare,reviewFacts} from './compare-engine.mjs';
import {showCheck,showMiss,showStreak,announce,NEXT_DELAY_MS} from './feedback.mjs';

export function mountCompare(app,{home,award,beep,learning,scores}){
  const g=createCompareGame(),$=selector=>app.querySelector(selector);
  let playing=false,paused=false,disposed=false,locked=false,scoreSaved=false,round=null,frame=0,last=0,delayAction=null,delayLeft=0,bestAtStart=scores.top('compare')[0]||0,sessionId=learning.newSessionId();
  app.innerHTML=`<div class="play-top"><button class="back" id="compare-back">← Đảo trò chơi</button><span>⚖️ Số nào lớn hơn?</span><button class="back" id="compare-pause" disabled>Tạm dừng</button></div>
    <section class="play purple compare-game" aria-label="Số nào lớn hơn">
      <div class="compare-hud" id="compare-hud"></div>
      <div id="compare-body"></div>
      <div class="challenge-overlay compare-overlay" id="compare-overlay"><span class="compare-symbol">⚖️</span><h1>Số nào lớn hơn?</h1><p>Chạm vào thẻ có giá trị lớn hơn.<br>Nếu hai bên bằng nhau, chọn <strong>Bằng nhau</strong>.</p><button class="primary" id="compare-begin">Bắt đầu →</button><small>↑ thẻ trên · ↓ thẻ dưới · Enter để chọn bằng nhau</small></div>
    </section>`;
  const overlay=$('#compare-overlay'),pauseButton=$('#compare-pause');

  function hud(){
    $('#compare-hud').innerHTML=`<div><span>Điểm</span><b>${g.score}</b></div><div><span>Kỷ lục</span><b>${bestAtStart}</b></div><div><span>Thời gian</span><b>${Math.ceil(g.remaining)}s</b></div><div><span>Chuỗi đúng</span><b>${g.streak}</b></div>`;
  }

  function adaptiveFact(options={}){return learning.nextFact({context:'compare',...options})}
  function newRound(){
    if(disposed||g.over)return;locked=false;delayAction=null;round=createCompareRound(g,{fact:adaptiveFact});
    $('#compare-body').innerHTML=`<div class="play-label">LƯỢT ${g.attempts+1}</div><h2>Thẻ nào có giá trị lớn hơn?</h2><div class="compare-stack"><button class="compare-card" aria-label="Chọn thẻ phía trên: ${round.cards[0].label}" data-compare-choice="top"><b>${round.cards[0].label}</b></button><div class="compare-versus" aria-hidden="true">so với</div><button class="compare-card" aria-label="Chọn thẻ phía dưới: ${round.cards[1].label}" data-compare-choice="bottom"><b>${round.cards[1].label}</b></button><button class="compare-equal" data-compare-choice="equal">Hai thẻ bằng nhau</button></div><div class="compare-feedback" id="compare-feedback" role="status" aria-live="polite">Chọn đáp án của bé nhé!</div>`;
    app.querySelectorAll('[data-compare-choice]').forEach(button=>button.onclick=()=>choose(button.dataset.compareChoice));hud();
  }

  function highlight(answer,choice){
    app.querySelectorAll('[data-compare-choice]').forEach(button=>{button.disabled=true;if(button.dataset.compareChoice===answer){button.classList.add('right');showCheck(button)}else if(button.dataset.compareChoice===choice){button.classList.add('wrong');showMiss(button)}});
  }

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

  function finish(){
    if(disposed||scoreSaved)return;playing=false;locked=true;delayAction=null;pauseButton.disabled=true;
    const result=scores.record('compare',g.score);scoreSaved=true;overlay.hidden=false;
    overlay.innerHTML=`<span class="compare-symbol">${result.newRecord?'🏆':'🌟'}</span><h2>${result.newRecord?'Kỷ lục mới!':'Hết giờ!'}</h2><p>${result.newRecord?`Bé vừa vượt kỷ lục ${result.previousBest} điểm!<br>`:''}<strong>${g.score} điểm</strong> · ${g.correct} lượt đúng<br>Chuỗi tốt nhất: ${g.bestStreak}</p><div class="score-board"><h3>5 điểm cao nhất</h3>${result.scores.map((score,index)=>`<span><b>${index+1}</b> ${score} điểm</span>`).join('')}</div><div class="finish-actions"><button class="primary" id="compare-again">↻ Chơi lại</button><button class="back" id="compare-home">Chọn trò khác</button></div>`;
    $('#compare-again').onclick=restart;$('#compare-home').onclick=home;$('#compare-again').focus();hud();
  }

  function tick(now){
    if(disposed||!playing)return;const dt=last?(now-last)/1000:0;last=now;
    if(!paused){
      elapseCompare(g,dt);if(g.over){finish();return}
      if(delayAction){delayLeft-=dt;if(delayLeft<=0){const action=delayAction;delayAction=null;action()}}
      hud();
    }
    frame=requestAnimationFrame(tick);
  }

  function begin(){playing=true;paused=false;last=0;overlay.hidden=true;pauseButton.disabled=false;pauseButton.textContent='Tạm dừng';newRound();frame=requestAnimationFrame(tick)}
  function restart(){Object.assign(g,createCompareGame());scoreSaved=false;bestAtStart=scores.top('compare')[0]||0;sessionId=learning.newSessionId();begin()}
  function togglePause(){
    if(!playing||g.over)return;paused=!paused;last=performance.now();overlay.hidden=!paused;pauseButton.textContent=paused?'Tiếp tục':'Tạm dừng';
    if(paused){overlay.innerHTML='<span class="compare-symbol">⏸️</span><h2>Mình nghỉ một chút nhé</h2><p>Đồng hồ đã dừng.</p><button class="primary" id="compare-resume">Tiếp tục →</button>';$('#compare-resume').onclick=togglePause;$('#compare-resume').focus()}else pauseButton.focus();
  }
  function key(event){
    if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;if(event.key==='Escape'){event.preventDefault();togglePause();return}
    const choice={ArrowUp:'top',ArrowDown:'bottom','=':'equal',Enter:'equal'}[event.key];if(choice){event.preventDefault();choose(choice)}
  }
  function visibility(){if(document.hidden&&playing&&!paused)togglePause()}
  function cleanup(){disposed=true;cancelAnimationFrame(frame);delayAction=null;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)}

  $('#compare-back').onclick=home;$('#compare-begin').onclick=begin;pauseButton.onclick=togglePause;document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);hud();return cleanup;
}
