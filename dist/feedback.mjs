export const NEXT_DELAY_MS=450;
const CENTER_MS=600,MISS_MS=300,LEVELUP_MS=600;

function insert(target,tag,className,text,hidden=true){
  const el=target.ownerDocument.createElement(tag);
  el.className=className;el.textContent=text;
  if(hidden)el.setAttribute('aria-hidden','true');
  target.appendChild(el);return el;
}

// One big check in the middle of the play surface; the ? box is left untouched.
export function showCenterCheck(surface){
  const check=insert(surface,'i','fb-check fb-check-center','✓');
  setTimeout(()=>check.remove(),CENTER_MS);
}

export function showMiss(button){
  button.classList.add('has-miss');
  const miss=insert(button,'i','fb-miss','✗');
  setTimeout(()=>{miss.remove();button.classList.remove('has-miss')},MISS_MS);
}

// The pill lives on the play surface (the HUD re-renders every tick) but is placed over the HUD's level cell.
export function showLevelUp(surface,level,cell){
  surface.classList.add('has-levelup');
  const pill=insert(surface,'span','fb-levelup',`⬆ Lên cấp ${level}!`);
  const s=surface.getBoundingClientRect(),c=cell.getBoundingClientRect();
  pill.style.left=`${c.left+c.width/2-s.left-surface.clientLeft}px`;
  pill.style.top=`${c.top+c.height/2-s.top-surface.clientTop}px`;
  setTimeout(()=>{pill.remove();surface.classList.remove('has-levelup')},LEVELUP_MS);
}

export function announce(region,text){
  region.textContent='';
  insert(region,'span','sr-only',text,false);
}

const CONFETTI_MS=2200,CONFETTI_PIECES=28,CONFETTI_COLORS=['#f4b83c','#7253e9','#51a978','#e0526c','#337cc0','#ffe58a'];
let confettiTimer;

// Rains confetti over the page's #confetti layer (aria-hidden, hidden under reduced motion).
export function celebrateRecord(anchor,random=Math.random){
  const layer=anchor.ownerDocument.getElementById?.('confetti');
  if(!layer)return;
  clearTimeout(confettiTimer);layer.textContent='';
  for(let i=0;i<CONFETTI_PIECES;i++){
    const piece=insert(layer,'i','','',false);
    piece.style.setProperty('--x',(random()*100).toFixed(1)+'%');
    piece.style.setProperty('--delay',(random()*.6).toFixed(2)+'s');
    piece.style.setProperty('--r',Math.round(360+random()*720)+'deg');
    piece.style.setProperty('background',CONFETTI_COLORS[i%CONFETTI_COLORS.length]);
  }
  confettiTimer=setTimeout(()=>{layer.textContent=''},CONFETTI_MS);
}
