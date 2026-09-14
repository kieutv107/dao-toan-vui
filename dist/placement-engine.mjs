// Adaptive-ladder placement over the 5 curriculum stages. Pure: no DOM, timer, audio, or storage.
// Binary search finds the highest stage the child answers correctly in at most 3 questions; each
// stage is probed at most once. `place` is the best stage answered correctly (defaults to 1).
export function createPlacement(){return {lo:1,hi:5,place:1,step:0,done:false,level:null}}

export function placementStage(state){return state.done?null:Math.floor((state.lo+state.hi)/2)}

export function recordPlacement(state,correct){
  if(state.done)return state;
  const mid=Math.floor((state.lo+state.hi)/2);
  if(correct){state.place=mid;state.lo=mid+1}else{state.hi=mid-1}
  state.step++;
  if(state.lo>state.hi){state.done=true;state.level=state.place}
  return state;
}

export function placementResult(state){return {done:state.done,level:state.level}}
