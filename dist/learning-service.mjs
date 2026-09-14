import {createLearningStore} from './learning-store.mjs';
import {recordEvidence} from './mastery-engine.mjs';
import {selectFact,progressSummary} from './adaptive-selector.mjs';

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
  return {
    get profile(){return profile},
    summary(){return progressSummary(profile,now())},
    nextFact(options={}){return draw(options)},
    hardestFact(options={}){return draw(options,{kind:'hardest'})},
    record(event){const state=recordEvidence(profile,{now:now(),...event});store.save(profile);return state},
    save(){return store.save(profile)},
    reset(){profile=store.reset();for(const k in lastSeen)delete lastSeen[k];return profile},
    newSessionId(){return `${now()}-${++sequence}`}
  };
}
