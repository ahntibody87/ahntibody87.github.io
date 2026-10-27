import * as T from './vendor/three.module.min.js';

const PI=Math.PI, clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const sphere=new T.SphereGeometry(1,24,16);
const pigment={ecto:0x7ca5d8,meso:0xd99a9c,endo:0xd4ad58,neutral:0xb6c2d1,nucleus:0x526b87,rna:0xb28b3e,protein:0x9a6585};

function material(color,opacity=1){return new T.MeshStandardMaterial({color,roughness:.63,metalness:0,side:T.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity>=1});}
function ellipsoid(parent,color,position,scale,opacity=1){const mesh=new T.Mesh(sphere,material(color,opacity));mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
function curveMesh(parent,points,color,radius=.035,opacity=1){
  const g=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p)),Math.max(16,points.length*3),radius,8,false);
  const mesh=new T.Mesh(g,material(color,opacity));parent.add(mesh);return mesh;
}
function fade(object,alpha){object.visible=alpha>.005;object.traverse(o=>{if(o.isMesh){const m=o.material;m.opacity=alpha*(m.userData.baseOpacity??1);m.transparent=m.opacity<1;m.depthWrite=m.opacity>.96;}});}
function translucent(parent){parent.traverse(o=>{if(o.isMesh)o.material.userData.baseOpacity=o.material.opacity;});return parent;}

// A shared camera, lighting and annotation system for all close-up specimens.
// Anatomy changes with the timeline; rotation never changes the sampled stage.
class SpecimenView {
  constructor(canvas,labelHost,{angle=.2,elevation=.5,span=7.8}={}){
    this.canvas=canvas;this.labelHost=labelHost;this.angle=angle;this.elevation=elevation;this.span=span;this.defaults={angle,elevation,span};this.annotations=[];
    try{this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{
      this.failed=true;const p=document.createElement('p');p.className='webgl-error';p.textContent='입체 모형을 표시할 수 없습니다. WebGL을 지원하는 브라우저에서 다시 열어 주세요. 단계별 설명은 계속 볼 수 있습니다.';canvas.parentElement.append(p);return;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor(0xf5f8fb);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.localClippingEnabled=true;
    this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-4,4,3,-3,.1,100);
    this.scene.add(new T.HemisphereLight(0xf7fbff,0xa6adbb,2.1));
    const key=new T.DirectionalLight(0xfff4e8,2.4);key.position.set(-4,7,6);this.scene.add(key);
    const rim=new T.DirectionalLight(0xc8dcff,1.5);rim.position.set(4,2,-5);this.scene.add(rim);
    this.model=new T.Group();this.scene.add(this.model);this.bind();
    this.observer=new ResizeObserver(()=>this.render());this.observer.observe(canvas.parentElement);
  }
  bind(){
    let last=null;const c=this.canvas;c.tabIndex=0;
    c.addEventListener('pointerdown',e=>{last=[e.clientX,e.clientY];c.setPointerCapture(e.pointerId);});
    c.addEventListener('pointermove',e=>{if(!last)return;this.angle-=(e.clientX-last[0])*.009;this.elevation=clamp(this.elevation+(e.clientY-last[1])*.007,-1.2,1.4);last=[e.clientX,e.clientY];this.render();});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,()=>last=null);
    c.addEventListener('keydown',e=>{const action={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Home:'reset','+':'in','-':'out'}[e.key];if(action){e.preventDefault();this.view(action);}});
    c.addEventListener('webglcontextlost',e=>{e.preventDefault();c.parentElement.dataset.contextLost='true';});
    c.addEventListener('webglcontextrestored',()=>{delete c.parentElement.dataset.contextLost;this.render();});
  }
  view(action){
    if(action==='reset')Object.assign(this,this.defaults);
    if(action==='top'){this.angle=0;this.elevation=1.4;}
    if(action==='side'){this.angle=PI/2;this.elevation=.15;}
    if(action==='left')this.angle-=.2;if(action==='right')this.angle+=.2;
    if(action==='up')this.elevation=clamp(this.elevation+.15,-1.2,1.4);if(action==='down')this.elevation=clamp(this.elevation-.15,-1.2,1.4);
    if(action==='in')this.span=clamp(this.span-.6,4.5,13);if(action==='out')this.span=clamp(this.span+.6,4.5,13);this.render();
  }
  annotate(items){
    this.annotations=items;if(!this.labelHost)return;
    const signature=items.map(i=>i.name).join('|');
    if(this.labelHost.dataset.signature===signature)return;
    this.labelHost.dataset.signature=signature;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const names=items.map(({name})=>{const g=document.createElementNS(svg.namespaceURI,'g');g.append(document.createElementNS(svg.namespaceURI,'path'),document.createElementNS(svg.namespaceURI,'circle'));g.lastChild.setAttribute('r','3');svg.append(g);const span=document.createElement('span');span.textContent=name;return span;});
    this.labelHost.replaceChildren(svg,...names);
  }
  render(){
    if(this.failed)return;const w=this.canvas.parentElement.clientWidth,h=this.canvas.parentElement.clientHeight;if(!w||!h)return;
    const size=this.renderer.getSize(new T.Vector2());if(size.x!==w||size.y!==h)this.renderer.setSize(w,h,false);
    const aspect=w/h,vertical=Math.max(5.6,this.span/aspect);this.camera.left=-vertical*aspect/2;this.camera.right=vertical*aspect/2;this.camera.top=vertical/2;this.camera.bottom=-vertical/2;
    this.camera.position.set(12*Math.sin(this.angle)*Math.cos(this.elevation),12*Math.sin(this.elevation),12*Math.cos(this.angle)*Math.cos(this.elevation));this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene,this.camera);if(!this.labelHost)return;
    const svg=this.labelHost.querySelector('svg');if(!svg)return;
    const spans=[...this.labelHost.querySelectorAll('span')];
    this.annotations.forEach((item,i)=>{
      const p=typeof item.point==='function'?item.point():item.point.clone();const q=p.project(this.camera),el=spans[i],g=svg.children[i];
      const visible=q.z>=-1&&q.z<=1&&Math.abs(q.x)<1.06&&Math.abs(q.y)<1.06;el.hidden=!visible;g.style.display=visible?'':'none';if(!visible)return;
      const half=el.offsetWidth/2,right=i%2===1;
      const x=clamp(right?w*.84:w*.16,half+8,w-half-8),y=h*([.21,.31,.73,.82][i%4]);
      const ax=(q.x/2+.5)*w,ay=(.5-q.y/2)*h;el.style.left=x+'px';el.style.top=y+'px';g.children[0].setAttribute('d',`M${ax},${ay} L${x+(right?-half:half)},${y}`);g.children[1].setAttribute('cx',ax);g.children[1].setAttribute('cy',ay);
    });
  }
}

