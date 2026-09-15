import {createLearningStore} from './learning-store.mjs';
import {recordEvidence,seedForm} from './mastery-engine.mjs';
import {selectFact,progressSummary,currentLevel} from './adaptive-selector.mjs';
import {formsBelowLevel,MIXED_LEVEL,coreForms} from './core-facts.mjs';

const PLACEMENT_KEY='toan-placement-v1';

export function createLearningService({storage=globalThis.localStorage,now=Date.now,random=Math.random}={}){
  const store=createLearningStore(storage);let profile=store.load(),sequence=0;const lastSeen={};
  // Draw a fact but never hand back the one this context just showed, so a game or drill never
  // poses the very same equation twice in a row. Falls back to allowing the repeat only when it
  // is genuinely the last option left.
  function draw(options,extra){
    const {context='',excludeIds=[]}=options,prev=lastSeen[context];
    const avoid=prev!=null&&!excludeIds.includes(prev)?[...excludeIds,prev]:excludeIds;
    const args={profile,random,now:now(),...options,...extra};
    let q=selectFact({...args,excludeIds:avoid});
    if(!q&&avoid!==excludeIds)q=selectFact(args);
    if(q)lastSeen[context]=q.id;
    return q;
  }
  function readPlacement(){try{const raw=storage?.getItem(PLACEMENT_KEY);if(raw){const v=JSON.parse(raw);if(v&&typeof v==='object')return v}}catch{}return null}
  function writePlacement(rec){try{storage?.setItem(PLACEMENT_KEY,JSON.stringify(rec))}catch{}return rec}
  return {
    get profile(){return profile},
    summary(){return progressSummary(profile,now())},
    nextFact(options={}){return draw(options)},
    hardestFact(options={}){return draw(options,{kind:'hardest'})},
    record(event){const state=recordEvidence(profile,{now:now(),...event});store.save(profile);return state},
    save(){return store.save(profile)},
    reset(){profile=store.reset();for(const k in lastSeen)delete lastSeen[k];return profile},
    newSessionId(){return `${now()}-${++sequence}`},
    placement(){return readPlacement()},
    placeAt(level){
      const at=now(),target=Math.max(level,currentLevel(profile));
      const toSeed=target>=MIXED_LEVEL?coreForms().filter(f=>f.level<MIXED_LEVEL):formsBelowLevel(target);
      for(const form of toSeed)seedForm(profile,form.questions[0],at);
      store.save(profile);
      const prevLevel=readPlacement()?.level||0;
      return writePlacement({done:true,level:Math.max(target,prevLevel),at});
    },
    skipPlacement(){return writePlacement({done:true,level:1,at:now()})}
  };
}
