// Educational component model, NOT atomic coordinates or a predicted native fold.
// Stem pairing comes from the applied dot-bracket structure. The right-handed
// helical arrangement and loop routing illustrate topology; dimensions are arbitrary.
import {layout} from './molecule.js?v=10';
import {dotPairs} from './tertiary-core.js?v=2';

const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k);
const length=a=>Math.hypot(...a),unit=a=>length(a)>1e-8?mul(a,1/length(a)):[1,0,0];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mean=points=>mul(points.reduce(add,[0,0,0]),1/points.length);
const rotate=(v,axis,t)=>add(add(mul(v,Math.cos(t)),mul(cross(axis,v),Math.sin(t))),mul(axis,axis.reduce((s,x,i)=>s+x*v[i],0)*(1-Math.cos(t))));
const distance=(a,b)=>length(sub(a,b));

export function buildSchematic(sequence,structure){
  if(!/^[ACGU]{8,120}$/.test(sequence)||structure?.length!==sequence.length)throw Error('적용한 서열의 2차 구조가 필요합니다.');
  const pairs=dotPairs(structure).sort((a,b)=>a[0]-b[0]),pairKeys=new Set(pairs.map(([a,b])=>`${a}:${b}`));
  const raw=layout(structure).map(p=>[p.x*.18,-p.y*.18,0]),origin=mean(raw),flat=raw.map(p=>sub(p,origin));
  const poses=Array(sequence.length).fill(null),stems=[];
  for(const [i,j] of pairs){
    if(pairKeys.has(`${i-1}:${j+1}`))continue;
    const stem=[];let a=i,b=j;while(pairKeys.has(`${a}:${b}`))stem.push([a++,b--]);stems.push(stem);
    const centers=stem.map(([a,b])=>mul(add(flat[a],flat[b]),.5)),center=mean(centers);
    const radial=unit(sub(flat[i],flat[j]));
    let axis=stem.length>1?unit(sub(centers.at(-1),centers[0])):unit(cross([0,0,1],radial));
    if(stem.length===1&&i+1<j&&axis.reduce((s,x,k)=>s+x*(flat[i+1][k]-flat[i][k]),0)<0)axis=mul(axis,-1);
    stem.forEach(([a,b],k)=>{
      const mid=add(center,mul(axis,(k-(stem.length-1)/2)*3.2)),turn=rotate(radial,axis,k*32.7*Math.PI/180);
      poses[a]={center:add(mid,mul(turn,6)),inward:mul(turn,-1),normal:axis};
      poses[b]={center:sub(mid,mul(turn,6)),inward:turn,normal:mul(axis,-1)};
    });
  }
  if(!pairs.length){
    for(let i=0;i<poses.length;i++)poses[i]={center:[(i-(poses.length-1)/2)*4.8,Math.sin(i*.48)*3,Math.cos(i*.48)*2],inward:[0,1,0],normal:[0,0,1]};
  }else{
    for(let start=0;start<poses.length;){
      if(poses[start]){start++;continue;}let end=start;while(end+1<poses.length&&!poses[end+1])end++;
      const count=end-start+1,left=start>0?poses[start-1].center:null,right=end+1<poses.length?poses[end+1].center:null;
      if(left&&right){
        const guide=mean(flat.slice(start,end+1)),middle=mul(add(left,right),.5),direction=unit(sub(guide,middle));
        const control=add(middle,mul(direction,Math.max(6,count*2.2,distance(left,right)*.6)));
        // Arc-length sampling makes short loops readable even at a rotated stem tip.
        const curve=[];let total=0;for(let s=0;s<=100;s++){const t=s/100,p=add(add(mul(left,(1-t)**2),mul(control,2*t*(1-t))),mul(right,t*t));if(s)total+=distance(p,curve.at(-1).p);curve.push({p,s:total});}
        for(let k=0;k<count;k++){
          const wanted=total*(k+1)/(count+1);let idx=1;while(idx<100&&curve[idx].s<wanted)idx++;
          const before=curve[idx-1],after=curve[idx],fraction=(wanted-before.s)/(after.s-before.s||1),center=add(before.p,mul(sub(after.p,before.p),fraction));
          const inward=unit(sub(middle,center)),tangent=unit(sub(after.p,before.p));
          poses[start+k]={center,inward,normal:unit(cross(tangent,inward))};
        }
      }else{
        const anchor=left||right,step=left?1:-1,reference=left?start-1:end+1;
        const outward=unit(sub(flat[left?start:end],flat[reference]));
        for(let k=0;k<count;k++){const i=left?start+k:end-k;poses[i]={center:add(anchor,mul(outward,(k+1)*4.8)),inward:unit(cross([0,0,1],outward)),normal:[0,0,step]};}
      }
      start=end+1;
    }
  }
  const atoms=[],sugars=[],baseCenters=[],phosphates=[];
  const append=(ri,name,p,part)=>{const index=atoms.length;atoms.push({index,serial:index+1,atom:name,elem:part==='phosphate'?'P':'C',resn:sequence[ri],resi:ri+1,chain:'A',x:p[0],y:p[1],z:p[2],bonds:[],bondOrder:[],properties:{part,schematic:true}});return index;};
  const bond=(a,b)=>{atoms[a].bonds.push(b);atoms[a].bondOrder.push(1);atoms[b].bonds.push(a);atoms[b].bondOrder.push(1);};
  poses.forEach((pose,ri)=>{
    const inward=unit(pose.inward);let side=cross(pose.normal,inward);
    if(length(side)<1e-6)side=cross(Math.abs(inward[2])<.9?[0,0,1]:[0,1,0],inward);side=unit(side);
    const point=(x,y,center=pose.center)=>add(center,add(mul(inward,x),mul(side,y)));
    const sugar=[];for(let k=0;k<5;k++){const t=k*2*Math.PI/5;sugar.push(append(ri,`S${k+1}'`,point(Math.cos(t)*1.05,Math.sin(t)*1.05),'sugar'));}
    for(let k=0;k<5;k++)bond(sugar[k],sugar[(k+1)%5]);sugars.push(sugar);
    const center=point(3.5,0);baseCenters.push(center);const purine='AG'.includes(sequence[ri]),ring=[];
    for(let k=0;k<6;k++){const t=(30+k*60)*Math.PI/180;ring.push(append(ri,`B${k+1}`,point(Math.cos(t)+(purine ? .6 : 0),Math.sin(t),center),'base'));}
    for(let k=0;k<6;k++)bond(ring[k],ring[(k+1)%6]);
    let attachment=ring[3];
    if(purine){const extra=[[-1.15,.8],[-1.7,0],[-1.15,-.8]].map(([x,y],k)=>append(ri,'B'+(k+7),point(x,y,center),'base'));bond(ring[2],extra[0]);bond(extra[0],extra[1]);bond(extra[1],extra[2]);bond(extra[2],ring[3]);attachment=extra[1];}
    bond(sugar[0],attachment);
  });
  poses.forEach((pose,ri)=>{
    const p=ri?add(mul(add(poses[ri-1].center,pose.center),.5),mul(unit(add(poses[ri-1].inward,pose.inward)),-.5)):sub(pose.center,mul(unit(sub(poses[1].center,pose.center)),2.6));
    const index=append(ri,'P',p,'phosphate');phosphates.push(index);
    if(ri)bond(sugars[ri-1][3],index);bond(index,sugars[ri][2]);
  });
  return {format:'rna-lab-schematic-v1',sequence,structure,model:'2차 구조 기반 입체 모형',atoms,poses,baseCenters,pairs,stems:stems.map(s=>s.length),phosphates,savedAt:Date.now()};
}
