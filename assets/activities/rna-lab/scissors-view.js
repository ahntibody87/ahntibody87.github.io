import {MoleculeView,layout} from './molecule.js?v=7';
import {TARGET,CUT_AFTER,LEFT,RIGHT,topology} from './scissors-model.js?v=7';
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;};
export const center=(p,ids)=>ids.reduce((c,i)=>({x:c.x+p[i].x/ids.length,y:c.y+p[i].y/ids.length}),{x:0,y:0});
export function scene(sequence,structure,phase='design'){
 const n=sequence.length,points=layout(structure),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 const cx=(Math.min(...xs)+Math.max(...xs))/2,minY=Math.min(...ys),scale=Math.min(1,780/(Math.max(...xs)-Math.min(...xs)||1));
 let geometry=points.map(p=>({x:425+(p.x-cx)*scale,y:(p.y-minY)*scale+(phase==='design'?380:250),angle:p.angle}));
 const motifs=topology(structure),joined=[...structure+'.'.repeat(TARGET.length)];
 const bound=['bound','docking'].includes(phase);
 if(['bound','docking','cut'].includes(phase)){
  for(let i=0;i<4;i++){geometry[i]={x:RIGHT[3-i]*50,y:146,angle:-Math.PI/2};geometry[n-4+i]={x:LEFT[3-i]*50,y:146,angle:-Math.PI/2};}
 }
 if(['docking','cut'].includes(phase)&&motifs.loops.length===2){
  const a=center(geometry,motifs.loops[0]),b=center(geometry,motifs.loops[1]);
  const split=motifs.stems[2][0][0];
  geometry=geometry.map((p,i)=>{if(i<4||i>=n-4)return p;const c=i<split?a:b;return {...p,x:p.x-c.x+(i<split?370:480),y:p.y-c.y+345};});
 }
 for(let i=0;i<TARGET.length;i++)geometry.push({x:i*50+(phase==='cut'?(i<=CUT_AFTER?-90:90):0),y:phase==='cut'?-140:0,angle:Math.PI/2});
 if(bound)for(let i=0;i<4;i++){joined[i]='(';joined[n+RIGHT[3-i]]=')';joined[n-4+i]='(';joined[n+LEFT[3-i]]=')';}
 return {sequence:sequence+TARGET,structure:joined.join(''),geometry,breaks:[n-1,...(phase==='cut'?[n+CUT_AFTER]:[])],highlighted:Array.from({length:TARGET.length},(_,i)=>n+i),cleavageAfter:phase==='cut'?null:n+CUT_AFTER,motifs};
}
export class ScissorsView extends MoleculeView{
 constructor(svg,onSelect){super(svg,onSelect);this.annotations=el('g',{'aria-hidden':'true',class:'scissors-annotations'});svg.append(this.annotations);}
 display(sequence,structure,phase,selected){
  this.designLength=sequence.length;this.phase=phase;this.motifs=topology(structure);const state=scene(sequence,structure,phase);
  this.show({...state,locked:state.highlighted,selected});this.endLayer.setAttribute('display','none');
 }
 draw(){
  super.draw();if(!this.annotations||!this.points.length)return;this.annotations.replaceChildren();
  const n=this.designLength,{stems=[],loops=[]}=this.motifs||{};
  stems.forEach((pairs,i)=>{if(!pairs.flat().every(j=>this.points[j]))return;const c=center(this.points,pairs.flat());this.annotations.append(el('text',{x:c.x,y:c.y-16},`S${i+1} · ${pairs.length}쌍`));});
  loops.forEach((ids,i)=>{if(!ids.every(j=>this.points[j]))return;const c=center(this.points,ids);this.annotations.append(el('ellipse',{cx:c.x,cy:c.y,rx:66,ry:26,class:'internal-loop'}),el('text',{x:c.x,y:c.y-35,class:'loop-label'},`내부 고리 ${i?'B':'A'}`));});
  if(this.points[n]){
   this.nodes.slice(n).forEach((node,i)=>{node.number.textContent=(i+1)%5===0?String(i+1):'';node.g.setAttribute('aria-label',`표적 ${i+1}번 ${TARGET[i]} · 고정`);});
   this.cutLabel.textContent=`표적 절단 ${CUT_AFTER+1} | ${CUT_AFTER+2}`;
   for(const [i,label]of [[0,'가위 5′'],[n-1,'가위 3′'],[n,'표적 5′'],[this.points.length-1,'표적 3′']]){const p=this.points[i];this.annotations.append(el('text',{x:p.x,y:p.y-30},label));}
   for(const [ids,label]of [[LEFT,'왼쪽 4개'],[RIGHT,'오른쪽 4개']]){const c=center(this.points,ids.map(i=>n+i));this.annotations.append(el('text',{x:c.x,y:c.y-55,class:'loop-label'},label));}
  }
  if(this.phase==='docking')this.annotations.append(el('text',{x:425,y:405,class:'reaction-label'},'두 내부 고리가 만나는 반응 부위'));
 }
}
