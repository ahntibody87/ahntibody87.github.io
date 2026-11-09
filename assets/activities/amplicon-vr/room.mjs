import * as T from '../embryo-atlas/vendor/three.module.min.js';

const stations = [
  {id:'ice', label:'아이스박스', x:2.0, y:6.8},
  {id:'bench', label:'작업대', x:5.0, y:6.8},
  {id:'vortex', label:'볼텍스 믹서', x:8.0, y:6.8},
  {id:'spin', label:'미니 원심분리기', x:8.0, y:2.2},
  {id:'pcr', label:'PCR 기기', x:6.0, y:2.2},
  {id:'gel', label:'전기영동 장치', x:4.0, y:2.2},
  {id:'uv', label:'UV 관찰기', x:2.0, y:2.2}
];
const counters = [
  {x:2,z:6.8,w:1.9,d:1.1}, {x:5,z:6.8,w:2.7,d:1.1}, {x:8,z:6.8,w:1.9,d:1.1},
  {x:5,z:2.2,w:7.8,d:1.15}, {x:.32,z:5,w:.64,d:8.5}, {x:5,z:.38,w:9,d:.76}
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
  const cube = new T.BoxGeometry();
  function box(x,y,z,w,h,d,key,group=scene) {
    const mesh = new T.Mesh(cube,materials[key]);
    mesh.scale.set(w,h,d);
    mesh.position.set(x,y,z);
    mesh.receiveShadow = true;
    mesh.castShadow = key !== 'clear';
    group.add(mesh);
    return mesh;
  }
  const round = new T.CylinderGeometry(1,1,1,18);
  function cylinder(x,y,z,r,h,key,group=scene) {
    const mesh = new T.Mesh(round,materials[key]);
    mesh.position.set(x,y,z);
    mesh.scale.set(r,h,r);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }
  const floor = document.createElement('canvas');
  floor.width = floor.height = 128;
  const ctx = floor.getContext('2d');
  ctx.fillStyle='#a5a7a0'; ctx.fillRect(0,0,128,128);
  for(let i=0;i<1500;i++){
    ctx.fillStyle=i%3===0?'#ddddce55':'#484b4520';
    ctx.fillRect((i*47)%127,(i*73+Math.floor(i/127)*13)%127,2,2);
  }
  ctx.strokeStyle='#83877f'; ctx.strokeRect(0,0,128,128);
  const tiles = new T.CanvasTexture(floor);
  tiles.colorSpace = T.SRGBColorSpace;
  tiles.wrapS = tiles.wrapT = T.RepeatWrapping;
  tiles.repeat.set(14,14);
  const ground = new T.Mesh(new T.PlaneGeometry(10.5,10.5),new T.MeshStandardMaterial({map:tiles,roughness:.85}));
  ground.rotation.x=-Math.PI/2; ground.position.set(5,0,5); ground.receiveShadow=true; scene.add(ground);

  box(5,3.3,5,10.3,.13,10.3,'paint');
  box(5,1.65,-.10,10.2,3.3,.15,'paint');
  box(10.07,1.65,5,.14,3.3,10.2,'paint');
  box(5,1.65,10.07,10.2,3.3,.14,'paint');
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
  for(const {x,z,w,d} of counters){
    box(x,.91,z,w,.085,d,'epoxy');
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
  for(const x of [2.2,5,7.8]){
    cylinder(x,.53,5.67,.24,.045,'wood');
    cylinder(x,.26,5.67,.035,.51,'steel');
    box(x,.03,5.67,.42,.04,.05,'steel');
    box(x,.03,5.67,.05,.04,.42,'steel');
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
      for(let i=0;i<status.spinLoaded;i++){
        const a=i*Math.PI/2;
        cylinder(x+Math.sin(a)*.11,base+.22,z+Math.cos(a)*.11,.023,.11,'pale',dynamic);
      }
    }
    if(id==='pcr'&&status.pcrLoaded&&!status.pcrRunning){
      for(let i=0;i<status.pcrLoaded;i++)cylinder(x-.12+i*.08,base+.31,z+.1,.023,.10,'pale',dynamic);
    }
    if(id==='uv'&&status.uvPlaced&&!status.uvClosed){
      box(x,base+.279,z+.075,.23,.025,.14,'glass',dynamic);
    }
  }

  for(const {id,x,y:z} of stations){
    const base=.955;
    if(id==='ice'){
      box(x,base+.16,z,.55,.32,.39,'blue');
      box(x,base+.35,z,.59,.075,.44,'pale');
      box(x,base+.20,z+.21,.16,.043,.035,'steel');
    }else if(id==='bench'){
      box(x,base+.04,z,.45,.08,.25,'blue');
      for(let i=0;i<5;i++)cylinder(x-.17+i*.084,base+.104,z,.026,.095,'pale');
      box(x-.38,base+.055,z,.23,.11,.22,'clear');
      box(x+.29,base+.035,z+.14,.26,.04,.035,'pale').rotation.y=.48;
    }else if(id==='vortex'||id==='spin'){
      const spin=id==='spin';
      cylinder(x,base+.083,z,spin?.23:.16,.165,'pale');
      cylinder(x,base+.17,z,spin?.205:.075,.065,'dark');
      box(x,base+.085,z+(spin?.22:.15),.08,.039,.028,'display');
    }else if(id==='gel'){
      box(x,base+.06,z,.47,.12,.37,'clear');
      box(x,base+.135,z,.50,.034,.40,'glass');
      for(const [offset,color] of [[-.20,'dark'],[.20,'red']]){
        cylinder(x+offset,base+.185,z,.024,.09,color);
        const wire=new T.CatmullRomCurve3([new T.Vector3(x+offset,base+.22,z),new T.Vector3(x+offset+.09,base+.33,z-.14),new T.Vector3(x+.34,base+.13,z-.18)]);
        scene.add(new T.Mesh(new T.TubeGeometry(wire,15,.011,5,false),materials[color]));
      }
      box(x+.43,base+.08,z-.15,.27,.16,.21,'dark');
      box(x+.43,base+.09,z-.04,.14,.039,.016,'display');
    }else{
      box(x,base+.13,z,.56,.26,.45,id==='uv'?'dark':'pale');
      box(x,base+.30,z-.052,.51,.09,.34,id==='uv'?'glass':'pale');
      const screen=box(x,base+.22,z+.204,.27,.021,.14,'display');
      screen.rotation.x=.38;
    }
  }

  scene.add(new T.HemisphereLight('#f3f8ff','#84796e',2.0));
  const sun=new T.DirectionalLight('#fff0d8',2.1);
  sun.position.set(-3,5,2); sun.target.position.set(5,0,5);
  sun.castShadow=true; sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:22});
  sun.shadow.normalBias=.024;
  scene.add(sun,sun.target);
  return {scene,carry,showStation};
}

