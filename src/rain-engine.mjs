import {question} from './math.mjs';

export function createGame({limit=20,op='mix'}={}) {
  return {limit,op,drops:[],spawnIn:0,nextId:1,goldGap:0,score:0,streak:0,bestStreak:0,solved:0,lives:3,over:false};
}
export function difficulty(g) {
  const level=1+Math.floor(g.solved/6);
  return {level,speed:.055,interval:3.8,maxDrops:Math.min(4,1+Math.floor(level/2)),goldChance:level<2?0:Math.min(.2,.06+(level-2)*.02)};
}
export function advance(g,dt,random=Math.random,{normalFact,hardestFact}={}) {
  if(g.over)return [];
  const d=difficulty(g),events=[];
  for(const drop of g.drops)drop.y+=dt*d.speed;
  const missed=g.drops.find(x=>x.y>=1);
  if(missed) {
    g.lives=Math.max(0,g.lives-1);g.streak=0;events.push({type:'miss',drop:missed});
    g.drops=[];g.spawnIn=1.2;g.over=!g.lives;
    return events;
  }
  g.spawnIn-=dt;
  if(g.spawnIn<=0&&g.drops.length<d.maxDrops) {
    // Each live card owns a lane, so equations never obscure one another.
    const free=[0,1,2,3].filter(lane=>!g.drops.some(x=>x.lane===lane));
    const lane=free[Math.floor(Math.random()*free.length)];
    const limit=Math.min(g.limit,10+(d.level-1)*2);
    const special=d.maxDrops>1&&g.drops.length>0&&g.goldGap===0&&!g.drops.some(x=>x.special)&&random()<d.goldChance;
    g.goldGap=special?5:Math.max(0,g.goldGap-1);
    // Skip equations already on screen so two identical drops never fall together.
    const busy=g.drops.map(x=>x.factId);
    const fact=(special?hardestFact?.(busy):normalFact?.(busy))||question(limit,g.op);
    g.drops.push({...fact,factId:fact.id,id:g.nextId++,lane,y:0,special});
    g.spawnIn=d.interval;
  }
  return events;
}
export function submit(g,input) {
  if(g.over||!/^\d{1,2}$/.test(input))return {type:'empty'};
  const matches=g.drops.filter(x=>x.answer===Number(input)).sort((a,b)=>b.y-a.y);
  const drop=matches.find(x=>x.special)||matches[0];
  if(!drop){g.streak=0;return {type:'wrong'}}
  const special=!!drop.special,cleared=special?[...g.drops]:matches;
  const ids=new Set(cleared.map(x=>x.id));
  g.drops=g.drops.filter(x=>!ids.has(x.id));g.solved++;g.streak++;
  g.bestStreak=Math.max(g.bestStreak,g.streak);
  const points=10*Math.min(5,1+Math.floor(g.streak/5));g.score+=points;
  if(!g.drops.length)g.spawnIn=Math.min(g.spawnIn,.6);
  return {type:'correct',drop,cleared,special,points};
}
export function learningFact(result){return result?.type==='correct'?result.drop:null}
