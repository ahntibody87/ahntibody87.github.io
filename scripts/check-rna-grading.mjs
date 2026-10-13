import assert from 'node:assert/strict';
import {gradeMission, pairing, shape} from '../assets/activities/rna-lab/grading.js';
import {MISSIONS} from '../assets/activities/rna-lab/missions.js';

// Small fixtures independent of classroom missions; no mission answers here.
const fixture={start:'AAAAAAAAAAAA',target:'((....))....',locked:[],maxChanges:null};
assert.ok(gradeMission(fixture,'GCAAAAGCAAAA',fixture.target).solved);
assert.ok(gradeMission(fixture,'GCUUUUGCUUUU',fixture.target).solved);
const shifted=gradeMission(fixture,'AAAAGCAAAAGC','....((....))');
assert.equal(shifted.solved,true);assert.equal(shifted.shapePercent,100);
assert.equal(shifted.extra.length,0);assert.equal(shifted.missing.length,0);assert.deepEqual(shifted.mismatches,[]);
assert.equal(shape('.......((((((....)))))).......').text,shape('............((((((....))))))..').text);
assert.equal(shape('((...))..((....))').text,shape('...((...)).....((....))...').text);
assert.notEqual(shape('((...))').text,shape('((....))').text);
assert.notEqual(shape('((....))').text,shape('(((....)))').text);
assert.notEqual(shape('((...))((...))').text,shape('((.((...)).))').text);
assert.notEqual(shape('(((....)))').text,shape('((.(....)))').text);
assert.equal(gradeMission(fixture,'GCAAAAGCAAAA','((.....))...').solved,false);
assert.equal(gradeMission(fixture,'GCAAAAGCAAAA','((....))(..)').solved,false);
assert.equal(gradeMission({...fixture,locked:[0]},'GCAAAAGCAAAA',fixture.target).solved,false);
const limited=gradeMission({...fixture,maxChanges:2},'GCAAAAGCAAAA',fixture.target);
assert.equal(limited.structureOk,true);assert.equal(limited.budgetOk,false);assert.equal(limited.solved,false);
assert.equal(gradeMission(fixture,'GCAAAAGCAAAA').hasPrediction,false);
assert.equal(gradeMission(fixture,'GCAAAAGC',fixture.target).solved,false);
assert.throws(()=>pairing('(()'));assert.throws(()=>pairing('x'));
assert.equal(MISSIONS.length,5);
for(const mission of MISSIONS){
  if(mission.kind==='scissors')continue;
  assert.equal(mission.start.length,mission.target.length);
  const mates=pairing(mission.target);
  assert.ok(mission.locked.every(i=>i>=0&&i<mission.start.length));
  assert.equal(gradeMission(mission,mission.start).solved,false);
}
console.log('RNA 채점 검사 통과: 서열·위치가 다른 같은 모양 인정, 루프·줄기·가지·벌지 차이 구분, 추가 구조 거부, 변경 제한, 미정 자리');
