export const rand=n=>Math.floor(Math.random()*n);
export function question(limit=20,op='mix'){const plus=op==='plus'||(op==='mix'&&rand(2)===0);let a=rand(limit+1),b=plus?rand(limit-a+1):rand(a+1);return {a,b,sign:plus?'+':'−',answer:plus?a+b:a-b};}
export function choices(answer,limit=20){let s=new Set([answer]);while(s.size<4)s.add(rand(limit+1));return [...s].sort(()=>Math.random()-.5);}
