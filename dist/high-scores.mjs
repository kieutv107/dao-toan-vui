const KEY='toan-high-scores-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
function clean(value){if(!value||value.version!==1||!value.games||typeof value.games!=='object')return{version:1,games:{}};const games={};for(const [id,scores] of Object.entries(value.games))games[id]=(Array.isArray(scores)?scores:[]).filter(Number.isFinite).sort((a,b)=>b-a).slice(0,5);return{version:1,games}}
export function createHighScoreStore(storage=globalThis.localStorage){
  let data={version:1,games:{}};
  try{const raw=storage?.getItem(KEY);if(raw)data=clean(JSON.parse(raw))}catch{}
  const save=()=>{try{storage?.setItem(KEY,JSON.stringify(data))}catch{}};
  return {
    top(gameId){return [...(data.games[gameId]||[])]},
    record(gameId,score){score=Math.max(0,Number(score)||0);const previousBest=data.games[gameId]?.[0]||0,newRecord=score>previousBest&&score>0;data.games[gameId]=[...(data.games[gameId]||[]),score].sort((a,b)=>b-a).slice(0,5);save();return{scores:[...data.games[gameId]],newRecord,previousBest}},
    reset(){data={version:1,games:{}};try{storage?.removeItem(KEY)}catch{}},
    snapshot(){return clone(data)}
  };
}
