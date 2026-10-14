import {MoleculeView,layout,partners} from './molecule.js?v=6';
import {TARGET_LENGTH,CUT_AFTER,LOOP_A,LOOP_B} from './scissors-model.js?v=6';
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e;};
export const center=(points,indices)=>indices.reduce((p,i)=>({x:p.x+points[i].x/indices.length,y:p.y+points[i].y/indices.length}),{x:0,y:0});
export function dockGeometry(structure,map){
  const points=layout(structure),a=LOOP_A.map(i=>map.get(i)),b=LOOP_B.map(i=>map.get(i));
  const ca=center(points,a),cb=center(points,b),split=map.get(24);
  return points.map((p,i)=>{
    // Rotate the two domains toward one another; animation is conceptual.
    const c=i<split?ca:cb,angle=i<split?-Math.PI/2:Math.PI/2;
    const x=p.x-c.x,y=p.y-c.y;
    return {x:x*Math.cos(angle)-y*Math.sin(angle)+(i<split?-90:90),y:x*Math.sin(angle)+y*Math.cos(angle),angle:p.angle+angle};
  });
}
export function cleavedStructure(structure){
  const s=[...structure],mates=partners(structure);
  for(let i=0;i<TARGET_LENGTH;i++){s[i]='.';if(mates[i]>=0)s[mates[i]]='.';}
  return s.join('');
}
export function cleaveGeometry(points){
  return points.map((p,i)=>i>=TARGET_LENGTH?{...p}:{...p,x:(i<=CUT_AFTER?-330:170)+(i%(CUT_AFTER+1))*65,y:-230,angle:-Math.PI/2});
}
export class ScissorsView extends MoleculeView{
  constructor(svg,onSelect){
    super(svg,onSelect);this.annotations=el('g',{'aria-hidden':'true',class:'scissors-annotations'});svg.append(this.annotations);
  }
  annotate({stems=[],loops=[],phase='design'}={}){this.motifs={stems,loops,phase};this.draw();}
  draw(){
    super.draw();if(!this.annotations||!this.points.length)return;
    this.annotations.replaceChildren();const {stems=[],loops=[],phase='design'}=this.motifs||{};
    stems.forEach((pairs,i)=>{if(!pairs.length)return;const c=center(this.points,pairs.flat());this.annotations.append(el('text',{x:c.x,y:c.y-15,class:'stem-label'},`S${i+1}`));});
    loops.forEach((indices,i)=>{if(!indices.length)return;const c=center(this.points,indices);this.annotations.append(el('ellipse',{cx:c.x,cy:c.y,rx:92,ry:34,class:'internal-loop'}),el('text',{x:c.x,y:c.y-44,class:'loop-label'},`내부 고리 ${i===0?'A':'B'}`));});
    if(phase==='docking')this.annotations.append(el('text',{x:0,y:90,class:'reaction-label'},'두 내부 고리가 만나는 반응 부위'));
    if(phase==='cut')this.annotations.append(el('text',{x:-210,y:-290,class:'reaction-label'},'앞 조각 · 5′ → 3′'),el('text',{x:270,y:-290,class:'reaction-label'},'뒤 조각 · 5′ → 3′'));
  }
}
