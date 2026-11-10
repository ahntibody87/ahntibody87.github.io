import {benchVisual,closedCoolerTexture} from './photo-bench.mjs?v=2';
import {daylightMaterials,referencePose,eyeHeight,fieldOfView,referenceAspect} from './room-materials.mjs';
import * as T from '../embryo-atlas/vendor/three.module.min.js';

const stations = [
  {id:'ice', label:'아이스박스', x:4.57, y:6.8},
  {id:'bench', label:'작업대', x:5.65, y:6.8},
  {id:'vortex', label:'볼텍스 믹서', x:6.45, y:6.8},
  {id:'spin', label:'미니 원심분리기', x:8.55, y:2.35},
  {id:'pcr', label:'PCR 기기', x:7.65, y:4.5},
  {id:'gel', label:'전기영동 장치', x:4.8, y:4.3},
  {id:'uv', label:'UV 관찰기', x:2.0, y:2.0}
];
const counters = [
  {x:5,z:6.8,w:3.65,d:1.1},
  {x:4.8,z:4.3,w:2.35,d:1.25,open:true},
  {x:7.65,z:4.5,w:2.0,d:1.18,open:true},
  {x:2,z:2,w:1.35,d:1.05,open:true},
  {x:8.55,z:2.35,w:1.45,d:1.1,open:true},
  {x:.48,z:5,w:.96,d:9.15}, {x:5,z:.38,w:9,d:.76}
];

