import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
import {registerOffline} from '../src/offline.mjs';

const src=new URL('../src/',import.meta.url);
const swSource=await readFile(new URL('sw.js',src),'utf8');
const ORIGIN='https://toan.test';

// Runs sw.js against fake self/caches/fetch so the real handlers are exercised.
function loadWorker(fetch){
  const listeners={},stores=new Map();
  const keyOf=(r,ignoreSearch=false)=>{const u=new URL(typeof r==='string'?r:r.url,ORIGIN+'/');if(ignoreSearch)u.search='';return u.href};
  const makeCache=()=>{const entries=new Map();return {entries,
    async addAll(list){for(const path of list)entries.set(keyOf(path),response('precached:'+path))},
    async put(r,res){entries.set(keyOf(r),res)},
    async match(r,opts={}){const want=keyOf(r,opts.ignoreSearch);for(const [k,v] of entries)if(keyOf(k,opts.ignoreSearch)===want)return v}
  }};
  const caches={async open(name){if(!stores.has(name))stores.set(name,makeCache());return stores.get(name)},async keys(){return [...stores.keys()]},async delete(name){return stores.delete(name)}};
  const self={location:{origin:ORIGIN},addEventListener:(type,fn)=>{listeners[type]=fn},skipWaiting:async()=>{self.skipped=true},clients:{claim:async()=>{self.claimed=true}}};
  vm.runInNewContext(swSource,{self,caches,fetch,URL,setTimeout:(...a)=>setTimeout(...a),clearTimeout:(...a)=>clearTimeout(...a)});
  return {listeners,stores,self,caches};
}
function response(body,extra={}){return {ok:true,body,...extra,clone(){return {...this}}}}
function request(path,extra={}){return {url:new URL(path,ORIGIN+'/').href,method:'GET',mode:'cors',...extra}}
async function run(worker,type){let pending;worker.listeners[type]({waitUntil:p=>{pending=p}});await pending}
function intercept(worker,req){let responded=null;worker.listeners.fetch({request:req,respondWith:p=>{responded=p}});return responded}
const offline=()=>Promise.reject(new TypeError('Failed to fetch'));
const assetsIn=src=>new Function(`return ${src.match(/const ASSETS=(\[[^\]]*\])/)[1]}`)();

test('the service worker precaches every file the app ships',async()=>{
  const files=(await readdir(src)).filter(f=>!f.startsWith('.')&&f!=='sw.js').sort();
  const assets=assetsIn(swSource);
  assert.deepEqual(assets.filter(a=>a!=='./').sort(),files);
  assert.ok(assets.includes('./'));
});

test('install precaches the app shell and activates right away',async()=>{
  const worker=loadWorker(offline);await run(worker,'install');
  const [cache]=[...worker.stores.values()];
  for(const path of ['index.html','app.js','feedback.mjs','style.css'])assert.ok(await cache.match(path),path);
  assert.ok(worker.self.skipped);
});

test('online requests come from the network and refresh the cache',async()=>{
  const worker=loadWorker(async()=>response('fresh'));await run(worker,'install');
  const res=await intercept(worker,request('app.js'));
  assert.equal(res.body,'fresh');
  await new Promise(r=>setImmediate(r));
  const [cache]=[...worker.stores.values()];
  assert.equal((await cache.match('app.js')).body,'fresh');
});

test('offline requests fall back to the cache, ignoring the ?v= cache buster',async()=>{
  const worker=loadWorker(offline);await run(worker,'install');
  assert.equal((await intercept(worker,request('style.css?v=2'))).body,'precached:style.css');
});

test('offline navigation to any page opens the cached app',async()=>{
  const worker=loadWorker(offline);await run(worker,'install');
  assert.equal((await intercept(worker,request('/', {mode:'navigate'}))).body,'precached:./');
  assert.equal((await intercept(worker,request('/khong-co', {mode:'navigate'}))).body,'precached:index.html');
});

test('a network that hangs for 3 s gives way to the cache',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const worker=loadWorker(()=>new Promise(()=>{}));await run(worker,'install');
  const pending=intercept(worker,request('app.js'));
  for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
  t.mock.timers.tick(3000);
  assert.equal((await pending).body,'precached:app.js');
});

test('Nunito from Google Fonts is cached on first load and reused offline',async()=>{
  let online=true;
  const worker=loadWorker(async()=>{if(!online)throw new TypeError('offline');return response('font',{type:'opaque',ok:false})});
  const font=request('https://fonts.gstatic.com/s/nunito/v1/a.woff2');
  assert.equal((await intercept(worker,font)).body,'font');
  online=false;
  assert.equal((await intercept(worker,font)).body,'font');
});

test('writes and other sites are left to the browser',async()=>{
  const worker=loadWorker(offline);
  assert.equal(intercept(worker,request('app.js',{method:'POST'})),null);
  assert.equal(intercept(worker,request('https://example.com/x.js')),null);
});

test('activate drops caches from older versions and keeps the current ones',async()=>{
  const worker=loadWorker(offline);await run(worker,'install');
  await worker.caches.open('dao-toan-vui-v0');
  await run(worker,'activate');
  assert.deepEqual([...worker.stores.keys()],['dao-toan-vui-v1']);
  assert.ok(worker.self.claimed);
});

test('registerOffline registers sw.js and is a no-op without service worker support',()=>{
  const calls=[];
  registerOffline({serviceWorker:{register:path=>{calls.push(path);return Promise.resolve()}}});
  assert.deepEqual(calls,['sw.js']);
  assert.doesNotThrow(()=>registerOffline({}));
});

test('the page opens full screen from the browser\'s own "add to home screen" and registers the service worker',async()=>{
  const [index,app,manifest]=await Promise.all(['index.html','app.js','site.webmanifest'].map(f=>readFile(new URL(f,src),'utf8')));
  for(const meta of ['<meta name="apple-mobile-web-app-capable" content="yes">','<meta name="mobile-web-app-capable" content="yes">','<meta name="apple-mobile-web-app-title" content="Toán Vui">'])assert.ok(index.includes(meta),meta);
  assert.match(index,/<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon\.png">/);
  // no in-app install button: the browser already offers "add to home screen"
  assert.doesNotMatch(index,/id="install"|install-help|install\.css/);
  assert.match(app,/import \{registerOffline\} from '\.\/offline\.mjs'/);
  assert.doesNotMatch(app,/setupInstall/);
  assert.match(app,/registerOffline\(navigator\)/);
  const m=JSON.parse(manifest);
  assert.equal(m.display,'standalone');assert.equal(m.start_url,'./');assert.equal(m.scope,'./');
  assert.ok(m.icons.some(i=>i.sizes==='512x512'));
});
