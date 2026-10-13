import assert from 'node:assert/strict';
import {gradeMission, pairing} from '../assets/activities/rna-lab/grading.js';
import {MISSIONS} from '../assets/activities/rna-lab/missions.js';

// Small fixtures independent of classroom missions; no mission answers here.
const fixture={start:'AAAAAAAAAAAA',target:'((....))....',locked:[],maxChanges:null};
assert.ok(gradeMission(fixture,'GCAAAAGCAAAA',fixture.target).solved);
assert.ok(gradeMission(fixture,'GCUUUUGCUUUU',fixture.target).solved);
const shifted=gradeMission(fixture,'AAAAGCAAAAGC','....((....))');
assert.equal(shifted.solved,false);assert.equal(shifted.extra.length,2);assert.equal(shifted.missing.length,2);
assert.equal(gradeMission(fixture,'GCAAAAGCAAAA','((....))(..)').solved,false);
assert.equal(gradeMission({...fixture,locked:[0]},'GCAAAAGCAAAA',fixture.target).solved,false);
const limited=gradeMission({...fixture,maxChanges:2},'GCAAAAGCAAAA',fixture.target);
assert.equal(limited.structureOk,true);assert.equal(limited.budgetOk,false);assert.equal(limited.solved,false);
assert.equal(gradeMission(fixture,'GCAAAAGCAAAA').hasPrediction,false);
assert.equal(gradeMission(fixture,'GCAAAAGC',fixture.target).solved,false);
assert.throws(()=>pairing('(()'));assert.throws(()=>pairing('x'));
assert.equal(MISSIONS.length,5);
for(const mission of MISSIONS){
  assert.equal(mission.start.length,mission.target.length);
  const mates=pairing(mission.target);
  assert.ok(mission.locked.every(i=>i>=0&&i<mission.start.length));
  assert.equal(gradeMission(mission,mission.start).solved,false);
  if(mission.kind==='ribozyme'){
    assert.equal(mission.start.length,54);assert.equal(mission.locked.length,16);
    assert.equal([...mission.start].filter(x=>x==='N').length,38);
    assert.equal(mission.start.slice(5,8),'GUC');assert.equal(mates[mission.cleavageAfter],-1);
    assert.equal(gradeMission(mission,mission.start,mission.target).solved,false);
    for(const stem of mission.stems)for(const [i,j]of stem.pairs)assert.equal(mates[i],j);
    assert.equal(mission.stems.reduce((sum,stem)=>sum+stem.pairs.length,0),15);
    assert.equal(gradeMission(mission,mission.start.replaceAll('N','A'),'.'.repeat(54)).solved,false);
  }
}
console.log('RNA 채점 검사 통과: 다양한 서열, 다른 결합 상대·추가 결합, 변경 제한, 고정 염기, 미정 자리, 해머헤드 3줄기·절단 자리');
