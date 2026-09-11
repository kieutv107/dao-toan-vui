export function createCompareGame(){
  return {attempts:0,correct:0,score:0,streak:0,bestStreak:0,wrongRun:0,recoveryRun:0,stagePenalty:0,remaining:60,over:false};
}

export function unlockedCompareStage(g){return g.attempts<5?1:g.attempts<10?2:3}

export function compareStage(g){return Math.max(1,unlockedCompareStage(g)-g.stagePenalty)}

export function recordCompareAnswer(g,good){
  if(g.over)return 0;
  g.attempts++;
  if(!good){
    g.streak=0;g.recoveryRun=0;g.wrongRun++;
    if(g.wrongRun===2){if(compareStage(g)>1)g.stagePenalty++;g.wrongRun=0}
    return 0;
  }
  g.correct++;g.wrongRun=0;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);g.recoveryRun++;
  if(g.stagePenalty&&g.recoveryRun===3){g.stagePenalty--;g.recoveryRun=0}
  const points=10*Math.min(4,1+Math.floor(g.streak/5));g.score+=points;return points;
}

export function elapseCompare(g,seconds){
  if(g.over)return;g.remaining=Math.max(0,g.remaining-seconds);if(g.remaining<.000001){g.remaining=0;g.over=true}
}
