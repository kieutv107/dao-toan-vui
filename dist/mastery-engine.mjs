const MAX=20,BANDS=[[0,5],[6,10],[11,15],[16,20]],PROFILE_VERSION=2;
export const MASTERY_SESSIONS=2;
export function factId({a,b,sign}){return `${a}${sign}${b}`}
export function factFamilyId({a,b,sign,answer}){const parts=sign==='+'?[a,b]:[b,answer];parts.sort((x,y)=>x-y);return `${parts[0]}+${parts[1]}=${parts[0]+parts[1]}`}
export function bandFor({a,sign,answer}){const n=sign==='+'?answer:a;return BANDS.findIndex(([,hi])=>n<=hi)}
export function parseFactId(id){const m=/^(\d+)([+−])(\d+)$/.exec(String(id));if(!m)return null;const a=Number(m[1]),sign=m[2],b=Number(m[3]);return {a,b,sign,answer:sign==='+'?a+b:a-b}}
function normalize(fact){if(typeof fact==='string')return parseFactId(fact);if(fact&&fact.answer===undefined)return {...fact,answer:fact.sign==='+'?fact.a+fact.b:fact.a-fact.b};return fact}
export function formKey(fact){const f=normalize(fact);return f?`${factFamilyId(f)}:${f.sign}`:String(fact)}
let catalog;
export function factCatalog(){
  if(catalog)return catalog;
  const out=[];
  for(let a=0;a<=MAX;a++)for(let b=0;b<=MAX-a;b++){const f={a,b,sign:'+',answer:a+b};out.push({...f,id:factId(f),familyId:factFamilyId(f),band:bandFor(f)})}
  for(let a=0;a<=MAX;a++)for(let b=0;b<=a;b++){const f={a,b,sign:'−',answer:a-b};out.push({...f,id:factId(f),familyId:factFamilyId(f),band:bandFor(f)})}
  catalog=Object.freeze(out.map(Object.freeze));return catalog;
}
export function createProfile(){return {version:PROFILE_VERSION,facts:{},timings:{},createdAt:Date.now(),updatedAt:Date.now()}}
const blank=()=>({strength:0,status:'new',correct:0,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:0,dueAt:0});
export function getFactState(profile,fact){return profile.facts[formKey(fact)]||blank()}
function timingKey(context,band){return `${context}:${band}`}
function median(values){const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
export function responseBenchmark(profile,context,band){const a=profile.timings[timingKey(context,band)]||[];return a.length<4?8000:median(a)}
function statusOf(s){if(!s.correct&&!s.wrong&&!s.hints&&!s.reviews)return'new';if(s.strength<=2)return'learning';if(s.strength<=4||s.fastSessions.length<MASTERY_SESSIONS)return'strong';return'mastered'}
function schedule(s,now){s.dueAt=now+([0,0,86400000,259200000][Math.min(3,s.strength>=5&&s.fastSessions.length>=MASTERY_SESSIONS?3:s.strength>=3?2:1)]||0);s.status=statusOf(s);return s}
export function recordEvidence(profile,event){
  const fact=normalize(event.fact),key=formKey(fact),band=fact.band??bandFor(fact),s={...getFactState(profile,fact),fastSessions:[...getFactState(profile,fact).fastSessions]};
  const now=event.now??Date.now(),elapsed=Number(event.elapsedMs),tkey=timingKey(event.context||'practice',band),benchmark=responseBenchmark(profile,event.context||'practice',band);
  if(event.result==='correct'){
    const cleanFirstTry=s.correct===0&&s.wrong===0&&s.hints===0;
    s.correct++;const timed=Number.isFinite(elapsed)&&elapsed>=0,fast=timed&&elapsed<=benchmark;
    s.strength=Math.min(6,s.strength+(fast?(cleanFirstTry?3:2):1));
    if(fast&&event.sessionId&&!s.fastSessions.includes(event.sessionId))s.fastSessions.push(event.sessionId);
    if(timed){const list=[...(profile.timings[tkey]||[]),elapsed].slice(-12);profile.timings[tkey]=list}
  }else if(event.result==='wrong'){s.wrong++;s.strength=Math.max(0,Math.min(4,s.strength-1))}
  else if(event.result==='hint')s.hints++;
  else if(event.result==='review')s.reviews++;
  s.lastSeen=now;schedule(s,now);
  profile.facts[key]=s;profile.updatedAt=now;return s;
}
// Fill a still-blank form with strong-but-reviewable evidence. Never touches a form that already
// carries evidence, so seeding can only add to blanks — it never overwrites or demotes real progress.
export function seedForm(profile,fact,now=Date.now()){
  const key=formKey(fact),cur=getFactState(profile,fact);
  if(cur.correct+cur.wrong+cur.hints+cur.reviews>0)return cur;
  const s={strength:3,status:'strong',correct:1,wrong:0,hints:0,reviews:0,fastSessions:[],lastSeen:now,dueAt:now};
  profile.facts[key]=s;profile.updatedAt=now;return s;
}
export function migrateProfile(old){
  if(!old||old.version===PROFILE_VERSION)return old;
  const profile={...createProfile(),timings:old.timings||{},createdAt:old.createdAt||Date.now(),updatedAt:old.updatedAt||Date.now()};
  for(const [id,s] of Object.entries(old.facts||{})){
    const fact=parseFactId(id);if(!fact||!s)continue;
    const key=formKey(fact),cur=profile.facts[key]||blank(),merged={...cur,correct:cur.correct+(s.correct||0),wrong:cur.wrong+(s.wrong||0),hints:cur.hints+(s.hints||0),reviews:cur.reviews+(s.reviews||0),strength:Math.max(cur.strength,s.strength||0),fastSessions:[...new Set([...cur.fastSessions,...(s.fastSessions||[])])],lastSeen:Math.max(cur.lastSeen,s.lastSeen||0),dueAt:Math.max(cur.dueAt,s.dueAt||0)};
    merged.status=statusOf(merged);profile.facts[key]=merged;
  }
  return profile;
}
