// Display geometry and transitions only. Thermodynamic prediction remains in fold-worker.js.
const NS='http://www.w3.org/2000/svg';
let viewId=0;
export const BASES={
  A:{name:'아데닌',family:'퓨린',rings:2,color:'#ba955a'},
  U:{name:'유라실',family:'피리미딘',rings:1,color:'#aa7974'},
  G:{name:'구아닌',family:'퓨린',rings:2,color:'#66889f'},
  C:{name:'사이토신',family:'피리미딘',rings:1,color:'#70917c'},
  N:{name:'아직 정하지 않은 염기',family:'설계할 자리',rings:0,color:'#8a969c'}
};
export function pairInfo(a,b){
  const key=[a,b].sort().join('');
  if(key==='AU')return {name:'A–U',count:2,wobble:false};
  if(key==='CG')return {name:'G–C',count:3,wobble:false};
  if(key==='GU')return {name:'G–U',count:2,wobble:true};
  return null;
}
export function partners(structure){
  const pairs=Array(structure.length).fill(-1),stack=[];
  for(let i=0;i<structure.length;i++){
    if(structure[i]==='(')stack.push(i);
    else if(structure[i]===')'){
      const j=stack.pop();if(j===undefined)throw new Error('잘못된 구조 표기');
      pairs[i]=j;pairs[j]=i;
    }else if(structure[i]!=='.')throw new Error('잘못된 구조 표기');
  }
  if(stack.length)throw new Error('잘못된 구조 표기');
  return pairs;
}
export function layout(structure){
  const pair=partners(structure),points=Array(structure.length);
  const gap=146,rise=38,step=44;
  if(!structure.includes('(')){
    const radius=Math.max(75,(structure.length-1)*step/(Math.PI*1.45));
    return [...structure].map((_,i)=>{
      const angle=-Math.PI*.225-i*Math.PI*1.55/Math.max(1,structure.length-1);
      return {x:radius*Math.cos(angle),y:-radius*Math.sin(angle),angle:-angle};
    });
  }
  function stem(i,j,x,y,angle){
    const dx=Math.cos(angle),dy=Math.sin(angle),px=-dy,py=dx;
    let k=0;
    while(i+k<j-k&&pair[i+k]===j-k){
      points[i+k]={x:x+dx*rise*k-px*gap/2,y:y+dy*rise*k-py*gap/2,angle:angle+Math.PI/2};
      points[j-k]={x:x+dx*rise*k+px*gap/2,y:y+dy*rise*k+py*gap/2,angle:angle-Math.PI/2};k++;
    }
    const left=i+k-1,right=j-k+1,tokens=[];
    for(let n=left+1;n<right;n++){
      if(pair[n]>n){tokens.push({index:n,child:pair[n]},{index:pair[n]});n=pair[n];}
      else tokens.push({index:n});
    }
    // The closing pair has a larger span than a backbone step. Keep loop
    // backbone spacing approximately uniform instead of stretching every edge.
    let low=gap/2+.1,high=Math.max(gap,(tokens.length+1)*step);
    for(let t=0;t<35;t++){
      const r=(low+high)/2,arc=r*(Math.PI*2-2*Math.asin(gap/(2*r)));
      if(arc<(tokens.length+1)*step)low=r;else high=r;
    }
    const radius=(low+high)/2,half=Math.asin(gap/(2*radius));
    const offset=Math.sqrt(radius*radius-gap*gap/4);
    const cx=x+dx*(rise*(k-1)+offset),cy=y+dy*(rise*(k-1)+offset);
    const first=angle-Math.PI+half,arc=Math.PI*2-half*2;
    tokens.forEach((token,t)=>{
      const a=first+(t+1)*arc/(tokens.length+1);
      points[token.index]={x:cx+radius*Math.cos(a),y:cy+radius*Math.sin(a),angle:a};
    });
    for(const token of tokens)if(token.child){
      const a=points[token.index],b=points[token.child],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      stem(token.index,token.child,mx,my,Math.atan2(my-cy,mx-cx));
    }
  }
  let cursor=0;
  for(let i=0;i<structure.length;i++){
    if(pair[i]>i){
      const j=pair[i];stem(i,j,0,0,-Math.PI/2);
      const group=points.slice(i,j+1),min=Math.min(...group.map(p=>p.x)),max=Math.max(...group.map(p=>p.x));
      group.forEach(p=>p.x+=cursor-min+20);cursor+=max-min+step;i=j;
    }else{points[i]={x:cursor,y:0,angle:-Math.PI/2};cursor+=step;}
  }
  return points;
}
export function alignGeometry(next,previous){
  if(!previous||next.length!==previous.length)return next.map(p=>({...p}));
  const center=list=>list.reduce((c,p)=>({x:c.x+p.x/list.length,y:c.y+p.y/list.length}),{x:0,y:0});
  const a=center(next),b=center(previous);let dot=0,cross=0;
  next.forEach((p,i)=>{const x=p.x-a.x,y=p.y-a.y,u=previous[i].x-b.x,v=previous[i].y-b.y;dot+=x*u+y*v;cross+=x*v-y*u;});
  const angle=Math.atan2(cross,dot),c=Math.cos(angle),s=Math.sin(angle);
  return next.map(p=>({x:(p.x-a.x)*c-(p.y-a.y)*s+b.x,y:(p.x-a.x)*s+(p.y-a.y)*c+b.y,angle:p.angle+angle}));
}
export function interpolatePoint(a,b,t){
  const delta=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle));
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+delta*t};
}
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2;
function element(tag,attrs={},text){
  const e=document.createElementNS(NS,tag);
  for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));
  if(text!==undefined)e.textContent=text;return e;
}
function box(points,padding=62){
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs)-padding,y=Math.min(...ys)-padding;
  const width=Math.max(260,Math.max(...xs)-x+padding),height=Math.max(250,Math.max(...ys)-y+padding);
  return {x,y,width,height};
}
const hex='-7,-7 5,-14 17,-7 17,7 5,14 -7,7';
const pent='-7,-7 -18,-11 -25,0 -18,11 -7,7';
const pyr='-13,-7 0,-14 13,-7 13,7 0,14 -13,7';

