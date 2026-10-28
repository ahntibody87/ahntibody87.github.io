import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readRnaPdb,validateResult} from '../assets/activities/rna-lab/tertiary-core.js';
import {RNA_CHEMISTRY} from '../assets/activities/rna-lab/rna-chemistry.js';
import {molecularGraph,viewerAtoms,atomPart,inspectGeometry,refineGeometry,writeCoordinates,rankCandidates} from '../assets/activities/rna-lab/tertiary-geometry.js';

// Independent, experimentally determined NMR hairpin. Its small clashes are
// intentionally retained: the cleanup must improve real coordinates, not only a toy.
const pdb=fs.readFileSync(new URL('./fixtures/rna-hairpin-1uuu.pdb',import.meta.url),'utf8');
const parsed=readRnaPdb(pdb),original=structuredClone(parsed.residues),before=inspectGeometry(parsed.residues);
assert.equal(parsed.sequence,'GGCGUACGUUUCGUACGCC');
assert.equal(before.breaks,0);assert.equal(before.severeBonds,0);assert.equal(before.chirality,0);
assert.deepEqual(['P','OP1','OP2',"C1'","O4'",'N9'].map(atomPart),['phosphate','phosphate','phosphate','sugar','sugar','base']);
for(const base of ['A','C','G','U'])assert.ok(RNA_CHEMISTRY[base].bonds.length>18);
const refined=refineGeometry(parsed.residues);assert.equal(refined.applied,true);assert.equal(refined.after.eligible,true);
assert.ok(refined.maxDisplacement<=.301);assert.ok(refined.after.bondRms<before.bondRms);assert.ok(refined.after.clashes<before.clashes);
assert.deepEqual(parsed.residues,original,'cleanup must not mutate raw prediction');
const fixed=writeCoordinates(pdb,refined.residues,'TEST CLEANUP'),roundtrip=readRnaPdb(fixed);
assert.equal(roundtrip.sequence,parsed.sequence);assert.equal(inspectGeometry(roundtrip.residues).eligible,true);
assert.deepEqual(roundtrip.residues.map(r=>r.confidence),parsed.residues.map(r=>r.confidence),'preserve raw confidence');
assert.equal(validateResult({format:'rna-lab-3d-v1',model:'test',sequence:parsed.sequence,pdb:fixed},parsed.sequence).sequence,parsed.sequence);

for(const [name,alter,field] of [
  ['backbone',r=>r[1].atoms.P[0]+=4,'breaks'],
  ['sugar ring',r=>r[3].atoms["C2'"][2]+=3,'sugarOutliers'],
  ['glycosidic link',r=>r[4].atoms.N1[0]+=3,'glycosidicOutliers'],
  ['base ring',r=>r[0].atoms.C8[0]+=3,'baseOutliers'],
  ['missing atom',r=>delete r[3].atoms["O4'"],'missingAtoms'],
  ['steric overlap',r=>{for(const [atom,p] of Object.entries(r[2].atoms))if(r[0].atoms[atom])p.splice(0,3,...r[0].atoms[atom]);},'severeClashes'],
]){
  const bad=structuredClone(roundtrip.residues);alter(bad);const quality=inspectGeometry(bad);
  assert.ok(quality[field]>0,name);assert.equal(quality.eligible,false,name+' must fail selection');
  const repair=refineGeometry(bad);assert.equal(repair.applied,false,name+' must not be cosmetically rescued');assert.deepEqual(repair.residues,bad);
  assert.equal(rankCandidates([{seed:0,quality,meanPlddt:99}]).length,0);
}

// Bonds must follow CCD topology even for distorted/overlapping coordinates.
const graph=molecularGraph(roundtrip.residues),view=viewerAtoms(roundtrip.residues);
const expected=new Set(graph.bonds.map(b=>[b.a,b.b].sort((a,b)=>a-b).join(':')));
let edges=0;
for(const a of view.atoms)for(const b of a.bonds){assert.ok(expected.has([a.index,b].sort((x,y)=>x-y).join(':')));assert.ok(view.atoms[b].bonds.includes(a.index));if(a.index<b)edges++;}
assert.equal(edges,graph.bonds.length);assert.equal(view.omitted,0);
const broken=structuredClone(roundtrip.residues);broken[1].atoms.P[0]+=6;assert.ok(viewerAtoms(broken).omitted>0,'do not bridge a broken covalent link');
const overlap=structuredClone(roundtrip.residues);overlap[0].atoms.N1=[...overlap[0].atoms.N9];
const overlapped=viewerAtoms(overlap).atoms,n1=overlapped.find(a=>a.resi===overlapped[0].resi&&a.atom==='N1'),n9=overlapped.find(a=>a.resi===overlapped[0].resi&&a.atom==='N9');
assert.ok(!n1.bonds.includes(n9.index),'proximity must not invent a bond');
const good=inspectGeometry(roundtrip.residues);
assert.equal(rankCandidates([{seed:0,quality:{...good,eligible:false},meanPlddt:99},{seed:1,quality:good,meanPlddt:20}])[0].seed,1);
assert.equal(rankCandidates([{seed:0,quality:{...good,score:10},meanPlddt:99},{seed:1,quality:{...good,score:1},meanPlddt:20}])[0].seed,1);
assert.throws(()=>readRnaPdb(pdb.replace(/ {3}-?\d+\.\d{3}/,'        ')));
console.log(JSON.stringify({passed:true,reference:'1UUU model 1',atoms:graph.atoms.length,bonds:edges,before:{rms:before.bondRms,clashes:before.clashes},after:{rms:good.bondRms,clashes:good.clashes,maxDisplacement:refined.maxDisplacement},checks:['chemical topology','backbone','sugar','glycosidic','base','missing atoms','clashes','bounded cleanup','raw preservation','candidate selection','PDB roundtrip']}));
