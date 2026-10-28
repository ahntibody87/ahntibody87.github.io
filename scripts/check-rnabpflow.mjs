import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildSchematic} from '../assets/activities/rna-lab/tertiary-schematic.js';
import {displayPolicy} from '../assets/activities/rna-lab/tertiary-ui.js';
import {reconstruct,initialState,features,rotateTowards,quatMatrix,matrixQuat,toPdb} from '../assets/activities/rna-lab/rnabpflow-math.js';
import {readRnaPdb} from '../assets/activities/rna-lab/tertiary-core.js';
const base=new URL('../assets/activities/rna-lab/vendor/rnabpflow/',import.meta.url),constants=JSON.parse(fs.readFileSync(new URL('constants.json',base)));
for(const n of [8,12,19,60,120])for(const structure of ['.'.repeat(n),'('.repeat(Math.floor((n-4)/2))+'.'.repeat(n%2?5:4)+')'.repeat(Math.floor((n-4)/2))]){
  const model=buildSchematic('AUGC'.repeat(30).slice(0,n),structure),atoms=model.atoms;
  assert.equal(model.format,'rna-lab-schematic-v1');assert.equal(model.poses.length,n);assert.equal(model.phosphates.length,n);
  assert.ok(atoms.every(a=>[a.x,a.y,a.z].every(Number.isFinite)));assert.ok(atoms.every(a=>a.properties.schematic));
  const visited=new Set([0]),todo=[0];while(todo.length){const i=todo.pop();for(const j of atoms[i].bonds){assert.ok(atoms[j].bonds.includes(i));if(!visited.has(j)){visited.add(j);todo.push(j);}}}
  assert.equal(visited.size,atoms.length,'single continuous strand including every base');
  for(let i=1;i<n;i++){const p=atoms[model.phosphates[i]];assert.equal(p.bonds.length,2);assert.deepEqual(new Set(p.bonds.map(j=>atoms[j].resi)),new Set([i,i+1]));}
}
assert.throws(()=>buildSchematic('AAAAAAAA','((.....)'));
assert.throws(()=>features('AAAAAAAA','((.....)'));
assert.deepEqual(features('AUGCAUGC','((....))').onehot.slice(0,16),Float32Array.of(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1));
assert.equal(features('AUGCAUGC','((....))').ss.reduce((a,b)=>a+b,0),12);assert.deepEqual(initialState(8),initialState(8));
for(const q of [[1,0,0,0],[0,1,0,0],[.001,.2,.3,.7]]){const m=quatMatrix(q),back=quatMatrix(matrixQuat(m));assert.ok(m.every((x,i)=>Math.abs(x-back[i])<1e-12));}
const half=rotateTowards(quatMatrix([1,0,0,0]),quatMatrix([0,0,0,1]),.5);assert.ok(Math.abs(half[0])<1e-12);assert.ok(Math.abs(half[3]-1)<1e-12);
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/rnabpflow-reconstruction.json',import.meta.url))),flatten=a=>a.flat(Infinity);
const residues=reconstruct('AGCUAGCU',{pred_trans:flatten(fixture.trans),pred_rot:flatten(fixture.rotations),torsions:flatten(fixture.angles)},constants);
let max=0;residues.forEach((r,k)=>Object.entries(r.atoms).forEach(([name,xyz])=>{const a=constants.atomNames[r.base].indexOf(name);xyz.forEach((x,j)=>max=Math.max(max,Math.abs(x-fixture.xyz[0][k][a][j])));}));
assert.ok(max<1e-5);assert.equal(readRnaPdb(toPdb(residues)).sequence,'AGCUAGCU');
const q={eligible:true,missingAtoms:0,unexpectedAtoms:0,severeBonds:0,severeClashes:0,chirality:0,severePlanarity:0};
assert.equal(displayPolicy(q,19),'prediction');assert.equal(displayPolicy({...q,eligible:false,severeBonds:1,severeClashes:6},19),'caution');assert.equal(displayPolicy({...q,eligible:false,severeClashes:2000},60),'schematic');
assert.equal(createHash('sha256').update(fs.readFileSync(new URL('rnabpflow-casp16-f32.onnx',base))).digest('hex'),'ca3fc6587ed7107d15add940227ce4362f8780700f445a436510b6ea4e41f46d');
console.log(JSON.stringify({passed:true,reconstructionMaxError:max,checks:['8–120 nt continuous schematic topology','sequence and pair map channels','rotation interpolation at pi','native all-atom reconstruction','PDB roundtrip','minor defects remain visible','gross failure retains model','pinned model SHA256']}));