const bound = n=>Math.max(.44,Math.min(9.56,n));
const blocked = (x,z)=>counters.some(c=>Math.abs(x-c.x)<c.w/2+.18&&Math.abs(z-c.z)<c.d/2+.18);
const directions = {w:'forward',s:'back',a:'left',d:'right',arrowup:'forward',arrowdown:'back',arrowleft:'turn-left',arrowright:'turn-right'};

export function createPerspective(){
  let renderer, lab, camera, unavailable=false, cleanup=()=>{}, yaw=0, pitch=-.08, lastStation=null;
  const canvas=document.createElement('canvas');
  canvas.className='vr-canvas'; canvas.setAttribute('aria-hidden','true');

  function initialize(){
    if(renderer||unavailable)return;
    try{
      renderer=new T.WebGLRenderer({canvas,antialias:true});
      renderer.shadowMap.enabled=true;
      renderer.toneMapping=T.ACESFilmicToneMapping;
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      lab=buildRoom();
      camera=new T.PerspectiveCamera(63,1,.045,35);
      camera.add(lab.carry);
      lab.scene.add(camera);
    }catch{
      renderer=null; unavailable=true;
    }
  }
  function draw(container,x,z,angle,tilt){
    if(!renderer||!container.clientWidth||!container.clientHeight)return;
    camera.aspect=container.clientWidth/container.clientHeight;
    camera.position.set(x,1.61,z);
    camera.rotation.set(tilt,angle,0,'YXZ');
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth,container.clientHeight,false);
    renderer.render(lab.scene,camera);
  }
  function explore(guide){
    return `<section class="amp-explore">
      <div class="amp-panel-head"><div><span class="amp-kicker">1인칭 과학실</span><h3 id="amp-route-guide" class="amp-route-guide" role="status">${guide}</h3></div></div>
      <div class="amp-room vr-room" tabindex="0" role="group" aria-label="과학실. WASD 이동, 방향키 또는 드래그로 둘러보기, E로 기기 조작">
        <div class="vr-camera"></div><button type="button" class="vr-marker" hidden></button>
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
      <p class="amp-controls-note">WASD로 이동하고 좌우 방향키나 드래그로 둘러보세요. 기기 앞에서 E를 누르거나 기기 이름을 선택하세요.</p>
      <div class="amp-station-links"><button type="button" class="vr-guide">현재 기기 앞으로</button><button type="button" class="vr-interact">앞의 기기 조작</button></div>
    </section>`;
  }

  function mount({root,station,player,expected,status,cargo,update,interact,open,feedback}){
    initialize();
    if(lab){
      lab.carry.visible=!!cargo&&!station;
      lab.showStation(station,status);
    }
    const target=stations.find(s=>s.id===expected);
    if(station){
      const current=stations.find(s=>s.id===station);
      const work=root.querySelector('.amp-work');
      const bench=work.querySelector('.amp-bench-scene');
      const backdrop=document.createElement('div');
      backdrop.className='vr-camera'+(bench?'':' vr-station-view');
      if(bench)bench.append(backdrop);
      else work.querySelector('.amp-panel-head').after(backdrop);
      if(renderer)backdrop.append(canvas);
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
      const repaint=()=>draw(backdrop,current.x,current.y+(bench?1.4:1.55),0,bench?-.23:-.32);
      const observer=new ResizeObserver(repaint); observer.observe(backdrop); repaint();
      cleanup=()=>observer.disconnect();
      lastStation=station;
      return;
    }
    const room=root.querySelector('.vr-room');
    const backdrop=room.querySelector('.vr-camera');
    const marker=room.querySelector('.vr-marker');
    const direct=root.querySelector('.vr-guide');
    const cargoLabel=room.querySelector('.vr-cargo');
    const nearLabel=cargo==='gel'?'전기영동 겔':cargo==='tubes'?'혼합한 반응관':'냉각 랙';
    cargoLabel.hidden=!cargo; cargoLabel.textContent='운반 중 · '+nearLabel;
    room.classList.toggle('vr-fallback',!renderer);
    if(renderer)backdrop.append(canvas);
    else backdrop.textContent='3D 화면을 사용할 수 없습니다. 아래 버튼으로 실험을 계속할 수 있습니다.';
    if(lastStation||yaw===0){
      yaw=Math.atan2(player.x-target.x,player.y-target.y);
      pitch=-.10;
    }
    lastStation=null;
    const controller=new AbortController();
    const options={signal:controller.signal};
    const keys=new Map();
    let frame=0,previous=0,drag=null;
    function paint(){
      const near=update();
      draw(backdrop,player.x,player.y,yaw,pitch);
      marker.hidden=true;
      if(!renderer)return;
      const point=new T.Vector3(target.x,1.33,target.y);
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
      player.x=target.x; player.y=target.y+1.12;
      yaw=0; pitch=-.13; feedback(); paint();
    }
    direct.onclick=guide;
    root.querySelector('.vr-interact').onclick=interact;
    marker.onclick=()=>{if(update()===expected)open(expected);else guide();};
    room.addEventListener('keydown',event=>{
      if(event.target!==room)return;
      const key=event.key.toLowerCase();
      if(key==='e'){event.preventDefault(); if(!event.repeat)interact();}
      if(directions[key]){event.preventDefault(); press(key,directions[key]);}
    },options);
    room.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()),options);
    room.addEventListener('blur',release,options);
    window.addEventListener('blur',release,options);
    backdrop.addEventListener('pointerdown',event=>{
      room.focus({preventScroll:true});
      backdrop.setPointerCapture(event.pointerId);
      drag={x:event.clientX,y:event.clientY};
    },options);
    backdrop.addEventListener('pointermove',event=>{
      if(!drag)return;
      yaw+=(event.clientX-drag.x)*.006;
      pitch=Math.max(-.55,Math.min(.28,pitch+(event.clientY-drag.y)*.004));
      drag={x:event.clientX,y:event.clientY}; paint();
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
    cleanup=()=>{observer.disconnect();controller.abort();release();};
  }

  return {stations,explore,mount,detach:()=>cleanup()};
}
