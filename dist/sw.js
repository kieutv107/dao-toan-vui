// Offline support: precache the whole app, then serve our own files network-first so a
// deploy reaches the child as soon as there is signal, and fall back to the cache offline.
const CACHE='dao-toan-vui-v1',FONT_CACHE='dao-toan-vui-fonts-v1',NETWORK_TIMEOUT_MS=3000;
const ASSETS=['./','index.html','app.js','site.webmanifest','style.css','rain.css','challenge.css','compare.css','sheet.css','truefalse.css','feedback.css','adaptive-selector.mjs','challenge-engine.mjs','challenge.mjs','compare-engine.mjs','compare.mjs','core-facts.mjs','feedback.mjs','high-scores.mjs','learning-service.mjs','learning-store.mjs','mastery-engine.mjs','math.mjs','offline.mjs','placement-engine.mjs','practice-engine.mjs','practice.mjs','rain-engine.mjs','rain.mjs','sheet-engine.mjs','sheet.mjs','strategies.mjs','truefalse-engine.mjs','truefalse.mjs','favicon.ico','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','android-chrome-192x192.png','android-chrome-512x512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key!==FONT_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin===self.location.origin)event.respondWith(networkFirst(request));
  else if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com')event.respondWith(cacheFirst(request));
});

function withTimeout(promise,ms){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('timeout')),ms);
    promise.then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});
  });
}

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  const network=fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response});
  network.catch(()=>{});
  try{return await withTimeout(network,NETWORK_TIMEOUT_MS)}
  catch{
    // ignoreSearch lets style.css?v=2 fall back to the precached style.css.
    const cached=await cache.match(request,{ignoreSearch:true})||(request.mode==='navigate'?await cache.match('index.html'):undefined);
    return cached||network;
  }
}

async function cacheFirst(request){
  const cache=await caches.open(FONT_CACHE);
  const cached=await cache.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response.ok||response.type==='opaque')cache.put(request,response.clone());
  return response;
}