// A closed sheet volume whose nuclei use the exact same deformation map.
class TissueSheet {
  constructor(parent,color){
    this.nx=48;this.nz=32;this.group=new T.Group();parent.add(this.group);
    const vertices=[],indices=[],count=(this.nx+1)*(this.nz+1);
    for(let side=0;side<2;side++)for(let j=0;j<=this.nz;j++)for(let i=0;i<=this.nx;i++)vertices.push(0,0,0);
    for(let side=0;side<2;side++)for(let j=0;j<this.nz;j++)for(let i=0;i<this.nx;i++){
      const a=side*count+j*(this.nx+1)+i,b=a+1,c=a+this.nx+1,d=c+1;
      indices.push(...(side?[a,c,b,b,c,d]:[a,b,c,b,d,c]));
    }
    const edge=(a,b)=>indices.push(a,a+count,b,b,a+count,b+count);
    for(let i=0;i<this.nx;i++){edge(i,i+1);const a=this.nz*(this.nx+1)+i;edge(a+1,a);}
    for(let j=0;j<this.nz;j++){edge(j*(this.nx+1),(j+1)*(this.nx+1));edge((j+1)*(this.nx+1)+this.nx,j*(this.nx+1)+this.nx);}
    this.geometry=new T.BufferGeometry();this.geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));this.geometry.setIndex(indices);
    const surfaceCount=this.nx*this.nz*6;this.geometry.addGroup(0,surfaceCount,0);this.geometry.addGroup(surfaceCount,surfaceCount,1);this.geometry.addGroup(surfaceCount*2,indices.length-surfaceCount*2,1);
    this.mesh=new T.Mesh(this.geometry,[material(new T.Color(color).multiplyScalar(.88)),material(color)]);this.mesh.frustumCulled=false;this.group.add(this.mesh);
    this.markers=[];for(let j=0;j<7;j++)for(let i=0;i<7;i++)this.markers.push({u:mix(-.91,.91,i/6),v:mix(-.9,.9,j/6),mesh:ellipsoid(this.group,new T.Color(color).multiplyScalar(.53),[0,0,0],[.065,.045,.078])});
  }
  update(map){
    const a=this.geometry.attributes.position;let n=0;
    for(let side=0;side<2;side++)for(let j=0;j<=this.nz;j++)for(let i=0;i<=this.nx;i++){const u=mix(-1,1,i/this.nx),v=mix(-1,1,j/this.nz),p=map(u,v,side===0?.055:-.055);a.setXYZ(n++,p.x,p.y,p.z);}
    a.needsUpdate=true;this.geometry.computeVertexNormals();this.geometry.computeBoundingSphere();this.map=map;
    for(const m of this.markers){m.mesh.position.copy(map(m.u,m.v,.075));}
  }
}