function buildRoom() {
  const scene = new T.Scene();
  scene.background = new T.Color('#c4d1d5');
  const palette = {
    paint:'#e1e0d7', trim:'#6e7778', wood:'#ae8d67', enamel:'#dbd9d0',
    epoxy:'#373e42', steel:'#9aa4a8', dark:'#242b30', blue:'#285878',
    pale:'#e2e5e3', amber:'#b99a67', glass:'#aacbd2', red:'#a7443c'
  };
  const materials = Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,new T.MeshStandardMaterial({color,roughness:key==='epoxy'?.39:.72,metalness:key==='steel'?.45:0})]));
  materials.window = new T.MeshBasicMaterial({color:'#cfe5ed'});
  materials.display = new T.MeshBasicMaterial({color:'#679eaa'});
  materials.clear = new T.MeshPhysicalMaterial({color:'#a5d4df',transparent:true,opacity:.55,roughness:.18});
  materials.floor=new T.MeshStandardMaterial({color:'#c3bcb0',roughness:.65});
  const daylight=daylightMaterials(materials);
  const cube = new T.BoxGeometry();
  function box(x,y,z,w,h,d,key,group=scene) {
    const mesh = new T.Mesh(cube,group===scene?daylight.material(key):materials[key]);
    mesh.scale.set(w,h,d);
    mesh.position.set(x,y,z);
    mesh.receiveShadow = true;
    mesh.castShadow = key !== 'clear';
    group.add(mesh);
    return mesh;
  }
  const round = new T.CylinderGeometry(1,1,1,18);
  function cylinder(x,y,z,r,h,key,group=scene) {
    const mesh = new T.Mesh(round,group===scene?daylight.material(key):materials[key]);
    mesh.position.set(x,y,z);
    mesh.scale.set(r,h,r);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  const ground=new T.Mesh(new T.PlaneGeometry(10.5,10.5),daylight.material('floor'));
  ground.rotation.x=-Math.PI/2;
  ground.position.set(5,0,5);
  ground.receiveShadow=true;
  scene.add(ground);

  box(5,3.3,5,10.3,.13,10.3,'paint');
  box(5,1.65,-.10,10.2,3.3,.15,'paint');
  box(10.07,1.65,5,.14,3.3,10.2,'paint');
  box(5,1.65,10.07,10.2,3.3,.14,'paint');
  box(-.21,1.65,5,.12,3.3,10.2,'window');
  box(-.08,.68,5,.12,1.36,10.2,'paint');
  box(-.08,3.07,5,.12,.46,10.2,'paint');
  for(let z=1;z<10;z+=2){
    box(-.13,2.09,z,.055,1.48,1.90,'window');
    box(.01,2.09,z-.96,.11,1.51,.065,'trim');
    box(.01,2.40,z,.11,.05,1.90,'trim');
    box(.04,1.35,z,.23,.07,1.95,'enamel');
  }
  for(const x of [2.4,5,7.6])for(const z of [2.4,7.2]){
    box(x,3.22,z,.31,.06,1.65,'enamel');
    box(x,3.18,z,.22,.02,1.54,'window');
  }
  for(let x=1;x<9;x+=1.12){
    box(x,1.67,.12,1.08,.94,.27,'wood');
    box(x,1.67,.27,.91,.77,.025,'glass');
    for(const y of [1.48,1.77]){
      box(x,y,.31,.92,.034,.1,'wood');
      for(let i=0;i<4;i++)cylinder(x-.32+i*.21,y+.081,.38,.051,.14,i%2?'amber':'pale');
    }
    box(x+.36,1.66,.31,.025,.17,.04,'steel');
  }
  box(9.98,1.87,4.3,.05,1.09,2.7,'trim');
  box(9.94,1.87,4.3,.035,1.00,2.60,'enamel');
  for(const {x,z,w,d,open} of counters){
    box(x,.91,z,w,.085,d,'epoxy');
    if(open){
      box(x,.80,z,w-.08,.15,d-.10,'enamel');
      for(const dx of [-1,1])for(const dz of [-1,1]){
        box(x+dx*(w/2-.12),.41,z+dz*(d/2-.12),.13,.82,.13,'enamel');
      }
      continue;
    }
    box(x,.45,z,w-.16,.84,d-.16,'enamel');
    const doors=Math.max(1,Math.round(w/.7));
    for(let i=0;i<doors;i++){
      const doorX=x-w/2+(i+.5)*w/doors;
      box(doorX,.47,z+d/2-.065,w/doors-.026,.73,.035,'enamel');
      box(doorX,.74,z+d/2-.034,.14,.022,.038,'steel');
    }
  }
  box(.37,.962,4.8,.45,.018,.62,'steel');
  box(.37,.976,4.8,.32,.018,.49,'dark');
  cylinder(.16,1.10,4.81,.021,.26,'steel');
  box(.25,1.22,4.81,.20,.035,.035,'steel');
  for(const [x,z] of [[4.30,5.22],[5.30,5.22],[7.65,5.37]]){
    cylinder(x,.53,z,.23,.052,'wood');
    const ring=new T.Mesh(new T.TorusGeometry(.16,.012,8,20),daylight.material('steel'));
    ring.rotation.x=Math.PI/2;
    ring.position.set(x,.24,z);
    scene.add(ring);
    for(let i=0;i<4;i++){
      const angle=(i+.5)*Math.PI/2;
      const leg=cylinder(x+Math.cos(angle)*.15,.26,z+Math.sin(angle)*.15,.012,.53,'steel');
      leg.rotation.z=Math.cos(angle)*.17;
      leg.rotation.x=-Math.sin(angle)*.17;
    }
  }

  const dynamic = new T.Group();
  scene.add(dynamic);
  const carry = new T.Group();
  box(0,-.045,-.50,.34,.075,.20,'blue',carry);
  box(-.17,-.065,-.46,.09,.058,.12,'blue',carry);
  box(.17,-.065,-.46,.09,.058,.12,'blue',carry);
  for(let i=0;i<4;i++)cylinder(-.12+i*.08,.018,-.5,.023,.085,'pale',carry);
  carry.position.y=-.31;

  function showStation(id,status){
    dynamic.clear();
    if(!id)return;
    const {x,y:z}=stations.find(item=>item.id===id);
    const base=.955;
    if(id==='vortex'&&status.vortexTube){
      cylinder(x,base+.235,z,.032,.14,'pale',dynamic);
    }
    if(id==='spin'&&status.spinLoaded&&!status.spinClosed){
      status.spinLoaded.forEach(i=>{
        const a=i*Math.PI/2;
        cylinder(x+Math.sin(a)*.11,base+.22,z-Math.cos(a)*.11,.023,.11,'pale',dynamic);
      });
    }
    if(id==='pcr'&&status.pcrLoaded&&!status.pcrRunning){
      for(let i=0;i<status.pcrLoaded;i++)cylinder(x-.12+i*.08,base+.31,z+.1,.023,.10,'pale',dynamic);
    }
    if(id==='uv'&&status.uvPlaced&&!status.uvClosed){
      box(x,base+.279,z+.075,.23,.025,.14,'glass',dynamic);
    }
  }

  const equipment=new T.Group();
  scene.add(equipment);
  let cooler;
  const coolerReady=closedCoolerTexture().then(map=>{
    if(!map)return;
    const {x,y:z}=stations[0];
    cooler=new T.Sprite(new T.SpriteMaterial({map,transparent:true,alphaTest:.025,toneMapped:false}));
    cooler.center.set(.5,0);
    cooler.position.set(x-.035,.955,z-.06);
    cooler.scale.set(.95,.57,1);
    scene.add(cooler);
  });
  for(const {id,x,y:z} of stations){
    const base=.955;
    if(id==='ice'){
      continue;
    }else if(id==='bench'){
      box(x,base+.04,z,.45,.08,.25,'blue',equipment);
      for(let i=0;i<5;i++)cylinder(x-.17+i*.084,base+.104,z,.026,.095,'pale',equipment);
      box(x-.38,base+.055,z,.23,.11,.22,'clear',equipment);
      box(x+.29,base+.035,z+.14,.26,.04,.035,'pale',equipment).rotation.y=.48;
    }else if(id==='vortex'||id==='spin'){
      const spin=id==='spin';
      cylinder(x,base+.083,z,spin?.23:.16,.165,'pale',equipment);
      cylinder(x,base+.17,z,spin?.205:.075,.065,'dark',equipment);
      box(x,base+.085,z+(spin?.22:.15),.08,.039,.028,'display',equipment);
    }else if(id==='gel'){
      box(x,base+.06,z,.47,.12,.37,'clear',equipment);
      box(x,base+.135,z,.50,.034,.40,'glass',equipment);
      for(const [offset,color] of [[-.20,'dark'],[.20,'red']]){
        cylinder(x+offset,base+.185,z,.024,.09,color,equipment);
        const wire=new T.CatmullRomCurve3([new T.Vector3(x+offset,base+.22,z),new T.Vector3(x+offset+.09,base+.33,z-.14),new T.Vector3(x+.34,base+.13,z-.18)]);
        equipment.add(new T.Mesh(new T.TubeGeometry(wire,15,.011,5,false),materials[color]));
      }
      box(x+.43,base+.08,z-.15,.27,.16,.21,'dark',equipment);
      box(x+.43,base+.09,z-.04,.14,.039,.016,'display',equipment);
    }else{
      box(x,base+.13,z,.56,.26,.45,id==='uv'?'dark':'pale',equipment);
      box(x,base+.30,z-.052,.51,.09,.34,id==='uv'?'glass':'pale',equipment);
      const screen=box(x,base+.22,z+.204,.27,.021,.14,'display',equipment);
      screen.rotation.x=.38;
    }
  }

  scene.add(new T.HemisphereLight('#f6fbff','#c5b69e',2.05));
  const sun=new T.DirectionalLight('#fff0d8',2.1);
  sun.position.set(-3,5,2); sun.target.position.set(5,0,5);
  sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:22});
  sun.shadow.normalBias=.024;
  scene.add(sun,sun.target);
  return {
    scene,carry,showStation,ready:Promise.all([daylight.ready,coolerReady]),
    aim(x,z,work,showCooler){
      daylight.aim(x,z);
      const distance=Math.hypot(x-referencePose.x,z-referencePose.z);
      equipment.visible=distance>.55&&!work;
      if(cooler)cooler.visible=showCooler;
    }
  };
}

