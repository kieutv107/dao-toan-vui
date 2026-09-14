import {getFactState} from './mastery-engine.mjs';
import {LEVELS,MIXED_LEVEL,coreForms,formsAtLevel,formsBelowLevel} from './core-facts.mjs';

const UNLOCK=.7,FOCUS_SHARE=.75;
const ready=s=>['strong','mastered'].includes(s.status);
function seen(s){return s.correct+s.wrong+s.hints+s.reviews>0}
function formState(profile,form){return getFactState(profile,form.questions[0])}
export function levelReadiness(profile,level){const forms=formsAtLevel(level);return forms.length?forms.filter(f=>ready(formState(profile,f))).length/forms.length:0}
export function currentLevel(profile){let level=1;while(level<MIXED_LEVEL&&levelReadiness(profile,level)>=UNLOCK)level++;return level}
function openForms(profile,level=currentLevel(profile)){return [...formsAtLevel(level),...formsBelowLevel(level)]}
function questionsOf(forms,{excludeIds=[],excludeAnswers=[],sign}={}){
  const excluded=new Set(excludeIds),answers=new Set(excludeAnswers);
  return forms.flatMap(f=>f.questions).filter(q=>!excluded.has(q.id)&&!answers.has(q.answer)&&(!sign||q.sign===sign));
}
function byKind(profile,pool,kind,now){
  if(kind==='new')return pool.filter(q=>getFactState(profile,q).status==='new');
  if(kind==='weak')return pool.filter(q=>{const s=getFactState(profile,q);return seen(s)&&(s.wrong>0||s.hints>0||s.strength<=2)});
  if(kind==='learning')return pool.filter(q=>getFactState(profile,q).status==='learning');
  if(kind==='due')return pool.filter(q=>{const s=getFactState(profile,q);return ready(s)&&s.dueAt<=now});
  return pool;
}
// focusLevel: a topic the child picked for this session only. It may be a locked level, and the
// selector then stays inside it (no review from lower levels, no fallback to other topics).
export function selectFact({profile,kind='normal',excludeIds=[],excludeAnswers=[],sign,scope,strict=false,focusLevel,random=Math.random,now=Date.now()}={}){
  const level=focusLevel??currentLevel(profile),focus=formsAtLevel(level),review=focusLevel?[]:formsBelowLevel(level),open=focusLevel?focus:openForms(profile,level);
  const wanted=scope||(review.length&&random()>=FOCUS_SHARE?'review':'focus');
  const primary=kind==='hardest'?open:wanted==='review'?review:focus;
  const filters={excludeIds,excludeAnswers,sign},widen=!strict&&!focusLevel;
  let pool=byKind(profile,questionsOf(primary,filters),kind,now);
  if(!pool.length)pool=questionsOf(primary,filters);
  if(!pool.length)pool=questionsOf(open,filters);
  if(!pool.length&&widen)pool=questionsOf(coreForms(),filters);
  if(!pool.length&&widen)pool=questionsOf(coreForms(),{excludeIds,excludeAnswers});
  if(!pool.length)return undefined;
  if(kind==='hardest')return [...pool].sort((a,b)=>{const x=getFactState(profile,a),y=getFactState(profile,b);return Number(!seen(x))-Number(!seen(y))||x.strength-y.strength||y.wrong-x.wrong||y.hints-x.hints||b.band-a.band||a.id.localeCompare(b.id)})[0];
  const weights=pool.map(q=>{const s=getFactState(profile,q);return 1+(s.wrong*3+s.hints*2)+(s.dueAt<=now&&seen(s)?3:0)+(s.status==='learning'?2:0)}),total=weights.reduce((a,b)=>a+b,0);let n=random()*total;
  for(let i=0;i<pool.length;i++){n-=weights[i];if(n<=0)return pool[i]}return pool.at(-1);
}
const SESSION_KINDS=['weak','weak','weak','weak','weak','weak','weak','learning','learning','learning','learning','learning','due','due','due','due','new','new'];
export function buildPracticeSession({profile,random=Math.random,now=Date.now(),count=SESSION_KINDS.length,focusLevel}={}){
  const kinds=Array.from({length:count},(_,i)=>SESSION_KINDS[i%SESSION_KINDS.length]),out=[],used=[];
  for(const kind of kinds){
    let q=selectFact({profile,kind,excludeIds:used,strict:true,focusLevel,random,now});
    if(!q)q=selectFact({profile,kind,excludeIds:used.slice(-3),strict:true,focusLevel,random,now});
    if(!q)q=selectFact({profile,excludeIds:used.slice(-1),focusLevel,random,now});
    out.push({...q});used.push(q.id);
  }
  return out;
}
export function progressSummary(profile,now=Date.now()){
  const level=currentLevel(profile),counts={new:0,learning:0,strong:0,mastered:0,due:0,total:0,level,levels:[]};
  for(const form of openForms(profile,level)){const s=formState(profile,form);counts[s.status]++;counts.total++;if(s.status!=='new'&&s.dueAt<=now)counts.due++}
  counts.levels=LEVELS.map(({id,title})=>{const forms=formsAtLevel(id);return {id,title,total:forms.length,ready:forms.filter(f=>ready(formState(profile,f))).length,unlocked:id<=level}});
  return counts;
}
