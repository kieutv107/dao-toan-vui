import {buildPracticeSession} from './adaptive-selector.mjs';

export const SHEET_SIZE=20;
export function createSheet({profile,sessionId,random=Math.random,now=Date.now(),record=()=>{},count=SHEET_SIZE}={}){
  const questions=buildPracticeSession({profile,random,now,count});
  return {sessionId,record,now,questions,answers:questions.map(()=>null),marks:[],graded:false,results:{correct:0,wrong:0,blank:0}};
}
export function setAnswer(g,index,value){
  if(g.graded||index<0||index>=g.questions.length)return false;
  const n=value===''||value===null||value===undefined?null:Number(value);
  g.answers[index]=Number.isInteger(n)?n:null;return true;
}
export function filledCount(g){return g.answers.filter(a=>a!==null).length}
export function grade(g){
  if(g.graded)return g.results;
  g.graded=true;
  g.marks=g.questions.map((q,i)=>{
    const given=g.answers[i],blank=given===null,correct=!blank&&given===q.answer;
    if(correct)g.results.correct++;else if(blank)g.results.blank++;else g.results.wrong++;
    g.record({fact:q,result:correct?'correct':'wrong',context:'sheet',sessionId:g.sessionId,now:g.now});
    return {correct,blank,given,expected:q.answer};
  });
  return g.results;
}
