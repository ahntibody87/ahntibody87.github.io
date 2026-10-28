import {RNA_CHEMISTRY} from './rna-chemistry.js';

export const QUALITY_VERSION='rna-geometry-v2';
export const PART_COLORS={sugar:'#627f91',phosphate:'#c17b36'};
export function canonicalAtom(name){return ({O1P:'OP1',O2P:'OP2',O3P:'OP3'})[name]||name.replace(/\*/g,"'");}
// Bridging O3'/O5' are grouped with the sugar for a consistent teaching legend.
export function atomPart(name){name=canonicalAtom(name);return name==='P'||/^OP[123]$/.test(name)?'phosphate':name.includes("'")?'sugar':'base';}
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const signedVolume=(o,a,b,c)=>dot(sub(a,o),cross(sub(b,o),sub(c,o)));
const angle=(a,b,c)=>{const u=sub(a,b),v=sub(c,b);return Math.acos(Math.max(-1,Math.min(1,dot(u,v)/(Math.hypot(...u)*Math.hypot(...v)||1))))*180/Math.PI;};
const radii={C:1.7,N:1.55,O:1.52,P:1.8};

export function molecularGraph(residues){
  const atoms=[],maps=[],bonds=[],missing=[],unexpected=[];
  residues.forEach((r,ri)=>{
    const map=new Map();maps.push(map);
    for(const [name,xyz] of Object.entries(r.atoms)){
      const definition=RNA_CHEMISTRY[r.base].atoms[name];
      if(!definition){unexpected.push({residue:ri+1,atom:name});continue;}
      if(name==='OP3'&&ri>0)unexpected.push({residue:ri+1,atom:name});
      map.set(name,atoms.length);atoms.push({ri,name,element:definition.element,xyz});
    }
    for(const name of Object.keys(RNA_CHEMISTRY[r.base].atoms))if(name!=='OP3'&&!(ri===0&&!map.has('P')&&['P','OP1','OP2'].includes(name))&&!map.has(name))missing.push({residue:ri+1,atom:name});
  });
  function add(a,b,target,kind){if(a!==undefined&&b!==undefined)bonds.push({a,b,target,kind});}
  residues.forEach((r,ri)=>{
    const map=maps[ri];
    for(const [a,b,target] of RNA_CHEMISTRY[r.base].bonds){
      const kind=a==="C1'"&&['N1','N9'].includes(b)?'glycosidic':atomPart(a)==='base'&&atomPart(b)==='base'?'base':atomPart(a)==='phosphate'||atomPart(b)==='phosphate'?'phosphate':'sugar';
      add(map.get(a),map.get(b),target,kind);
    }
    if(ri>0&&r.chain===residues[ri-1].chain&&r.number===residues[ri-1].number+1)add(maps[ri-1].get("O3'"),map.get('P'),1.607,'link');
  });
  const adjacency=atoms.map(()=>new Set());
  for(const b of bonds){adjacency[b.a].add(b.b);adjacency[b.b].add(b.a);}
  // Exclude covalent neighbours and 1-3 contacts from nonbonded clash checks.
  const excluded=adjacency.map((set,i)=>{const all=new Set([i,...set]);for(const j of set)for(const k of adjacency[j])all.add(k);return all;});
  const angles=[];
  residues.forEach((r,ri)=>{
    const map=maps[ri],ideal=RNA_CHEMISTRY[r.base].atoms;
    for(const [name,b] of map){const neighbours=[...adjacency[b]].filter(i=>atoms[i].ri===ri);
      for(let j=0;j<neighbours.length;j++)for(let k=j+1;k<neighbours.length;k++){
        const a=neighbours[j],c=neighbours[k],x=ideal[atoms[a].name].xyz,y=ideal[name].xyz,z=ideal[atoms[c].name].xyz;
        angles.push({a,b,c,target:angle(x,y,z),distance:distance(x,z)});
      }
    }
  });
  return {atoms,maps,bonds,adjacency,excluded,angles,missing,unexpected};
}

function clashPairs(graph,positions=graph.atoms.map(a=>a.xyz)){
  const cells=new Map(),pairs=[],size=3.6;
  positions.forEach((p,i)=>{
    const cell=p.map(x=>Math.floor(x/size));
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
      for(const j of cells.get([cell[0]+x,cell[1]+y,cell[2]+z].join(','))||[]){
        if(graph.excluded[i].has(j))continue;
        const d=distance(p,positions[j]),overlap=radii[graph.atoms[i].element]+radii[graph.atoms[j].element]-d;
        if(overlap>.65)pairs.push({a:j,b:i,distance:d,overlap});
      }
    }
    const key=cell.join(',');if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);
  });
  return pairs;
}

