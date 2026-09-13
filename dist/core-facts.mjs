import {factCatalog,factFamilyId,formKey} from './mastery-engine.mjs';

export const LEVELS=[
  {id:1,title:'Bù về 10 và số đôi nhỏ'},
  {id:2,title:'Số đôi và gần số đôi'},
  {id:3,title:'Cộng qua 10'},
  {id:4,title:'Trừ qua 10'},
  {id:5,title:'Trộn tất cả'}
];
export const MIXED_LEVEL=LEVELS.length;

function strategyFor(x,y){
  if(x+y===10&&x>=1)return 'make10';
  if(x===y&&x>=1&&x<=10)return 'double';
  if(y===x+1&&x>=1&&x<=9)return 'nearDouble';
  if(y<=9&&x+y>=11)return 'bridge10';
  return null;
}
function levelFor(strategy,sum,sign){
  if(sign==='+')return strategy==='make10'||(strategy==='double'&&sum<=10)?1:strategy==='bridge10'?3:2;
  return sum>=10?4:MIXED_LEVEL;
}
let cache;
function build(){
  if(cache)return cache;
  const byFamily=new Map();
  for(const q of factCatalog()){if(!byFamily.has(q.familyId))byFamily.set(q.familyId,[]);byFamily.get(q.familyId).push(q)}
  const facts=[],forms=[],formByKey=new Map();
  for(const [familyId,questions] of byFamily){
    const [x,y]=familyId.split('=')[0].split('+').map(Number),sum=x+y,strategy=strategyFor(x,y);
    if(!strategy)continue;
    const fact={id:familyId,x,y,sum,strategy,variants:{'+':[],'−':[]},forms:{}};
    for(const sign of ['+','−']){
      const qs=questions.filter(q=>q.sign===sign);
      fact.variants[sign]=qs.map(q=>q.id);
      const form={key:formKey({...qs[0]}),fact,sign,level:levelFor(strategy,sum,sign),questions:qs};
      fact.forms[sign]=form;forms.push(form);formByKey.set(form.key,form);
    }
    facts.push(fact);
  }
  cache={facts:Object.freeze(facts),forms:Object.freeze(forms),formByKey,factByFamily:new Map(facts.map(f=>[f.id,f]))};
  return cache;
}
export function coreFacts(){return build().facts}
export function coreForms(){return build().forms}
export function coreFactOf(question){return build().factByFamily.get(question.familyId||factFamilyId(question))||null}
export function formOf(question){return build().formByKey.get(formKey(question))||null}
export function formsAtLevel(level){const all=build().forms;return level>=MIXED_LEVEL?all:all.filter(f=>f.level===level)}
export function formsBelowLevel(level){return level>=MIXED_LEVEL?[]:build().forms.filter(f=>f.level<level)}
