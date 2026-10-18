import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {verifyPassword} from '../assets/course-password.mjs';
import {accessConfig,accessContent,accessHead} from './course-access.mjs';

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
    for(const state of ['valid','expired','missing','blocked','other-course']){
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
      const context={document,location:{pathname},sessionStorage};
      runInNewContext(restore,context);
      const body=accessContent(site.courses.find(c=>c.id===gate.id),'<h1>Fixture</h1>');
      const reveal=body.match(/<script>([\s\S]*?)<\/script>/)[1];
      assert.ok(body.indexOf('<script>')<body.indexOf('<h1>Fixture'));
      runInNewContext(reveal,context);
      assert.equal(dataset.courseEntryGranted,state==='valid'?gate.id:undefined);
      assert.equal(content.hidden,state!=='valid');
      assert.equal(content.inert,state!=='valid');
    }
  }
}
const css=fs.readFileSync(new URL('../assets/course-access.css',import.meta.url),'utf8');
assert.match(css,/html\[data-course-entry-granted\] \.course-entry-screen\{display:none!important\}/);
console.log('과목 입장: 비밀번호 확인·오입력, 세 과목 잠금, 과목별 salt, 설정 검증 통과');
console.log('첫 표시: 인증된 탭 즉시 본문 표시, 만료·미인증·저장 차단 시 잠금 유지 검사 통과');
