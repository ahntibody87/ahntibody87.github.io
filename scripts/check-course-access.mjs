import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
import {verifyPassword} from '../assets/course-password.mjs';
import {accessConfig,accessContent} from './course-access.mjs';

const fixture={salt:'00112233445566778899aabbccddeeff',iterations:100000};
fixture.digest=pbkdf2Sync('fixture-entry-code',Buffer.from(fixture.salt,'hex'),fixture.iterations,32,'sha256').toString('hex');
assert.equal(await verifyPassword('fixture-entry-code',fixture),true);
assert.equal(await verifyPassword('wrong-entry-code',fixture),false);
assert.equal(await verifyPassword(' fixture-entry-code',fixture),false);
assert.equal(await verifyPassword('fixture-entry-code',{...fixture,digest:'0'.repeat(64)}),false);
const site=JSON.parse(fs.readFileSync(new URL('../data/site.json',import.meta.url),'utf8'));
const gates=accessConfig(site);
assert.deepEqual(gates.map(g=>g.id),['integrated-science','genetics']);
assert.notEqual(gates[0].salt,gates[1].salt);
for(const c of site.courses){
  const html=accessContent(c,'<h1>Course fixture</h1>');
  assert.equal(html.includes('class="course-access-content" hidden inert'),!!c.entryGate);
  if(c.entryGate){assert.match(html,/type="password"/);assert.match(html,/type="submit" disabled/);}
}
assert.throws(()=>accessConfig({courses:[{id:'invalid',entryGate:{password:'should-not-be-in-config'}}]}));
console.log('과목 입장: 비밀번호 확인·오입력, 두 과목 잠금, 고급 생명과학 공개, 설정 검증 통과');
