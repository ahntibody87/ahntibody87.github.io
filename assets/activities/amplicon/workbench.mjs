// A small software renderer for the fixed camera. All equipment is modeled
// in world coordinates, then projected and lit as a mesh on the canvas.
const WIDTH=1000, HEIGHT=440, HORIZON=235;
const CAMERA_TILT=.67;
const sine=Math.sin(CAMERA_TILT), cosine=Math.cos(CAMERA_TILT);
function project([x,y,z]){
  const depth=z*cosine+y*sine;
  const scale=68/(1-depth/23);
  return {x:500+x*scale,y:HORIZON+(z*sine-y*cosine)*scale,depth};
}
function paintScene(canvas,objects,tool,tip,liquid){
  const ctx=canvas.getContext('2d');
  const faces=[];
  function face(points,color,light=1){
    const view=points.map(project);
    faces.push({view,color,light,depth:view.reduce((sum,p)=>sum+p.depth,0)/view.length});
  }
  function box(x,y,z,w,h,d,color){
    const l=x-w/2,r=x+w/2,b=z-d/2,f=z+d/2,t=y+h;
    face([[l,y,f],[r,y,f],[r,t,f],[l,t,f]],color,.72);
    face([[l,y,b],[l,y,f],[l,t,f],[l,t,b]],color,.59);
    face([[r,y,f],[r,y,b],[r,t,b],[r,t,f]],color,.85);
    face([[l,t,b],[l,t,f],[r,t,f],[r,t,b]],color,1.09);
  }
  function cylinder(x,y,z,r,h,color,bottom=r,segments=12){
    const upper=[],lower=[];
    for(let i=0;i<segments;i++){
      const angle=2*Math.PI*i/segments;
      upper.push([x+r*Math.cos(angle),y+h,z+r*Math.sin(angle)]);
      lower.push([x+bottom*Math.cos(angle),y,z+bottom*Math.sin(angle)]);
    }
    upper.forEach((point,i)=>{
      const next=(i+1)%segments;
      face([point,lower[i],lower[next],upper[next]],color,.76+.23*Math.sin(2*Math.PI*(i+.5)/segments+.9));
    });
    face(upper,color,1.11);
  }
  function tube(o,bottle=false){
    const {x,z}=o;
    const y=o.base??.16, radius=bottle?.32:.20, height=bottle?.75:.62;
    cylinder(x,y,z,radius,height,'#bcced4',radius*.65);
    cylinder(x,y+.04,z+.012,radius*1.025,Math.min(.48,o.fill??.23),o.color,radius*.64);
    const open=tool&&Math.hypot(tool.x-x,tool.z-z)<.15&&Math.abs(tool.y-(o.toolHeight??.58))<.17;
    if(open){
      cylinder(x,y+height,z,radius*1.06,.035,'#eef3ee');
      cylinder(x,y+height+.036,z,radius*.72,.012,'#385663');
      cylinder(x-radius*.95,y+.14,z-radius*.43,radius*.94,.095,o.color);
    }else cylinder(x,y+height,z,radius*1.17,.12,o.color);
    box(x,y+.27,z+radius*.96,radius*1.5,.18,.025,'#f4f6f3');
  }
  const coolerScene=objects.some(object=>object.kind==='cooler');
  if(!coolerScene){
    box(0,-1.55,2.35,12.4,1.35,.45,'#5e7379');
    box(0,-.21,0,13,.21,6.2,'#bdc8c6');
    box(0,-.04,-2.88,13,.13,.14,'#d5dddd');
  }
  const furniture=faces.splice(0);
  const supports=[];
  for(const o of objects){
    const {x,z}=o;
    if(o.kind==='cooler'){
      box(x,0,z,5.8,.38,3.7,'#4f8eab');
      box(x,.38,z,5.46,.055,3.37,'#c4e9ef');
      box(x,.36,z+1.69,5.8,.40,.28,'#549abb');
      box(x-2.75,.35,z,.29,.45,3.35,'#6babc4');
      box(x+2.75,.35,z,.29,.45,3.35,'#5b9cb8');
      box(x,.4,z-1.68,5.8,.42,.25,'#80b6ca');
      box(x,.52,z+1.86,.75,.18,.16,'#e1eef3');
      if(o.open){
        box(x,.78,z-1.70,5.87,2.10,.25,'#a6cbd8');
        box(x,1.04,z-1.53,5.36,1.60,.08,'#d7e8e9');
        for(let i=0;i<9;i++)box(x-2.16+i*.54,.44,z+.96,.25,.12,.24,'#e1f2f5');
      }else{
        box(x,.79,z,6.04,.28,3.87,'#aacbd9');
        box(x,.79,z+1.97,.95,.20,.11,'#4f829f');
      }
    }else if(o.kind==='receivingPad'){
      box(x,0,z,5.10,.20,2.60,'#a8c4ce');
    }else if(o.kind==='coldRack'){
      const y=o.base??.33, width=o.width??6.15;
      box(x,y,z,width,.17,.86,'#3c92a2');
      box(x,y+.17,z,width,.08,.81,'#b3dfe3');
    }else if(o.kind==='ice'){
      box(x,0,z,8.7,.25,2.6,'#5aa9bc');
      box(x,.25,z,8.45,.045,2.36,'#afdeea');
      for(let i=0;i<20;i++)box(x-3.9+(i%10)*.84,.30,z-.94+Math.floor(i/10)*1.77,.28,.12,.22,'#c6e9f2');
    }else if(o.kind==='rack'){
      box(x,.02,z,6.4,.14,1.28,'#637fa3');
      box(x,.16,z,6.4,.18,1.13,'#8aa7bf');
    }else if(o.kind==='tips'){
      box(x,.02,z,1.24,.4,1.22,'#5ea5aa');
      box(x,.42,z,1.21,.08,1.18,'#dbf2ed');
      for(let i=0;i<9;i++)cylinder(x+(i%3-1)*.31,.49,z+(Math.floor(i/3)-1)*.31,.083,.13,'#e9f8f1',.055,8);
    }else if(o.kind==='bin'){
      box(x,.02,z,1.15,.58,1.12,'#a67d8c');
      box(x,.59,z,1.25,.08,1.21,'#d7b1bd');
      box(x,.67,z,.91,.016,.8,'#4b3540');
    }else if(o.kind==='tank'){
      const gelWidth=8,gelDepth=3.05,base=.38,rim=.57,wellHalf=.35,wellDepth=.76;
      const gelBack=z-gelDepth/2,gelFront=z+gelDepth/2;
      const wellBack=o.wellZ-wellDepth/2,wellFront=o.wellZ+wellDepth/2;
      box(x,0,z,9.1,.22,3.95,'#5f7f95');
      box(x,.22,z,8.85,.16,3.70,'#a4c7d5');
      box(x,base,z,gelWidth,.07,gelDepth,'#92bdb3');
      box(x,base+.07,(gelBack+wellBack)/2,gelWidth,rim-base-.07,wellBack-gelBack,'#b0d6cb');
      box(x,base+.07,(wellFront+gelFront)/2,gelWidth,rim-base-.07,gelFront-wellFront,'#b0d6cb');
      let left=x-gelWidth/2;
      for(let i=0;i<=o.wellCount;i++){
        const center=x+(i-(o.wellCount-1)/2)*o.wellSpacing;
        const right=i===o.wellCount?x+gelWidth/2:center-wellHalf;
        box((left+right)/2,base+.07,o.wellZ,right-left,rim-base-.07,wellDepth,'#b0d6cb');
        left=center+wellHalf;
      }
      box(x,.38,z-1.69,8.7,.14,.12,o.reverse?'#b2576d':'#3e5570');
      box(x,.38,z+1.69,8.7,.14,.12,o.reverse?'#3e5570':'#b2576d');
      if(o.progress!==null){
        for(let i=0;i<o.wellCount;i++){
          const laneX=x+(i-(o.wellCount-1)/2)*o.wellSpacing;
          box(laneX,rim,z-.38+o.progress*1.53,1.1,.008,.15,'#899ebc');
        }
      }
    }else if(o.kind==='well'){
      box(x,.452,z,.68,.012,.74,o.color);
    }else tube(o,o.kind==='bottle');
    if(o.kind==='receivingPad')furniture.push(...faces.splice(0));
    else if(['cooler','coldRack','ice','rack','tank'].includes(o.kind))supports.push(...faces.splice(0));
  }
  if(tool){
    const {x,y,z}=tool;
    cylinder(x,y+.43,z,.15,.72,'#2f7193',.13);
    cylinder(x,y+1.15,z,.21,.64,'#edf2ef',.17);
    cylinder(x,y+1.77,z,.13,.13,'#28566d');
    box(x,y+1.36,z+.18,.21,.15,.046,'#213f54');
    if(tip)cylinder(x,y+.02,z,.105,.45,liquid?'#68cde2':'#d9edeb',.027,10);
    // Gloved palm and fingers move with the pipette grip.
    cylinder(x+.28,y+1.12,z-.045,.25,.42,'#5a9fc1',.19,10);
    for(let i=0;i<3;i++)box(x+.16,y+1.15+i*.11,z+.13,.35,.08,.16,'#81bed7');
    box(x+.54,y+1.20,z-.10,.35,.20,.34,'#b8d9e4');
  }
  const background=ctx.createLinearGradient(0,0,0,HEIGHT);
  background.addColorStop(0,coolerScene?'#d6e6ef':'#182d3b');
  background.addColorStop(.60,coolerScene?'#eaf3f7':'#345363');
  background.addColorStop(1,coolerScene?'#c3d8e3':'#1b303b');
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  if(!canvas.closest('.amp-vr')){
    ctx.fillStyle=background;
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle='#ffffff0b';
    for(let i=1;i<7;i++)ctx.fillRect(i*145,0,1,214);
    ctx.fillRect(0,145,WIDTH,1);
  }
  const ordered=group=>group.sort((a,b)=>a.depth-b.depth);
  for(const {view,color,light} of [...ordered(furniture),...ordered(supports),...ordered(faces)]){
    const channel=i=>Math.min(255,Math.round(parseInt(color.slice(i,i+2),16)*light));
    ctx.fillStyle='rgb('+[channel(1),channel(3),channel(5)].join(',')+')';
    ctx.beginPath();
    view.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle=ctx.fillStyle;
    ctx.lineWidth=.55;
    ctx.stroke();
  }
}

