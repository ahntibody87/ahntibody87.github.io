import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {GOAL,TARGET,START,validSequence,gradeScissors} from '../assets/activities/rna-lab/scissors-model.js';
import {scene} from '../assets/activities/rna-lab/scissors-view.js';import {partners} from '../assets/activities/rna-lab/molecule.js';
const c=vm.createContext({console,TextDecoder,TextEncoder,Uint8Array,WebAssembly,performance,setTimeout,clearTimeout});vm.runInContext(fs.readFileSync(new URL('../assets/activities/rna-lab/vendor/ribossfold.js',import.meta.url),'utf8'),c);const e=await c.ribossfold();
const fold=sequence=>{const r=e.foldSeq(sequence).trim().split(/\s+/);return {sequence,structure:r[0],energy:Number(r[1])/100};};
const good='CAAAGGAGGUUACCCCCCACCGAGCCCACGCGCGUCUC',prediction=fold(good);
assert.equal(good.length,38);assert.equal(TARGET.length,18);assert.equal(prediction.structure,GOAL);assert.ok(gradeScissors(good,prediction).solved);assert.ok(!gradeScissors(START,fold(START)).solved);
assert.ok(validSequence(good+'A'));assert.ok(validSequence(good.slice(1)));assert.ok(!validSequence('ACX'));assert.ok(!gradeScissors(good,{...prediction,sequence:START}).solved);
const wrong='G'+good.slice(1);assert.ok(!gradeScissors(wrong,{...prediction,sequence:wrong}).solved);
for(const stage of ['design','approach','bound','docking','cut']){const s=scene(good,GOAL,stage),p=partners(s.structure);assert.equal(s.sequence.length,56);assert.ok(s.breaks.includes(37));assert.ok(s.geometry.every(p=>Object.values(p).every(Number.isFinite)));const cross=p.slice(0,38).filter(j=>j>=38);assert.equal(cross.length,['bound','docking'].includes(stage)?8:0);if(stage==='cut')assert.ok(s.breaks.includes(46));}
console.log('미션 5 통과: 독립 38 nt 접힘, 가변 길이 입력, 별도 18 nt 표적, 좌우 4쌍, 접근·결합·고리·절단');
