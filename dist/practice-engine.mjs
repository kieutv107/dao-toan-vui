const ALL_TOTALS=[5,6,7,8,9,10,11,12,13,14,15,16,17,18];

export function practiceTotals(limit=20){return ALL_TOTALS.filter(total=>total<=limit)}

export function pairs(total){const out=[];for(let a=1;a<=9;a++){const b=total-a;if(b>=1&&b<=9)out.push([a,b])}return out}

export function buildSet(total,op,random=Math.random){
  const qs=pairs(total).map(([a,b])=>{
    const plus=op==='plus'||(op==='mix'&&random()<.5);
    return plus?{a,b,sign:'+',answer:total}:{a:total,b:a,sign:'−',answer:b};
  });
  for(let i=qs.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[qs[i],qs[j]]=[qs[j],qs[i]]}
  return qs;
}

export function createPractice({op='mix',limit=20}={}){return {op,limit,totals:practiceTotals(limit),setIndex:0,pos:0,correct:0,attempts:0,questions:[],setDone:false,done:false}}

export function startSet(g,random=Math.random){g.questions=buildSet(g.totals[g.setIndex],g.op,random);g.pos=0;g.setDone=false;return g.questions}

export function current(g){return g.questions[g.pos]||null}

export function answer(g,value){
  if(g.done||g.setDone)return {correct:false,setComplete:false};
  const q=current(g);if(!q)return {correct:false,setComplete:false};
  g.attempts++;
  if(Number(value)!==q.answer)return {correct:false,setComplete:false};
  g.correct++;g.pos++;
  const setComplete=g.pos>=g.questions.length;if(setComplete)g.setDone=true;
  return {correct:true,setComplete};
}

export function nextSet(g,random=Math.random){
  if(g.setIndex>=g.totals.length-1){g.done=true;return false}
  g.setIndex++;startSet(g,random);return true;
}
