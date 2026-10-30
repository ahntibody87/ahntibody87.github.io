import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {verifyPassword} from '../assets/course-password.mjs';
import {accessConfig,accessContent,accessHead} from './course-access.mjs';
import {rememberEntry,rememberedEntry,forgetEntry} from '../assets/course-entry-state.mjs';

const fixture={salt:'00112233445566778899aabbccddeeff',iterations:100000};
fixture.digest=pbkdf2Sync('fixture-entry-code',Buffer.from(fixture.salt,'hex'),fixture.iterations,32,'sha256').toString('hex');
assert.equal(await verifyPassword('fixture-entry-code',fixture),true);
assert.equal(await verifyPassword('wrong-entry-code',fixture),false);
assert.equal(await verifyPassword(' fixture-entry-code',fixture),false);
assert.equal(await verifyPassword('fixture-entry-code',{...fixture,digest:'0'.repeat(64)}),false);
const site=JSON.parse(fs.readFileSync(new URL('../data/site.json',import.meta.url),'utf8'));
const gates=accessConfig(site);
assert.deepEqual(gates.map(g=>g.id),['integrated-science','genetics','advanced-life-science']);
assert.equal(new Set(gates.map(g=>g.salt)).size,gates.length);
for(const c of site.courses){
  const html=accessContent(c,'<h1>Course fixture</h1>');
  assert.equal(html.includes('class="course-access-content" hidden inert'),!!c.entryGate);
  if(c.entryGate){assert.match(html,/type="password"/);assert.match(html,/type="submit" disabled/);}
}
assert.throws(()=>accessConfig({courses:[{id:'invalid',entryGate:{password:'should-not-be-in-config'}}]}));
// Run only parser-blocking scripts: delayed module downloads must not flash the gate.
const head=accessHead(site);
const restore=head.match(/<script>([\s\S]*?)<\/script>/)[1];
assert.ok(head.indexOf('<script>'+restore)<head.indexOf('<script type="module"'));
for(const gate of gates){
  for(const pathname of [gate.path.slice(0,-1),gate.path,gate.path+'unit/activity/']){
    for(const state of ['valid','expired','missing','blocked','other-course','remembered','remembered-expired','remembered-other-course','remembered-malformed']){
      const dataset={};
      const content={hidden:true,inert:true};
      const document={documentElement:{dataset},getElementById:()=>({textContent:JSON.stringify(gates)}),currentScript:{parentElement:content}};
      const sessionStorage={getItem:key=>{
        if(state==='blocked')throw Error('Storage denied');
        if(state==='valid'&&key==='atll-course-entry:'+gate.id)return gate.digest;
        if(state==='expired')return 'old-digest';
        if(state==='other-course')return gates.find(g=>g.id!==gate.id).digest;
        return null;
      }};
      const localStorage={getItem:key=>{
        if(key!=='atll-course-remember:'+gate.id)return null;
        if(state==='remembered')return JSON.stringify({version:1,verifier:gate.digest,expiresAt:Date.now()+86400000});
        if(state==='remembered-expired')return JSON.stringify({version:1,verifier:gate.digest,expiresAt:Date.now()-1});
        if(state==='remembered-other-course')return JSON.stringify({version:1,verifier:gates.find(g=>g.id!==gate.id).digest,expiresAt:Date.now()+86400000});
        if(state==='remembered-malformed')return '{invalid';
        return null;
      },removeItem:()=>{}};
      const context={document,location:{pathname},sessionStorage,localStorage};
      runInNewContext(restore,context);
      const body=accessContent(site.courses.find(c=>c.id===gate.id),'<h1>Fixture</h1>');
      const reveal=body.match(/<script>([\s\S]*?)<\/script>/)[1];
      assert.ok(body.indexOf('<script>')<body.indexOf('<h1>Fixture'));
      runInNewContext(reveal,context);
      const expected=state==='valid'||state==='remembered';
      assert.equal(dataset.courseEntryGranted,expected?gate.id:undefined);
      assert.equal(content.hidden,!expected);
      assert.equal(content.inert,!expected);
    }
  }
}
const css=fs.readFileSync(new URL('../assets/course-access.css',import.meta.url),'utf8');
assert.match(css,/html\[data-course-entry-granted\] \.course-entry-screen\{display:none!important\}/);
console.log('과목 입장: 비밀번호 확인·오입력, 세 과목 잠금, 과목별 salt, 설정 검증 통과');
console.log('첫 표시: 인증된 탭 즉시 본문 표시, 만료·미인증·저장 차단 시 잠금 유지 검사 통과');
const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
const now=1700000000000,ttl=7*86400000,gate=gates[2];
assert.equal(rememberedEntry(gate,storage,now),false);
assert.equal(rememberEntry(gate,storage,now),true);
assert.equal(rememberedEntry(gate,storage,now+ttl-1),true);
assert.equal(rememberedEntry(gates[1],storage,now),false);
assert.equal(rememberedEntry({...gate,digest:'0'.repeat(64)},storage,now),false);
assert.equal(rememberEntry(gate,storage,now),true);
assert.equal(rememberedEntry(gate,storage,now+ttl),false);
assert.equal(saved.has('atll-course-remember:'+gate.id),false);
rememberEntry(gate,storage,now);forgetEntry(gate,storage);assert.equal(rememberedEntry(gate,storage,now),false);
for(const invalid of ['null','{}','{bad',JSON.stringify({version:1,verifier:gate.digest,expiresAt:now+ttl+1})]){saved.set('atll-course-remember:'+gate.id,invalid);assert.equal(rememberedEntry(gate,storage,now),false);}
const blocked={getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');},removeItem:()=>{throw Error('denied');}};
assert.equal(rememberEntry(gate,blocked,now),false);assert.equal(rememberedEntry(gate,blocked,now),false);assert.doesNotThrow(()=>forgetEntry(gate,blocked));
assert.match(accessContent(site.courses[2],''),/type="checkbox" id="course-entry-remember" name="remember">/);
assert.doesNotMatch(accessContent(site.courses[2],''),/name="remember"[^>]*checked/);
console.log('7일 입장 유지: 만료 경계·과목 격리·비밀번호 변경·기억 지우기·손상/차단 저장소·기본 미선택 검사 통과');
