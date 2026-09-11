export function createCompareGame(){
  return {attempts:0,correct:0,score:0,streak:0,bestStreak:0,wrongRun:0,recoveryRun:0,stagePenalty:0,remaining:60,over:false};
}

export function unlockedCompareStage(g){return g.attempts<5?1:g.attempts<10?2:3}

export function compareStage(g){return Math.max(1,unlockedCompareStage(g)-g.stagePenalty)}

export function recordCompareAnswer(g,good){
  if(g.over)return 0;
  const stageBefore=compareStage(g);
  g.attempts++;
  if(!good){
    g.streak=0;g.recoveryRun=0;g.wrongRun++;
    if(g.wrongRun===2){
      if(stageBefore>1)g.stagePenalty=unlockedCompareStage(g)-(stageBefore-1);
      g.wrongRun=0;
    }
    return 0;
  }
  g.correct++;g.wrongRun=0;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);g.recoveryRun++;
  if(g.stagePenalty&&g.recoveryRun===3){g.stagePenalty--;g.recoveryRun=0}
  const points=10*Math.min(4,1+Math.floor(g.streak/5));g.score+=points;return points;
}

export function elapseCompare(g,seconds){
  if(g.over)return;g.remaining=Math.max(0,g.remaining-seconds);if(g.remaining<.000001){g.remaining=0;g.over=true}
}

const clamp=value=>Math.max(0,Math.min(20,Math.round(value)));
const randomInt=(max,random)=>Math.floor(random()*(max+1));
const numberCard=value=>({kind:'number',value:clamp(value),label:String(clamp(value))});
const factCard=fact=>({kind:'fact',value:clamp(fact.answer),label:`${fact.a} ${fact.sign} ${fact.b}`,fact});
const winner=cards=>cards[0].value===cards[1].value?'equal':cards[0].value>cards[1].value?'top':'bottom';

export function compareGap(g){return g.attempts<15?[3,6]:g.attempts<20?[2,4]:[1,2]}

function differentValue(base,[low,high],random){
  const gap=low+randomInt(high-low,random),preferUp=random()<.5;
  if(preferUp&&base+gap<=20)return base+gap;
  if(base-gap>=0)return base-gap;
  return Math.min(20,base+gap);
}

function factForValue(value,random,avoidId){
  const candidates=[];
  for(let a=0;a<=value;a++){const b=value-a;candidates.push({a,b,sign:'+',answer:value,id:`${a}+${b}`})}
  for(let b=1;value+b<=20;b++){const a=value+b;candidates.push({a,b,sign:'−',answer:value,id:`${a}−${b}`})}
  const usable=candidates.filter(x=>x.id!==avoidId),pool=usable.length?usable:candidates;
  return pool[randomInt(pool.length-1,random)];
}

function suppliedFact(fact,options,random,fallbackValue=10){
  const candidate=fact?.(options);return candidate&&Number.isFinite(candidate.answer)?candidate:factForValue(fallbackValue,random);
}

function numberRound(tie,random){
  const top=randomInt(20,random),bottom=tie?top:differentValue(top,[1,8],random),cards=[numberCard(top),numberCard(bottom)];
  return {cards,answer:winner(cards)};
}

function mixedRound(tie,fact,random){
  const expression=suppliedFact(fact,{},random,randomInt(20,random));
  const number=tie?expression.answer:differentValue(expression.answer,[1,6],random);
  const cards=random()<.5?[factCard(expression),numberCard(number)]:[numberCard(number),factCard(expression)];
  return {cards,answer:winner(cards)};
}

function factRound(g,tie,fact,random){
  const first=suppliedFact(fact,{},random,randomInt(20,random));let second;
  if(tie){
    const candidate=fact?.({answer:first.answer,excludeIds:[first.id]});
    second=candidate?.answer===first.answer&&candidate.id!==first.id?candidate:factForValue(first.answer,random,first.id);
  }else{
    const [low,high]=compareGap(g);let best=null;
    for(let i=0;i<30;i++){
      const candidate=fact?.({excludeIds:[first.id]});if(!candidate||!Number.isFinite(candidate.answer))continue;
      const gap=Math.abs(first.answer-candidate.answer);if(gap>=low&&gap<=high){second=candidate;break}
      if(gap>0&&(!best||Math.abs(gap-(low+high)/2)<best.distance))best={candidate,distance:Math.abs(gap-(low+high)/2)};
    }
    second??=best?.candidate;
    if(!second||second.answer===first.answer)second=factForValue(differentValue(first.answer,[low,high],random),random,first.id);
  }
  const cards=[factCard(first),factCard(second)];return {cards,answer:winner(cards)};
}

export function createCompareRound(g,{fact,random=Math.random}={}){
  const tie=random()<.2,stage=compareStage(g);
  return stage===1?numberRound(tie,random):stage===2?mixedRound(tie,fact,random):factRound(g,tie,fact,random);
}

export function reviewFacts(round,correct){
  return correct?round.cards.filter(card=>card.kind==='fact').map(card=>card.fact):[];
}
