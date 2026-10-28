// RNAbpFlow sampling/reconstruction browser port. GPL-3.0.
// Reconstruction follows OpenFold-derived Apache-2.0 code; see TERTIARY-NOTICE.md.
import {dotPairs} from './tertiary-core.js?v=2';
export const MODEL_VERSION='rnabpflow-casp16-f32-v1';
const mm=(a,b)=>Array.from({length:9},(_,k)=>{const i=Math.floor(k/3),j=k%3;return a[i*3]*b[j]+a[i*3+1]*b[3+j]+a[i*3+2]*b[6+j];});
const mv=(a,v)=>[0,1,2].map(i=>a[i*3]*v[0]+a[i*3+1]*v[1]+a[i*3+2]*v[2]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
function normalized(q){const n=Math.hypot(...q);return q.map(x=>x/n);}
export function quatMatrix(q){const [w,x,y,z]=normalized(q);return [1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y),2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x),2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y)];}
export function matrixQuat(m){
  let q;const trace=m[0]+m[4]+m[8];
  if(trace>0){const s=Math.sqrt(trace+1)*2;q=[s/4,(m[7]-m[5])/s,(m[2]-m[6])/s,(m[3]-m[1])/s];}
  else if(m[0]>m[4]&&m[0]>m[8]){const s=Math.sqrt(1+m[0]-m[4]-m[8])*2;q=[(m[7]-m[5])/s,s/4,(m[1]+m[3])/s,(m[2]+m[6])/s];}
  else if(m[4]>m[8]){const s=Math.sqrt(1+m[4]-m[0]-m[8])*2;q=[(m[2]-m[6])/s,(m[1]+m[3])/s,s/4,(m[5]+m[7])/s];}
  else{const s=Math.sqrt(1+m[8]-m[0]-m[4])*2;q=[(m[3]-m[1])/s,(m[2]+m[6])/s,(m[5]+m[7])/s,s/4];}
  return normalized(q);
}
export function rotateTowards(current,target,fraction){
  let a=matrixQuat(current),b=matrixQuat(target),d=a.reduce((s,x,i)=>s+x*b[i],0);
  if(d<0){b=b.map(x=>-x);d=-d;}
  if(d>.999999)return quatMatrix(a.map((x,i)=>x+(b[i]-x)*fraction));
  const angle=Math.acos(Math.min(1,d)),s=Math.sin(angle),u=Math.sin((1-fraction)*angle)/s,v=Math.sin(fraction*angle)/s;
  return quatMatrix(a.map((x,i)=>u*x+v*b[i]));
}
export function initialState(n,seed=420){
  // Same centered Gaussian / uniform-SO(3) prior as upstream; JS RNG sequence differs.
  let value=seed>>>0;const random=()=>{let t=value+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
  const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(Number.MIN_VALUE,random())))*Math.cos(2*Math.PI*random());
  const trans=Float32Array.from({length:n*3},gaussian),rot=new Float32Array(n*9);
  for(let j=0;j<3;j++){let mean=0;for(let i=0;i<n;i++)mean+=trans[i*3+j];mean/=n;for(let i=0;i<n;i++)trans[i*3+j]=(trans[i*3+j]-mean)*10;}
  for(let i=0;i<n;i++)rot.set(quatMatrix(Array.from({length:4},gaussian)),i*9);
  return {trans,rot};
}
export function features(sequence,structure){
  if(!/^[AUGC]{8,120}$/.test(sequence)||structure?.length!==sequence.length)throw Error('적용된 서열과 2차 구조가 필요합니다.');
  const n=sequence.length,ss=new Float32Array(n*n*3),onehot=new Float32Array(n*4);
  for(const [a,b] of dotPairs(structure))for(let k=0;k<3;k++){ss[(a*n+b)*3+k]=1;ss[(b*n+a)*3+k]=1;}
  for(let i=0;i<n;i++)onehot[i*4+'AUGC'.indexOf(sequence[i])]=1;
  return {ss,onehot};
}
export function advance(state,pred,t,dt){
  const trans=new Float32Array(state.trans.length),rot=new Float32Array(state.rot.length);
  for(let i=0;i<trans.length;i++)trans[i]=state.trans[i]+dt*(pred.pred_trans[i]-state.trans[i])/(1-t);
  for(let i=0;i<rot.length;i+=9)rot.set(rotateTowards(Array.from(state.rot.slice(i,i+9)),Array.from(pred.pred_rot.slice(i,i+9)),10*dt),i);
  return {trans,rot};
}
export function reconstruct(sequence,pred,constants){
  const frames=constants.restype_rigid_group_default_frame,groups=constants.restype_atom23_to_rigid_group,positions=constants.restype_atom23_rigid_group_positions,mask=constants.restype_atom23_mask;
  const residues=[];
  for(let i=0;i<sequence.length;i++){
    const type='AGCU'.indexOf(sequence[i]),local=[];
    for(let g=0;g<10;g++){
      const f=frames[type][g],r=f.slice(0,3).flatMap(row=>row.slice(0,3)),t=f.slice(0,3).map(row=>row[3]);
      const s=g?pred.torsions[(i*9+g-1)*2]:0,c=g?pred.torsions[(i*9+g-1)*2+1]:1;
      local.push({r:mm(r,[1,0,0,0,c,-s,0,s,c]),t});
    }
    const compose=(a,b)=>({r:mm(a.r,b.r),t:add(a.t,mv(a.r,b.t))});
    for(let g=2;g<=5;g++)local[g]=compose(local[g-1],local[g]);local[8]=compose(local[7],local[8]);
    const root={r:Array.from(pred.pred_rot.slice(i*9,i*9+9)),t:Array.from(pred.pred_trans.slice(i*3,i*3+3))},atoms={};
    for(let a=0;a<23;a++)if(mask[type][a]){const frame=compose(root,local[groups[type][a]]);atoms[constants.atomNames[sequence[i]][a]]=add(frame.t,mv(frame.r,positions[type][a]));}
    residues.push({base:sequence[i],chain:'A',number:i+1,atoms,confidence:{}});
  }
  return residues;
}
export function toPdb(residues){
  const lines=['REMARK RNAbpFlow CASP16 browser port; prediction, not experiment.','REMARK B-factor is zero: this model does not provide pLDDT.'];let serial=0;
  for(const r of residues)for(const [name,xyz] of Object.entries(r.atoms)){
    if(xyz.some(x=>!Number.isFinite(x)||Math.abs(x)>=1000))throw Error('유효한 원자 좌표를 얻지 못했습니다.');
    lines.push(`ATOM  ${String(++serial).padStart(5)} ${name.padStart(4)} ${r.base.padStart(3)} A${String(r.number).padStart(4)}    ${xyz.map(x=>x.toFixed(3).padStart(8)).join('')}  1.00  0.00          ${name[0].padStart(2)}  `);
  }
  return lines.concat('TER','END').join('\n')+'\n';
}
