import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrueFalseGame,unlockedTrueFalseStage,trueFalseStage,recordTrueFalseAnswer,elapseTrueFalse,createTrueFalseRound,reviewFacts} from '../src/truefalse-engine.mjs';

const at=remaining=>Object.assign(createTrueFalseGame(),{remaining});

test('stages open after 0, 30 and 60 active seconds',()=>{
  for(const [remaining,stage] of [[90,1],[60.5,1],[60,2],[30.5,2],[30,3],[.5,3]]){
    const g=at(remaining);assert.equal(unlockedTrueFalseStage(g),stage,`remaining ${remaining}`);assert.equal(trueFalseStage(g),stage);
  }
});

test('two misses lower a stage and three correct answers recover it',()=>{
  const g=at(30);
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),2);assert.equal(g.score,0);assert.equal(g.streak,0);
  recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);
  assert.equal(trueFalseStage(g),3);
});

test('a lowered stage rises with the clock but stays one below it until recovery',()=>{
  const g=at(31);
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),1);
  elapseTrueFalse(g,1);
  assert.equal(unlockedTrueFalseStage(g),3);assert.equal(trueFalseStage(g),2);
  recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);recordTrueFalseAnswer(g,true);
  assert.equal(trueFalseStage(g),3);
});

test('difficulty never drops below stage 1 or rises above the clock',()=>{
  const g=createTrueFalseGame();
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),1);assert.equal(g.stagePenalty,0);
  g.remaining=60;
  recordTrueFalseAnswer(g,false);recordTrueFalseAnswer(g,false);
  assert.equal(trueFalseStage(g),1);assert.equal(g.stagePenalty,1);
  for(let i=0;i<6;i++)recordTrueFalseAnswer(g,true);
  assert.equal(trueFalseStage(g),2);assert.equal(g.stagePenalty,0);
});

test('wrong answers keep score while correct streaks award up to forty points',()=>{
  const g=createTrueFalseGame();assert.equal(recordTrueFalseAnswer(g,false),0);assert.equal(g.score,0);
  assert.equal(recordTrueFalseAnswer(g,true),10);
  for(let i=0;i<19;i++)recordTrueFalseAnswer(g,true);
  assert.equal(g.bestStreak,20);assert.equal(recordTrueFalseAnswer(g,true),40);
});

test('ninety active seconds end the run and later answers do nothing',()=>{
  const g=createTrueFalseGame();assert.equal(g.remaining,90);
  elapseTrueFalse(g,89.9);assert.equal(g.over,false);
  elapseTrueFalse(g,.1);assert.equal(g.remaining,0);assert.equal(g.over,true);
  assert.equal(recordTrueFalseAnswer(g,true),0);assert.equal(g.attempts,0);
});

const FACTS=[{a:7,b:6,sign:'+',answer:13,id:'7+6'},{a:9,b:9,sign:'+',answer:18,id:'9+9'},{a:2,b:1,sign:'+',answer:3,id:'2+1'},{a:12,b:10,sign:'−',answer:2,id:'12−10'},{a:20,b:0,sign:'−',answer:20,id:'20−0'},{a:0,b:0,sign:'+',answer:0,id:'0+0'}];
const rotating=()=>{let i=0;return ()=>FACTS[i++%FACTS.length]};
// mulberry32: a fixed, well-mixed sequence so the statistical checks below are deterministic
const seeded=seed=>()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const roundsAt=(remaining,count=400)=>{const g=at(remaining),fact=rotating(),random=seeded(Math.round(remaining)+1);return Array.from({length:count},()=>createTrueFalseRound(g,{fact,random}))};
const gaps=rounds=>rounds.filter(r=>!r.truth).map(r=>Math.abs(r.left.value-r.right.value));
const distinct=list=>[...new Set(list)].sort((x,y)=>x-y);

test('rounds are consistent and every number stays within 0 to 20',()=>{
  for(const remaining of [90,60,30]){
    for(const round of roundsAt(remaining)){
      assert.equal(round.left.kind,'fact');
      assert.equal(round.truth,round.left.value===round.right.value);
      for(const part of [round.left,round.right]){
        const numbers=part.kind==='fact'?[part.fact.a,part.fact.b,part.value]:[part.value];
        assert.ok(numbers.every(n=>Number.isInteger(n)&&n>=0&&n<=20),JSON.stringify(round));
        if(part.kind==='fact'){
          assert.equal(part.value,part.fact.sign==='+'?part.fact.a+part.fact.b:part.fact.a-part.fact.b);
          assert.equal(part.label,`${part.fact.a} ${part.fact.sign} ${part.fact.b}`);
        }else assert.equal(part.label,String(part.value));
      }
    }
  }
});

test('false rounds miss the real value by the gap of their stage',()=>{
  assert.deepEqual(distinct(gaps(roundsAt(90))),[3,4,5]);
  assert.deepEqual(distinct(gaps(roundsAt(60))),[1,2]);
  const late=roundsAt(30);
  assert.deepEqual(distinct(gaps(late.filter(r=>r.right.kind==='number'))),[1]);
  assert.deepEqual(distinct(gaps(late.filter(r=>r.right.kind==='fact'))),[1,2]);
});

test('about half the rounds are true and only stage three has two sides',()=>{
  for(const remaining of [90,60,30]){
    const rounds=roundsAt(remaining),trueShare=rounds.filter(r=>r.truth).length/rounds.length,twoSided=rounds.filter(r=>r.right.kind==='fact');
    assert.ok(trueShare>.4&&trueShare<.6,`remaining ${remaining}: true share ${trueShare}`);
    if(remaining>30){assert.equal(twoSided.length,0);continue}
    const share=twoSided.length/rounds.length;
    assert.ok(share>.4&&share<.6,`two-sided share ${share}`);
    assert.ok(twoSided.some(r=>r.truth)&&twoSided.some(r=>!r.truth));
  }
});

test('the right side of a two-sided round is a different fact',()=>{
  const twoSided=roundsAt(30).filter(r=>r.right.kind==='fact');
  assert.ok(twoSided.length>0);
  for(const round of twoSided)assert.notEqual(round.right.fact.id,round.left.fact.id);
});

test('rounds still come out when the supplier has no usable fact',()=>{
  const g=createTrueFalseGame();
  for(const fact of [()=>undefined,()=>null,()=>({a:15,b:9,sign:'+',answer:24,id:'15+9'})]){
    const round=createTrueFalseRound(g,{fact,random:seeded(7)});
    assert.equal(round.left.kind,'fact');assert.notEqual(round.left.fact.id,'15+9');
    assert.ok(round.left.value>=0&&round.left.value<=20);
  }
  assert.equal(createTrueFalseRound(g,{random:seeded(7)}).left.kind,'fact');
});

test('only correct rounds expose the left fact for review',()=>{
  const right={kind:'fact',value:13,label:'8 + 5',fact:{a:8,b:5,sign:'+',answer:13,id:'8+5'}};
  const round={stage:3,truth:true,left:{kind:'fact',value:13,label:'7 + 6',fact:FACTS[0]},right};
  assert.deepEqual(reviewFacts(round,true),[FACTS[0]]);
  assert.deepEqual(reviewFacts(round,false),[]);
});
