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
