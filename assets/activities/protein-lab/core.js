export const THREE_TO_ONE={ALA:'A',ARG:'R',ASN:'N',ASP:'D',CYS:'C',GLN:'Q',GLU:'E',GLY:'G',HIS:'H',ILE:'I',LEU:'L',LYS:'K',MET:'M',PHE:'F',PRO:'P',SER:'S',THR:'T',TRP:'W',TYR:'Y',VAL:'V',MSE:'M'};

export function cleanSequence(raw){
  const lines=raw.trim().split(/\r?\n/),headers=lines.filter(l=>l.trim().startsWith('>'));
  if(headers.length>1)throw Error('한 번에 한 단백질의 서열만 입력하세요.');
  const seq=lines.filter(l=>!l.trim().startsWith('>')).join('').replace(/\s/g,'').toUpperCase();
  if(!seq)throw Error('아미노산 서열을 입력하세요.');
  const invalid=[...new Set(seq.replace(/[ACDEFGHIKLMNPQRSTVWY]/g,''))];
  if(invalid.length)throw Error(`사용할 수 없는 문자: ${invalid.join(', ')}. 20종 아미노산의 1레터 코드를 사용하세요.`);
  if(seq.length<10||seq.length>256)throw Error(`현재 ${seq.length}개입니다. 브라우저 예측에는 10~256개를 입력하세요.`);
  return seq;
}

export function mutationPositions(raw,length){
  if(!raw.trim())throw Error('바꿀 위치를 입력하세요. 예: 12, 20-24');
  const result=new Set();
  for(const part of raw.split(',')){
    const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if(!m)throw Error('위치는 12, 20-24처럼 입력하세요.');
    const start=Number(m[1]),end=Number(m[2]??m[1]);
    if(start<1||end>length||start>end)throw Error(`위치는 1~${length} 사이로 입력하세요.`);
    for(let n=start;n<=end;n++)result.add(n);
  }
  return [...result].sort((a,b)=>a-b);
}

export function parsePdb(text){
  if(text.length>8_000_000)throw Error('8 MB 이하의 PDB 파일을 사용하세요.');
  const chains=new Map(),seen=new Set();let started=false;
  for(const line of text.split(/\r?\n/)){
    if(line.startsWith('ENDMDL')&&started)break;
    if(!line.startsWith('ATOM  ')&&!line.startsWith('HETATM'))continue;
    started=true;
    if(line.slice(12,16).trim()!=='CA')continue;
    const alt=line[16];if(alt&&alt!==' '&&alt!=='A')continue;
    const res=line.slice(17,20).trim(),one=THREE_TO_ONE[res];if(!one)continue;
    const chain=line[21]||' ',resid=line.slice(22,27).trim(),key=chain+':'+resid;
    if(seen.has(key))continue;seen.add(key);
    const fields=[line.slice(30,38),line.slice(38,46),line.slice(46,54)];
    if(fields.some(x=>!x.trim()))throw Error('PDB에 좌표가 빠진 원자가 있습니다.');
    const point=fields.map(Number);
    if(point.some(x=>!Number.isFinite(x)||Math.abs(x)>100000))throw Error('PDB의 좌표가 올바르지 않습니다.');
    const entry={one,res,resid,chain,point,b:Number(line.slice(60,66))};
    if(!chains.has(chain))chains.set(chain,[]);chains.get(chain).push(entry);
  }
  if(!chains.size)throw Error('아미노산의 Cα 좌표가 있는 PDB 파일을 선택하세요.');
  if([...chains.values()].some(c=>c.length>2500))throw Error('비교할 사슬은 2,500개 잔기 이하로 선택하세요.');
  return {chains};
}