export class MoleculeView{
  constructor(svg,onSelect){
    this.svg=svg;this.onSelect=onSelect;this.nodes=[];this.links=[];this.edges=new Map();this.points=[];this.frame=0;this.camera=null;this.selected=0;this.zoom=1;
    this.reduced=matchMedia('(prefers-reduced-motion:reduce)');
    this.directionId=`rna-direction-${++viewId}`;
    const defs=element('defs');
    const marker=element('marker',{id:this.directionId,viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:4,markerHeight:4,orient:'auto'});
    marker.append(element('path',{d:'M 1 1 L 9 5 L 1 9 Z',fill:'#667b85'}));defs.append(marker);
    this.backbone=element('g',{'aria-hidden':true,class:'molecular-backbone'});
    this.pairLayer=element('g',{'aria-hidden':true,class:'molecular-pairs'});
    this.nodeLayer=element('g',{class:'molecular-nodes'});
    this.endLayer=element('g',{'aria-hidden':true});
    this.cutLayer=element('g',{'aria-hidden':true,class:'cleavage-marker',display:'none'});
    this.cutLabel=element('text',{},'절단 8 | 9');this.cutLayer.append(this.cutLabel);
    svg.replaceChildren(defs,this.backbone,this.pairLayer,this.nodeLayer,this.endLayer,this.cutLayer);
  }
  ensureNodes(count){
    if(this.nodes.length===count)return;
    cancelAnimationFrame(this.frame);this.points=[];this.edges.clear();this.camera=null;
    this.backbone.replaceChildren();this.pairLayer.replaceChildren();this.nodeLayer.replaceChildren();this.endLayer.replaceChildren();this.nodes=[];this.links=[];
    for(let i=0;i<count;i++){
      if(i){
        const g=element('g'),a=element('line',{class:'covalent'}),b=element('line',{class:'covalent'}),p=element('circle',{r:3.8,class:'phosphate'});
        g.append(a,b,p);this.backbone.append(g);this.links.push({g,a,b,p});
      }
      const g=element('g',{class:'base-node nucleotide','data-index':i,role:'button',tabindex:'-1'});
      const hit=element('circle',{r:25,class:'hit-area'}),halo=element('ellipse',{rx:21,ry:18,class:'selection-halo'});
      const ribose=element('polygon',{points:'-5,-5 3,-6 7,1 1,7 -6,3',class:'ribose'});
      const chemistry=element('g',{class:'base-chemistry'}),glyco=element('line',{x1:7,y1:0,x2:17,y2:0,class:'glycosidic'});
      const ring1=element('polygon',{class:'base-ring'}),ring2=element('polygon',{points:pent,class:'base-ring'});
      // Purines attach via the five-membered ring; the fused hexagon is distal.
      const rings=element('g',{transform:'translate(42,0)'});rings.append(ring1,ring2);chemistry.append(glyco,rings);
      const label=element('text',{class:'base-label'}),number=element('text',{class:'base-number'}),lock=element('path',{d:'M -3 -2 V -5 A 3 3 0 0 1 3 -5 V -2 M -4 -2 H 4 V 4 H -4 Z',class:'lock-mark'});
      g.append(hit,halo,ribose,chemistry,label,number,lock);
      g.addEventListener('click',()=>this.onSelect(i));
      g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();this.onSelect(i);}});
      this.nodeLayer.append(g);this.nodes.push({g,hit,halo,ribose,chemistry,ring1,ring2,rings,label,number,lock});
    }
    this.firstLabel=element('text',{class:'end-label'},'5′');this.lastLabel=element('text',{class:'end-label'},'3′');
    this.endLayer.append(this.firstLabel,this.lastLabel);
  }
  updateSequence(sequence){
    if(this.nodes.length!==sequence.length)return;
    this.sequence=sequence;this.paintBases();this.draw();
  }
  paintBases(){
    this.nodes.forEach((node,i)=>{
      const base=this.sequence[i],info=BASES[base];
      node.g.dataset.nucleotideBase=base;node.g.style.setProperty('--base-color',info.color);
      node.g.classList.toggle('unassigned',base==='N');
      node.ring1.setAttribute('points',info.rings===2?hex:pyr);node.ring2.hidden=info.rings!==2;
      node.ring2.setAttribute('display',info.rings===2?'':'none');
      node.rings.setAttribute('transform',`translate(${info.rings===2?42:31},0)`);
      node.rings.setAttribute('display',base==='N'?'none':'');
      node.label.textContent=base==='N'?'?':base;node.number.textContent=(i+1)%5===0?String(i+1):'';
    });
  }
  selection(selected,locked=[],mismatches=[]){
    this.selected=selected;this.locked=locked;this.mismatches=mismatches;
    const mate=this.pair?.[selected]??-1;
    this.nodes.forEach((node,i)=>{
      const isLocked=locked.includes(i),partner=this.pair?.[i]??-1;
      node.g.classList.toggle('selected',i===selected);node.g.classList.toggle('paired-selection',i===mate);
      node.g.classList.toggle('locked',isLocked);node.g.classList.toggle('mismatch',mismatches.includes(i));
      node.g.setAttribute('tabindex',i===selected?'0':'-1');
      node.g.setAttribute('aria-label',`${i+1}번 ${this.sequence[i]}${isLocked?' 고정 염기':''}${partner>=0?`, ${partner+1}번과 결합`: ', 결합하지 않음'}`);
      node.lock.setAttribute('display',isLocked?'':'none');
    });
    this.draw();
  }
  show({sequence,structure,selected,locked=[],mismatches=[],cleavageAfter=null,geometry=null,breaks=[],virtualAfter=null,highlighted=[]}){
    this.cleavageAfter=cleavageAfter;
    this.breaks=breaks;this.virtualAfter=virtualAfter;this.highlighted=highlighted;
    this.cutLabel.textContent=cleavageAfter===null?'':`절단 ${cleavageAfter+1} | ${cleavageAfter+2}`;
    this.cutLayer.setAttribute('display',cleavageAfter===null?'none':'');
    const unchanged=this.structure===structure&&this.nodes.length===sequence.length;
    this.ensureNodes(sequence.length);this.sequence=sequence;this.pair=partners(structure);this.structure=structure;
    this.paintBases();this.selection(selected,locked,mismatches);
    if(unchanged&&this.points.length&&!geometry)return;
    cancelAnimationFrame(this.frame);
    const next=geometry||alignGeometry(layout(structure),this.points.length?this.points:null);
    const from=this.points.length?this.points.map(p=>({...p})):next;
    const targetBox=this.zoom>1&&this.camera?{...this.camera}:box(next,this.framePadding);
    const fromBox=this.camera?{...this.camera}:targetBox;
    const wanted=new Set();
    this.pair.forEach((j,i)=>{
      if(j<=i)return;const key=`${i}-${j}`;wanted.add(key);
      if(!this.edges.has(key)){
        const g=element('g',{class:'hydrogen-bonds','data-pair':key});
        this.pairLayer.append(g);this.edges.set(key,{g,i,j,opacity:0,from:0,to:1});
      }
    });
    for(const [key,edge]of this.edges){edge.from=edge.opacity;edge.to=wanted.has(key)?1:0;}
    const immediate=!this.points.length||this.reduced.matches;
    const start=performance.now(),duration=760;
    this.svg.dataset.animating=String(!immediate);this.svg.dataset.structure=structure;
    const tick=now=>{
      const progress=immediate?1:Math.min(1,(now-start)/duration),t=ease(progress);
      this.points=from.map((p,i)=>interpolatePoint(p,next[i],t));
      this.camera=Object.fromEntries(Object.keys(targetBox).map(k=>[k,lerp(fromBox[k],targetBox[k],t)]));
      for(const edge of this.edges.values())edge.opacity=lerp(edge.from,edge.to,t);
      this.draw();
      if(progress<1)this.frame=requestAnimationFrame(tick);
      else{
        this.svg.dataset.animating='false';
        for(const [key,edge]of this.edges)if(!edge.to){edge.g.remove();this.edges.delete(key);}
        this.draw();
      }
    };
    tick(start);
  }
  draw(){
    if(!this.points.length||!this.camera)return;
    const {x,y,width,height}=this.camera;this.svg.setAttribute('viewBox',`${x} ${y} ${width} ${height}`);
    this.nodes.forEach((node,i)=>{
      const p=this.points[i],dx=Math.cos(p.angle),dy=Math.sin(p.angle),info=BASES[this.sequence[i]];
      node.g.classList.toggle('target-nucleotide',this.highlighted?.includes(i));
      node.g.setAttribute('transform',`translate(${p.x.toFixed(3)},${p.y.toFixed(3)})`);
      node.chemistry.setAttribute('transform',`rotate(${p.angle*180/Math.PI})`);
      const offset=info.rings===2?47:31;
      node.label.setAttribute('x',dx*offset);node.label.setAttribute('y',dy*offset);
      node.halo.setAttribute('cx',dx*offset);node.halo.setAttribute('cy',dy*offset);
      node.halo.setAttribute('transform',`rotate(${p.angle*180/Math.PI},${dx*offset},${dy*offset})`);
      node.hit.setAttribute('cx',dx*offset);node.hit.setAttribute('cy',dy*offset);
      node.number.setAttribute('x',-dx*18);node.number.setAttribute('y',-dy*18);
      node.lock.setAttribute('transform',`translate(${-dx*10-dy*9},${-dy*10+dx*9}) scale(.7)`);
    });
    this.links.forEach((link,i)=>{
      const a=this.points[i],b=this.points[i+1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,ux=dx/length,uy=dy/length;
      const attrs=(line,x1,y1,x2,y2)=>{line.setAttribute('x1',x1);line.setAttribute('y1',y1);line.setAttribute('x2',x2);line.setAttribute('y2',y2);};
      attrs(link.a,a.x+ux*7,a.y+uy*7,mx-ux*4,my-uy*4);attrs(link.b,mx+ux*4,my+uy*4,b.x-ux*7,b.y-uy*7);
      link.p.setAttribute('cx',mx);link.p.setAttribute('cy',my);
      link.b.setAttribute('marker-end',i%5===2?`url(#${this.directionId})`:'');
      link.g.classList.toggle('selected-backbone',i===this.selected||i+1===this.selected);
      link.g.classList.toggle('cleavage-bond',i===this.cleavageAfter);
      link.g.classList.toggle('virtual-connection',i===this.virtualAfter);
      link.g.setAttribute('display',this.breaks?.includes(i)?'none':'');
    });
    for(const edge of this.edges.values()){
      const a=this.points[edge.i],b=this.points[edge.j],extentA=BASES[this.sequence[edge.i]].rings===2?61:46,extentB=BASES[this.sequence[edge.j]].rings===2?61:46;
      const ax=a.x+Math.cos(a.angle)*extentA,ay=a.y+Math.sin(a.angle)*extentA,bx=b.x+Math.cos(b.angle)*extentB,by=b.y+Math.sin(b.angle)*extentB;
      const info=pairInfo(this.sequence[edge.i],this.sequence[edge.j]),count=info?.count||1;
      while(edge.g.children.length<count)edge.g.append(element('line'));
      while(edge.g.children.length>count)edge.g.lastElementChild.remove();
      const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
      Array.from(edge.g.children).forEach((line,k)=>{
        const offset=(k-(count-1)/2)*4;
        line.setAttribute('x1',ax+nx*offset);line.setAttribute('y1',ay+ny*offset);
        line.setAttribute('x2',bx+nx*offset);line.setAttribute('y2',by+ny*offset);
      });
      edge.g.setAttribute('opacity',edge.opacity);edge.g.classList.toggle('wobble',!!info?.wobble);
      edge.g.classList.toggle('selected-pair',edge.i===this.selected||edge.j===this.selected);
      edge.g.classList.toggle('pending-pair',!info);
    }
    const first=this.points[0],last=this.points.at(-1);
    for(const [label,p]of [[this.firstLabel,first],[this.lastLabel,last]]){
      label.setAttribute('x',p.x-Math.cos(p.angle)*37);label.setAttribute('y',p.y-Math.sin(p.angle)*37);
    }
    if(this.cleavageAfter!==null){
      const a=this.points[this.cleavageAfter],b=this.points[this.cleavageAfter+1];
      if(a&&b){this.cutLabel.setAttribute('x',(a.x+b.x)/2-22);this.cutLabel.setAttribute('y',(a.y+b.y)/2-16);}
    }
  }
  fit(){
    if(!this.points.length)return;
    this.camera=box(this.points,this.framePadding);this.draw();
  }
}
