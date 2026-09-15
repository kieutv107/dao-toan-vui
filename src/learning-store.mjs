import {createProfile,migrateProfile} from './mastery-engine.mjs';
const KEY='toan-learning-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
function valid(x){return x&&(x.version===1||x.version===2)&&x.facts&&typeof x.facts==='object'&&x.timings&&typeof x.timings==='object'}
export function createLearningStore(storage=globalThis.localStorage){
  let memory=createProfile();
  const persist=()=>{try{storage?.setItem(KEY,JSON.stringify(memory))}catch{}};
  return {
    load(){try{const raw=storage?.getItem(KEY);if(raw){const value=JSON.parse(raw);if(valid(value)){memory=value.version===1?migrateProfile(value):value;if(value.version===1)persist()}}}catch{}return clone(memory)},
    save(profile){memory=valid(profile)?clone(migrateProfile(profile)):createProfile();persist();return clone(memory)},
    reset(){memory=createProfile();try{storage?.removeItem(KEY)}catch{}return clone(memory)}
  };
}
