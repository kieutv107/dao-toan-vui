export function createRunnerGame(){return {attempts:0,correct:0,score:0,streak:0,bestStreak:0,remaining:75,over:false}}

export function runnerDifficulty(g){
  const level=1+Math.floor(g.correct/5),deadline=Math.max(4.2,8-(level-1)*.55);
  return {level,deadline,travelSeconds:deadline};
}

function comboMultiplier(streak){return streak>=10?2:streak>=5?1.5:streak>=3?1.2:1}

export function recordRunnerAnswer(g,good){
  if(g.over)return 0;g.attempts++;
  if(!good){g.streak=0;return 0}
  g.correct++;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);
  const points=Math.round(10*comboMultiplier(g.streak));g.score+=points;return points;
}

export function elapseRunner(g,seconds){if(!g.over){g.remaining=Math.max(0,g.remaining-seconds);if(g.remaining<.000001){g.remaining=0;g.over=true}}}

function fallbackFact(random){
  const a=2+Math.floor(random()*8),room=Math.max(2,Math.min(9,20-a)),b=2+Math.floor(random()*(room-1));
  return {a,b,sign:'+',answer:a+b,id:`${a}+${b}`};
}

function shuffle(values,random){
  for(let i=values.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}return values;
}

function distractors(answer,attempts,random){
  const [low,high]=attempts<5?[2,5]:attempts<15?[1,3]:[1,2],near=[];
  for(let gap=low;gap<=high;gap++)for(const value of [answer-gap,answer+gap])if(value>=0&&value<=20)near.push(value);
  const pool=[...new Set(near)];
  for(let value=0;pool.length<2&&value<=20;value++)if(value!==answer&&!pool.includes(value))pool.push(value);
  return shuffle(pool,random).slice(0,2);
}

export function createRunnerRound(g,{fact,random=Math.random}={}){
  const selected=fact?.({context:'runner'})||fallbackFact(random),values=[selected.answer,...distractors(selected.answer,g.attempts,random)];
  const gates=shuffle(values,random).map(value=>({value,correct:value===selected.answer}));
  return {fact:selected,gates,answer:selected.answer};
}
