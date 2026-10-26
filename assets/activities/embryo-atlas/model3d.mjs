import * as T from './vendor/three.module.min.js';

// Schematic anatomy in model coordinates: +Y dorsal, -Z cranial, +Z caudal.
// Timelines are instructional morphs, not reconstructions of a measured embryo.
const PI=Math.PI, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t, smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const colors={cell:0xb7cbdc, shell:0xb3c7db, icm:0xd5bd8f, ecto:0x7ca5d8, meso:0xd99a9c, endo:0xe0bd70, support:0xb9bdc5};
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const SPHERE=new T.SphereGeometry(1,24,18), NUCLEUS=new T.SphereGeometry(1,12,8);
const dummy=new T.Object3D();

function lattice(n){
  if(n===1)return [V()];
  if(n===2)return [V(-.88,0,0),V(.88,0,0)];
  if(n===4)return [V(-.82,-.7,0),V(-.82,.7,0),V(.82,-.7,0),V(.82,.7,0)];
  if(n===8)return Array.from({length:8},(_,i)=>V((i&4)?.8:-.8,(i&2)?.8:-.8,(i&1)?.8:-.8));
  const p=[];
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++)if((x+y+z)%2===0)p.push(V(x*.66,y*.66,z*.66));
  return p.sort((a,b)=>a.lengthSq()-b.lengthSq()).slice(0,32);
}

// A packed morula uses solid rounded Voronoi volumes, including interior cells.
function packedGeometry(center,seeds){
  const g=new T.SphereGeometry(1,24,18), pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){
    const d=V().fromBufferAttribute(pos,i).normalize();
    const b=center.dot(d);
    let len=Math.min(.76,-b+Math.sqrt(b*b+2.27**2-center.lengthSq()));
    for(const q of seeds){const delta=q.clone().sub(center), dot=delta.dot(d);if(dot>1e-5)len=Math.min(len,delta.lengthSq()/(2*dot));}
    // Small intercellular seams reveal contact surfaces without a hollow centre.
    const v=d.multiplyScalar(len*.978).add(center);
    pos.setXYZ(i,v.x,v.y,v.z);
  }
  g.computeVertexNormals();return g;
}

function dualShell(){
  const ico=new T.IcosahedronGeometry(1,3);
  const p=ico.attributes.position, map=new Map();
  for(let i=0;i<p.count;i+=3){
    const tri=[0,1,2].map(k=>V().fromBufferAttribute(p,i+k).normalize());
    const c=tri[0].clone().add(tri[1]).add(tri[2]).normalize();
    for(const v of tri){const key=v.toArray().map(n=>n.toFixed(5)).join(',');if(!map.has(key))map.set(key,{v,cs:[]});map.get(key).cs.push(c);}
  }
  const positions=[],normals=[];
  const add=(a,b,c)=>{positions.push(...a.toArray(),...b.toArray(),...c.toArray());};
  const nuclei=[];
  for(const {v,cs} of map.values()){
    const axis=V(Math.abs(v.y)<.9?0:1,Math.abs(v.y)<.9?1:0,0), a=axis.cross(v).normalize(), b=v.clone().cross(a);
    cs.sort((p,q)=>Math.atan2(p.dot(b),p.dot(a))-Math.atan2(q.dot(b),q.dot(a)));
    const outer=cs.map(c=>c.clone().lerp(v,.055).normalize().multiplyScalar(2.13));
    const inner=outer.map(c=>c.clone().multiplyScalar(1.97/2.13));
    for(let j=0;j<cs.length;j++){const k=(j+1)%cs.length;add(v.clone().multiplyScalar(2.145),outer[j],outer[k]);add(v.clone().multiplyScalar(1.97),inner[k],inner[j]);add(outer[j],inner[j],inner[k]);add(outer[j],inner[k],outer[k]);}
    nuclei.push(v.clone().multiplyScalar(2.149));
  }
  ico.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return {g,nuclei};
}