export function inspectGeometry(residues){
  const graph=molecularGraph(residues),outliers=[],counts={link:0,sugar:0,glycosidic:0,base:0,phosphate:0};
  let severeBonds=0,bondError=0,worstBondError=0;
  for(const b of graph.bonds){const d=distance(graph.atoms[b.a].xyz,graph.atoms[b.b].xyz),error=Math.abs(d-b.target);bondError+=error*error;worstBondError=Math.max(worstBondError,error);
    if(error>.25){counts[b.kind]++;outliers.push({residue:graph.atoms[b.a].ri+1,atom:graph.atoms[b.a].name,otherResidue:graph.atoms[b.b].ri+1,otherAtom:graph.atoms[b.b].name,distance:d,kind:b.kind});}
    if(error>.6||d<.75||d>2.5)severeBonds++;
  }
  let angleOutliers=0,severeAngles=0,chirality=0,nonplanarBases=0,severePlanarity=0;
  for(const a of graph.angles){const error=Math.abs(angle(graph.atoms[a.a].xyz,graph.atoms[a.b].xyz,graph.atoms[a.c].xyz)-a.target);if(error>30)angleOutliers++;if(error>55)severeAngles++;}
  residues.forEach((r,ri)=>{
    const ideal=RNA_CHEMISTRY[r.base].atoms;
    for(const center of ["C1'","C2'","C3'","C4'"]){const index=graph.maps[ri].get(center);if(index===undefined)continue;
      const names=[...graph.adjacency[index]].filter(j=>graph.atoms[j].ri===ri).map(j=>graph.atoms[j].name);
      if(names.length!==3)continue;
      const expected=signedVolume(ideal[center].xyz,...names.map(n=>ideal[n].xyz)),actual=signedVolume(r.atoms[center],...names.map(n=>r.atoms[n]));
      if(actual*expected<=0||Math.abs(actual)<.2)chirality++;
    }
    const [a,b,c]=['N1','C2','C6'].map(n=>r.atoms[n]);if(!a||!b||!c)return;
    const normal=cross(sub(b,a),sub(c,a)),length=Math.hypot(...normal);
    const baseAtoms=Object.entries(r.atoms).filter(([n])=>atomPart(n)==='base');
    const deviation=length<.1?Infinity:Math.max(...baseAtoms.map(([,p])=>Math.abs(dot(sub(p,a),normal)/length)));
    if(deviation>.2)nonplanarBases++;if(deviation>.5)severePlanarity++;
  });
  const clashes=clashPairs(graph),severeClashes=clashes.filter(c=>c.overlap>1.0).length;
  const bondOutliers=outliers.length,missingAtoms=graph.missing.length,unexpectedAtoms=graph.unexpected.length;
  // Conservative application screening, NOT MolProbity/wwPDB validation or native-fold accuracy.
  // Normalize small-contact counts by atoms, rather than nucleotides: a
  // nucleotide has ~20 heavy atoms. A few mild contacts alone should not reject
  // an otherwise intact RNA, including our independent experimental reference.
  const eligible=missingAtoms===0&&unexpectedAtoms===0&&severeBonds===0&&severeClashes===0&&chirality===0&&severeAngles===0&&severePlanarity===0&&bondOutliers<=Math.max(2,graph.bonds.length*.03)&&clashes.length<=Math.max(3,graph.atoms.length*.03);
  const score=1000*(missingAtoms+unexpectedAtoms+severeBonds+severeClashes+chirality+severeAngles+severePlanarity)+10*bondOutliers+angleOutliers+nonplanarBases+2*clashes.length+Math.sqrt(bondError/Math.max(1,graph.bonds.length));
  return {version:QUALITY_VERSION,eligible,score,atomCount:graph.atoms.length,breaks:counts.link,bondOutliers,severeBonds,sugarOutliers:counts.sugar,glycosidicOutliers:counts.glycosidic,baseOutliers:counts.base,phosphateOutliers:counts.phosphate,angleOutliers,severeAngles,chirality,nonplanarBases,severePlanarity,clashes:clashes.length,severeClashes,missingAtoms,unexpectedAtoms,bondRms:Math.sqrt(bondError/Math.max(1,graph.bonds.length)),worstBondError,details:{bonds:outliers.slice(0,20),missing:graph.missing.slice(0,20)}};
}

export function viewerAtoms(residues){
  const graph=molecularGraph(residues);
  const atoms=graph.atoms.map((a,index)=>({index,serial:index+1,atom:a.name,elem:a.element,resn:residues[a.ri].base,resi:residues[a.ri].number,chain:residues[a.ri].chain,x:a.xyz[0],y:a.xyz[1],z:a.xyz[2],b:residues[a.ri].confidence?.[a.name]??0,bonds:[],bondOrder:[],properties:{part:atomPart(a.name)}}));
  let omitted=0;
  for(const bond of graph.bonds){const d=distance(graph.atoms[bond.a].xyz,graph.atoms[bond.b].xyz);
    if(d<.75||Math.abs(d-bond.target)>.6||d>2.5){omitted++;continue;}
    atoms[bond.a].bonds.push(bond.b);atoms[bond.b].bonds.push(bond.a);atoms[bond.a].bondOrder.push(1);atoms[bond.b].bondOrder.push(1);
  }
  return {atoms,omitted};
}