// Horn quaternion solution for fixed-correspondence least-squares rigid fitting.
export function fitPoints(reference,moving,indices=null,weights=null){
  const ids=indices??reference.map((_,i)=>i);
  if(ids.length<3)throw Error('비교하려면 대응하는 잔기가 3개 이상 필요합니다.');
  const ac=[0,0,0],bc=[0,0,0],total=weights?ids.reduce((s,i)=>s+weights[i],0):ids.length;
  for(const i of ids)for(let k=0;k<3;k++){const w=(weights?.[i]??1)/total;ac[k]+=reference[i][k]*w;bc[k]+=moving[i][k]*w;}
  const s=Array(9).fill(0);
  for(const i of ids)for(let a=0;a<3;a++)for(let b=0;b<3;b++)s[a*3+b]+=(weights?.[i]??1)*(moving[i][a]-bc[a])*(reference[i][b]-ac[b]);
  const [xx,xy,xz,yx,yy,yz,zx,zy,zz]=s;
  const n=[[xx+yy+zz,yz-zy,zx-xz,xy-yx],[yz-zy,xx-yy-zz,xy+yx,zx+xz],[zx-xz,xy+yx,-xx+yy-zz,yz+zy],[xy-yx,zx+xz,yz+zy,-xx-yy+zz]];
  const v=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>+(i===j)));
  for(let it=0;it<80;it++){
    let p=0,q=1;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(Math.abs(n[i][j])>Math.abs(n[p][q])){p=i;q=j;}
    if(Math.abs(n[p][q])<1e-12)break;
    const angle=.5*Math.atan2(2*n[p][q],n[q][q]-n[p][p]),c=Math.cos(angle),sn=Math.sin(angle);
    const pp=n[p][p],qq=n[q][q],pq=n[p][q];
    n[p][p]=c*c*pp-2*sn*c*pq+sn*sn*qq;n[q][q]=sn*sn*pp+2*sn*c*pq+c*c*qq;n[p][q]=n[q][p]=0;
    for(let k=0;k<4;k++)if(k!==p&&k!==q){const kp=n[k][p],kq=n[k][q];n[k][p]=n[p][k]=c*kp-sn*kq;n[k][q]=n[q][k]=sn*kp+c*kq;}
    for(let k=0;k<4;k++){const kp=v[k][p],kq=v[k][q];v[k][p]=c*kp-sn*kq;v[k][q]=sn*kp+c*kq;}
  }
  let best=0;for(let i=1;i<4;i++)if(n[i][i]>n[best][best])best=i;
  let [w,x,y,z]=v.map(row=>row[best]);
  const rot=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]];
  const transform=p=>rot.map((row,k)=>row.reduce((sum,r,j)=>sum+r*(p[j]-bc[j]),ac[k]));
  const aligned=moving.map(transform),distances=reference.map((p,i)=>Math.hypot(...p.map((val,k)=>val-aligned[i][k])));
  const rmsd=Math.sqrt(ids.reduce((s,i)=>s+distances[i]**2,0)/ids.length);
  return {aligned,distances,rmsd,transform};
}

export function compareResidues(a,b){
  if(a.length!==b.length)throw Error('현재 비교는 길이가 같은 야생형·치환 변이용입니다. 두 사슬의 잔기 수를 맞춰 주세요.');
  const fit=fitPoints(a.map(r=>r.point),b.map(r=>r.point));
  const changes=a.map((r,i)=>r.one!==b[i].one?i+1:null).filter(Boolean);
  const tm=positionTmScore(a.map(r=>r.point),b.map(r=>r.point),fit);
  return {...fit,changes,tmScore:tm.score,tmD0:tm.d0,length:a.length};
}

// Fixed residue correspondence. Multiple fragment starts + iteratively reweighted
// rigid fitting maximize the TM objective heuristically; no structural realignment.
export function positionTmScore(reference,moving,initial=null){
  const length=reference.length;
  const d0=length<=21?.5:Math.max(.5,1.24*Math.cbrt(length-15)-1.8);
  const score=fit=>fit.distances.reduce((s,d)=>s+1/(1+(d/d0)**2),0)/length;
  let best=initial??fitPoints(reference,moving),bestScore=score(best);
  const starts=[best];
  for(const size of new Set([4,Math.max(4,Math.floor(length/4)),Math.max(4,Math.floor(length/2))])){
    if(size>=length)continue;
    const step=Math.max(1,Math.floor((length-size)/6));
    for(let from=0;from<=length-size;from+=step)starts.push(fitPoints(reference,moving,Array.from({length:size},(_,i)=>i+from)));
  }
  for(let fit of starts){
    let previous=score(fit);
    if(previous>bestScore){best=fit;bestScore=previous;}
    for(let iteration=0;iteration<30;iteration++){
      const weights=fit.distances.map(d=>1/(1+(d/d0)**2)**2);
      const next=fitPoints(reference,moving,null,weights),value=score(next);
      if(value>bestScore){best=next;bestScore=value;}
      if(value-previous<1e-9)break;
      fit=next;previous=value;
    }
  }
  return {score:Math.max(0,Math.min(1,bestScore)),d0};
}

export function transformPdb(text,transform,chain){
  let first=true;
  return text.split(/\r?\n/).filter(line=>{
    if(line.startsWith('ENDMDL')){first=false;return false;}
    if(!first)return false;
    return !/^(ATOM  |HETATM)/.test(line)||line[21]===chain;
  }).map(line=>{
    if(!/^(ATOM  |HETATM)/.test(line))return line;
    const p=[Number(line.slice(30,38)),Number(line.slice(38,46)),Number(line.slice(46,54))];
    return line.slice(0,30)+transform(p).map(v=>v.toFixed(3).padStart(8)).join('')+line.slice(54);
  }).join('\n');
}
