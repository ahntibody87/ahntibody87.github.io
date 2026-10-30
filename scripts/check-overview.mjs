import fs from 'node:fs';
import assert from 'node:assert/strict';
import {defaults,simulate} from '../assets/activities/bbb-lab/model.mjs';
const html=fs.readFileSync('index.html','utf8');
const ids=['overview-design-title','overview-simulation-title','overview-inquiry-title','overview-author-title'];
const positions=ids.map(id=>html.indexOf(`id="${id}"`));
assert.ok(positions.every((p,i)=>p>=0&&(!i||p>positions[i-1])),'continuous section order');
const author=[
 'ATLL은 서울특별시 고등학교 교사 안영준이 제작한 생명과학 탐구 플랫폼입니다. 생명과학을 가르치며 학생들과 함께 더 깊이 들여다보고 싶었던 주제와 활동, 탐구에 도움이 되는 연구 엔진과 도구를 이곳에 조금씩 담고 있습니다.',
 '학생들이 생명과학 연구를 조금 더 가깝게 느끼고, 궁금한 것을 직접 확인하며 상상력을 구체화하고 아이디어를 실현하는 성공 경험을 쌓을 수 있도록 노력하고 있습니다. 그 경험을 바탕으로 자신만의 질문과 아이디어를 세상에 펼쳐 나가기를 응원하며, ATLL은 학생들의 생명과학적 사고가 시작되고 뻗어 나가는 데 필요한 작은 프라이머가 되고자 합니다.'
];
author.forEach(p=>assert.ok(html.includes(`<p>${p}</p>`),'approved author wording'));
const provenance=JSON.parse(fs.readFileSync('assets/overview/provenance.json'));
assert.equal(provenance.protein.residues,162);assert.deepEqual(provenance.protein.differences,[{position:99,from:'L',to:'A'}]);
for(const [key,pro] of [['direct',false],['prodrug',true]]){
 const expected=simulate(defaults,pro);assert.equal(provenance.bbb[key].length,expected.length);
 expected.forEach((s,i)=>{assert.equal(provenance.bbb[key][i].t,s.t);assert.ok(Math.abs(provenance.bbb[key][i].active-s.y[4])<1e-10);assert.ok(s.y.every(v=>v>=-1e-9));assert.ok(Math.abs(s.y.reduce((a,b)=>a+b,0)-100)<1e-8);});
}
const atomLines=fs.readFileSync('assets/overview/rna-hairpin.pdb','utf8').split('\n').filter(l=>l.startsWith('ATOM  '));
assert.equal(new Set(atomLines.map(l=>l.slice(22,26))).size,12);
assert.ok(atomLines.length>200);assert.ok(atomLines.every(l=>[30,38,46].every(i=>Number.isFinite(Number(l.slice(i,i+8))))));
for(const name of ['protein-comparison','rna-design','bbb-simulation','inquiry-evidence']){
 const svg=fs.readFileSync(`assets/overview/${name}.svg`,'utf8');assert.match(svg,/viewBox="0 0 1000 660"/);assert.ok(!/NaN|Infinity/.test(svg.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g,'')));
 const height={'protein-comparison':660,'rna-design':960,'bbb-simulation':760,'inquiry-evidence':1050}[name];
 const mobile=fs.readFileSync(`assets/overview/${name}-mobile.svg`,'utf8');assert.ok(mobile.includes(`viewBox="0 0 600 ${height}"`));assert.ok(!/NaN|Infinity/.test(mobile.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g,'')));assert.ok(html.includes(`/assets/overview/${name}-mobile.svg?v=`),'mobile art direction');
}
assert.ok(!html.includes('/assets/overview/trna.pdb'));
console.log('Overview: exact author copy, ordered sections, authentic protein pair, prepared RNA coordinates, BBB numerical agreement and mass conservation passed.');
