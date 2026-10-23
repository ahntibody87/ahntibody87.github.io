// Geometric screening of canonical base-pair candidates, NOT FR3D/DSSR annotation.
export function readRnaPdb(pdb){
  if(typeof pdb!=='string'||pdb.length>2000000)throw Error('구조 파일 크기가 올바르지 않습니다.');
  const residues=new Map();let ended=false;
  for(const line of pdb.split(/\r?\n/)){
    if(line.startsWith('ENDMDL')){ended=true;break;}
    if(!line.startsWith('ATOM  '))continue;
    const base=line.slice(17,20).trim(),chain=line.slice(21,22),number=Number(line.slice(22,26)),insertion=line.slice(26,27).trim();
    if(!/^[ACGU]$/.test(base)||insertion||!Number.isInteger(number))throw Error('표준 A·U·G·C 단일 RNA 가닥만 지원합니다.');
    const key=chain+':'+number,xyz=[30,38,46].map(i=>Number(line.slice(i,i+8)));
    if(xyz.some(x=>!Number.isFinite(x)||Math.abs(x)>10000))throw Error('유효하지 않은 원자 좌표입니다.');
    if(!residues.has(key))residues.set(key,{base,chain,number,atoms:{}});
    const r=residues.get(key);if(r.base!==base)throw Error('염기 번호가 중복되었습니다.');
    const name=line.slice(12,16).trim(),alt=line[16];if(alt===' '||alt==='A')r.atoms[name]=xyz;
  }
  const list=[...residues.values()];
  if(list.length<8||list.length>120||new Set(list.map(r=>r.chain)).size!==1)throw Error('8~120개 염기의 단일 RNA 가닥이 필요합니다.');
  if(list.some((r,i)=>!r.atoms["C1'"]||(i&&r.number!==list[i-1].number+1)))throw Error('빠진 염기 또는 리보스 좌표가 있습니다.');
  return {sequence:list.map(r=>r.base).join(''),residues:list};
}
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>Math.sqrt(dot(a,a)),dist=(a,b)=>norm(sub(a,b));
function plane(r){const [a,b,c]=['N1','C2','C6'].map(k=>r.atoms[k]);if(!a||!b||!c)return null;const u=sub(b,a),v=sub(c,a),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=norm(n);return length>0?{origin:a,normal:n.map(x=>x/length)}:null;}
const contacts={AU:[['N6','O4'],['N1','N3']],GC:[['O6','N4'],['N1','N3'],['N2','O2']],GU:[['O6','N3'],['N1','O2']]};
export function geometricPairs(residues){
  const candidates=[];
  for(let i=0;i<residues.length;i++)for(let j=i+4;j<residues.length;j++){
    let a=residues[i],b=residues[j],key=a.base+b.base;
    if(!contacts[key]){[a,b]=[b,a];key=a.base+b.base;}if(!contacts[key])continue;
    const p=plane(a),q=plane(b);if(!p||!q||Math.abs(dot(p.normal,q.normal))<Math.cos(Math.PI/6))continue;
    if(Math.abs(dot(sub(q.origin,p.origin),p.normal))>1.5||Math.abs(dot(sub(p.origin,q.origin),q.normal))>1.5)continue;
    const distances=contacts[key].map(([x,y])=>a.atoms[x]&&b.atoms[y]?dist(a.atoms[x],b.atoms[y]):Infinity);
    const sugar=dist(a.atoms["C1'"],b.atoms["C1'"]);
    if(distances.every(d=>d>=2.3&&d<=3.8)&&sugar>=8&&sugar<=13)candidates.push({i,j,score:distances.reduce((s,d)=>s+Math.abs(d-2.9),0)/distances.length});
  }
  // One partner per nucleotide; unresolved alternatives are not represented as certainty.
  candidates.sort((a,b)=>a.score-b.score);const occupied=new Set(),pairs=[];
  for(const p of candidates)if(!occupied.has(p.i)&&!occupied.has(p.j)){pairs.push([p.i,p.j]);occupied.add(p.i);occupied.add(p.j);}
  return pairs.sort((a,b)=>a[0]-b[0]);
}
export function dotPairs(structure){const stack=[],pairs=[];for(let i=0;i<structure.length;i++){if(structure[i]==='(')stack.push(i);else if(structure[i]===')'){if(!stack.length)throw Error('잘못된 2차 구조');pairs.push([stack.pop(),i]);}else if(structure[i]!=='.')throw Error('잘못된 2차 구조');}if(stack.length)throw Error('잘못된 2차 구조');return pairs;}
export function comparePairs(two,three){const key=p=>p.join(':'),a=new Set(two.map(key)),b=new Set(three.map(key));return {shared:three.filter(p=>a.has(key(p))),only2d:two.filter(p=>!b.has(key(p))),only3d:three.filter(p=>!a.has(key(p)))};}
export function inspectGeometry(residues){let breaks=0;for(let i=1;i<residues.length;i++){const a=residues[i-1].atoms["O3'"],b=residues[i].atoms.P;if(!a||!b||dist(a,b)<1.2||dist(a,b)>2.3)breaks++;}return {breaks};}
export function validateResult(data,sequence){
  if(!data||data.format!=='rna-lab-3d-v1'||data.sequence!==sequence||typeof data.model!=='string'||data.model.length>120)throw Error('현재 적용한 서열과 같은 RNA 실험실 결과 파일을 선택하세요.');
  const parsed=readRnaPdb(data.pdb);if(parsed.sequence!==sequence)throw Error('파일의 원자 좌표와 염기서열이 일치하지 않습니다.');return {...data,...parsed};
}
