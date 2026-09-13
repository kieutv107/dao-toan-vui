import {createLearningStore} from './learning-store.mjs';
import {recordEvidence} from './mastery-engine.mjs';
import {selectFact,progressSummary} from './adaptive-selector.mjs';

export function createLearningService({storage=globalThis.localStorage,now=Date.now,random=Math.random}={}){
  const store=createLearningStore(storage);let profile=store.load(),sequence=0;
  return {
    get profile(){return profile},
    summary(){return progressSummary(profile,now())},
    nextFact(options={}){return selectFact({profile,random,now:now(),...options})},
    hardestFact(options={}){return selectFact({profile,kind:'hardest',random,now:now(),...options})},
    record(event){const state=recordEvidence(profile,{now:now(),...event});store.save(profile);return state},
    save(){return store.save(profile)},
    reset(){profile=store.reset();return profile},
    newSessionId(){return `${now()}-${++sequence}`}
  };
}
