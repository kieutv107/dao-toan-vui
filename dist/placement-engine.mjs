// Adaptive-ladder placement over the 5 curriculum stages. Pure: no DOM, timer, audio, or storage.
// Binary search finds the highest stage the child can handle; each probed stage is asked PER_STAGE
// questions and counts as passed on a MAJORITY (>= PASS correct). This keeps the search short while
// giving each stage several attempts, so the result reflects real ability rather than one lucky/unlucky
// answer. `place` is the best stage passed (defaults to 1). Each stage is probed at most once.
export const PER_STAGE=3,PASS=2;

export function createPlacement(){return {lo:1,hi:5,place:1,step:0,done:false,level:null,perStage:PER_STAGE,pass:PASS,hits:0,asked:0}}

export function placementStage(state){return state.done?null:Math.floor((state.lo+state.hi)/2)}

export function recordPlacement(state,correct){
  if(state.done)return state;
  const mid=Math.floor((state.lo+state.hi)/2);
  state.step++;state.asked++;if(correct)state.hits++;
  if(state.asked>=state.perStage){ // stage fully probed — decide by majority, then move the ladder
    if(state.hits>=state.pass){state.place=mid;state.lo=mid+1}else{state.hi=mid-1}
    state.hits=0;state.asked=0;
    if(state.lo>state.hi){state.done=true;state.level=state.place}
  }
  return state;
}

export function placementResult(state){return {done:state.done,level:state.level}}
