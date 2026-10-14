import assert from 'node:assert/strict';
import {patients,drugs,newInvestigation,addTest,submissionErrors,restoreInvestigation} from '../assets/activities/cell-energy/model.mjs';

// Exercise the investigation from two tests through submission and reload.
const run=newInvestigation();
run.started=true;
addTest(run,'oxygen','산소 소비로 전자 전달이 계속되는지 확인한다.');
assert.throws(()=>addTest(run,'oxygen','중복 검사'));
assert.throws(()=>addTest(run,'gradient','   '));
addTest(run,'gradient','양성자 기울기로 ATP 합성 효소 차단과 짝풀림을 구분한다.');
assert.throws(()=>addTest(run,'nadh','세 번째 검사'));
assert.equal(submissionErrors(run).length,6);
for(const patient of patients)run.answers[patient.id]={drug:patient.drug,reason:'두 검사 결과와 약물 작용을 연결한 근거'};
assert.deepEqual(submissionErrors(run),[]);
run.answers.C.reason='  ';
assert.equal(submissionErrors(run)[0].field,'ce-reason-C');
run.answers.C.reason='기울기가 커지고 산소 소비가 느려져 ATP 합성 효소 차단으로 판단한다.';
run.submittedAt=new Date().toISOString();
run.exit='짝풀림제는 산소 소비가 늘어도 ATP 합성이 감소할 수 있다.';
assert.throws(()=>addTest(run,'atp','제출 후 변경'));
assert.deepEqual(restoreInvestigation(JSON.parse(JSON.stringify(run))),run);
assert.equal(restoreInvestigation({...run,order:['cyanide','cyanide','dnp']}),null);

// Labels and feedback follow substance IDs even when displayed numbers move.
const permutations=[];
for(const a of drugs)for(const b of drugs)for(const c of drugs)
  if(new Set([a.id,b.id,c.id]).size===3)permutations.push([a.id,b.id,c.id]);
for(const order of permutations){
  const restored=restoreInvestigation({...run,order});
  for(const patient of patients){
    const number=restored.order.indexOf(restored.answers[patient.id].drug)+1;
    assert.equal(restored.order[number-1],patient.drug);
    assert.ok(drugs.find(drug=>drug.id===restored.order[number-1]).image);
  }
}
console.log('두 번 검사·중복/초과 차단·근거 필수·제출 후 복구·6가지 약물 순서 검사 통과');
