import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {TARGETS,INITIAL_DESIGN,reverseComplement,validDesign,gradeScissors,hairpinSequence,ribozymeSequence} from '../assets/activities/rna-lab/scissors-model.js';
assert.equal(reverseComplement('ACGUAA'),'UUACGU');
assert.equal(validDesign(INITIAL_DESIGN),true);
assert.equal(validDesign({...INITIAL_DESIGN,stem5:'ANNN'}),false);
assert.equal(validDesign({...INITIAL_DESIGN,arm3:'ACGU'}),false);
const context=vm.createContext({console,TextDecoder,TextEncoder,Uint8Array,WebAssembly,performance,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(new URL('../assets/activities/rna-lab/vendor/ribossfold.js',import.meta.url),'utf8'),context);
const engine=await context.ribossfold();
for(const target of TARGETS){
  assert.match(target.left+target.cut+target.right,/^[ACGU]{4}GUC[ACGU]{6}$/);
  const d={arm5:reverseComplement(target.right),arm3:reverseComplement(target.left),stem5:'GGCC',stem3:'GGCC'};
  const raw=engine.foldSeq(hairpinSequence(d)).trim().split(/\s+/);
  const prediction={sequence:hairpinSequence(d),structure:raw[0]};
  assert.equal(prediction.structure,'((((....))))');
  assert.ok(gradeScissors(target,d,prediction).solved);
  assert.equal(ribozymeSequence(d).length,34);
  assert.match(ribozymeSequence(d),/CUGAUGAGGCCGAAAGGCCGAA/);
  assert.equal(gradeScissors(target,d).solved,false);
  assert.equal(gradeScissors(target,d,{...prediction,sequence:'AAAAAAAAAAAA'}).solved,false);
  assert.equal(gradeScissors(target,d,{...prediction,structure:'............'}).solved,false);
  assert.equal(gradeScissors(target,{...d,arm3:[...d.arm3].reverse().join('')},prediction).solved,false);
  assert.equal(gradeScissors(target,{...d,arm5:'NNNNNN'},prediction).solved,false);
  assert.equal(gradeScissors(target,{...d,stem3:'AAAC'},prediction).solved,false);
  for(const other of TARGETS.filter(t=>t!==target))assert.equal(gradeScissors(other,d,prediction).solved,false);
}
console.log('표적 RNA 가위 검사 통과: 실제 계산기의 헤어핀 예측, 반대 방향 상보성, 표적 변경, 빈 자리·잘못된 구조·이전 예측 거부');