export function writeCoordinates(pdb,residues,remark){
  const lookup=new Map(residues.map(r=>[r.chain+':'+r.number,r]));
  const lines=pdb.split(/\r?\n/).filter(line=>!line.startsWith('CONECT')).map(line=>{
    if(!line.startsWith('ATOM  '))return line;
    const r=lookup.get(line.slice(21,22)+':'+Number(line.slice(22,26))),p=r?.atoms[canonicalAtom(line.slice(12,16).trim())];
    return p?line.slice(0,30)+p.map(x=>x.toFixed(3).padStart(8)).join('')+line.slice(54):line;
  });
  return 'REMARK   1 '+remark+'\n'+lines.join('\n');
}

// Bounded geometric cleanup with positional restraints. This is not MD, an Amber
// minimization, or a new fold. Never attempt to rescue a seriously broken input.
export function refineGeometry(residues,{iterations=80,maxDisplacement=.3}={}){
  const before=inspectGeometry(residues),copy=structuredClone(residues);
  if(before.severeBonds||before.severeClashes||before.missingAtoms||before.unexpectedAtoms||before.chirality||before.severePlanarity||before.severeAngles)return {residues:copy,before,after:before,applied:false,maxDisplacement:0,iterations:0,reason:'severe-input'};
  const graph=molecularGraph(copy),origin=graph.atoms.map(a=>[...a.xyz]);let positions=origin.map(p=>[...p]);
  function evaluate(pos,gradient=false){
    const grad=pos.map(()=>[0,0,0]);let energy=0;
    function spring(a,b,target,weight,dead=0){const u=sub(pos[a],pos[b]),d=Math.hypot(...u),delta=d-target,e=Math.sign(delta)*Math.max(0,Math.abs(delta)-dead);energy+=weight*e*e;
      if(!gradient||!e)return;const dir=d>1e-8?u.map(x=>x/d):[1,0,0];for(let k=0;k<3;k++){const g=2*weight*e*dir[k];grad[a][k]+=g;grad[b][k]-=g;}}
    for(const b of graph.bonds)spring(b.a,b.b,b.target,5,.035);
    for(const a of graph.angles)spring(a.a,a.c,a.distance,.5,.15);
    for(const c of clashPairs(graph,pos))spring(c.a,c.b,radii[graph.atoms[c.a].element]+radii[graph.atoms[c.b].element]-.55,.8);
    pos.forEach((p,i)=>p.forEach((x,k)=>{const e=x-origin[i][k];energy+=.6*e*e;if(gradient)grad[i][k]+=1.2*e;}));
    return {energy,grad};
  }
  let steps=0,current=evaluate(positions).energy;
  for(;steps<iterations;steps++){
    const {grad}=evaluate(positions,true);let accepted=false;
    for(let rate=.035;rate>.0001;rate/=2){const trial=positions.map((p,i)=>{
      const q=p.map((x,k)=>x-rate*grad[i][k]),delta=sub(q,origin[i]),length=Math.hypot(...delta);
      return length>maxDisplacement?origin[i].map((x,k)=>x+delta[k]*maxDisplacement/length):q;
    });const energy=evaluate(trial).energy;if(energy<current-1e-9){positions=trial;current=energy;accepted=true;break;}}
    if(!accepted)break;
  }
  // Round to the precision that will actually be saved and displayed.
  graph.atoms.forEach((a,i)=>a.xyz.splice(0,3,...positions[i].map(x=>Number(x.toFixed(3)))));
  const after=inspectGeometry(copy),maxMove=Math.max(0,...graph.atoms.map((a,i)=>distance(a.xyz,origin[i])));
  const improved=after.score<=before.score&&after.bondRms<=before.bondRms&&after.clashes<=before.clashes&&after.chirality<=before.chirality&&(!before.eligible||after.eligible)&&maxMove>0;
  return {residues:improved?copy:structuredClone(residues),before,after:improved?after:before,applied:improved,maxDisplacement:improved?maxMove:0,iterations:steps,reason:improved?'bounded-cleanup':'unchanged'};
}

export function rankCandidates(candidates){return candidates.filter(c=>c.quality?.eligible).sort((a,b)=>a.quality.score-b.quality.score||(b.meanPlddt??0)-(a.meanPlddt??0));}
