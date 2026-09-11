import {createProfile} from './mastery-engine.mjs';
const KEY='toan-learning-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
function valid(x){return x&&x.version===1&&x.facts&&typeof x.facts==='object'&&x.timings&&typeof x.timings==='object'}
export function createLearningStore(storage=globalThis.localStorage){
  let memory=createProfile();
  return {
    load(){try{const raw=storage?.getItem(KEY);if(raw){const value=JSON.parse(raw);if(valid(value))memory=value}}catch{}return clone(memory)},
    save(profile){memory=valid(profile)?clone(profile):createProfile();try{storage?.setItem(KEY,JSON.stringify(memory))}catch{}return clone(memory)},
    reset(){memory=createProfile();try{storage?.removeItem(KEY)}catch{}return clone(memory)}
  };
}
