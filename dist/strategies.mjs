import {coreFactOf} from './core-facts.mjs';

function dotsFor(q){return q.sign==='+'?{total:q.answer,from:q.a,mode:'added'}:{total:q.a,from:q.answer,mode:'removed'}}
export function strategyHint(q){
  const fact=coreFactOf(q),strategy=fact?.strategy||null,lines=[],hint={strategy,lines,dots:dotsFor(q),frame:strategy==='make10'?'ten':'dots'};
  const add=q.sign==='+',big=Math.max(q.a,q.b),small=Math.min(q.a,q.b);
  if(strategy==='make10'){
    if(add)lines.push(`${q.a} và ${q.b} là đôi bạn của 10.`,`${q.a} + ${q.b} = 10`);
    else lines.push(`${q.b} cần thêm mấy nữa để đủ 10?`,`${q.b} + ${q.answer} = 10, nên 10 − ${q.b} = ${q.answer}`);
  }else if(strategy==='double'){
    if(add)lines.push(`Gấp đôi ${q.a} là ${q.answer}.`,`${q.a} + ${q.a} = ${q.answer}`);
    else lines.push(`${q.b} + ${q.b} = ${q.a}, nên ${q.a} − ${q.b} = ${q.answer}`);
  }else if(strategy==='nearDouble'){
    if(add)lines.push(`${small} + ${small} = ${small*2}, thêm 1 nữa.`,`${small*2} + 1 = ${q.answer}`);
    else{const low=Math.min(q.b,q.answer);lines.push(`${low} + ${low} = ${low*2}, thêm 1 là ${q.a}.`,`${q.b} + ${q.answer} = ${q.a}, nên ${q.a} − ${q.b} = ${q.answer}`)}
  }else if(strategy==='bridge10'){
    if(add){const toTen=10-big,rest=small-toTen;lines.push(`${big} + ${toTen} = 10`,`10 + ${rest} = ${q.answer}`)}
    else{const toTen=q.a-10,rest=q.b-toTen;lines.push(`${q.a} − ${toTen} = 10`,`10 − ${rest} = ${q.answer}`)}
  }else{
    lines.push(add?`Đếm ${q.a} chấm, rồi thêm ${q.b} chấm.`:`Có ${q.a} chấm, bớt đi ${q.b} chấm bị gạch.`);
  }
  return hint;
}