export class LayerView extends SpecimenView {
  constructor(canvas,labels){super(canvas,labels,{angle:.43,elevation:.68,span:7.9});if(this.failed)return;
    this.ecto=new T.Group();this.endo=new T.Group();this.meso=new T.Group();this.model.add(this.ecto,this.endo,this.meso);
    this.neural=new TissueSheet(this.ecto,pigment.ecto);this.gut=new TissueSheet(this.endo,pigment.endo);
    this.surface=[];for(const x of [-2.1,2.1])this.surface.push(ellipsoid(this.ecto,0xc9d4e0,[x,-.2,0],[.54,.09,2.5],.5));
    this.brain=[];for(let i=0;i<3;i++)this.brain.push(ellipsoid(this.ecto,pigment.ecto,[0,.55,-2.05+i*.44],[.43+i*.09,.43+i*.04,.46],0));
    this.axis=ellipsoid(this.meso,0xb5c3d2,[0,-.25,0],[.25,.25,2.8],.3);
    this.bands=[];for(const side of [-1,1])this.bands.push(ellipsoid(this.meso,pigment.meso,[side*.82,0,0],[.4,.25,2.5]));
    this.somites=[];this.muscle=[];
    for(const side of [-1,1])for(let j=0;j<7;j++){
      const group=new T.Group();this.meso.add(group);const body=ellipsoid(group,pigment.meso,[0,0,0],[.38,.29,.29]);
      const nucleus=ellipsoid(group,0x916976,[0,.1,.18],[.10,.07,.06]);this.somites.push({side,j,group,body,nucleus});
      for(let k=0;k<2;k++){const cell=new T.Group();this.meso.add(cell);ellipsoid(cell,pigment.meso,[0,0,0],[.14,.14,.5]);ellipsoid(cell,0x916976,[0,.06,.15],[.06,.05,.09]);this.muscle.push({side,j,k,group:cell});}
    }
    this.villi=[];for(let j=0;j<9;j++){const mesh=ellipsoid(this.endo,pigment.endo,[0,0,0],[.11,.32,.11]);this.villi.push(mesh);}
    this.outerGut=ringTube(this.endo,pigment.meso,.97,1.1,4.8);this.outerGut.position.y=-.88;
    this.gutClip=new T.Plane(V(0,-1,0),-.55);
    this.update('ecto',0);
  }
  update(layer,progress){
    if(this.failed)return;this.layer=layer;const t=clamp(progress)*3.999;
    this.ecto.visible=layer==='ecto';this.meso.visible=layer==='meso';this.endo.visible=layer==='endo';
    if(layer==='ecto'){
      const fold=smooth((t-.65)/1.65),growth=smooth(t-2.8);
      const map=(u,v,offset=0)=>{const a=u*PI,r=.56*(1+growth*1.05*smooth((-v-.2)/.65)),x=mix(u*1.8,r*Math.sin(a),fold),y=mix(0,r*(1-Math.cos(a)),fold);return V(x-offset*fold*Math.sin(a),y+offset*mix(1,Math.cos(a),fold),2.5*v);};
      this.neural.update(map);this.surface.forEach((m,i)=>{m.position.y=mix(-.2,1.3,fold);m.position.x=(i?1:-1)*mix(2.1,.9,fold);m.scale.x=mix(.54,.94,fold);});
      this.brain.forEach((m,i)=>{m.visible=growth>.001;m.scale.set((.43+i*.09)*growth,(.43+i*.04)*growth,(.46)*growth);m.material.opacity=1;m.material.transparent=false;});
      this.annotate([{name:t<1?'신경판':t<2?'신경고랑':'신경관',point:()=>map(-.15,0,.1)},{name:'표면 외배엽 → 표피',point:()=>this.surface[1].position.clone()},{name:t<3?'같은 영역의 표식':'머리 쪽 확장 → 뇌',point:()=>map(.2,t<3?.5:-.85,.1)},{name:t<3?'머리 쪽':'몸통 쪽 → 척수',point:()=>map(0,t<3?-.9:.85,.08)}]);
    }else if(layer==='meso'){
      const split=smooth(t-.35),emerge=smooth(t-1.6),align=smooth(t-2.8);
      this.bands.forEach(m=>{m.material.opacity=1-split;m.material.transparent=true;m.visible=split<.995;});
      this.somites.forEach(({side,j,group})=>{group.position.set(side*.82,0,-2.1+j*.7);group.scale.setScalar(mix(.01,1,split));fade(group,split*(1-emerge*.82));});
      this.muscle.forEach(({side,j,k,group})=>{group.position.set(side*mix(.85,1.6+k*.25,emerge),mix(0,.12+k*.23,emerge),mix(-2.1+j*.7,(j-3)*.16,align));group.scale.set(mix(.7,1,align),mix(.7,1,align),mix(.32,4.0,align));fade(group,emerge);});
      this.annotate([{name:t<1?'축옆중배엽':t<2?'반복되는 체절':'체절의 근육 형성 영역',point:V(-.82,.25,-1.5)},{name:t<2?'신경관 · 위치 기준':t<3?'근육 전구세포':'정렬된 골격근 조직',point:t<2?V(0,0,.3):()=>this.muscle[20].group.localToWorld(V(0,.14,0))},{name:t<2?'몸통 중배엽의 일부를 확대':'근육이 될 세포의 이동·배열',point:t<2?V(-.82,.25,1.4):()=>this.muscle[8].group.localToWorld(V(0,.10,.28))}]);
    }else{
      const fold=smooth((t-.6)/1.6),detail=smooth(t-2.8);
      const map=(u,v,offset=0)=>{const a=u*PI,r=.7+detail*.18;return V(mix(u*2.0,r*Math.sin(a),fold)+offset*fold*Math.sin(a),mix(0,-r*(1-Math.cos(a)),fold)+offset*mix(1,Math.cos(a),fold),2.4*v);};
      this.gut.update(map);
      this.villi.forEach((m,j)=>{const x=Math.sin(j*.7)*.35;m.visible=detail>.005;m.position.set(x,-.88-Math.sqrt(.82**2-x*x)+.28,j*.47-1.88);m.scale.y=.32*detail;});
      this.outerGut.visible=detail>.05;fade(this.outerGut,detail*.6);
      this.endo.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.clippingPlanes=detail>.05?[this.gutClip]:[];});
      this.annotate([{name:t<1?'내배엽층':t<3?'내배엽 → 장관 상피':'장 상피 · 절개 확대',point:()=>map(.6,-.3,.05)},{name:t<2?'양옆의 접힘':'장관 안쪽 공간',point:V(0,-.6,.2)},{name:t<3?'몸 안으로 포함될 영역':'후기 상피의 융모 · 시간 압축',point:t<3?()=>map(-.4,.7,.06):()=>this.villi[7].position.clone().add(V(0,.22,0))},...(t>=3?[{name:'바깥벽 · 중배엽 유래 조직',point:V(-1.02,-.88,.9)}]:[])]);
    }
    this.render();
  }
}

