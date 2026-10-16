import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cleanSequence,mutationPositions,substituteSequence,residueRows,atomResidueKey,fitPoints,parsePdb,compareResidues,transformPdb,positionTmScore} from '../assets/activities/protein-lab/core.js';
import {AMINO_ACIDS,PRESETS} from '../assets/activities/protein-lab/amino-acids.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
assert.equal(AMINO_ACIDS.length,20);assert.equal(new Set(AMINO_ACIDS.map(x=>x.code)).size,20);
assert.deepEqual(PRESETS.map(x=>x.sequence.length),[35,76,56]);
assert.equal(cleanSequence('>test\nacdefghikl\n'), 'ACDEFGHIKL');
assert.throws(()=>cleanSequence('>a\nACDEFGHIKL\n>b\nACDEFGHIKL'),/한 번에/);
assert.throws(()=>cleanSequence('ACDEFGHIKX'),/사용할 수 없는/);
assert.throws(()=>cleanSequence('A'.repeat(257)),/10~256/);
assert.deepEqual(mutationPositions('2, 4-6, 5',10),[2,4,5,6]);
assert.throws(()=>mutationPositions('0, 100',35),/1~35/);
for(const aa of AMINO_ACIDS){assert.equal(substituteSequence('ACDEFGHIKL',[2,4,5],aa.code),`A${aa.code}D${aa.code}${aa.code}GHIKL`);}
assert.throws(()=>substituteSequence('ACDEFGHIKL',[1],'X'),/아미노산/);
const a=[[0,0,0],[2,0,0],[0,3,0],[0,0,4],[2,1,3]];
const b=a.map(([x,y,z])=>[-y+5,x+8,z+10]);
assert.ok(fitPoints(a,b).rmsd<1e-8,'rotation + translation should fit exactly');
assert.ok(Math.abs(positionTmScore(a,b).score-1)<1e-8,'rigid motions must have TM-score one');
const reflected=a.map(([x,y,z])=>[-x,y,z]);
assert.ok(fitPoints(a,reflected).rmsd>.1,'a reflection must not be accepted as a rotation');
const disturbed=b.map(p=>[...p]);disturbed[4][0]+=3;
assert.ok(fitPoints(a,disturbed).rmsd>.3,'non-rigid changes should remain');
assert.ok(positionTmScore(a,disturbed).score<1,'deformation must reduce TM-score');
const core=Array.from({length:30},(_,i)=>[Math.cos(i)*5,Math.sin(i)*5,i]);
const outlier=core.map(p=>[...p]);outlier[29]=[500,500,500];
assert.ok(positionTmScore(core,outlier).score>28.9/30,'TM optimization should retain a matching core despite one outlier');
function pdb(points,chain='A'){
 return points.map((p,i)=>'ATOM  '+String(i+1).padStart(5)+'  CA  ALA '+chain+String(i+1).padStart(4)+'    '+p.map(v=>v.toFixed(3).padStart(8)).join('')+'  1.00 80.00           C  ').join('\n')+'\nEND\n';
}
const pa=parsePdb(pdb(a)).chains.get('A'),pb=parsePdb(pdb(b)).chains.get('A');
// Same numeric ID in two chains and insertion codes must remain distinct.
const unusual=pdb(a).split('\n').map((line,i)=>line.startsWith('ATOM')?line.slice(0,22)+String(i<2?42:100+i).padStart(4)+(i===1?'A':' ')+line.slice(27):line).join('\n');
const parsedUnusual=parsePdb(unusual+'\n'+unusual.replaceAll('ALA A','ALA B'));
const external=residueRows(parsedUnusual);
assert.deepEqual(external.slice(0,3).map(r=>[r.position,r.resid]),[[1,'42'],[2,'42A'],[3,'102']]);
assert.equal(new Set(external.map(r=>r.key)).size,10);
assert.equal(external[1].key,atomResidueKey({chain:'A',resi:42,icode:'A'}));
assert.equal(external[5].position,1,'sequence order restarts in each chain');
assert.ok(external.every(r=>r.plddt===null),'B-factor 80 is not pLDDT');
const explicit=residueRows(parsedUnusual,{plddt:[91,null,0,75,88]});
assert.equal(explicit[0].plddt,91);assert.equal(explicit[1].plddt,null);assert.equal(explicit[2].plddt,0);assert.equal(explicit[5].plddt,null);
assert.equal(pa.length,5);assert.ok(compareResidues(pa,pb).rmsd<1e-8);
assert.throws(()=>compareResidues(pa,pb.slice(1)),/길이가 같은/);
assert.throws(()=>parsePdb('ATOM      1  CA  ALA A   1'),/좌표가 빠진/);
const first=pdb(a).replace('END\n','ENDMDL\n')+pdb(b);
assert.equal(parsePdb(first).chains.get('A').length,5);
const moved=transformPdb(pdb(b),fitPoints(a,b).transform,'A');
assert.ok(compareResidues(pa,parsePdb(moved).chains.get('A')).rmsd<.002);
const base=path.join(root,'assets/activities/protein-lab');
const entry=['lab.js','engine-worker.js'];const visited=new Set();
function imports(file){
 if(visited.has(file))return;visited.add(file);
 const source=fs.readFileSync(file,'utf8');
 for(const m of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)["']([^"']+)["']/g)){
  if(!m[1].startsWith('.'))continue;
  const target=path.resolve(path.dirname(file),m[1].split('?')[0]);assert.ok(fs.existsSync(target),`missing module ${target}`);imports(target);
 }
}
entry.forEach(x=>imports(path.join(base,x)));
const worker=fs.readFileSync(path.join(base,'engine-worker.js'),'utf8');
assert.ok(!worker.includes('api.esmatlas.com'),'inference must run locally');
assert.ok(!worker.includes('api.colabfold.com'),'no MSA search in inference');
console.log(`Protein laboratory: sequence/FASTA validation, substitutions, rigid fit, reflection rejection, PDB models and ${visited.size} local module paths passed.`);