// Exact polygonal caps from the same triangles being clipped, rather than
// decorative circles. This makes the morula solid at every section depth.
function sectionGeometry(geometry,z){
  const a=geometry.attributes.position, idx=geometry.index, n=idx?idx.count:a.count, points=new Map();
  for(let k=0;k<n;k+=3){
    const tri=[0,1,2].map(j=>V().fromBufferAttribute(a,idx?idx.getX(k+j):k+j));
    for(let j=0;j<3;j++){
      const p=tri[j],q=tri[(j+1)%3];if((p.z-z)*(q.z-z)>=0)continue;
      const v=p.clone().lerp(q,(z-p.z)/(q.z-p.z));points.set(`${v.x.toFixed(5)},${v.y.toFixed(5)}`,v);
    }
  }
  const ps=[...points.values()],g=new T.BufferGeometry();if(ps.length<3)return g;
  const c=ps.reduce((s,v)=>s.add(v),V()).divideScalar(ps.length);ps.sort((a,b)=>Math.atan2(a.y-c.y,a.x-c.x)-Math.atan2(b.y-c.y,b.x-c.x));
  const vertices=[];for(let j=0;j<ps.length;j++)vertices.push(c.x,c.y,z+.003,ps[j].x,ps[j].y,z+.003,ps[(j+1)%ps.length].x,ps[(j+1)%ps.length].y,z+.003);
  g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}

export function tissuePoint(kind,u,v,fold){
  const w=Math.sqrt(Math.max(.035,1-v*v*.94)), x=1.96*u*w, z=2.48*v;
  const bend=-.82*fold*v*v, zz=mix(z,2.3*Math.sin(v*1.1),fold);
  if(kind==='neural'){
    const a=u*PI, r=.23*(1+.65*smooth((-v-.35)/.5)*fold);
    return V(mix(x*.25,r*Math.sin(a),fold),mix(.44,.40-r*Math.cos(a),fold)+bend,zz);
  }
  const radius={ecto:1.14,meso:.88,endo:.40}[kind]*w;
  const y0={ecto:.41,meso:.12,endo:-.17}[kind];
  const cy=kind==='endo'?-.37:-.31;
  const angle=u*PI*.965;
  return V(mix(x,radius*Math.sin(angle),fold),mix(y0,cy+radius*Math.cos(angle),fold)+bend,zz);
}

class Sheet {
  constructor(owner,key,kind,u0=-1,u1=1){
    this.owner=owner;this.kind=kind;this.u0=u0;this.u1=u1;this.nx=40;this.nz=44;this.key=key;
    const nx=this.nx,nz=this.nz, n=(nx+1)*(nz+1), indices=[];
    this.g=new T.BufferGeometry();this.g.setAttribute('position',new T.BufferAttribute(new Float32Array(n*2*3),3));
    for(let side=0;side<2;side++)for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
      const a=side*n+j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
      if(side===0)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
    }
    const edge=(a,b)=>indices.push(a,b,a+n,b,b+n,a+n);
    for(let i=0;i<nx;i++){edge(i,i+1);edge(n-2-i,n-1-i);}
    for(let j=0;j<nz;j++){edge(j*(nx+1),(j+1)*(nx+1));edge(j*(nx+1)+nx,(j+1)*(nx+1)+nx);}
    this.g.setIndex(indices);this.mesh=new T.Mesh(this.g,owner.material(key));this.mesh.frustumCulled=false;owner.disc.add(this.mesh);
    this.nuclei=owner.pool(key,500,.34,true);owner.disc.add(this.nuclei.mesh);
  }
  update(fold,growth=1,opacity=1){
    this.mesh.visible=growth>0;this.nuclei.mesh.visible=growth>0;if(!growth)return;
    const p=this.g.attributes.position,n=(this.nx+1)*(this.nz+1);
    const map=(u,v)=>{
      if(this.kind==='ecto' && this.u0!==-1 || this.kind==='ecto' && this.u1!==1){
        // Surface ectoderm closes above the separate neural plate.
        const sign=u<0?-1:1;u=sign*mix(Math.abs(u),Math.max(0,(Math.abs(u)-.25)/.75),fold);
      }
      const point=tissuePoint(this.kind,u,v,fold);
      if(fold===0&&this.kind==='neural'&&this.owner.lastTime>=7&&this.owner.lastTime<9&&v>.025&&v<.88){point.y-=.24*Math.exp(-u*u*22)*Math.sin((v-.025)/.855*PI);}
      return point;
    };
    for(let j=0;j<=this.nz;j++)for(let i=0;i<=this.nx;i++){
      let u=mix(this.u0,this.u1,i/this.nx),v=mix(-.98,.98,j/this.nz);
      if(this.kind==='meso'||this.kind==='endo')u*=growth;
      const vtx=map(u,v), du=map(u+.001,v).sub(vtx),dv=map(u,v+.001).sub(vtx), normal=dv.cross(du).normalize();
      for(let side=0;side<2;side++){const q=vtx.clone().addScaledVector(normal,side===0?.035:-.035);p.setXYZ(side*n+j*(this.nx+1)+i,q.x,q.y,q.z);}
    }
    p.needsUpdate=true;this.g.computeVertexNormals();this.nuclei.reset();
    for(let j=0;j<21;j++)for(let i=0;i<19;i++){
      let u=mix(this.u0+.017,this.u1-.017,(i+.25*(j%2))/18.3),v=mix(-.94,.94,j/20);
      if(this.kind==='meso'||this.kind==='endo')u*=growth;
      // Leave a narrow primitive streak on the posterior dorsal surface.
      if(fold===0&&this.kind==='ecto'&&Math.abs(u)<.055&&v>.02&&v<.85)continue;
      const pos=map(u,v),normal=map(u,v+.005).sub(pos).cross(map(u+.005,v).sub(pos)).normalize();
      pos.addScaledVector(normal,.046);
      this.nuclei.add(pos,V(.035,.018,.047),new T.Quaternion().setFromUnitVectors(V(0,1,0),normal));
    }
    this.nuclei.finish();
  }
}

