// Store a time-limited copy of the existing course grant, never the password.
// This remains the site's client-side course entry gate, not server authentication.
export function rememberedEntry(gate,storage,now=Date.now()){
  try{
    const key='atll-course-remember:'+gate.id,raw=storage.getItem(key);
    if(!raw)return false;
    const entry=JSON.parse(raw),ttl=7*24*60*60*1000;
    const valid=entry?.version===1&&entry.verifier===gate.digest&&Number.isFinite(entry.expiresAt)&&entry.expiresAt>now&&entry.expiresAt<=now+ttl;
    if(!valid)storage.removeItem(key);
    return valid;
  }catch{return false;}
}
export function rememberEntry(gate,storage,now=Date.now()){
  try{storage.setItem('atll-course-remember:'+gate.id,JSON.stringify({version:1,verifier:gate.digest,expiresAt:now+7*24*60*60*1000}));return true;}catch{return false;}
}
export function forgetEntry(gate,storage){try{storage.removeItem('atll-course-remember:'+gate.id);}catch{}}