export function mountWorkbench(scene,getObjects,getToolState,onTarget){
  const canvas=scene.querySelector('canvas');
  const targets=scene.querySelectorAll('[data-bench-target]');
  const anchored=scene.querySelectorAll('[data-bench-target],[data-bench-label]');
  let drag=null;
  let suppressClickUntil=0;
  let tool=getToolState().position;
  function draw(position=tool){
    const {tip,liquid}=getToolState();
    paintScene(canvas,getObjects(),position,tip,liquid);
  }
  function positionTargets(){
    const objects=getObjects();
    for(const target of anchored){
      const o=objects.find(object=>object.id===(target.dataset.benchTarget??target.dataset.benchLabel));
      if(!o)continue;
      const p=project([o.x,o.labelHeight??.35,o.labelZ??o.z]);
      target.style.left=(100*p.x/WIDTH)+'%';
      target.style.top=(100*p.y/HEIGHT)+'%';
    }
  }
  for(const target of targets)target.addEventListener('click',()=>{
    if(performance.now()>suppressClickUntil)onTarget(target.dataset.benchTarget);
  });
  scene.addEventListener('pointerdown',event=>{
    if(event.target.closest('.amp-scene-prompt'))return;
    const target=event.target.closest('[data-bench-target]');
    if(target?.disabled||!event.isPrimary||event.button!==0)return;
    const bounds=canvas.getBoundingClientRect();
    const grip=tool&&project([tool.x,tool.y+1.32,tool.z]);
    const onPipette=grip&&Math.hypot(
      bounds.left+grip.x*bounds.width/WIDTH-event.clientX,
      bounds.top+grip.y*bounds.height/HEIGHT-event.clientY
    )<24;
    if(!target&&!onPipette)return;
    drag={id:target?.dataset.benchTarget??'pipette',x:event.clientX,y:event.clientY,pointer:event.pointerId};
    scene.setPointerCapture(event.pointerId);
  });
  scene.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointer||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
    const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-bench-target]');
    scene.querySelector('.amp-drag-over')?.classList.remove('amp-drag-over');
    if(hit&&scene.contains(hit)&&!hit.disabled)hit.classList.add('amp-drag-over');
    if(drag.id==='pipette'||scene.dataset.benchScene==='gel'||getToolState().tip){
      const bounds=canvas.getBoundingClientRect();
      const screenX=(event.clientX-bounds.left)*WIDTH/bounds.width;
      const screenY=(event.clientY-bounds.top)*HEIGHT/bounds.height;
      const y=1.2;
      const vertical=(screenY-HORIZON)/68;
      const z=(vertical*(1-y*sine/23)+y*cosine)/(sine+vertical*cosine/23);
      const x=(screenX-500)*(1-(z*cosine+y*sine)/23)/68;
      if(Math.abs(x)<7&&Math.abs(z)<4)draw({x,y,z});
    }
  });
  scene.addEventListener('pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointer)return;
    const from=drag.id;
    const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-bench-target]');
    drag=null;
    draw();
    scene.querySelector('.amp-drag-over')?.classList.remove('amp-drag-over');
    suppressClickUntil=performance.now()+350;
    if(hit&&scene.contains(hit)&&!hit.disabled)onTarget(hit.dataset.benchTarget,from);
  });
  scene.addEventListener('pointercancel',()=>{
    drag=null;
    draw();
    scene.querySelector('.amp-drag-over')?.classList.remove('amp-drag-over');
  });
  positionTargets();
  draw();
  return {
    draw,
    refresh(){draw();positionTargets();},
    async move(id,duration){
      const target=getObjects().find(o=>o.id===id);
      if(!target)return;
      const start=tool??{x:4.6,y:1,z:1};
      const end={x:target.x,y:(target.toolHeight??.58),z:target.z};
      const startTime=performance.now();
      if(duration>0)await new Promise(resolve=>{
        function frame(now){
          const progress=Math.min(1,(now-startTime)/duration);
          const ease=progress*progress*(3-2*progress);
          draw({x:start.x+(end.x-start.x)*ease,y:start.y+(end.y-start.y)*ease+Math.sin(Math.PI*ease)*.45,z:start.z+(end.z-start.z)*ease});
          if(progress<1&&canvas.isConnected)requestAnimationFrame(frame);else resolve();
        }
        requestAnimationFrame(frame);
      });
      tool=end;
      draw();
      return end;
    }
  };
}
