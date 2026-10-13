import assert from 'node:assert/strict';
import {MoleculeView,BASES,pairInfo,partners,layout,alignGeometry,interpolatePoint} from '../assets/activities/rna-lab/molecule.js';

// Exercise the real renderer with a deterministic animation clock and a small
// SVG DOM double; no private mission solutions are included here.
class SvgNode {
  constructor(tag){this.tagName=tag;this.attrs={};this.children=[];this.dataset={};this.style={setProperty(){}};this.classList={toggle(){}};}
  setAttribute(k,v){this.attrs[k]=String(v);}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  addEventListener(){}
  remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
  get lastElementChild(){return this.children.at(-1);}
}
let clock=0,nextId=0;const frames=new Map();
globalThis.document={createElementNS:(_ns,tag)=>new SvgNode(tag)};
globalThis.matchMedia=()=>({matches:false});
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
globalThis.requestAnimationFrame=callback=>{const id=++nextId;frames.set(id,callback);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function advance(milliseconds){clock+=milliseconds;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(clock));}
function framePoints(view){return view.points.map(p=>({...p}));}

for(const [a,b,count,wobble]of [['A','U',2,false],['G','C',3,false],['G','U',2,true]]){
  assert.equal(pairInfo(a,b).count,count);assert.equal(pairInfo(b,a).count,count);assert.equal(pairInfo(a,b).wobble,wobble);
}
assert.equal(pairInfo('A','C'),null);
assert.equal(BASES.A.rings,2);assert.equal(BASES.G.rings,2);assert.equal(BASES.C.rings,1);assert.equal(BASES.U.rings,1);
assert.throws(()=>partners('(()'));assert.throws(()=>partners('x'));
for(const structure of ['((((....))))','.(((....))).','....', '.'.repeat(120),'(((((....)))))....(((((....)))))','((..((...))..))']){
  const points=layout(structure);assert.equal(points.length,structure.length);
  assert.ok(points.every(p=>Object.values(p).every(Number.isFinite)));
  const pair=partners(structure);pair.forEach((j,i)=>{if(j>=0)assert.equal(pair[j],i);});
}
const source=[{x:0,y:0,angle:0},{x:5,y:0,angle:0},{x:0,y:4,angle:0}];
const rotated=source.map(p=>({x:-p.y+30,y:p.x+20,angle:p.angle+Math.PI/2}));
const aligned=alignGeometry(source,rotated);
assert.ok(aligned.every((p,i)=>Math.hypot(p.x-rotated[i].x,p.y-rotated[i].y)<1e-9));
const shortTurn=interpolatePoint({x:0,y:0,angle:Math.PI-.1},{x:10,y:4,angle:-Math.PI+.1},.5);
assert.equal(shortTurn.x,5);assert.ok(Math.abs(shortTurn.angle-Math.PI)<1e-9);

const svg=new SvgNode('svg'),view=new MoleculeView(svg,()=>{});
const first={sequence:'GGGGAAAACCCC',structure:'((((....))))',selected:0};
view.show(first);
assert.equal(svg.dataset.animating,'false');assert.equal(view.links.length,11);assert.equal(view.edges.size,4);
assert.equal(view.edges.get('0-11').g.children.length,3);
const identities=[...view.nodes];const before=framePoints(view);
view.updateSequence('AGGGAAAACCCC');
assert.equal(view.nodes[0].label.textContent,'A');assert.deepEqual(view.points,before);
view.show({sequence:'AGGGAAAACCCC',structure:'.(((....))).',selected:0});
assert.equal(svg.dataset.animating,'true');assert.deepEqual(view.points,before);
assert.ok(view.nodes.every((node,i)=>node===identities[i]));
advance(380);
const mid=framePoints(view);assert.notDeepEqual(mid,before);assert.equal(svg.dataset.animating,'true');
assert.ok(view.edges.get('0-11').opacity>0&&view.edges.get('0-11').opacity<1);
// A second edit must begin at the current interpolated positions.
view.updateSequence('UGGGAAAACCCC');
view.show({sequence:'UGGGAAAACCCC',structure:'..((....))..',selected:0});
assert.deepEqual(view.points,mid);assert.ok(view.nodes.every((node,i)=>node===identities[i]));
advance(800);
assert.equal(svg.dataset.animating,'false');assert.equal(view.edges.size,2);
assert.ok([...view.edges.values()].every(e=>e.opacity===1));
const settled=framePoints(view);view.selection(4,[],[]);assert.deepEqual(view.points,settled);assert.equal(frames.size,0);
// Same structure: base identities change without another movement.
view.show({sequence:'AGGGAAAACCCC',structure:'..((....))..',selected:0});
assert.equal(svg.dataset.animating,'false');assert.deepEqual(view.points,settled);
view.reduced={matches:true};view.show(first);assert.equal(svg.dataset.animating,'false');assert.equal(frames.size,0);
const scaffold='NNNNNGUCNNNNNNNNNNNNNCUGANGAGNNNNNNNNNNNNNNCGAAACNNNNN';
view.show({sequence:scaffold,structure:'.((((((.(((((...))))).......((((........))))...)))))).',selected:0,cleavageAfter:7});
assert.equal(view.nodes.filter(node=>node.label.textContent==='?').length,38);
assert.equal(view.links.length,53);assert.equal(view.edges.size,15);assert.equal(view.cutLayer.attrs.display,'');
assert.ok(view.points.every(p=>Object.values(p).every(Number.isFinite)));
view.show(first);assert.equal(view.cutLayer.attrs.display,'none');assert.equal(view.nodes.length,12);
console.log('RNA 분자 표시 검사 통과: 결합·계열, 유효 좌표, 연속 이동, 빠른 재수정, 노드 유지, 감소된 움직임');
