// Registers the service worker that keeps the app playable offline (see sw.js).
export function registerOffline(nav){
  if(!nav.serviceWorker)return;
  nav.serviceWorker.register('sw.js').catch(()=>{});
}
