import {createSheet,setAnswer,filledCount,grade} from './sheet-engine.mjs';

export function mountSheet(app,{home,beep,learning,startGame}){
  const g=createSheet({profile:learning.profile,sessionId:learning.newSessionId(),record:e=>learning.record(e)}),$=s=>app.querySelector(s),stage=learning.summary();
  let disposed=false;
  app.innerHTML=`<div class="play-top"><button class="back" id="sheet-back">← Đảo trò chơi</button><span>📝 Phiếu 20 phép</span><span class="practice-badge">Chặng ${stage.level} · Không đếm giờ</span></div>
    <section class="play yellow sheet"><p class="challenge-rules">Điền kết quả vào từng ô, xong hết rồi bấm <b>Chấm bài</b>. Không tính giờ, không trừ điểm!</p>
      <ol class="sheet-grid" id="sheet-grid">${g.questions.map((q,i)=>`<li class="sheet-row"><label for="sheet-${i}"><span class="sheet-eq"><b class="sheet-term">${q.a}</b><i class="sheet-op">${q.sign}</i><b class="sheet-term">${q.b}</b><i class="sheet-op">=</i></span></label><input id="sheet-${i}" data-index="${i}" type="number" inputmode="numeric" min="0" max="20" autocomplete="off" aria-label="Kết quả câu ${i+1}: ${q.a} ${q.sign} ${q.b}"><span class="sheet-mark" aria-live="polite"></span></li>`).join('')}</ol>
      <div class="sheet-footer"><div id="sheet-status" role="status" aria-live="polite" class="challenge-feedback"></div><div class="finish-actions" id="sheet-actions"><button class="primary" id="sheet-grade">Chấm bài ✓</button></div></div>
    </section>`;
  $('#sheet-back').onclick=home;
  const inputs=[...app.querySelectorAll('input[data-index]')];
  function status(text,kind=''){const s=$('#sheet-status');s.textContent=text;s.className='challenge-feedback '+kind}
  function progress(){const n=filledCount(g);status(n<g.questions.length?`Đã điền ${n} / ${g.questions.length} câu`:'Đủ rồi! Bấm Chấm bài nhé.',n<g.questions.length?'':'success')}
  inputs.forEach((input,i)=>{
    input.oninput=()=>{setAnswer(g,i,input.value);progress()};
    input.onkeydown=e=>{if(e.key==='Enter'||e.key==='ArrowDown'){e.preventDefault();(inputs[i+1]||$('#sheet-grade')).focus()}else if(e.key==='ArrowUp'&&i>0){e.preventDefault();inputs[i-1].focus()}};
  });
  function finish(){
    if(disposed||g.graded)return;
    const r=grade(g);
    g.marks.forEach((m,i)=>{const row=inputs[i].closest('.sheet-row'),mark=row.querySelector('.sheet-mark');inputs[i].disabled=true;row.classList.add(m.correct?'right':'wrong');mark.textContent=m.correct?'✓':m.blank?`trống → ${m.expected}`:`✗ sai → ${m.expected}`});
    beep(r.correct>=g.questions.length/2);
    status(r.correct===g.questions.length?`Tuyệt vời! Đúng cả ${r.correct} câu!`:`Đúng ${r.correct} / ${g.questions.length} câu${r.blank?`, còn ${r.blank} câu chưa điền`:''}. Câu sai đã có đáp án bên cạnh để bé xem lại.`,r.correct===g.questions.length?'success':'');
    $('#sheet-actions').innerHTML=`<button class="primary" id="sheet-again">↻ Làm phiếu mới</button><button class="back" id="sheet-home">Nghỉ một chút</button>`;
    $('#sheet-again').onclick=()=>startGame('sheet');$('#sheet-home').onclick=home;$('#sheet-again').focus();
    app.querySelector('.sheet-row.wrong')?.scrollIntoView({block:'center',behavior:'smooth'});
  }
  $('#sheet-grade').onclick=finish;
  progress();inputs[0]?.focus();
  return ()=>{disposed=true};
}
