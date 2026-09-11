import {createRunnerGame,runnerDifficulty,createRunnerRound,recordRunnerAnswer,elapseRunner} from './runner-engine.mjs';

export function mountRunner(app,{home,award,beep,learning,scores}){
  const g=createRunnerGame(),$=selector=>app.querySelector(selector);
  let playing=false,paused=false,disposed=false,locked=false,scoreSaved=false,round=null,frame=0,last=0,questionLeft=0,delayAction=null,delayLeft=0,questionStarted=0,sessionId=learning.newSessionId(),bestAtStart=scores.top('runner')[0]||0;
  app.innerHTML=`<div class="play-top"><button class="back" id="runner-back">← Đảo trò chơi</button><span>🏃 Vượt chướng ngại vật</span><button class="back" id="runner-pause" disabled>Tạm dừng</button></div>
    <section class="play sunset runner-game" aria-label="Vượt chướng ngại vật">
      <div class="runner-hud" id="runner-hud"></div><div id="runner-body"></div>
      <div class="success-mark" id="runner-success" aria-hidden="true" hidden><span>✓</span></div>
      <div class="challenge-overlay runner-overlay" id="runner-overlay"><span class="runner-intro">🏃‍♀️</span><h1>Vượt chướng ngại vật</h1><p>Tính phép toán rồi chọn đúng một trong ba cánh cổng.<br>Đúng để nhảy qua, sai thì đứng dậy chạy tiếp!</p><button class="primary" id="runner-begin">Bắt đầu →</button><small>Phím 1 · 2 · 3 cũng chọn được cổng</small></div>
    </section>`;
  const overlay=$('#runner-overlay'),pauseButton=$('#runner-pause');

  function difficulty(){return runnerDifficulty(g)}
  function hud(){
    const multiplier=g.streak>=10?'x2':g.streak>=5?'x1.5':g.streak>=3?'x1.2':'x1';
    $('#runner-hud').innerHTML=`<div><span>Điểm</span><b>${g.score}</b></div><div><span>Kỷ lục</span><b>${Math.max(bestAtStart,g.score)}</b></div><div><span>Thời gian</span><b>${Math.ceil(g.remaining)}s</b></div><div><span>Combo</span><b>${g.streak} · ${multiplier}</b></div>`;
    const bar=$('#runner-question-bar');if(bar)bar.style.width=Math.max(0,questionLeft/difficulty().deadline*100)+'%';
  }

  function showSuccess(){const mark=$('#runner-success');mark.hidden=false;mark.classList.remove('play');void mark.offsetWidth;mark.classList.add('play')}
  function newRound(){
    if(disposed||g.over)return;locked=false;delayAction=null;round=createRunnerRound(g,{fact:options=>learning.nextFact(options)});const d=difficulty();questionLeft=d.deadline;questionStarted=performance.now();
    const mark=$('#runner-success');mark.hidden=true;mark.classList.remove('play');
    $('#runner-body').innerHTML=`<div class="runner-question"><span>CẤP ${d.level} · LƯỢT ${g.attempts+1}</span><h2>${round.fact.a} ${round.fact.sign} ${round.fact.b} = ?</h2><div class="runner-time"><div id="runner-question-bar"></div></div></div>
      <div class="runner-scene" style="--travel:${d.travelSeconds}s"><div class="runner-clouds" aria-hidden="true">☁️ <span>☁️</span></div><div class="runner-road"><div class="runner-obstacle" aria-hidden="true">▰</div><div class="runner-hero" id="runner-hero" aria-hidden="true">🏃‍♀️</div><div class="runner-gates">${round.gates.map((gate,index)=>`<button data-runner-choice="${index}" aria-label="Cổng ${index+1}, đáp án ${gate.value}"><small>${index+1}</small><b>${gate.value}</b><span>⌒</span></button>`).join('')}</div></div></div>
      <div class="runner-feedback" id="runner-feedback" role="status" aria-live="polite">Chọn cổng trước khi tới chướng ngại vật nhé!</div>`;
    app.querySelectorAll('[data-runner-choice]').forEach(button=>button.onclick=()=>choose(Number(button.dataset.runnerChoice)));hud();
  }

  function reveal(choice,correct){
    app.querySelectorAll('[data-runner-choice]').forEach((button,index)=>{button.disabled=true;if(round.gates[index].correct)button.classList.add('right');else if(index===choice)button.classList.add('wrong')});
    const hero=$('#runner-hero');hero.classList.add(correct?'jump':'crash');
  }

  function resolve(correct,choice=null,timedOut=false){
    if(locked||disposed||g.over)return;locked=true;const points=recordRunnerAnswer(g,correct);reveal(choice,correct);hud();
    if(correct){
      learning.record({fact:round.fact,result:'correct',elapsedMs:performance.now()-questionStarted,context:'runner',sessionId});award();beep();showSuccess();
      $('#runner-feedback').textContent=`Qua cổng! +${points} điểm${g.streak>=3?` · Combo ${g.streak}`:''}`;$('#runner-feedback').className='runner-feedback success';delayLeft=.45;
    }else{
      learning.record({fact:round.fact,result:'wrong',elapsedMs:performance.now()-questionStarted,context:'runner',sessionId});beep(false);
      $('#runner-feedback').textContent=`${timedOut?'Chưa kịp rồi!':'Ối, vướng chướng ngại vật!'} Đáp án đúng là ${round.answer}.`;
      $('#runner-feedback').className='runner-feedback miss';delayLeft=.9;
    }
    delayAction=newRound;
  }

  function choose(index){if(!playing||paused||locked||disposed||g.over)return;resolve(round.gates[index].correct,index)}
  function timeout(){resolve(false,null,true)}

  function finish(){
    if(disposed||scoreSaved)return;playing=false;locked=true;delayAction=null;pauseButton.disabled=true;const result=scores.record('runner',g.score);scoreSaved=true;overlay.hidden=false;
    overlay.innerHTML=`<span class="runner-intro">${result.newRecord?'🏆':'🏁'}</span><h2>${result.newRecord?'Kỷ lục mới!':'Về đích rồi!'}</h2><p><strong>${g.score} điểm</strong> · Qua đúng ${g.correct} chướng ngại vật<br>Combo tốt nhất: ${g.bestStreak}</p><div class="score-board"><h3>5 điểm cao nhất</h3>${result.scores.map((score,index)=>`<span><b>${index+1}</b> ${score} điểm</span>`).join('')}</div><div class="finish-actions"><button class="primary" id="runner-again">↻ Chạy lại</button><button class="back" id="runner-home">Chọn trò khác</button></div>`;
    $('#runner-again').onclick=restart;$('#runner-home').onclick=home;$('#runner-again').focus();hud();
  }

  function tick(now){
    if(disposed||!playing)return;const dt=last?(now-last)/1000:0;last=now;
    if(!paused){
      elapseRunner(g,dt);if(g.over){finish();return}
      if(delayAction){delayLeft-=dt;if(delayLeft<=0){const action=delayAction;delayAction=null;action()}}
      else if(!locked){questionLeft=Math.max(0,questionLeft-dt);if(!questionLeft)timeout()}
      hud();
    }
    frame=requestAnimationFrame(tick);
  }

  function begin(){playing=true;paused=false;last=0;overlay.hidden=true;pauseButton.disabled=false;pauseButton.textContent='Tạm dừng';newRound();frame=requestAnimationFrame(tick)}
  function restart(){Object.assign(g,createRunnerGame());scoreSaved=false;bestAtStart=scores.top('runner')[0]||0;sessionId=learning.newSessionId();begin()}
  function togglePause(){
    if(!playing||g.over)return;paused=!paused;last=performance.now();overlay.hidden=!paused;$('#runner-body').inert=paused;pauseButton.textContent=paused?'Tiếp tục':'Tạm dừng';
    if(paused){overlay.innerHTML='<span class="runner-intro">⏸️</span><h2>Mình nghỉ một chút nhé</h2><p>Đồng hồ và đường chạy đã dừng.</p><button class="primary" id="runner-resume">Tiếp tục →</button>';$('#runner-resume').onclick=togglePause;$('#runner-resume').focus()}else pauseButton.focus();
  }
  function key(event){
    if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;if(event.key==='Escape'){event.preventDefault();togglePause();return}
    const index=Number(event.key)-1;if(index>=0&&index<3){event.preventDefault();choose(index)}
  }
  function visibility(){if(document.hidden&&playing&&!paused)togglePause()}
  function cleanup(){disposed=true;cancelAnimationFrame(frame);delayAction=null;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)}

  $('#runner-back').onclick=home;$('#runner-begin').onclick=begin;pauseButton.onclick=togglePause;document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);hud();return cleanup;
}
