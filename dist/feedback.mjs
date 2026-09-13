export const NEXT_DELAY_MS=450;
const MORPH_MS=200,MISS_MS=300,STREAK_MS=600;

function insert(target,tag,className,text,hidden=true){
  const el=target.ownerDocument.createElement(tag);
  el.className=className;el.textContent=text;
  if(hidden)el.setAttribute('aria-hidden','true');
  target.appendChild(el);return el;
}

export function showCheck(target,answer){
  target.classList.add('is-check');
  if(answer===undefined){insert(target,'i','fb-check fb-check-badge','✓');return}
  target.textContent='';
  const check=insert(target,'i','fb-check fb-check-fill','✓');
  insert(target,'b','fb-answer',String(answer));
  setTimeout(()=>check.remove(),MORPH_MS);
}

export function showMiss(button){
  button.classList.add('has-miss');
  const miss=insert(button,'i','fb-miss','✗');
  setTimeout(()=>{miss.remove();button.classList.remove('has-miss')},MISS_MS);
}

export function showStreak(anchor,n){
  anchor.classList.add('has-streak');
  const pill=insert(anchor,'span','fb-streak',`Chuỗi ${n}`);
  setTimeout(()=>{pill.remove();anchor.classList.remove('has-streak')},STREAK_MS);
}

export function announce(region,text){
  region.textContent='';
  insert(region,'span','sr-only',text,false);
}
