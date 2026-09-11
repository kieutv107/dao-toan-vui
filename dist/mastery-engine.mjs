const MAX=20,BANDS=[[0,5],[6,10],[11,15],[16,20]];
export function factId({a,b,sign}){return `${a}${sign}${b}`}
export function factFamilyId({a,b,sign,answer}){const parts=sign==='+'?[a,b]:[b,answer];parts.sort((x,y)=>x-y);return `${parts[0]}+${parts[1]}=${parts[0]+parts[1]}`}
export function bandFor({a,sign,answer}){const n=sign==='+'?answer:a;return BANDS.findIndex(([,hi])=>n<=hi)}
let catalog;
export function factCatalog(){
  if(catalog)return catalog;
  const out=[];
  for(let a=0;a<=MAX;a++)for(let b=0;b<=MAX-a;b++){const f={a,b,sign:'+',answer:a+b};out.push({...f,id:factId(f),familyId:factFamilyId(f),band:bandFor(f)})}
  for(let a=0;a<=MAX;a++)for(let b=0;b<=a;b++){const f={a,b,sign:'−',answer:a-b};out.push({...f,id:factId(f),familyId:factFamilyId(f),band:bandFor(f)})}
  catalog=Object.freeze(out.map(Object.freeze));return catalog;
}
export function createProfile(){return {version:1,facts:{},timings:{},createdAt:Date.now(),updatedAt:Date.now()}}
const blank=()=>({strength:0,status:'new',correct:0,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:0,dueAt:0});
export function getFactState(profile,id){return profile.facts[id]||blank()}
function timingKey(context,band){return `${context}:${band}`}
function median(values){const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
export function responseBenchmark(profile,context,band){const a=profile.timings[timingKey(context,band)]||[];return a.length<4?8000:median(a)}
function statusOf(s){if(!s.correct&&!s.wrong&&!s.hints&&!s.reviews)return'new';if(s.strength<=2)return'learning';if(s.strength<=4||s.fastSessions.length<3)return'strong';return'mastered'}
export function recordEvidence(profile,event){
  const id=event.fact.id||factId(event.fact),band=event.fact.band??bandFor(event.fact),s={...getFactState(profile,id),fastSessions:[...getFactState(profile,id).fastSessions]};
  const now=event.now??Date.now(),elapsed=Number(event.elapsedMs),key=timingKey(event.context||'practice',band),benchmark=responseBenchmark(profile,event.context||'practice',band);
  if(event.result==='correct'){
    s.correct++;const timed=Number.isFinite(elapsed)&&elapsed>=0,fast=timed&&elapsed<=benchmark;
    s.strength=Math.min(6,s.strength+(fast?2:1));
    if(fast&&event.sessionId&&!s.fastSessions.includes(event.sessionId))s.fastSessions.push(event.sessionId);
    if(timed){const list=[...(profile.timings[key]||[]),elapsed].slice(-12);profile.timings[key]=list}
  }else if(event.result==='wrong'){s.wrong++;s.strength=Math.max(0,Math.min(4,s.strength-1))}
  else if(event.result==='hint')s.hints++;
  else if(event.result==='review')s.reviews++;
  s.lastSeen=now;s.dueAt=now+([0,0,86400000,259200000][Math.min(3,s.strength>=5&&s.fastSessions.length>=3?3:s.strength>=3?2:1)]||0);s.status=statusOf(s);
  profile.facts[id]=s;profile.updatedAt=now;return s;
}
export function progressSummary(profile,now=Date.now()){
  const counts={new:0,learning:0,strong:0,mastered:0,due:0,total:factCatalog().length};
  for(const fact of factCatalog()){const s=getFactState(profile,fact.id);counts[s.status]++;if(s.status!=='new'&&s.dueAt<=now)counts.due++}
  return counts;
}