function ringTube(parent,color,inner,outer,length){
  const start=PI,arc=PI*1.5,group=new T.Group();parent.add(group);
  for(const radius of [inner,outer]){const g=new T.CylinderGeometry(radius,radius,length,64,1,true,start,arc),m=new T.Mesh(g,material(color));m.rotation.x=PI/2;group.add(m);}
  for(const z of [-length/2,length/2]){const m=new T.Mesh(new T.RingGeometry(inner,outer,64,1,start-PI/2,arc),material(color));m.position.z=z;group.add(m);}
  for(const a of [start,start+arc]){
    const g=new T.BufferGeometry(),points=[];
    for(const [r,z] of [[inner,-length/2],[outer,-length/2],[inner,length/2],[outer,length/2]])points.push(Math.sin(a)*r,-Math.cos(a)*r,z);
    g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();group.add(new T.Mesh(g,material(color)));
  }
  return translucent(group);
}

export class GutView extends SpecimenView {
  constructor(canvas,labels){super(canvas,labels,{angle:.5,elevation:.35,span:5.8});if(this.failed)return;
    this.outer=ringTube(this.model,pigment.meso,1.0,1.28,2.7);this.inner=ringTube(this.model,pigment.endo,.76,1.0,2.7);
    this.annotate([{name:'평활근 · 중배엽',point:V(-1.20,.45,.9)},{name:'상피 · 내배엽',point:V(.82,-.24,1.35)},{name:'장 안쪽 공간',point:V(0,0,1.35)}]);this.highlight('all');
  }
  highlight(which){if(this.failed)return;fade(this.outer,which==='endo'?.16:1);fade(this.inner,which==='meso'?.16:1);this.render();}
}

