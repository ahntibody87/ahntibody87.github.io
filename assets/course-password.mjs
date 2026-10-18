// Client-side entry convenience only; this does not make public files private.
export async function verifyPassword(password,gate) {
  const bytes=hex=>Uint8Array.from(hex.match(/../g),s=>parseInt(s,16));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes(gate.salt),iterations:gate.iterations,hash:'SHA-256'},key,256));
  const expected=bytes(gate.digest);
  let diff=derived.length^expected.length;
  for(let i=0;i<derived.length;i++)diff|=derived[i]^expected[i];
  return diff===0;
}
