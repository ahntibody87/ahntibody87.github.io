import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createState,freshTip,addReagent,resetTube,planSharedReagents,issues,nextIssues,timeline,frameAt,bands} from '../assets/activities/amplicon/model.mjs';
import {molecule,temperatureGraph} from '../assets/activities/amplicon/visuals.mjs';
const scenario=JSON.parse(fs.readFileSync(new URL('../assets/activities/amplicon/scenarios/sars-cov-2.json',import.meta.url)));
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log(`PASS ${name}`);};
function prepared(){
  const s=createState(scenario);
  for(const sample of scenario.samples){
    s.tubes[sample.id].received=true;
    for(const r of [...scenario.reagents.map(r=>r.id),`sample:${sample.id}`]){freshTip(s);assert.ok(addReagent(s,sample.id,r));}
    s.tubes[sample.id].mixed=true;s.tubes[sample.id].spun=true;
  }
  s.pcrLoaded=scenario.samples.map(s=>s.id);s.amplified=true;s.recorded=true;s.lanes=[...s.lanePlan];s.gelRun=true;
  return s;
}
const has=(s,rule,step=5)=>issues(s,scenario,step).some(x=>x.rule===rule);
test('자동 분주: 시범 튜브 조제 후 나머지 공통 시약만 분주',()=>{
  const state=createState(scenario);
  for(const tube of Object.values(state.tubes))tube.received=true;
  assert.equal(planSharedReagents(state,scenario),null);
  for(const {id} of scenario.reagents){freshTip(state);addReagent(state,'A',id);}
  const plan=planSharedReagents(state,scenario);
  assert.equal(plan.length,12);
  assert.ok(plan.every(({tube,reagent})=>tube!=='A'&&!reagent.startsWith('sample:')));
  for(const {tube,reagent} of plan){freshTip(state);addReagent(state,tube,reagent);}
  assert.deepEqual(planSharedReagents(state,scenario),[]);
  assert.ok(Object.values(state.tubes).every(tube=>tube.additions.length===4));
});
test('자동 분주: 정상 부분 조제 이어가기와 기존 오조작 보존',()=>{
  const state=prepared();
  resetTube(state,'B');freshTip(state);addReagent(state,'B','buffer',false);
  assert.deepEqual(planSharedReagents(state,scenario).map(item=>item.reagent),['primer','rt','taq']);
  addReagent(state,'B','primer',false);
  assert.equal(planSharedReagents(state,scenario),null);
  assert.deepEqual(state.tubes.B.additions.at(-1).previousTransfer,{tube:'B',reagent:'buffer'});
  assert.ok(has(state,'tip',2));
});
test('정상 진행 및 새로고침 초기 상태',()=>{
  const s=prepared();for(let i=0;i<=6;i++){s.step=i;assert.deepEqual(nextIssues(s,scenario),[]);}
  const fresh=createState(scenario);assert.equal(fresh.step,0);assert.equal(fresh.reason,'');assert.equal(fresh.gelRun,false);
});
for(const r of scenario.reagents)test(`${r.label} 누락과 복구`,()=>{
  const s=prepared(),saved=structuredClone(s.tubes.A);s.tubes.A.additions=s.tubes.A.additions.filter(x=>x.reagent!==r.id);
  assert.ok(has(s,r.missingRule,2));s.tubes.A=saved;assert.deepEqual(issues(s,scenario,2),[]);
});
test('팁 재사용·다른 용액·다른 시료 오염 차단과 새 튜브 복구',()=>{
  const s=prepared();resetTube(s,'A');freshTip(s);addReagent(s,'A','buffer',false);addReagent(s,'A','primer',false);
  assert.ok(has(s,'tip',2));resetTube(s,'A');assert.ok(s.tip.used,'튜브 교체만으로 팁이 깨끗해지면 안 됨');
  for(const r of ['buffer','primer','rt','taq','sample:A']){freshTip(s);addReagent(s,'A',r);}assert.deepEqual(issues(s,scenario,2),[]);
  resetTube(s,'A');freshTip(s);addReagent(s,'B','sample:B',false);addReagent(s,'A','sample:A');assert.ok(has(s,'tip',2));
});
test('팁 없으면 분주되지 않음',()=>{const s=prepared();const n=s.tubes.A.additions.length;s.tip=null;assert.equal(addReagent(s,'A','buffer'),false);assert.equal(s.tubes.A.additions.length,n);});
for(const kind of ['missing','duplicate','wrong'])test(`시료 ${kind} 차단`,()=>{
  const s=prepared();if(kind==='missing')s.tubes.A.additions.pop();if(kind==='duplicate')s.tubes.A.additions.push({...s.tubes.A.additions.at(-1)});if(kind==='wrong')s.tubes.A.additions.at(-1).reagent='sample:B';
  assert.ok(has(s,'sample',2));s.tubes.A=prepared().tubes.A;assert.deepEqual(issues(s,scenario,2),[]);
});
test('시료 먼저 투입·시약 중복 차단',()=>{
  const s=prepared();s.tubes.A.additions.unshift(s.tubes.A.additions.pop());assert.ok(has(s,'order',2));s.tubes.A=prepared().tubes.A;
  s.tubes.A.additions.push(s.tubes.A.additions[0]);assert.ok(has(s,'duplicate',2));
});
test('효소 상온 취급 차단',()=>{const s=prepared();s.tubes.A.additions[2].cold=false;assert.ok(has(s,'ice',2));s.tubes.A=prepared().tubes.A;assert.deepEqual(issues(s,scenario,2),[]);});
for(const control of ['positive','NTC'])test(`${control} 누락 차단`,()=>{const s=prepared();s.tubes[control].received=false;assert.ok(has(s,'controls',1));s.tubes[control].received=true;assert.deepEqual(issues(s,scenario,1),[]);});
for(const [field,rule] of [['mixed','mix'],['spun','spin']])test(`${rule} 생략 차단`,()=>{const s=prepared();s.tubes.A[field]=false;assert.ok(has(s,rule,3));s.tubes.A[field]=true;assert.deepEqual(issues(s,scenario,3),[]);});
for(const [key,value,rule] of [['rtEnabled',false,'rtDeleted'],['rt',20,'rtTemp'],['initial',72,'denature'],['denature',72,'denature'],['anneal',80,'annealHigh'],['anneal',25,'annealLow'],['extend',45,'extend'],['final',30,'extend'],['cycles',2,'cycles'],['cycles',NaN,'cycles'],['cycles',30.5,'cycles']])test(`${key}=${value} 차단과 기본값 복구`,()=>{
  const s=prepared();s.program[key]=value;assert.ok(has(s,rule,4));s.program[key]=scenario.program.defaults[key];assert.deepEqual(issues(s,scenario,4),[]);
});
test('PCR 튜브 누락 및 가동 전 진행 차단',()=>{const s=prepared();s.pcrLoaded.pop();assert.ok(has(s,'pcrLoad',4));s.pcrLoaded=prepared().pcrLoaded;s.amplified=false;s.step=4;assert.ok(nextIssues(s,scenario).some(x=>x.rule==='pcrRun'));});
test('마커 누락·레인 기록 누락·잘못된 순서·전극 반대 차단과 복구',()=>{
  const s=prepared();s.lanes[0]=null;assert.ok(has(s,'marker'));s.lanes[0]='marker';s.recorded=false;assert.ok(has(s,'laneRecord'));s.recorded=true;
  [s.lanes[1],s.lanes[2]]=[s.lanes[2],s.lanes[1]];assert.ok(has(s,'laneMismatch'));s.lanes=[...s.lanePlan];s.polarity='reverse';assert.ok(has(s,'polarity'));s.polarity='normal';assert.deepEqual(issues(s,scenario),[]);
});
test('사용자가 정한 레인 순서와 밴드가 일치',()=>{const s=prepared();s.lanePlan=['marker','NTC','positive','B','A'];s.lanes=[...s.lanePlan];assert.deepEqual(issues(s,scenario,5),[]);assert.deepEqual(s.lanes.map(id=>bands(scenario,id)),[scenario.markerBp,[],[300],[],[300]]);});
test('전기영동 완료 전 다음 단계 차단',()=>{const s=prepared();s.step=5;s.gelRun=false;assert.ok(nextIssues(s,scenario).some(x=>x.rule==='gelRun'));});
test('경고는 원인→분자 수준→판정 영향으로 완비',()=>{for(const w of Object.values(scenario.warnings))for(const key of ['cause','molecule','consequence'])assert.ok(w[key]?.length>5);});
test('온도·분자 뷰 공통 시간축과 2분 이내 재생',()=>{
  const f=timeline(scenario.program.defaults);assert.ok(f.at(-1).end<120000);assert.equal(f.filter(x=>x.phase==='extend').length,30);
  for(const frame of f){assert.equal(frameAt(f,frame.start),frame);assert.ok(molecule(frame,.5,true).includes('5′'));assert.ok(molecule(frame,.5,false).includes('표적 RNA 없음'));}
  assert.ok(temperatureGraph(f,0).includes('50°'));assert.equal(f[0].phase,'rt');assert.equal(f[1].phase,'initial');
});
test('활동의 저장·외부 전송·글로벌 CSS 없음',()=>{
  for(const f of ['model.mjs','lab.mjs']){const code=fs.readFileSync(new URL(`../assets/activities/amplicon/${f}`,import.meta.url),'utf8');assert.doesNotMatch(code,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest/);}
  const css=fs.readFileSync(new URL('../assets/activities/amplicon/lab.css',import.meta.url),'utf8');assert.doesNotMatch(css,/(^|\n)(?:body|html|:root|\.site-header|\.workspace)/);
});
test('등록된 단원·활동 경로',()=>{const site=JSON.parse(fs.readFileSync(new URL('../data/site.json',import.meta.url)));const unit=site.courses.find(c=>c.id==='advanced-life-science').units.find(u=>u.id==='biotechnology');assert.equal(unit.activities.length,1);assert.equal(unit.activities[0].id,'amplicon');assert.equal(unit.activities[0].type,'inquiry');});
console.log(`AMPLICON: ${checks}개 검사 통과`);
