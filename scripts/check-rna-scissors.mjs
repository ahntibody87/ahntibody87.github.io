import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GOAL,TARGET,START,LOCKED,LOOP_A,LOOP_B,validSequence,gradeScissors,topology} from '../assets/activities/rna-lab/scissors-model.js';
import {dockGeometry,cleaveGeometry,cleavedStructure} from '../assets/activities/rna-lab/scissors-view.js';
import {partners} from '../assets/activities/rna-lab/molecule.js';
const ctx=vm.createContext({console,TextDecoder,TextEncoder,Uint8Array,WebAssembly,performance,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(new URL('../assets/activities/rna-lab/vendor/ribossfold.js',import.meta.url),'utf8'),ctx);
const engine=await ctx.ribossfold();
const fold=sequence=>{const raw=engine.foldSeq(sequence).trim().split(/\s+/);return {sequence,structure:raw[0],energy:Number(raw[1])/100};};
// Artificial structural fixture, unrelated to any real organism or catalyst.
const solved='CAUCAGCAACACUGCCAAUGACACUGCCAAUGACACCAUCAGCA';
assert.ok(validSequence(START));assert.ok(validSequence(solved));assert.ok(!validSequence('A'.repeat(44)));assert.ok(!validSequence(solved.slice(1)));
const result=fold(solved),grade=gradeScissors(solved,result);
assert.equal(result.structure,GOAL);assert.ok(grade.solved);
assert.equal(grade.stems.length,4);assert.ok(grade.stems.every(x=>x.length===3));assert.deepEqual(grade.loops,[LOOP_A,LOOP_B]);
assert.ok(!gradeScissors(START,fold(START)).solved);assert.ok(!gradeScissors(solved,null).solved);assert.ok(!gradeScissors(solved,{...result,sequence:START}).solved);
assert.ok(!gradeScissors(solved,{...result,structure:'.'.repeat(44)}).solved);
const altered='A'+solved.slice(1);assert.ok(!gradeScissors(altered,{...result,sequence:altered}).solved);
let structures=new Set([result.structure]);
for(let i=TARGET.length;i<solved.length;i++){const s=solved.slice(0,i)+(solved[i]==='A'?'C':'A')+solved.slice(i+1);structures.add(fold(s).structure);}
assert.ok(structures.size>5,'Full-sequence mutations must change the predicted topology');
const geometry=dockGeometry(GOAL,grade.nodeMap),cut=cleaveGeometry(geometry),structure=cleavedStructure(GOAL),mates=partners(structure);
assert.ok(geometry.every(p=>Object.values(p).every(Number.isFinite)));assert.ok(cut.every(p=>Object.values(p).every(Number.isFinite)));
LOCKED.forEach(i=>assert.equal(mates[i],-1));assert.ok(mates.slice(TARGET.length).some(j=>j>=0));
assert.notDeepEqual(cut.slice(0,TARGET.length),geometry.slice(0,TARGET.length));assert.deepEqual(cut.slice(TARGET.length),geometry.slice(TARGET.length));
assert.equal(topology('(((....)))').loops.length,0);
console.log(`미션 5 검사 통과: 실제 전체 접힘, 4개 구간·2개 내부 고리, ${structures.size}개 변이 구조, 고정 표적, 이전 결과 거부, 도킹·절단 좌표와 표적 분리`);