const bound = n=>Math.max(.44,Math.min(9.56,n));
const blocked = (x,z)=>counters.some(c=>Math.abs(x-c.x)<c.w/2+.18&&Math.abs(z-c.z)<c.d/2+.18);
const directions = {w:'forward',s:'back',a:'left',d:'right',arrowup:'forward',arrowdown:'back',arrowleft:'turn-left',arrowright:'turn-right'};

export function createPerspective(){
  let renderer, lab, camera, unavailable=false, cleanup=()=>{}, yaw=referencePose.yaw, pitch=referencePose.pitch, lastStation=null;
  const canvas=document.createElement('canvas');
  const viewSize=new T.Vector2();
  canvas.className='vr-canvas'; canvas.setAttribute('aria-hidden','true');

  function initialize(){
    if(renderer||unavailable)return;
    try{
      renderer=new T.WebGLRenderer({canvas,antialias:true});
      renderer.shadowMap.enabled=true;
      renderer.toneMapping=T.ACESFilmicToneMapping;
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      lab=buildRoom();
      camera=new T.PerspectiveCamera(fieldOfView,1,.045,35);
      camera.add(lab.carry);
      lab.scene.add(camera);
    }catch{
      renderer=null; unavailable=true;
    }
  }
  function draw(container,x,z,angle,tilt,{reference=false,work=false,cooler=false}={}){
    if(!renderer||!container.clientWidth||!container.clientHeight)return;
    camera.aspect=reference?referenceAspect:container.clientWidth/container.clientHeight;
    camera.position.set(x,eyeHeight,z);
    lab.aim(x,z,work,cooler);
    camera.rotation.set(tilt,angle,0,'YXZ');
    camera.updateProjectionMatrix();
    const size=renderer.getSize(viewSize);
    if(size.x!==container.clientWidth||size.y!==container.clientHeight)renderer.setSize(container.clientWidth,container.clientHeight,false);
    renderer.render(lab.scene,camera);
  }
  function explore(guide){
    return `<section class="amp-explore">
      <div class="amp-panel-head"><div><span class="amp-kicker">1인칭 과학실</span><h3 id="amp-route-guide" class="amp-route-guide" role="status">${guide}</h3></div></div>
      <div class="amp-room vr-room" tabindex="0" role="group" aria-label="과학실. 화면 클릭 후 마우스로 둘러보기, WASD 이동, E로 기기 조작, Esc로 마우스 해제">
        <div class="vr-camera"></div><div class="vr-crosshair" aria-hidden="true"></div><button type="button" class="vr-marker" hidden></button>
        <span class="vr-cargo" hidden></span>
        <div class="vr-pad" aria-label="화면 이동 조작">
          <button type="button" data-walk="turn-left" aria-label="왼쪽 둘러보기">↶</button>
          <button type="button" data-walk="forward" aria-label="앞으로 이동">↑</button>
          <button type="button" data-walk="turn-right" aria-label="오른쪽 둘러보기">↷</button>
          <button type="button" data-walk="left" aria-label="왼쪽으로 이동">←</button>
          <button type="button" data-walk="back" aria-label="뒤로 이동">↓</button>
          <button type="button" data-walk="right" aria-label="오른쪽으로 이동">→</button>
        </div>
      </div>
      <p class="amp-controls-note">PC에서는 화면을 클릭한 뒤 마우스로 둘러보고 WASD로 이동하세요. E로 기기 조작, Esc로 마우스 해제. 터치 화면에서는 드래그와 이동 버튼을 사용하세요.</p>
      <div class="amp-station-links"><button type="button" class="vr-guide">현재 기기 앞으로</button><button type="button" class="vr-interact">앞의 기기 조작</button></div>
    </section>`;
  }

  function mount({root,station,player,expected,status,cargo,update,interact,open,feedback}){
    initialize();
    if(lab){
      lab.carry.visible=typeof cargo==='string'&&!station;
      lab.showStation(station,status);
    }
    const target=stations.find(s=>s.id===expected);
    if(station){
      const current=stations.find(s=>s.id===station);
      const work=root.querySelector('.amp-work');
      const bench=work.querySelector('.amp-bench-scene');
      if(benchVisual(bench?.dataset.benchScene)){
        if(renderer){
          const cameraLayer=document.createElement('div');
          cameraLayer.className='vr-camera vr-reference-camera';
          cameraLayer.classList.add('vr-daylight-loading');
          cameraLayer.append(canvas);
          bench.append(cameraLayer);
          const repaint=()=>draw(cameraLayer,referencePose.x,referencePose.z,referencePose.yaw,referencePose.pitch,{reference:true,work:true});
          const observer=new ResizeObserver(repaint);
          observer.observe(cameraLayer);
          lab.ready.then(()=>{if(cameraLayer.isConnected){repaint();cameraLayer.classList.remove('vr-daylight-loading');}});
          cleanup=()=>observer.disconnect();
        }
        const hud=document.createElement('div');
        hud.className='vr-photo-hud';
        hud.innerHTML='<strong>AMPLICON</strong><span>반응액 준비</span>';
        bench.append(hud);
        const abbreviations={positive:'양성',negative:'음성'};
        bench.querySelectorAll('[data-bench-target] > span').forEach(label=>{
          const id=label.parentElement.dataset.benchTarget.split(':')[1];
          if(!abbreviations[id])return;
          label.dataset.shortLabel=label.parentElement.dataset.benchTarget.startsWith('sample:')
            ?abbreviations[id]+' 원본':abbreviations[id]+' 관';
        });
        lastStation=station;
        return;
      }
      const backdrop=document.createElement('div');
      backdrop.className='vr-camera'+(bench?'':' vr-station-view');
      if(bench)bench.append(backdrop);
      else work.querySelector('.amp-panel-head').after(backdrop);
      if(renderer)backdrop.append(canvas);
      const machine=work.querySelector('.amp-machine');
      if(renderer&&machine){
        machine.querySelector('svg').remove();
        if(station==='vortex'&&status.vortexTube){
          const contact=document.createElement('button');
          contact.type='button';
          contact.className='vr-marker vr-work-hotspot';
          contact.textContent='접촉판에 누르고 있기';
          contact.setAttribute('aria-hidden','true');
          contact.tabIndex=-1;
          const hold=work.querySelector('#amp-vortex-hold');
          contact.onpointerdown=hold.onpointerdown;
          contact.onpointerup=hold.onpointerup;
          contact.onpointercancel=hold.onpointercancel;
          contact.onlostpointercapture=hold.onlostpointercapture;
          machine.append(contact);
        }
        backdrop.append(machine);
      }
      const operation = station==='pcr'
        ? (status.pcrLoaded ? 'runPcr' : 'loadPcr')
        : station==='uv' ? (status.uvPlaced ? 'view' : 'placeGel') : null;
      const control = operation && work.querySelector('[data-action="'+operation+'"]:enabled');
      if(control){
        const hotspot=document.createElement('button');
        hotspot.type='button';
        hotspot.className='vr-marker vr-work-hotspot';
        hotspot.textContent=control.textContent;
        hotspot.onclick=()=>control.click();
        backdrop.append(hotspot);
      }
      const repaint=()=>{
        draw(backdrop,current.x,current.y+(bench?1.4:1.55),0,bench?-.23:-.32);
        if(!renderer||station!=='spin')return;
        machine.querySelectorAll('[data-slot]').forEach(slot=>{
          const angle=Number(slot.dataset.slot)*Math.PI/2;
          const point=new T.Vector3(current.x+Math.sin(angle)*.135,1.17,current.y-Math.cos(angle)*.135).project(camera);
          slot.style.left=(50+point.x*50)+'%';
          slot.style.top=(50-point.y*50)+'%';
        });
      };
      const observer=new ResizeObserver(repaint); observer.observe(backdrop); repaint();
      lab?.ready.then(()=>{if(backdrop.isConnected)repaint();});
      cleanup=()=>observer.disconnect();
      lastStation=station;
      return;
    }
    const room=root.querySelector('.vr-room');
    const backdrop=room.querySelector('.vr-camera');
    const marker=room.querySelector('.vr-marker');
    const direct=root.querySelector('.vr-guide');
    const cargoLabel=room.querySelector('.vr-cargo');
    const hud=document.createElement('div');
    hud.className='vr-photo-hud';
    const phase=target.id==='pcr'?'RT-PCR':['gel','uv'].includes(target.id)?'전기영동':'반응액 준비';
    hud.innerHTML='<strong>AMPLICON</strong><span>'+phase+'</span>';
    room.append(hud);
    const nearLabel=cargo==='gel'?'전기영동 겔':cargo==='tubes'?'혼합한 반응관':'냉각 랙';
    room.classList.toggle('vr-carrying-rack',cargo===true);
    cargoLabel.hidden=!cargo; cargoLabel.textContent='운반 중 · '+nearLabel;
    room.classList.toggle('vr-fallback',!renderer);
    if(renderer){
      backdrop.append(canvas);
      backdrop.classList.add('vr-daylight-loading');
      lab.ready.then(()=>backdrop.classList.remove('vr-daylight-loading'));
    }
    else backdrop.textContent='3D 화면을 사용할 수 없습니다. 아래 버튼으로 실험을 계속할 수 있습니다.';
    if(lastStation){
      yaw=Math.atan2(player.x-target.x,player.y-target.y);
      pitch=-.10;
    }
    lastStation=null;
    const controller=new AbortController();
    const options={signal:controller.signal};
    const keys=new Map();
    let frame=0,approachFrame=0,previous=0,drag=null;
    function paint(){
      const near=update();
      draw(backdrop,player.x,player.y,yaw,pitch,{reference:true,cooler:true});
      marker.hidden=true;
      if(!renderer)return;
      const point=new T.Vector3(target.x,target.id==='ice'?1.32:1.33,target.y+(target.id==='ice'?-.06:0));
      const local=point.clone().applyMatrix4(camera.matrixWorldInverse);
      point.project(camera);
      if(local.z>=0||Math.abs(point.x)>.84||Math.abs(point.y)>.76)return;
      marker.hidden=false;
      marker.textContent=target.label+(near===expected?' · 조작':'');
      marker.style.left=(50+point.x*50)+'%';
      marker.style.top=(50-point.y*50)+'%';
    }
    function advance(now){
      frame=0;
      const dt=previous?Math.min(.04,(now-previous)/1000):.016;
      previous=now;
      const held=[...keys.values()];
      const axis=(positive,negative)=>Number(held.includes(positive))-Number(held.includes(negative));
      yaw+=axis('turn-left','turn-right')*dt*1.7;
      const f=axis('forward','back'),s=axis('right','left');
      const speed=2.35*dt/(Math.hypot(f,s)||1);
      const x=bound(player.x+(-Math.sin(yaw)*f+Math.cos(yaw)*s)*speed);
      const z=bound(player.y+(-Math.cos(yaw)*f-Math.sin(yaw)*s)*speed);
      if(!blocked(x,player.y))player.x=x;
      if(!blocked(player.x,z))player.y=z;
      paint();
      if(keys.size)frame=requestAnimationFrame(advance);
    }
    function press(id,key){
      keys.set(id,key);
      if(!frame){previous=0; frame=requestAnimationFrame(advance);}
    }
    function release(){keys.clear(); cancelAnimationFrame(frame); frame=0;}
    function guide(){
      const atFrontBench=target.id==='ice'||target.id==='bench';
      player.x=target.id==='bench'?referencePose.x+.30:atFrontBench?referencePose.x:target.x;
      player.y=atFrontBench?referencePose.z:target.y+1.12;
      yaw=referencePose.yaw;
      pitch=atFrontBench?referencePose.pitch:-.13;
      feedback();
      paint();
    }
    direct.onclick=guide;
    function activate(){
      if(approachFrame)return;
      if(update()!==expected){interact();return;}
      if(!renderer||matchMedia('(prefers-reduced-motion: reduce)').matches||!['ice','bench'].includes(expected)){
        open(expected);
        return;
      }
      disengage();
      const start=performance.now();
      const heading=Math.atan2(Math.sin(yaw),Math.cos(yaw));
      const startPitch=pitch;
      const x=player.x,z=player.y;
      function approach(now){
        const t=Math.min(1,(now-start)/240);
        const ease=t*t*(3-2*t);
        draw(backdrop,T.MathUtils.lerp(x,referencePose.x,ease),T.MathUtils.lerp(z,referencePose.z,ease),
          T.MathUtils.lerp(heading,referencePose.yaw,ease),T.MathUtils.lerp(startPitch,referencePose.pitch,ease),
          {reference:true,cooler:expected==='ice'});
        if(t<1)approachFrame=requestAnimationFrame(approach);
        else{approachFrame=0;open(expected);}
      }
      approachFrame=requestAnimationFrame(approach);
    }
    root.querySelector('.vr-interact').onclick=activate;
    marker.onclick=()=>{if(update()===expected)activate();else guide();};
    room.addEventListener('keydown',event=>{
      if(event.target!==room)return;
      const key=event.key.toLowerCase();
      if(key==='e'){event.preventDefault(); if(!event.repeat)activate();}
      if(directions[key]&&!approachFrame){event.preventDefault(); press(key,directions[key]);}
    },options);
    room.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()),options);
    room.addEventListener('blur',release,options);
    window.addEventListener('blur',release,options);
    const locked=()=>document.pointerLockElement===backdrop;
    let mouseLook=false;
    function setMouseLook(active){
      mouseLook=active;
      room.classList.toggle('vr-locked',active);
    }
    function disengage(){
      setMouseLook(false);
      if(locked())document.exitPointerLock();
      release();
    }
    function look(dx,dy,sensitivity){
      yaw-=dx*sensitivity;
      pitch=Math.max(-1.3,Math.min(1.3,pitch-dy*sensitivity));
      paint();
    }
    document.addEventListener('pointerlockchange',()=>{
      setMouseLook(locked());
      drag=null;
      release();
      if(locked())room.focus({preventScroll:true});
    },options);
    document.addEventListener('mousemove',event=>{
      if(locked()||(mouseLook&&!drag&&backdrop.contains(event.target)))look(event.movementX,event.movementY,.0024);
    },options);
    backdrop.addEventListener('click',event=>{
      if(event.pointerType==='touch'||event.pointerType==='pen'||locked()||!renderer)return;
      room.focus({preventScroll:true});
      setMouseLook(true);
      try{backdrop.requestPointerLock?.()?.catch(()=>{});}catch{}
    },options);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&mouseLook)disengage();
    },options);
    window.addEventListener('blur',disengage,options);
    backdrop.addEventListener('pointerdown',event=>{
      if(mouseLook||event.button!==0)return;
      room.focus({preventScroll:true});
      backdrop.setPointerCapture(event.pointerId);
      drag={x:event.clientX,y:event.clientY};
    },options);
    backdrop.addEventListener('pointermove',event=>{
      if(!drag||locked())return;
      look(event.clientX-drag.x,event.clientY-drag.y,.005);
      drag={x:event.clientX,y:event.clientY};
    },options);
    backdrop.addEventListener('lostpointercapture',()=>{drag=null;},options);
    for(const button of room.querySelectorAll('[data-walk]')){
      button.onpointerdown=event=>{
        event.preventDefault();
        room.focus({preventScroll:true});
        button.setPointerCapture(event.pointerId);
        press(event.pointerId,button.dataset.walk);
      };
      button.onlostpointercapture=event=>keys.delete(event.pointerId);
      button.onclick=event=>{
        if(event.detail!==0)return;
        press('button',button.dataset.walk);
        requestAnimationFrame(()=>keys.delete('button'));
      };
    }
    const observer=new ResizeObserver(paint); observer.observe(backdrop); paint();
    lab?.ready.then(()=>{if(backdrop.isConnected)paint();});
    cleanup=()=>{
      observer.disconnect();
      controller.abort();
      cancelAnimationFrame(approachFrame);
      disengage();
    };
  }

  return {stations,spawn:{x:referencePose.x,y:referencePose.z},explore,mount,benchVisual,detach:()=>cleanup()};
}
