import {factCatalog,getFactState} from './mastery-engine.mjs';

export function unlockedBand(profile){
  let unlocked=0;
  for(let band=0;band<3;band++){
    const facts=factCatalog().filter(f=>f.band===band),ready=facts.filter(f=>['strong','mastered'].includes(getFactState(profile,f.id).status)).length;
    if(ready/facts.length<.7)break;unlocked=band+1;
  }
  return unlocked;
}
function seen(s){return s.correct+s.wrong+s.hints+s.reviews>0}
function poolFor(profile,{kind='normal',excludeIds=[],excludeAnswers=[],sign,now=Date.now()}={}){
  const band=unlockedBand(profile),excluded=new Set(excludeIds),answers=new Set(excludeAnswers);
  let pool=factCatalog().filter(f=>f.band<=band&&!excluded.has(f.id)&&!answers.has(f.answer)&&(!sign||f.sign===sign));
  if(kind==='new')pool=factCatalog().filter(f=>f.band<=Math.min(3,band+1)&&getFactState(profile,f.id).status==='new'&&!excluded.has(f.id)&&!answers.has(f.answer)&&(!sign||f.sign===sign));
  else if(kind==='weak')pool=pool.filter(f=>{const s=getFactState(profile,f.id);return seen(s)&&(s.wrong>0||s.hints>0||s.strength<=2)});
  else if(kind==='learning')pool=pool.filter(f=>getFactState(profile,f.id).status==='learning');
  else if(kind==='due')pool=pool.filter(f=>{const s=getFactState(profile,f.id);return ['strong','mastered'].includes(s.status)&&s.dueAt<=now});
  return pool;
}
export function selectFact({profile,kind='normal',excludeIds=[],excludeAnswers=[],sign,random=Math.random,now=Date.now()}={}){
  let pool=poolFor(profile,{kind,excludeIds,excludeAnswers,sign,now});
  if(!pool.length)pool=poolFor(profile,{kind:'normal',excludeIds,excludeAnswers,sign,now});
  if(!pool.length)pool=poolFor(profile,{kind:'normal',excludeIds,excludeAnswers,now});
  if(kind==='hardest')return [...pool].sort((a,b)=>{const x=getFactState(profile,a.id),y=getFactState(profile,b.id);return Number(!seen(x))-Number(!seen(y))||x.strength-y.strength||y.wrong-x.wrong||y.hints-x.hints||b.band-a.band||a.id.localeCompare(b.id)})[0];
  const weights=pool.map(f=>{const s=getFactState(profile,f.id);return 1+(s.wrong*3+s.hints*2)+(s.dueAt<=now&&seen(s)?3:0)+(s.status==='learning'?2:0)}),total=weights.reduce((a,b)=>a+b,0);let n=random()*total;
  for(let i=0;i<pool.length;i++){n-=weights[i];if(n<=0)return pool[i]}return pool.at(-1);
}
export function buildPracticeSession({profile,random=Math.random,now=Date.now()}={}){
  const kinds=['weak','weak','weak','weak','weak','weak','weak','learning','learning','learning','learning','learning','due','due','due','due','new','new'],out=[],used=[];
  for(let i=0;i<kinds.length;i++){
    const sign=i%2?'−':'+';let q=selectFact({profile,kind:kinds[i],excludeIds:used,sign,random,now});
    if(!q)q=selectFact({profile,excludeIds:used,sign,random,now});
    if(!q)q=selectFact({profile,excludeIds:used,random,now});
    out.push({...q});used.push(q.id);
  }
  return out;
}
