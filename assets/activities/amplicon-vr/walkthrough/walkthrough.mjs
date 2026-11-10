import * as T from '../../embryo-atlas/vendor/three.module.min.js';
import {canStand,spawn,stations} from './layout.mjs?v=3';
import {createLab} from './lab-scene.mjs?v=3';

const standing=1.62;
const movement={
  KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right',
  ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'turnLeft',ArrowRight:'turnRight'
};

export function mountWalkthrough(root,experiment=null){
  root.innerHTML=`<section class="lab-walk" aria-label="1인칭 과학실">
    <header class="lab-walk-title"><div><p>AMPLICON / ${experiment?'반응액 준비':'공간 확인본'}</p><h2>1인칭 과학실</h2></div>
    <a href="${experiment?'?room=preview':'./'}">${experiment?'공간만 둘러보기':'실험 활동으로 돌아가기'}</a></header>
    <div class="lab-viewport" tabindex="0" aria-label="3D 과학실. WASD로 이동, 마우스로 시점 회전, E로 작업 위치 보기">
      <canvas aria-hidden="true"></canvas>
      <span class="lab-crosshair" aria-hidden="true"></span>
      <div class="lab-viewbar"><strong>AMPLICON</strong><span class="lab-zone">입구 · 자유 탐색</span></div>
      <button class="lab-enter" type="button">클릭해서 둘러보기</button>
      <div class="lab-spot" hidden><span></span><button type="button"></button></div>
      <output class="lab-aim" hidden></output>
      <section class="lab-preparation" hidden aria-label="현재 실험 조작"><p></p><small>기기를 직접 클릭하거나 Esc로 마우스를 해제하고 아래 버튼을 누르세요.</small><div></div></section>
      <div class="lab-pad" aria-label="터치 이동">
        <button type="button" data-dir="turnLeft" aria-label="왼쪽 보기">↶</button>
        <button type="button" data-dir="forward" aria-label="앞으로 이동">↑</button>
        <button type="button" data-dir="turnRight" aria-label="오른쪽 보기">↷</button>
        <button type="button" data-dir="left" aria-label="왼쪽 이동">←</button>
        <button type="button" data-dir="back" aria-label="뒤로 이동">↓</button>
        <button type="button" data-dir="right" aria-label="오른쪽 이동">→</button>
      </div>
    </div>
    <p class="lab-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 · 마우스 시점 · <kbd>E</kbd> 작업 위치 보기 또는 일어나기 · <kbd>Esc</kbd> 마우스 해제</p>
    <ul class="lab-station-list" aria-label="방문한 장비">${stations.map(station=>`<li data-visit="${station.id}">${station.name}</li>`).join('')}</ul>
    <p class="lab-note" role="status">${experiment?experiment.message:'빈 통로에서 출발합니다. 왼쪽 앞의 아이스박스부터 살펴보세요.'}</p>
  </section>`;
  const find=selector=>root.querySelector(selector);
  const viewport=find('.lab-viewport');
  const canvas=find('canvas');
  const entry=find('.lab-enter');
  const prompt=find('.lab-spot');
  const promptLabel=prompt.querySelector('span');
  const promptButton=prompt.querySelector('button');
  const zone=find('.lab-zone');
  const note=find('.lab-note');
  const actions=find('.lab-preparation');
  const aim=find('.lab-aim');
  const actionReadout=actions.querySelector('p');
  const actionButtons=actions.querySelector('div');
  const raycaster=new T.Raycaster();
  const pointer=new T.Vector2();
  let renderer;
  try{
    renderer=new T.WebGLRenderer({canvas,antialias:true});
  }catch{
    entry.hidden=true;
    note.textContent='이 브라우저에서 3D 화면을 열 수 없습니다.';
    return;
  }
  const maxPixelRatio=Math.min(devicePixelRatio,1.5);
  let renderRatio=maxPixelRatio,slowFrames=0;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.10;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  const lab=createLab(experiment);
  const camera=new T.PerspectiveCamera(51,1,.035,36);
  camera.add(lab.carried);
  lab.scene.add(camera);
  const player={...spawn,pitch:-.055};
  const keys=new Map();
  const visits=new Set();
  const labelPoint=new T.Vector3();
  let frame=0,last=0,working=null,near=null,pose=null,transition=null;
  let mouseMode=false,drag=null,carrying=false,animating=false;
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  const locked=()=>document.pointerLockElement===canvas;

  function schedule(){
    if(!frame){last=performance.now();frame=requestAnimationFrame(render);}
  }
  function stop(){
    keys.clear();
    drag=null;
  }
  function setMouse(active){
    mouseMode=active;
    viewport.classList.toggle('lab-mouse',active);
    entry.hidden=active||!!working;
  }
  function capture(){
    viewport.focus({preventScroll:true});
    setMouse(true);
    if(locked())return;
    try{canvas.requestPointerLock?.()?.catch(()=>{});}catch{}
  }
  function releaseMouse(){
    if(locked())document.exitPointerLock();
    setMouse(false);
    stop();
  }
  function look(dx,dy){
    const target=working?pose:player;
    if(!target||transition)return;
    if(working){
      target.yaw=T.MathUtils.clamp(target.yaw-dx*.0024,-.65,.65);
      target.pitch=T.MathUtils.clamp(target.pitch-dy*.0024,working.tilt-.30,working.tilt+.42);
    }else{
      target.yaw=Math.atan2(Math.sin(target.yaw-dx*.0024),Math.cos(target.yaw-dx*.0024));
      target.pitch=T.MathUtils.clamp(target.pitch-dy*.0024,-1.25,1.18);
    }
    schedule();
  }
  function press(code,value){
    keys.set(code,value);
    schedule();
  }
  function advance(dt){
    const held=new Set(keys.values());
    const axis=(positive,negative)=>Number(held.has(positive))-Number(held.has(negative));
    player.yaw+=axis('turnLeft','turnRight')*dt*1.52;
    const forward=axis('forward','back'),right=axis('right','left');
    if(!forward&&!right)return;
    const scale=2.1*dt/Math.hypot(forward,right);
    const dx=(right*Math.cos(player.yaw)-forward*Math.sin(player.yaw))*scale;
    const dz=(-right*Math.sin(player.yaw)-forward*Math.cos(player.yaw))*scale;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.035));
    for(let i=0;i<steps;i++){
      const x=player.x+dx/steps,z=player.z+dz/steps;
      if(canStand(x,player.z))player.x=x;
      if(canStand(player.x,z))player.z=z;
    }
  }
  function updateHint(){
    near=null;
    if(transition){prompt.hidden=true;return;}
    if(working){
      prompt.classList.add('lab-spot-working');
      prompt.hidden=false;
      promptLabel.textContent=working.action;
      promptButton.textContent=experiment?'E · 작업 위치에서 나오기':working.id==='ice'?'랙 들고 물러나기':working.id==='prep'&&carrying?'랙 내려놓고 일어나기':'작업 위치에서 나오기';
      return;
    }
    prompt.classList.remove('lab-spot-working');
    let reach=.67;
    for(const station of stations){
      const distance=Math.hypot(player.x-station.x,player.z-station.standZ);
      if(distance<reach){near=station;reach=distance;}
    }
    prompt.hidden=true;
    if(!near)return;
    labelPoint.set(near.x,near.id==='ice'?1.27:1.16,near.z);
    labelPoint.project(camera);
    if(labelPoint.z>1||Math.abs(labelPoint.x)>.88)return;
    prompt.hidden=false;
    prompt.style.setProperty('--lab-x',(50+50*labelPoint.x)+'%');
    prompt.style.setProperty('--lab-y',T.MathUtils.clamp(50-50*labelPoint.y,18,77)+'%');
    promptLabel.textContent=near.name;
    promptButton.textContent='E · 작업 위치 보기';
  }
  function render(now){
    frame=0;
    const elapsed=(now-last)/1000;
    const dt=Math.min(.24,elapsed);
    last=now;
    if(keys.size&&!working){
      slowFrames=elapsed>.075?slowFrames+1:0;
      if(slowFrames>=4&&renderRatio>.62){
        renderRatio=Math.max(.62,renderRatio*.82);
        renderer.setPixelRatio(renderRatio);
        slowFrames=0;
      }
    }
    if(!working&&!transition)advance(dt);
    let view=pose??{...player,y:standing};
    if(transition){
      const {from,to,start,done}=transition;
      const t=motionPreference.matches?1:Math.min(1,(now-start)/280);
      const eased=t*t*(3-2*t);
      view=Object.fromEntries(['x','y','z','yaw','pitch'].map(key=>[key,T.MathUtils.lerp(from[key],to[key],eased)]));
      if(t===1){transition=null;done();}
    }
    camera.position.set(view.x,view.y,view.z);
    camera.rotation.set(view.pitch,view.yaw,0,'YXZ');
    const wasAnimating=animating;
    animating=lab.updatePreparation(now,experiment);
    lab.carried.visible=experiment?experiment.phase==='carry'&&!animating:carrying&&!working;
    if(wasAnimating&&!animating)renderer.shadowMap.needsUpdate=true;
    renderer.render(lab.scene,camera);
    updateHint();
    const aimed=pickTarget();
    aim.hidden=!aimed;
    if(aimed)aim.textContent=experiment.actions.get(aimed);
    if(transition||animating||keys.size&&!working)frame=requestAnimationFrame(render);
  }
  function resize(){
    const {width,height}=viewport.getBoundingClientRect();
    if(width<=0||height<=0)return;
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    renderRatio=Math.min(renderRatio,maxPixelRatio,Math.sqrt(1250000/(width*height)));
    renderer.setPixelRatio(renderRatio);
    renderer.setSize(width,height,false);
    schedule();
  }
  function enter(){
    if(transition||animating)return;
    if(working){
      const old=working;
      if(!experiment){
        if(old.id==='ice')carrying=true;
        if(old.id==='prep')carrying=false;
      }
      actions.hidden=true;
      transition={from:pose,to:{...player,y:standing},start:performance.now(),done(){
        working=null;
        pose=null;
        zone.textContent=(experiment?experiment.phase==='carry':carrying)?'냉각 랙 운반 중':'자유 탐색';
        note.textContent=experiment?experiment.message:old.id==='ice'?'랙을 들고 통로로 물러난 뒤, 옆 피펫 작업대까지 걸어가세요.':'통로를 따라 다른 장비에도 접근해 보세요.';
        entry.hidden=true;
      }};
      schedule();
      return;
    }
    if(!near||prompt.hidden){
      note.textContent='장비 앞 통로까지 직접 걸어가 장비를 바라본 뒤 E를 누르세요.';
      return;
    }
    if(experiment&&near.id!==experiment.destination){
      const next=stations.find(station=>station.id===experiment.destination);
      note.textContent='지금은 '+next.name+'에서 작업할 차례입니다.';
      return;
    }
    if(experiment?.finished){
      note.textContent='반응액 준비를 완료했습니다. 볼텍스 혼합부터는 다음 구간입니다.';
      return;
    }
    working=near;
    const target=working;
    keys.clear();
    entry.hidden=true;
    pose={x:target.x,y:target.eye,z:target.viewZ,yaw:0,pitch:target.tilt};
    transition={from:{...player,y:standing},to:pose,start:performance.now(),done(){
      zone.textContent=target.name;
      note.textContent=experiment?experiment.message:target.action+'입니다. 마우스로 주변을 둘러보거나 E를 눌러 일어나세요.';
      visits.add(target.id);
      find('[data-visit="'+target.id+'"]').dataset.visited='true';
      if(!experiment&&visits.size===stations.length)note.textContent+=' 모든 장비의 작업 위치를 확인했습니다.';
      refreshActions();
    }};
    schedule();
  }

  function refreshActions(){
    if(!experiment||!working){actions.hidden=true;return;}
    const ids=experiment.controls(working.id);
    const counts=working.id==='prep'&&experiment.phase==='prep'
      ?' · '+experiment.samples.map(({id,name})=>name+' '+experiment.state.tubes[id].additions.length+'/'+(experiment.reagents.length+1)).join(' · '):'';
    actionReadout.textContent=experiment.message+counts;
    actions.hidden=false;
    actionButtons.replaceChildren(...ids.map(id=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.labAction=id;
      button.textContent=experiment.actions.get(id);
      return button;
    }));
  }

  function perform(id){
    if(!experiment||transition||animating||!experiment.controls(working?.id).includes(id))return;
    const effect=experiment.perform(id);
    if(effect){
      const duration=motionPreference.matches?0:['lid','rack','place'].includes(effect)?360:220;
      lab.prepareAction(effect,id,performance.now(),duration);
      animating=duration>0&&effect!=='auto';
      if(effect==='lid'){
        pose.pitch=-.55;
        renderer.shadowMap.needsUpdate=true;
      }
    }
    note.textContent=experiment.message;
    refreshActions();
    viewport.focus({preventScroll:true});
    schedule();
  }

  actions.addEventListener('click',event=>{
    const button=event.target.closest('[data-lab-action]');
    if(button)perform(button.dataset.labAction);
  });
  entry.addEventListener('click',event=>{
    if(event.pointerType==='touch'){viewport.focus({preventScroll:true});entry.hidden=true;return;}
    capture();
  });
  function pointAt(event){
    const rect=canvas.getBoundingClientRect();
    if(locked())pointer.set(0,0);
    else pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  }
  function pickTarget(){
    if(!experiment||!working||transition||animating)return null;
    if(locked())pointer.set(0,0);
    raycaster.setFromCamera(pointer,camera);
    const ids=experiment.controls(working.id);
    return raycaster.intersectObjects(ids.map(id=>lab.targets.get(id)).filter(Boolean),false)[0]?.object.userData.action??null;
  }
  canvas.addEventListener('click',event=>{
    pointAt(event);
    const hit=pickTarget();
    if(hit){perform(hit);return;}
    if(event.pointerType!=='touch'&&!locked())capture();
  });
  promptButton.addEventListener('click',()=>{
    viewport.focus({preventScroll:true});
    enter();
  });
  document.addEventListener('pointerlockchange',()=>{
    if(locked())setMouse(true);
    else if(mouseMode)releaseMouse();
  });
  document.addEventListener('mousemove',event=>{
    if(locked()||mouseMode&&event.target===canvas)look(event.movementX,event.movementY);
  });
  viewport.addEventListener('keydown',event=>{
    if(event.key==='Escape'){releaseMouse();return;}
    if(event.code==='KeyE'){
      event.preventDefault();
      if(!event.repeat)enter();
      return;
    }
    if(movement[event.code]&&!working&&!transition){
      event.preventDefault();
      press(event.code,movement[event.code]);
    }
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',releaseMouse);
  viewport.addEventListener('focusout',event=>{
    if(!viewport.contains(event.relatedTarget)&&!locked())stop();
  });
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse')return;
    viewport.focus({preventScroll:true});
    entry.hidden=true;
    canvas.setPointerCapture(event.pointerId);
    drag={x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointermove',event=>{
    if(working){pointAt(event);schedule();}
    if(!drag)return;
    look((event.clientX-drag.x)*2,(event.clientY-drag.y)*2);
    drag={x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  root.querySelectorAll('[data-dir]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();
      viewport.focus({preventScroll:true});
      entry.hidden=true;
      button.setPointerCapture(event.pointerId);
      if(!working&&!transition)press(event.pointerId,button.dataset.dir);
    });
    button.addEventListener('lostpointercapture',event=>keys.delete(event.pointerId));
  });
  new ResizeObserver(resize).observe(viewport);
  lab.ready.then(schedule);
  resize();
}
