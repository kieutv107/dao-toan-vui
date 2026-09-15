const DURATION=90;

export function createTrueFalseGame(){
  return {attempts:0,correct:0,score:0,streak:0,bestStreak:0,wrongRun:0,recoveryRun:0,stagePenalty:0,remaining:DURATION,over:false};
}

export function unlockedTrueFalseStage(g){const elapsed=DURATION-g.remaining;return elapsed<30?1:elapsed<60?2:3}

export function trueFalseStage(g){return Math.max(1,unlockedTrueFalseStage(g)-g.stagePenalty)}

export function recordTrueFalseAnswer(g,good){
  if(g.over)return 0;
  const stageBefore=trueFalseStage(g);
  g.attempts++;
  if(!good){
    g.streak=0;g.recoveryRun=0;g.wrongRun++;
    if(g.wrongRun===2){
      if(stageBefore>1)g.stagePenalty=unlockedTrueFalseStage(g)-(stageBefore-1);
      g.wrongRun=0;
    }
    return 0;
  }
  g.correct++;g.wrongRun=0;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);g.recoveryRun++;
  if(g.stagePenalty&&g.recoveryRun===3){g.stagePenalty--;g.recoveryRun=0}
  const points=10*Math.min(4,1+Math.floor(g.streak/5));g.score+=points;return points;
}

export function elapseTrueFalse(g,seconds){
  if(g.over)return;g.remaining=Math.max(0,g.remaining-seconds);if(g.remaining<.000001){g.remaining=0;g.over=true}
}

const MAX=20,FALSE_GAPS={1:[3,5],2:[1,2],3:[1,1]};
const randomInt=(low,high,random)=>low+Math.floor(random()*(high-low+1));
const pick=(list,random)=>list[Math.floor(random()*list.length)];
const inRange=n=>Number.isInteger(n)&&n>=0&&n<=MAX;
const valueOf=({a,b,sign})=>sign==='+'?a+b:a-b;
const usable=f=>!!f&&(f.sign==='+'||f.sign==='−')&&inRange(f.a)&&inRange(f.b)&&inRange(valueOf(f))&&f.answer===valueOf(f);
const expression=fact=>({kind:'fact',value:fact.answer,label:`${fact.a} ${fact.sign} ${fact.b}`,fact});
const number=value=>({kind:'number',value,label:String(value)});

function factsForValue(value){
  const out=[];
  for(let a=0;a<=value;a++)out.push({a,b:value-a,sign:'+',answer:value,id:`${a}+${value-a}`});
  for(let b=1;value+b<=MAX;b++)out.push({a:value+b,b,sign:'−',answer:value,id:`${value+b}−${b}`});
  return out;
}

// Moves away by a gap in [low, high]; flips direction when the preferred one would leave 0–20.
function shifted(value,[low,high],random){
  const gap=randomInt(low,high,random),up=random()<.5;
  if(up&&value+gap<=MAX)return value+gap;
  return value-gap>=0?value-gap:value+gap;
}

export function createTrueFalseRound(g,{fact,random=Math.random}={}){
  const stage=trueFalseStage(g),truth=random()<.5,twoSided=stage===3&&random()<.5,supplied=fact?.();
  const left=expression(usable(supplied)?supplied:pick(factsForValue(randomInt(0,MAX,random)),random));
  const target=truth?left.value:shifted(left.value,twoSided?[1,2]:FALSE_GAPS[stage],random);
  const right=twoSided?expression(pick(factsForValue(target).filter(f=>f.id!==left.fact.id),random)):number(target);
  return {stage,truth,left,right};
}

export function reviewFacts(round,correct){return correct?[round.left.fact]:[]}
