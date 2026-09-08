export function createChallenge(mode,limit=20){
  return {mode,limit,correct:0,attempts:0,score:0,streak:0,bestStreak:0,clean:true,lives:['bubble','mystery'].includes(mode)?3:null,remaining:60,board:1,over:false};
}
export function challengeDifficulty(g){
  const level=g.mode==='memory'?g.board:1+Math.floor(g.correct/4);
  const deadline=['bubble','rocket','mystery'].includes(g.mode)?Math.max(g.mode==='mystery'?10:8,(g.mode==='mystery'?22:18)-(level-1)*2):null;
  return {level,limit:Math.min(g.limit,6+(level-1)*5),deadline,pairs:[3,4,6][Math.min(2,g.board-1)],reveal:Math.max(900,1500-(level-1)*250),motion:Math.max(1.4,3-(level-1)*.3)};
}
export function recordAnswer(g,good){
  if(g.over)return 0;
  g.attempts++;
  if(!good){g.streak=0;g.clean=false;g.score=Math.max(0,g.score-5);if(g.lives!==null)g.lives=Math.max(0,g.lives-1);if(g.mode==='rocket')g.remaining=Math.max(0,g.remaining-3);g.over=g.lives===0||(g.mode==='rocket'&&g.remaining===0);return 0}
  g.correct++;g.streak=g.clean?g.streak+1:0;g.bestStreak=Math.max(g.bestStreak,g.streak);
  const points=g.clean?10*Math.min(4,1+Math.floor(g.streak/5)):5;g.score+=points;return points;
}
export function elapse(g,seconds){if(!g.over&&g.mode==='rocket'){g.remaining=Math.max(0,g.remaining-seconds);if(!g.remaining)g.over=true}}
