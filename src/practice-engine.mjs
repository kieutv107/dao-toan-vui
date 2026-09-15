import {buildPracticeSession} from './adaptive-selector.mjs';

export function createPractice({profile,sessionId,random=Math.random,now=Date.now(),record=()=>{},focusLevel}={}){
  return {profile,sessionId,random,now,record,focusLevel,questions:buildPracticeSession({profile,sessionId,random,now,focusLevel}),pos:0,done:false,results:{correct:0,wrong:0,hints:0}};
}
export function current(g){return g.questions[g.pos]||null}
export function pickGame(games,random=Math.random){return games[Math.floor(random()*games.length)]}
function event(g,q,result,elapsedMs){g.record({fact:q,result,elapsedMs,context:'practice',sessionId:g.sessionId,now:g.now})}
function requeue(g,q){if(q.reviewScheduled)return;const offset=3+Math.floor(g.random()*3),copy={...q,reviewScheduled:false,hinted:false};q.reviewScheduled=true;g.questions.splice(Math.min(g.questions.length,g.pos+offset),0,copy)}
export function markHint(g){const q=current(g);if(!q||g.done||q.hinted)return false;q.hinted=true;g.results.hints++;event(g,q,'hint');requeue(g,q);return true}
export function answer(g,value,{elapsedMs}={}){
  const q=current(g);if(!q||g.done)return{correct:false,complete:g.done};
  if(Number(value)!==q.answer){g.results.wrong++;event(g,q,'wrong',elapsedMs);requeue(g,q);return{correct:false,complete:false}}
  g.results.correct++;event(g,q,q.hinted?'review':'correct',elapsedMs);g.pos++;g.done=g.pos>=g.questions.length;return{correct:true,complete:g.done};
}