export class MuscleView extends SpecimenView {
  constructor(canvas,labels){super(canvas,labels,{angle:.08,elevation:.22,span:9.5});if(this.failed)return;
    this.molecular=new T.Group();this.fusion=new T.Group();this.model.add(this.molecular,this.fusion);
    this.cell=ellipsoid(this.molecular,0xb7c8d7,[0,0,0],[3.7,1.68,1.35],.42);
    this.cell.geometry=new T.SphereGeometry(1,48,32,PI,PI);
    curveMesh(this.molecular,Array.from({length:81},(_,i)=>V(3.7*Math.cos(i*2*PI/80),1.68*Math.sin(i*2*PI/80),0)),0x99aec1,.022,.72);
    this.nucleus=ellipsoid(this.molecular,0x8a9eb6,[-1.42,.03,0],[1.13,1.12,.98],.24);
    this.nucleus.material.side=T.FrontSide;
    curveMesh(this.molecular,Array.from({length:65},(_,i)=>V(-1.42+1.11*Math.cos(i*2*PI/64),.03+1.1*Math.sin(i*2*PI/64),.08)),0x829ab2,.018,.55);
    const pore=new T.Mesh(new T.TorusGeometry(.10,.025,8,24),material(0x708ba3));pore.position.set(-.50,.2,.60);pore.rotation.y=PI/2;this.molecular.add(pore);
    const gene=new T.Group();this.molecular.add(gene);this.gene=gene;
    // An explicit gene segment in a stable piece of DNA, not decorative letters.
    for(const strand of [-1,1])for(let segment=0;segment<3;segment++){
      const points=[];for(let j=0;j<=24;j++){const x=-2.27+(segment+j/24)*.58;points.push(V(x,Math.sin((x+2.27)*9)*.17*strand,.45+Math.cos((x+2.27)*9)*.17*strand));}
      curveMesh(gene,points,segment===1?pigment.rna:0x6485a3,segment===1?.045:.03);
    }
    for(let j=0;j<16;j++){const x=-2.27+j*.109,a=(x+2.27)*9;curveMesh(gene,[V(x,Math.sin(a)*.17,.45+Math.cos(a)*.17),V(x,-Math.sin(a)*.17,.45-Math.cos(a)*.17)],j>=5&&j<=10?0xc6a458:0x9db1c2,.012);}
    this.rna=new T.Group();this.molecular.add(this.rna);curveMesh(this.rna,Array.from({length:21},(_,i)=>V((i/20-.5)*.8,Math.sin(i*.8)*.055,Math.cos(i*.6)*.035)),pigment.rna,.034);
    this.ribosome=new T.Group();this.ribosome.position.set(1.55,-.1,.3);this.molecular.add(this.ribosome);ellipsoid(this.ribosome,0x718d9e,[0,.08,0],[.32,.18,.20]);ellipsoid(this.ribosome,0x95a8b5,[0,-.11,.03],[.25,.12,.17]);
    this.protein=new T.Group();this.molecular.add(this.protein);
    for(let i=0;i<6;i++){const a=i*2.39;ellipsoid(this.protein,pigment.protein,[Math.cos(a)*.10,Math.sin(a)*.10,(i%2)*.08],[.10,.10,.10]);}
    this.regulators=new T.Group();this.molecular.add(this.regulators);for(let i=0;i<3;i++)ellipsoid(this.regulators,0x8b9a8b,[-1.75+i*.30,.63,.35],[.085,.10,.09]);
    this.targets=new T.Group();this.molecular.add(this.targets);
    for(let j=0;j<3;j++){curveMesh(this.targets,[V(-2.12,-.35-j*.15,.45),V(-1.7,-.32-j*.15,.57),V(-1.15,-.35-j*.15,.47)],0x9b7e7d,.025);}
    this.filaments=[];for(let j=0;j<12;j++){const mesh=curveMesh(this.molecular,[V(.1,-.9+j*.13,.25),V(1.1,-.9+j*.13,.30),V(2.6,-.9+j*.13,.25)],j%2?0xb37d87:0xc89b9e,.027);this.filaments.push(mesh);}
    this.signal=[];for(let i=0;i<4;i++)this.signal.push(ellipsoid(this.molecular,0xc7ab70,[-4.05-i*.13,.25+(i-1)*.22,.1],[.06,.06,.06]));
    this.myoblasts=[];for(let i=0;i<3;i++){const group=new T.Group();this.fusion.add(group);ellipsoid(group,pigment.meso,[0,0,0],[1.5,.33,.35],.55);ellipsoid(group,0x7d5f78,[-.3,.05,.15],[.17,.12,.13]);this.myoblasts.push(group);}
    this.fiber=new T.Group();this.fusion.add(this.fiber);ellipsoid(this.fiber,pigment.meso,[0,0,0],[3.55,.63,.63],.46);
    for(let j=0;j<9;j++){const a=j*2*PI/9,y=Math.sin(a)*.38,z=Math.cos(a)*.38;curveMesh(this.fiber,[V(-3.15,y,z),V(0,y,z),V(3.15,y,z)],j%2?0xa87580:0xc29098,.037);}
    for(let j=0;j<22;j++){const ring=new T.Mesh(new T.TorusGeometry(.48,.013,6,32),material(0x9b717e,.7));ring.rotation.y=PI/2;ring.position.x=-2.95+j*.28;this.fiber.add(ring);}
    for(let i=0;i<6;i++)ellipsoid(this.fiber,0x79617c,[-2.6+i*1.02,i%2?.46:-.46,.24],[.17,.085,.12]);
    translucent(this.molecular);translucent(this.fusion);this.update(0);
  }
  update(time,contraction=0){
    if(this.failed)return;const step=Math.min(4,Math.floor(time)),p=time-step;this.time=time;
    this.molecular.visible=step<4;this.fusion.visible=step===4;
    if(step<4){
      const transit=step===1?smooth((p-.25)/.7):step>1?1:0;
      this.rna.visible=step>=1;this.rna.position.set(mix(-1.55,1.5,transit),mix(.05,.22,transit),.68);
      this.ribosome.visible=step>=2;this.protein.visible=step>=2;
      const proteinTravel=step===2?smooth((p-.35)/.6):1;
      this.protein.position.set(mix(1.75,-1.5,proteinTravel),Math.sin(proteinTravel*PI)*-.85+.35,.72);
      this.regulators.visible=step>=3;this.targets.visible=step>=3;
      this.filaments.forEach((m,j)=>{m.visible=step>=3&&p>j/17;m.scale.x=smooth((p-j/17)*3);});
      this.signal.forEach((m,i)=>{m.visible=step===0;m.position.x=-4.08+smooth(p)*(.45-i*.04);});
      const labels=[{name:'핵',point:V(-2.1,.9,.2)},{name:step===0?'분화 신호':step===1?'mRNA · 핵 밖으로':step===2?'리보솜 · 번역':'근육 단백질의 합성·배열',point:step===0?V(-3.7,.3,.1):step===1?()=>this.rna.position.clone():step===2?V(1.55,-.1,.3):V(1.6,-.65,.3)},{name:'MyoD 유전자 · DNA에 유지',point:V(-1.4,0,.6)}];
      if(step>=2)labels.push({name:step===2?'MyoD 단백질 · 핵으로':'MyoD + 다른 조절인자',point:()=>this.protein.position.clone()});this.annotate(labels);
    }else{
      const merge=smooth(p/.65),mature=smooth((p-.48)/.38);
      this.myoblasts.forEach((g,i)=>{g.position.set(mix((i-1)*.75,0,merge),mix((i-1)*1.05,0,merge),0);g.scale.x=mix(1,1.7,merge);fade(g,1-mature);});
      fade(this.fiber,mature);this.fiber.scale.set(1-contraction,.96+contraction*.7,.96+contraction*.7);
      this.annotate([{name:p<.55?'근아세포의 길어짐·융합':'여러 핵을 가진 근섬유',point:V(-2.0,.43,.25)},{name:p<.7?'관찰 배율을 낮춰 여러 세포 관찰':'정렬된 근육 단백질',point:V(1.4,.2,.4)},{name:p<.7?'다핵 근관 형성':'이후 성숙 → 수축 기능',point:V(0,-.5,.15)}]);
    }
    this.render();
  }
}