export class EmbryoView {
  constructor(canvas,{sectionCanvas,labelHost,onError}={}){
    this.canvas=canvas;this.labelHost=labelHost;this.sectionCanvas=sectionCanvas;
    this.labels=[];this.materials=[];this.options={cut:.55,section:true,opacity:1,labels:true,trail:true};this.lastTime=0;
    try{this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){onError?.(e);this.failed=true;return;}
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.setClearColor(0xf5f8fb);this.renderer.localClippingEnabled=true;
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(34,1,.1,100);
    this.scene.add(new T.HemisphereLight(0xf6faff,0xc4c9d1,2.3));const light=new T.DirectionalLight(0xfff5e9,2.4);light.position.set(-4,7,6);this.scene.add(light);
    const rim=new T.DirectionalLight(0xc9ddff,1.3);rim.position.set(4,2,-5);this.scene.add(rim);
    this.plane=new T.Plane(V(0,0,-1),.55);this.angle=.35;this.elevation=.28;this.distance=9.6;
    this.early=new T.Group();this.blast=new T.Group();this.disc=new T.Group();this.scene.add(this.early,this.blast,this.disc);
    this.earlyCells=[];
    for(let i=0;i<8;i++){
      const m=new T.Mesh(SPHERE,this.material('cell'));const n=new T.Mesh(NUCLEUS,this.material('cell',true));this.early.add(m,n);this.earlyCells.push({m,n});
    }
    const seeds=lattice(32);this.morula=new T.Group();this.early.add(this.morula);this.packed=[];
    seeds.forEach((c,i)=>{
      const geometry=packedGeometry(c,seeds),body=new T.Mesh(geometry,this.material('cell')),nu=new T.Mesh(NUCLEUS,this.material('cell',true));
      const cap=new T.Mesh(new T.BufferGeometry(),this.material('cell',false,false)),capN=new T.Mesh(NUCLEUS,this.material('cell',true,false));this.morula.add(body,nu,cap,capN);
      const initial=lattice(8).reduce((a,b)=>a.distanceToSquared(c)<b.distanceToSquared(c)?a:b);
      const final=Float32Array.from(geometry.attributes.position.array);
      this.packed.push({body,nu,cap,capN,c,initial,final});nu.scale.setScalar(.145);
      body.material.color.offsetHSL((i%3-1)*.018,(i%4-2)*.015,(i%5-2)*.012);cap.material.color.copy(body.material.color);
    });
    const membrane=new T.Mesh(new T.SphereGeometry(2.3,48,32),new T.MeshPhysicalMaterial({color:0xc7d6e4,transparent:true,opacity:.10,roughness:.55,depthWrite:false,side:T.FrontSide}));this.early.add(membrane);
    const wire=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:128},(_,i)=>V(Math.cos(i*PI/64)*2.31,Math.sin(i*PI/64)*2.31,0))),new T.LineBasicMaterial({color:0xb3c3d5,transparent:true,opacity:.4}));this.early.add(wire);
    const shell=dualShell();this.blast.add(new T.Mesh(shell.g,this.material('shell')));
    const sn=this.pool('shell',shell.nuclei.length,.58,true);for(const p of shell.nuclei)sn.add(p,V(.057,.057,.021),new T.Quaternion().setFromUnitVectors(V(0,0,1),p.clone().normalize()));sn.finish();this.blast.add(sn.mesh);
    this.icm=this.pool('icm',32,1);this.icmN=this.pool('icm',32,.45,true);this.blast.add(this.icm.mesh,this.icmN.mesh);this.icmTargets=[];
    for(let i=0;i<24;i++){const a=i*2.39996,r=.17*Math.sqrt(i);this.icmTargets.push(V(-1.15+Math.cos(a)*r*.72,.8+Math.sin(a)*r*.82,-.56+(i%3)*.27));}
    this.sheets=[new Sheet(this,'ecto','ecto',-1,-.25),new Sheet(this,'ecto','ecto',.25,1),new Sheet(this,'ecto','neural'),new Sheet(this,'meso','meso'),new Sheet(this,'endo','endo')];
    this.support=new Sheet(this,'support','endo');
    this.migrants=this.pool('endo',120,1);this.migrantsM=this.pool('meso',120,1);this.disc.add(this.migrants.mesh,this.migrantsM.mesh);
    this.somites=this.pool('meso',70,1);this.disc.add(this.somites.mesh);
    this.paths=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x9b7855,transparent:true,opacity:.75,clippingPlanes:[this.plane]}));this.disc.add(this.paths);
    this.heart=new T.Group();for(let i=0;i<3;i++){const m=new T.Mesh(SPHERE,this.material('meso'));m.position.set(.23*(i-1),-1.03+Math.sin(i)*.08,-1.12);m.scale.set(.30,.24,.32);this.heart.add(m);}this.disc.add(this.heart);
    this.bind();this.resizeObserver=new ResizeObserver(()=>this.render());this.resizeObserver.observe(canvas.parentElement);this.update(0);
  }
  material(key,nucleus=false,clipped=true){
    const color=new T.Color(colors[key]);if(nucleus)color.multiplyScalar(.58);
    const mat=new T.MeshStandardMaterial({color,roughness:.77,metalness:0,side:T.DoubleSide,transparent:true,opacity:nucleus?.9:1,clippingPlanes:clipped?[this.plane]:[],depthWrite:true});
    mat.userData={key,nucleus,clipped};this.materials.push(mat);return mat;
  }
  pool(key,count,scale=1,nucleus=false,clipped=true){
    const mesh=new T.InstancedMesh(nucleus?NUCLEUS:SPHERE,this.material(key,nucleus,clipped),count);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);let n=0;
    return {mesh,reset(){n=0;},add(p,size,q){if(n>=count)return;dummy.position.copy(p);dummy.scale.copy(size);dummy.quaternion.copy(q||new T.Quaternion());dummy.updateMatrix();mesh.setMatrixAt(n++,dummy.matrix);},finish(){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;}};
  }
  bind(){
    const c=this.canvas;c.tabIndex=0;let last=null;
    c.addEventListener('pointerdown',e=>{last={x:e.clientX,y:e.clientY};c.setPointerCapture(e.pointerId);});
    c.addEventListener('pointermove',e=>{if(!last)return;this.angle-=(e.clientX-last.x)*.009;this.elevation=clamp(this.elevation+(e.clientY-last.y)*.007,-1.3,1.45);last={x:e.clientX,y:e.clientY};this.render();});
    const end=()=>last=null;c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);c.addEventListener('lostpointercapture',end);
    c.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();this.distance=clamp(this.distance+e.deltaY*.008,6,16);this.render();},{passive:false});
    c.addEventListener('keydown',e=>{const k=e.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(k))return;e.preventDefault();if(k==='Home')return this.view('reset');if(k==='ArrowLeft')this.angle-=.15;if(k==='ArrowRight')this.angle+=.15;if(k==='ArrowUp')this.elevation=Math.min(1.45,this.elevation+.15);if(k==='ArrowDown')this.elevation=Math.max(-1.3,this.elevation-.15);if(k==='+')this.distance=Math.max(6,this.distance-.6);if(k==='-')this.distance=Math.min(16,this.distance+.6);this.render();});
    c.addEventListener('webglcontextlost',e=>{e.preventDefault();c.parentElement.dataset.contextLost='true';});
    c.addEventListener('webglcontextrestored',()=>{delete c.parentElement.dataset.contextLost;this.update(this.lastTime,this.options);});
  }
  view(which){if(this.failed)return;if(which==='reset'){this.angle=.35;this.elevation=this.lastTime>=6?.48:.28;this.distance=9.6;}if(which==='top'){this.angle=0;this.elevation=1.45;}if(which==='side'){this.angle=0;this.elevation=.03;}if(which==='left')this.angle-=.22;if(which==='right')this.angle+=.22;if(which==='in')this.distance=Math.max(6,this.distance-.6);if(which==='out')this.distance=Math.min(16,this.distance+.6);this.render();}
  annotate(list){
    this.labels=list;if(!this.labelHost)return;
    if(this.labelHost.dataset.signature===list.map(x=>x[0]).join('|'))return;
    this.labelHost.dataset.signature=list.map(x=>x[0]).join('|');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    list.forEach(()=>{const line=document.createElementNS('http://www.w3.org/2000/svg','path');svg.append(line);});
    this.labelHost.replaceChildren(svg,...list.map(([name])=>{const el=document.createElement('span');el.textContent=name;return el;}));
  }
  update(time,options={}){
    if(this.failed)return;const previous=this.lastTime;this.lastTime=time;Object.assign(this.options,options);const i=Math.min(10,Math.floor(time)),p=time-i;
    if(previous<6&&time>=6){this.elevation=.52;this.angle=.65;}else if(previous>=6&&time<6){this.elevation=.28;this.angle=.35;}
    const cut=this.options.section&&i>=4;this.plane.constant=cut?this.options.cut:100;
    this.early.visible=i<5;this.blast.visible=i===5||i===6;this.disc.visible=i>=6;
    for(const m of this.materials){const {key,nucleus}=m.userData;const selected=this.options.highlight, inactive=selected&&!['cell','icm','support','shell',selected].includes(key);m.opacity=inactive?.13:(nucleus?.83:1);if(key==='shell'||key==='ecto')m.opacity*=this.options.opacity;if(key==='cell'&&!nucleus)m.opacity*=.96;m.depthWrite=!inactive&&m.opacity>.45;m.needsUpdate=false;}
    if(i<5){
      this.morula.visible=i===4;
      this.earlyCells.forEach(({m,n})=>m.visible=n.visible=i<4);
      if(i<4){const count=[1,2,4,8][i],from=lattice(Math.max(1,count/2)),to=lattice(count),f=i===0?1:smooth(p/.78),r=[1.99,1.21,.99,.88][i];
        this.earlyCells.forEach(({m,n},k)=>{m.visible=n.visible=k<count;if(k>=count)return;const a=from[Math.floor(k/2)],b=to[k],local=smooth((p-(k/2)*.025)/.72);const q=i===0?1:local;const pos=a.clone().lerp(b,q);const prevR=[1.99,1.99,1.21,.99][i];m.position.copy(pos);m.scale.setScalar(mix(prevR,r,q));m.scale.y*=1+.08*Math.sin(q*PI);n.position.copy(pos).add(V(.06,.1,m.scale.z*.65));n.scale.setScalar(m.scale.x*.22);});
      }else{
        const f=smooth(p/.78);this.morula.scale.setScalar(1);
        const key=f.toFixed(3)+'|'+this.options.cut+'|'+cut;
        if(this.packingKey!==key)for(const cell of this.packed){const {body,nu,cap,capN,c,initial,final}=cell;const a=body.geometry.attributes.position;
          for(let k=0;k<a.count;k++){const end=V(final[k*3],final[k*3+1],final[k*3+2]);const start=end.clone().sub(c).normalize().multiplyScalar(.87).add(initial);const q=start.lerp(end,f);a.setXYZ(k,q.x,q.y,q.z);}a.needsUpdate=true;body.geometry.computeVertexNormals();
          nu.position.copy(initial).lerp(c,f);cap.visible=cut;cap.geometry.dispose();cap.geometry=sectionGeometry(body.geometry,this.options.cut);
          const dz=this.options.cut-nu.position.z;capN.visible=cut&&Math.abs(dz)<.18;const r=Math.sqrt(Math.max(0,.18**2-dz**2));capN.position.set(nu.position.x,nu.position.y,this.options.cut+.01);capN.scale.set(r,r,.015);
        }
        this.packingKey=key;
      }
      this.annotate(i===4?[['조밀한 세포 덩어리',V(-1,1.6,0)],['안쪽에도 세포가 있습니다',V(.2,-.4,.1)]]:[['배아의 바깥 경계',V(1.65,1.5,0)],['핵 · DNA',V(-.3,.25,1.3)]]);
    }
    this.blast.position.set(0,0,0);this.blast.scale.setScalar(1);
    if(i===5||i===6){const f=i===6?1:smooth(p/.86);this.blast.scale.setScalar(mix(.94,1,f));this.icm.reset();this.icmN.reset();const initial=lattice(32);this.icmTargets.forEach((end,k)=>{const pos=initial[k].clone().multiplyScalar(.77).lerp(end,f),r=mix(.45,.29,f);this.icm.add(pos,V(r,r,r));this.icmN.add(pos.clone().add(V(0,.08,r*.8)),V(.085,.07,.06));});this.icm.finish();this.icmN.finish();if(i===5)this.annotate([['바깥 세포층 · 영양막',V(1.35,1.5,-.2)],['속세포덩어리',V(-1.12,.85,.3)],['포배강 · 내부 공간',V(.4,-.55,-.45)]]);}
    let fold=0;
    if(i>=6){
      const f=i===6?smooth(p/.8):1;this.disc.scale.setScalar(i===6?mix(.32,1,f):1);this.disc.position.set(i===6?mix(-.8,0,f):0,0,0);
      if(i===6){this.blast.scale.setScalar(mix(.91,.24,f));this.blast.position.set(-2.65*f,1.4*f,-1.3*f);}
      fold=i>=9?smooth(clamp(time-9)):0;
      this.sheets[0].update(fold);this.sheets[1].update(fold);this.sheets[2].update(fold);
      this.sheets[3].update(fold,i<8?0:i===8?Math.max(.015,smooth(p)):1);
      this.sheets[4].update(fold,i<7?0:i===7?Math.max(.015,smooth(p)):1);
      this.support.update(0,i<7?1:i===7?1-smooth(p):0);this.support.mesh.visible=i<8;this.support.nuclei.mesh.visible=i<8;
      // Unreplaced lower cells retreat outward as definitive endoderm spreads.
      this.support.mesh.scale.x=1;this.support.mesh.position.y=-.05;this.support.nuclei.mesh.position.y=-.05;
      this.migrants.reset();this.migrantsM.reset();const segments=[];
      if(i===7||i===8){const pool=i===7?this.migrants:this.migrantsM, floor=i===7?-.18:.13;
        const route=(s,sign,v)=>{const width=Math.sqrt(1-v*v*.94);return s<.40?V(sign*mix(1.48*width,.025,s/.4),.48,2.48*v):s<.60?V(sign*.025,mix(.48,floor,(s-.4)/.2),2.48*v):V(sign*mix(.025,1.45*width,(s-.6)/.4),floor,2.48*v);};
        for(const sign of [-1,1])for(let j=0;j<5;j++){
          const v=.06+j*.15;
          if(this.options.trail)for(let k=0;k<40;k++){segments.push(...route(k/40,sign,v).toArray(),...route((k+1)/40,sign,v).toArray());}
          for(let k=0;k<4;k++){const t=clamp(p*1.6-k*.18-j*.035);if(t<=0||t>=1)continue;pool.add(route(t,sign,v),V(.07,.085,.07));}
        }
      }
      this.migrants.finish();this.migrantsM.finish();this.paths.geometry.dispose();this.paths.geometry=new T.BufferGeometry();this.paths.geometry.setAttribute('position',new T.Float32BufferAttribute(segments,3));
      this.somites.reset();if(fold>.25){for(const s of [-1,1])for(let k=0;k<12;k++){const v=-.65+k*.117;const pos=V(s*mix(.85,.59,fold),mix(.16,.27,fold)-.82*fold*v*v,2.3*Math.sin(v*1.1));this.somites.add(pos,V(.19,.17,mix(.12,.16,clamp(time-10))));}}this.somites.finish();
      this.heart.visible=time>10.12;this.heart.scale.setScalar(smooth((time-10.1)/.55));
      if(i===6)this.annotate([['속세포덩어리에서 확대',V(-2.65,1.4,-1.3)],['몸을 만들 세포층 · 상배엽',V(-.7,.44,-.6)],['아래쪽 보조층',V(.8,-.22,.8)]]);
      else if(i<9)this.annotate([['세포가 들어가는 통로 · 원시선',V(0,.5,1.05)],[i===7?'몸의 내배엽 형성':'내배엽',V(-1.3,-.20,-.25)],[i===8?'중배엽':'상배엽',V(1.2,i===8?.13:.44,-.35)],...(i===8?[['외배엽',V(-.9,.44,-1.05)]]:[])]);
      else this.annotate([['외배엽 → 표피',tissuePoint('ecto',-.55,-.4,fold)],['외배엽 → 신경관',tissuePoint('neural',0,-.6,fold)],['중배엽 → 근육 등',V(.66,.1,-.05)],['내배엽 → 장관 상피',tissuePoint('endo',.25,.12,fold)]]);
    }
    this.fold=fold;this.render();
  }
  render(){
    if(this.failed)return;const w=this.canvas.parentElement.clientWidth,h=this.canvas.parentElement.clientHeight;if(w<1||h<1)return;
    const size=this.renderer.getSize(new T.Vector2());if(size.x!==w||size.y!==h)this.renderer.setSize(w,h,false);
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
    this.camera.position.set(this.distance*Math.sin(this.angle)*Math.cos(this.elevation),this.distance*Math.sin(this.elevation),this.distance*Math.cos(this.angle)*Math.cos(this.elevation));this.camera.lookAt(0,0,0);
    this.renderer.render(this.scene,this.camera);
    if(this.labelHost){
      this.labelHost.hidden=!this.options.labels;const svg=this.labelHost.querySelector('svg');
      [...this.labelHost.querySelectorAll('span')].forEach((el,j)=>{
        const q=this.labels[j][1].clone().project(this.camera),ax=(q.x*.5+.5)*w,ay=(-q.y*.5+.5)*h;
        const right=j%2===1, half=el.offsetWidth/2, x=clamp(right?w*.84:w*.16,half+7,w-half-7), y=(j<2?(this.lastTime>=6?.45:.24):.77)*h;
        el.hidden=q.z>1;el.style.left=`${x}px`;el.style.top=`${y}px`;
        const line=svg.children[j];line.setAttribute('d',`M${ax},${ay} L${x+(right?-20:20)},${y}`);
      });
    }
    this.crossSection();
  }
  crossSection(){
    const canvas=this.sectionCanvas;if(!canvas)return;const show=this.lastTime>=6&&this.options.section;canvas.parentElement.hidden=!show;if(!show)return;
    const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height;c.clearRect(0,0,W,H);c.fillStyle='#ffffffed';c.fillRect(0,0,W,H);
    const v=clamp(this.options.cut/2.48,-.94,.94),f=this.fold||0;
    const draw=(kind,start=-1,end=1)=>{c.beginPath();for(let k=0;k<=100;k++){const p=tissuePoint(kind,mix(start,end,k/100),v,f),x=W/2+p.x*58,y=H*.50-p.y*58;if(k===0)c.moveTo(x,y);else c.lineTo(x,y);}c.strokeStyle='#'+colors[kind==='neural'?'ecto':kind].toString(16);c.lineWidth=8;c.lineCap='round';c.stroke();};
    draw('ecto');if(this.lastTime>=8){const growth=this.lastTime<9?smooth(this.lastTime-8):1;draw('meso',-growth,growth);}
    if(this.lastTime<8){c.strokeStyle='#b9bdc5';c.lineWidth=7;c.beginPath();c.moveTo(35,H*.55);c.lineTo(W-35,H*.55);c.stroke();}
    if(this.lastTime>=7){const growth=this.lastTime<8?smooth(this.lastTime-7):1;draw('endo',-growth,growth);}if(f>0)draw('neural');
    if(this.lastTime>=7&&this.lastTime<9){const y=this.lastTime<8?H*.5+10:H*.5-6;c.strokeStyle='#80634b';c.lineWidth=2;c.beginPath();c.moveTo(W/2,H*.5-38);c.lineTo(W/2,y);c.lineTo(W/2+20,y);c.stroke();}
  }
}
