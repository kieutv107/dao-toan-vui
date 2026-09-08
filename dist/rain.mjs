import {createGame,difficulty,advance,submit} from './rain-engine.mjs';

export function mountRain(app,{settings,home,award,beep}) {
  const g=createGame(settings);
  let playing=false,paused=false,disposed=false,input='',frame=0,last=0,feedbackTimer;
  const nodes=new Map();
  app.innerHTML=`<div class="play-top"><button class="back" id="rain-back">← Đảo trò chơi</button><span>🌦️ Mưa phép tính</span><button class="back" id="rain-pause" disabled>Tạm dừng</button></div>
    <section class="rain-game" aria-label="Mưa phép tính">
      <div class="rain-stats"><div><span>Điểm</span><b id="rain-score">0</b></div><div><span>Cấp độ</span><b id="rain-level">1</b></div><div><span>Chuỗi đúng</span><b id="rain-streak">0</b></div><div><span>Mạng</span><b id="rain-lives" aria-label="3 mạng">♥ ♥ ♥</b></div></div>
      <div class="rain-layout"><div class="rain-field" id="rain-field" aria-label="Phép tính đang rơi"><div class="rain-lanes" aria-hidden="true"></div><div class="rain-drops" id="rain-drops"></div><div class="rain-floor">Đừng để phép tính chạm vạch nhé!</div><div class="rain-overlay" id="rain-overlay"><span class="rain-symbol" aria-hidden="true">🌦️</span><h1>Mưa phép tính</h1><p>Tính nhẩm, hứng điểm vui!</p><p>Nhập đáp án rồi bấm <strong>OK</strong> hoặc <strong>Enter</strong>.<br>Mỗi phép tính chạm đáy mất ♥.<br>Trả lời sai chỉ ngắt chuỗi đúng.</p><button class="primary" id="rain-begin">Bắt đầu chơi →</button><small>${settings.op==='plus'?'Phép cộng':settings.op==='minus'?'Phép trừ':'Cộng & trừ'} · Trong phạm vi ${settings.limit}</small></div></div>
      <div class="rain-controls"><div class="rain-feedback" id="rain-feedback" role="status" aria-live="polite">Bé sẵn sàng chưa?</div><div class="rain-entry"><span>Đáp án của bé</span><output id="rain-input" aria-label="Đáp án đã nhập">—</output></div><div class="rain-keypad" aria-label="Bàn phím số">${[1,2,3,4,5,6,7,8,9,'erase',0,'ok'].map(v=>`<button data-rain-key="${v}" ${v==='ok'?'class="rain-ok"':''} aria-label="${v==='erase'?'Xóa một chữ số':v==='ok'?'Gửi đáp án':v}" disabled>${v==='erase'?'⌫':v==='ok'?'OK ↵':v}</button>`).join('')}</div><p class="rain-help">Đúng liên tiếp để tăng điểm.<br>Càng lên cấp, mưa càng nhanh!</p></div></div>
    </section>`;
  const $=s=>app.querySelector(s),field=$('#rain-field'),dropLayer=$('#rain-drops'),overlay=$('#rain-overlay'),pauseButton=$('#rain-pause');
  function controls(enabled){app.querySelectorAll('[data-rain-key]').forEach(b=>b.disabled=!enabled)}
  function say(message,kind=''){clearTimeout(feedbackTimer);$('#rain-feedback').textContent=message;$('#rain-feedback').className='rain-feedback '+kind}
  function stats(){const d=difficulty(g);$('#rain-score').textContent=g.score;$('#rain-level').textContent=d.level;$('#rain-streak').textContent=g.streak;$('#rain-lives').textContent='♥ '.repeat(g.lives)+'♡ '.repeat(3-g.lives);$('#rain-lives').setAttribute('aria-label',g.lives+' mạng')}
  function paint(){
    for(const [id,node] of nodes)if(!g.drops.some(d=>d.id===id)){node.remove();nodes.delete(id)}
    const travel=Math.max(40,dropLayer.clientHeight-56);
    for(const drop of g.drops){let node=nodes.get(drop.id);if(!node){node=document.createElement('div');node.className='rain-drop';node.textContent=`${drop.a} ${drop.sign} ${drop.b}`;node.style.left=(drop.lane*25+12.5)+'%';dropLayer.append(node);nodes.set(drop.id,node)}node.style.transform=`translate(-50%, ${drop.y*travel}px)`;node.classList.toggle('rain-danger',drop.y>.78)}
  }
  function effect(drop,text,kind){const el=document.createElement('span');el.className='rain-effect '+kind;el.textContent=text;el.style.left=(drop.lane*25+12.5)+'%';el.style.top=Math.min(85,drop.y*85)+'%';field.append(el);el.addEventListener('animationend',()=>el.remove(),{once:true});setTimeout(()=>el.remove(),900)}
  function end(){playing=false;controls(false);pauseButton.disabled=true;overlay.hidden=false;overlay.innerHTML=`<span class="rain-symbol">🌟</span><h2>Một cơn mưa thật vui!</h2><p><strong>${g.score} điểm</strong> · ${g.solved} phép tính đúng<br>Chuỗi tốt nhất: ${g.bestStreak} · Cấp ${difficulty(g).level}</p><p>Nghỉ mắt một chút rồi thử lại nhé.</p><button class="primary" id="rain-again">↻ Chơi lại</button><button class="back" id="rain-home">Chọn trò khác</button>`;$('#rain-again').onclick=()=>{dispose();mountRestart()};$('#rain-home').onclick=home;$('#rain-again').focus()}
  // Restart within the same mounted controller so the parent's cleanup stays valid.
  function mountRestart(){Object.assign(g,createGame(settings));disposed=false;input='';nodes.clear();dropLayer.replaceChildren();$('#rain-input').textContent='—';document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);begin()}
  function tick(now){if(disposed||!playing||paused)return;const dt=last?Math.min((now-last)/1000,.1):0;last=now;const events=advance(g,dt);for(const e of events){effect(e.drop,'− ♥','miss');say(`${e.drop.a} ${e.drop.sign} ${e.drop.b} = ${e.drop.answer}. Thử phép tiếp nhé!`,'miss');beep(false)}stats();paint();if(g.over){end();return}frame=requestAnimationFrame(tick)}
  function begin(){playing=true;paused=false;last=0;overlay.hidden=true;pauseButton.disabled=false;pauseButton.textContent='Tạm dừng';controls(true);say('Nhập đáp án cho một phép tính đang rơi.');frame=requestAnimationFrame(tick)}
  function pause(){if(!playing)return;paused=!paused;cancelAnimationFrame(frame);controls(!paused);pauseButton.textContent=paused?'Tiếp tục':'Tạm dừng';overlay.hidden=!paused;if(paused){overlay.innerHTML='<span class="rain-symbol">☂️</span><h2>Mưa đang nghỉ</h2><p>Sẵn sàng rồi mình chơi tiếp nhé!</p><button class="primary" id="rain-resume">Tiếp tục →</button>';$('#rain-resume').onclick=pause;$('#rain-resume').focus()}else{last=0;frame=requestAnimationFrame(tick)}}
  function enter(value){if(!playing||paused||g.over)return;if(value==='erase')input=input.slice(0,-1);else if(value==='ok'){
      const result=submit(g,input);if(result.type==='empty')return;input='';if(result.type==='correct'){award();beep();effect(result.drop,'+'+result.points,'success');say(g.streak>=5?`Tuyệt! Chuỗi ${g.streak} · +${result.points} điểm`:`Đúng rồi! +${result.points} điểm`,'success')}else{beep(false);say('Chưa đúng. Bé tính lại nhé!','miss')}stats();paint();
    }else if(input.length<2)input=(input==='0'?'':input)+value;$('#rain-input').textContent=input||'—'}
  function key(e){if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;if(e.key==='Escape'){e.preventDefault();pause();return}if(!playing||paused)return;if(/^\d$/.test(e.key)){e.preventDefault();enter(e.key)}else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();enter('erase')}else if(e.key==='Enter'){e.preventDefault();enter('ok')}}
  function visibility(){if(document.hidden&&playing&&!paused)pause()}
  function dispose(){disposed=true;cancelAnimationFrame(frame);clearTimeout(feedbackTimer);document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility)}
  $('#rain-back').onclick=home;$('#rain-begin').onclick=begin;pauseButton.onclick=pause;app.querySelectorAll('[data-rain-key]').forEach(b=>b.onclick=()=>enter(b.dataset.rainKey));document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return dispose;
}
