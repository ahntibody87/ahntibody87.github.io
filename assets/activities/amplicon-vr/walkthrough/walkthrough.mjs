import * as T from '../../embryo-atlas/vendor/three.module.min.js';
import {canStand,spawn,stations} from './layout.mjs?v=4-nodot1';
import {createLab} from './lab-scene.mjs?v=10-nodot1';
import {createPcrLesson} from './pcr-lesson.mjs?v=4-nodot1';
import {createGelObservation} from './gel-observation.mjs?v=2-nodot1';

const standing=1.62;
const stationReach=1.15;
const mixHoldMs=1500;
const stationSteps={ice:1,prep:2,vortex:3,spin:3,pcr:4,gel:5,led:6};
const movement={
  KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right',
  ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'turnLeft',ArrowRight:'turnRight'
};

export function mountWalkthrough(root,experiment,{lowMotion=false,reviewSteps=[]}={}){
  root.innerHTML=`<section class="lab-walk" aria-labelledby="lab-walk-title">
    <header class="lab-walk-title"><h2 id="lab-walk-title">AMPLICON / 웹 구현 과학실</h2></header>
    <div class="lab-viewport" tabindex="0" aria-label="3D 과학실. WASD로 이동, 마우스로 시점 회전, E로 작업 위치 보기">
      <canvas aria-hidden="true"></canvas>
      <div class="lab-viewbar"><strong>AMPLICON</strong><span class="lab-note" role="status">${experiment?experiment.message:'왼쪽 앞의 아이스박스부터 살펴보세요.'}</span><span class="lab-zone">입구 / 자유 탐색</span></div>
      <button class="lab-enter" type="button">클릭해서 이동 조작하기</button>
      <div class="lab-spot" hidden><span></span><button type="button"></button></div>
      <div class="lab-object-buttons" aria-label="기구 옆 조작 버튼"></div>
      <section class="lab-preparation" hidden aria-label="자동 준비"><div></div></section>
      <div class="lab-mix-meter" hidden><span>볼텍스 혼합</span><progress max="${mixHoldMs}" value="0" aria-label="볼텍스 혼합 진행률"></progress></div>
      <span class="lab-drag-tube" aria-hidden="true" hidden></span>
      <div class="lab-pcr-panel"></div><div class="lab-gel-panel"></div>
      <section class="lab-observation lab-review" hidden aria-labelledby="lab-review-title">
        <header><span class="lab-observation-kicker">탐구 완료 / 단계 다시 보기</span><button type="button">닫기</button></header>
        <h3 id="lab-review-title" tabindex="-1"></h3><p></p><ul></ul>
      </section>
      <div class="lab-pad" aria-label="터치 이동">
        <button type="button" data-dir="turnLeft" aria-label="왼쪽 보기">↶</button>
        <button type="button" data-dir="forward" aria-label="앞으로 이동">↑</button>
        <button type="button" data-dir="turnRight" aria-label="오른쪽 보기">↷</button>
        <button type="button" data-dir="left" aria-label="왼쪽 이동">←</button>
        <button type="button" data-dir="back" aria-label="뒤로 이동">↓</button>
        <button type="button" data-dir="right" aria-label="오른쪽 이동">→</button>
      </div>
    </div>
    <p class="lab-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 / 마우스 시점 / <kbd>E</kbd> 작업 위치 보기 또는 일어나기 / 작업 중에는 빈 곳을 드래그해 시점 조정</p>
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
  const objectButtons=find('.lab-object-buttons');
  const mixMeter=find('.lab-mix-meter'),mixProgress=mixMeter.querySelector('progress');
  const tubeGhost=find('.lab-drag-tube');
  const review=find('.lab-review');
  review.querySelector('button').addEventListener('click',()=>{
    review.hidden=true;
    viewport.focus({preventScroll:true});
  });
  let tubeDrag=null;
  const anchor=new T.Vector3();
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
  const labelPoint=new T.Vector3();
  let frame=0,last=0,working=null,near=null,pose=null,transition=null;
  let mouseMode=false,drag=null,carrying=false,animating=false,skipClick=false;
  let autoQueue=null,autoAt=0,holdStarted=null,spinEnds=0,handlingUntil=0;
  let pcrRun=false,gelRun=null;
  const lesson=createPcrLesson(find('.lab-pcr-panel'),schedule);
  const observation=experiment&&createGelObservation(find('.lab-gel-panel'),experiment,()=>{
    note.textContent=experiment.message;refreshActions();schedule();
  },()=>viewport.focus({preventScroll:true}));
  const reduceMotion=lowMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;

  function schedule(){
    if(!frame){last=performance.now();frame=requestAnimationFrame(render);}
  }
  function stop(){
    keys.clear();
    drag=null;
  }
  function setMouse(active){
    mouseMode=active;
    entry.hidden=active||!!working;
  }
  function capture(){
    viewport.focus({preventScroll:true});
    setMouse(true);
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
    const waiting=animating||holdStarted!==null||transition||autoQueue||pcrRun||gelRun||spinEnds;
    viewport.toggleAttribute('data-lab-waiting',!!waiting);
    viewport.classList.toggle('lab-working',!!working);
    if(transition||autoQueue||pcrRun||gelRun||spinEnds){prompt.hidden=true;return;}
    if(working){
      prompt.classList.add('lab-spot-working');
      promptButton.toggleAttribute('data-lab-next',!waiting&&!experiment.finished&&working.id!==experiment.destination);
      prompt.hidden=false;
      promptLabel.textContent=experiment?'':working.action;
      promptButton.textContent=experiment?'E / 작업 위치에서 나오기':working.id==='ice'?'랙 들고 물러나기':working.id==='prep'&&carrying?'랙 내려놓고 일어나기':'작업 위치에서 나오기';
      return;
    }
    prompt.classList.remove('lab-spot-working');
    let reach=stationReach;
    for(const station of stations){
      const distance=Math.hypot(player.x-station.x,player.z-station.standZ);
      if(distance<reach){near=station;reach=distance;}
    }
    prompt.hidden=true;
    if(experiment?.finished){
      const instruction='탐구 완료 / 원하는 장비를 다시 살펴보세요.';
      if(note.textContent!==instruction)note.textContent=instruction;
    }else if(experiment){
      const destination=stations.find(station=>station.id===experiment.destination);
      const instruction=near?.id===destination.id?'E를 눌러 작업 위치에 들어가세요.':destination.name+'로 이동하세요.';
      if(note.textContent!==instruction)note.textContent=instruction;
    }
    if(!near)return;
    labelPoint.set(near.x,near.id==='ice'?1.27:1.16,near.z);
    labelPoint.project(camera);
    if(labelPoint.z>1||Math.abs(labelPoint.x)>.98)return;
    prompt.hidden=false;
    prompt.style.setProperty('--lab-x',T.MathUtils.clamp(50+50*labelPoint.x,15,85)+'%');
    prompt.style.setProperty('--lab-y',T.MathUtils.clamp(50-50*labelPoint.y,18,77)+'%');
    promptLabel.textContent=near.name;
    promptButton.toggleAttribute('data-lab-next',!experiment.finished&&near.id===experiment.destination);
    promptButton.textContent='E / 작업 위치 보기';
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
      const t=reduceMotion?1:Math.min(1,(now-start)/280);
      const eased=t*t*(3-2*t);
      view=Object.fromEntries(['x','y','z','yaw','pitch'].map(key=>[key,T.MathUtils.lerp(from[key],to[key],eased)]));
      if(t===1){transition=null;done();}
    }
    const halfView=working?.id==='prep'?28:['vortex','spin','pcr','gel','led'].includes(working?.id)?32:0;
    const fov=Math.max(51,T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(halfView))/camera.aspect)));
    if(fov!==camera.fov){camera.fov=fov;camera.updateProjectionMatrix();}
    camera.position.set(view.x,view.y,view.z);
    camera.rotation.set(view.pitch,view.yaw,0,'YXZ');
    const wasAnimating=animating;
    animating=lab.updatePreparation(now,experiment);
    if(holdStarted!==null){
      mixProgress.value=now-holdStarted;
      if(mixProgress.value===mixHoldMs){
        holdStarted=null;experiment.perform('holdMix');
        note.textContent=experiment.message;refreshActions();
      }
    }
    if(spinEnds&&now>=spinEnds){
      spinEnds=0;experiment.completeSpin();handlingUntil=now+360;
      note.textContent=experiment.message;refreshActions();
    }
    let pcrProgress=0,gelProgress=0;
    if(pcrRun){
      const observation=lesson.update(now);
      if(!experiment.finished)pcrProgress=observation.progress;
      if(observation.done){
        pcrRun=false;lesson.close();
        if(!experiment.finished)experiment.completePcr();
        note.textContent=experiment.message;refreshActions();viewport.focus({preventScroll:true});
      }
    }
    if(gelRun){
      gelProgress=Math.min(1,(now-gelRun.start)/gelRun.duration);
      if(gelProgress===1){
        gelRun=null;experiment.completeGel();
        note.textContent=experiment.message;refreshActions();
      }
    }
    lab.updateHandling(now,experiment,holdStarted!==null&&!reduceMotion,pcrProgress,gelProgress);
    lab.showCarriedGel(experiment?.phase==='toLed');
    lab.carried.visible=experiment?experiment.carrying&&!animating:carrying&&!working;
    if(wasAnimating&&!animating&&!autoQueue)renderer.shadowMap.needsUpdate=true;
    renderer.render(lab.scene,camera);
    updateHint();
    positionObjectButtons();
    if(autoQueue&&!animating&&now>=autoAt)advanceAuto(now);
    if(tubeDrag?.active||transition||animating||autoQueue||holdStarted!==null||spinEnds||pcrRun&&lesson.playing||gelRun||now<handlingUntil||keys.size&&!working)frame=requestAnimationFrame(render);
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
    if(transition||animating||autoQueue||holdStarted!==null||spinEnds||pcrRun||gelRun||observationIsOpen())return;
    if(working){
      const old=working;
      if(!experiment){
        if(old.id==='ice')carrying=true;
        if(old.id==='prep')carrying=false;
      }
      actions.hidden=true;
      mixMeter.hidden=true;
      objectButtons.replaceChildren();
      transition={from:pose,to:{...player,y:standing},start:performance.now(),done(){
        working=null;
        pose=null;
        zone.textContent=experiment?.carrying?(experiment.phase==='carry'?'냉각 랙 운반 중':'반응관 랙 운반 중'):carrying?'냉각 랙 운반 중':'자유 탐색';
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
    if(experiment&&!experiment.finished&&near.id!==experiment.destination){
      const next=stations.find(station=>station.id===experiment.destination);
      note.textContent='지금은 '+next.name+'에서 작업할 차례입니다.';
      return;
    }
    working=near;
    const target=working;
    keys.clear();
    entry.hidden=true;
    pose={x:target.x,y:target.eye,z:target.viewZ,yaw:0,pitch:target.tilt};
    transition={from:{...player,y:standing},to:pose,start:performance.now(),done(){
      zone.textContent=target.name;
      note.textContent=experiment?.finished?'탐구 완료 / 장비와 실험 단계를 다시 살펴보세요.':experiment?(target.id==='ice'
        ?experiment.lid?'냉각 랙을 집으세요.':'아이스박스 뚜껑을 여세요.'
        :experiment.carrying?'랙을 내려놓으세요.':experiment.message):target.action+'입니다. 마우스로 주변을 둘러보거나 E를 눌러 일어나세요.';
      refreshActions();
    }};
    schedule();
  }

  const shortNames={buffer:'버퍼와 dNTP',primer:'프라이머',rt:'역전사 효소',taq:'Taq',
    'sample:A':'A 원본','sample:B':'B 원본','sample:positive':'+ 원본','sample:negative':'− 원본',
    'tube:A':'A 반응관','tube:B':'B 반응관','tube:positive':'+ 반응관','tube:negative':'− 반응관',
    tips:'새 팁',discard:'팁 버리기',place:'랙 놓기',holdMix:'꾹 눌러 믹싱하기',removeMix:'반응관 되돌리기',collectSpin:'반응관 회수','gelSource:marker':'마커','gelSource:A':'A 산물','gelSource:B':'B 산물','gelSource:positive':'+ 대조군','gelSource:negative':'− 대조군'};

  function refreshActions(){
    if(!experiment||!working){actions.hidden=true;objectButtons.replaceChildren();return;}
    const ids=autoQueue?[]:experiment.controls(working.id);
    mixMeter.hidden=!ids.includes('holdMix')&&!ids.includes('removeMix');
    if(holdStarted===null)mixProgress.value=ids.includes('removeMix')?mixHoldMs:0;
    const next=experiment.finished?null:experiment.nextAction(working.id,ids);
    const fixed=[],tagged=[];
    for(const id of ids){
      const button=document.createElement('button');
      button.type='button';
      button.dataset.labAction=id;
      button.toggleAttribute('data-lab-next',id===next);
      const fullName=experiment.actions.get(id);
      button.textContent=shortNames[id]??fullName;
      button.title=fullName;
      button.setAttribute('aria-label',fullName);
      if(lab.targets.has(id)){
        if(id.startsWith('well:'))button.textContent=['1 / 마커','2 / A','3 / B','4 / 양성','5 / 음성'][Number(id.slice(5))];
        button.dataset.kind=experiment.reagents.some(item=>item.id===id)?'reagent':id.split(':')[0];
        button.className='lab-object-button';
        tagged.push(button);
      }else fixed.push(button);
    }
    if(experiment.finished&&working.id!=='led'){
      const button=document.createElement('button');
      button.type='button';
      button.dataset.labReview='';
      button.textContent=working.id==='pcr'?'PCR 모식도 다시 보기':'실험 단계 다시 보기';
      fixed.push(button);
    }
    actions.hidden=!fixed.length;
    actionButtons.replaceChildren(...fixed);
    objectButtons.replaceChildren(...tagged);
    positionObjectButtons();
  }
  function positionObjectButtons(){
    if(!objectButtons.children.length)return;
    const width=viewport.clientWidth,height=viewport.clientHeight;
    const groups=new Map();
    for(const button of objectButtons.children){
      const target=lab.targets.get(button.dataset.labAction);
      target.getWorldPosition(anchor).project(camera);
      const visible=anchor.z<1&&Math.abs(anchor.x)<1&&Math.abs(anchor.y)<1;
      button.hidden=!visible;
      if(button.dataset.labAction==='runSpin'||button.dataset.labAction==='runPcr')button.disabled=performance.now()<handlingUntil;
      if(!visible)continue;
      const kind=button.dataset.kind;
      const item={button,x:(anchor.x+1)*width/2,y:(1-anchor.y)*height/2};
      if(!groups.has(kind))groups.set(kind,[]);
      groups.get(kind).push(item);
    }
    for(const [kind,items] of groups){
      items.sort((a,b)=>a.x-b.x);
      const count=items.length;
      const widest=Math.max(...items.map(({button})=>button.offsetWidth));
      const middle=(items[0].x+items.at(-1).x)/2;
      const spacing=count>1?Math.min((width-widest-12)/(count-1),Math.max(widest+7,(items.at(-1).x-items[0].x)/(count-1))):0;
      const span=(count-1)*spacing/2+widest/2+5;
      const center=T.MathUtils.clamp(middle,span,width-span);
      items.forEach(({button,x,y},i)=>{
        const mixTag=kind==='holdMix'||kind==='removeMix';
        const left=mixTag?T.MathUtils.clamp(x+widest/2+24,span,width-span):center+(i-(count-1)/2)*spacing;
        const gap=mixTag?-38:['sample','lid','rack','well'].includes(kind)?-32:kind==='reagent'?22:kind==='discard'&&width<650?62:24;
        const top=T.MathUtils.clamp(y+gap,62,height*.74);
        button.style.left=left+'px';
        button.style.top=top+'px';
        button.style.setProperty('--tag-line',Math.hypot(x-left,y-top)+'px');
        button.style.setProperty('--tag-angle',Math.atan2(y-top,x-left)+'rad');
      });
    }
  }

  function animateAction(id,now,duration){
    const effect=experiment.perform(id);
    if(!effect)return false;
    lab.prepareAction(effect,id,now,duration);
    animating=duration>0&&['lid','rack','place','tips','discard','aspirate','dispense','selectGel','loadGel'].includes(effect);
    if(!animating)handlingUntil=now+420;
    if(effect==='runSpin')spinEnds=now+(reduceMotion?800:2400);
    if(effect==='runPcr'){pcrRun=true;lesson.open();}
    if(effect==='runGel')gelRun={start:now,duration:reduceMotion?1200:3900};
    if(effect==='inspectLed')observation.open();
    if(effect==='lid'){
      pose.pitch=-.55;
      renderer.shadowMap.needsUpdate=true;
    }
    return true;
  }
  function advanceAuto(now){
    if(autoQueue.length){
      const next=autoQueue.shift();
      const duration=reduceMotion?0:165;
      if(animateAction(next,now,duration)){
        autoAt=now+(duration||65);
        const label=experiment.actions.get(next);
        const operation=next==='tips'?'새 팁 장착':next==='discard'?'사용한 팁 폐기'
          :next.startsWith('tube:')?label+'에 주입':label+' 흡입';
        note.textContent='자동 준비 중 / '+operation;
        return;
      }
    }
    autoQueue=null;
    renderer.shadowMap.needsUpdate=true;
    note.textContent=experiment.message;
    refreshActions();
    schedule();
  }
  const observationIsOpen=()=>!review.hidden||!!find('.lab-gel-observation:not([hidden])');
  function perform(id){
    if(id==='holdMix'||!experiment||transition||animating||autoQueue||holdStarted!==null||spinEnds||pcrRun||gelRun||observationIsOpen()||!experiment.controls(working?.id).includes(id))return;
    if(['runSpin','runPcr'].includes(id)&&performance.now()<handlingUntil)return;
    if(id==='auto'){
      const sequence=experiment.autoActions();
      if(!sequence.length)return;
      autoQueue=sequence;
      autoAt=0;
      note.textContent='나머지 반응관을 자동으로 준비합니다.';
    }else{
      const duration=reduceMotion?0:['lid','rack','place'].includes(id)?360:220;
      animateAction(id,performance.now(),duration);
      note.textContent=experiment.message;
    }
    refreshActions();
    if(!pcrRun&&!observationIsOpen())viewport.focus({preventScroll:true});
    schedule();
  }

  let consumeMixClick=false;
  function beginMix(event){
    if(!experiment?.controls(working?.id).includes('holdMix')||holdStarted!==null)return;
    if(event?.type==='pointerdown'){
      consumeMixClick=true;
      viewport.setPointerCapture(event.pointerId);
    }
    holdStarted=performance.now();
    note.textContent='혼합 중 / 버튼을 계속 누르세요.';
    schedule();
  }
  function cancelMix(){
    if(holdStarted===null)return;
    holdStarted=null;mixProgress.value=0;handlingUntil=performance.now()+140;
    note.textContent='혼합이 끝날 때까지 접촉판 버튼을 누르고 있으세요.';
    schedule();
  }
  viewport.addEventListener('pointerdown',()=>{consumeMixClick=false;},true);
  viewport.addEventListener('keydown',()=>{consumeMixClick=false;},true);
  viewport.addEventListener('click',event=>{
    if(!consumeMixClick)return;
    consumeMixClick=false;
    event.stopPropagation();
  },true);
  objectButtons.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const id=event.target.closest('[data-lab-action]')?.dataset.labAction;
    if(id==='holdMix')beginMix(event);
    else startTubeDrag(event,id);
  });
  objectButtons.addEventListener('contextmenu',event=>{
    if(event.target.closest('[data-lab-action="holdMix"]'))event.preventDefault();
  });
  objectButtons.addEventListener('keydown',event=>{
    if([' ','Enter'].includes(event.key)&&event.target.closest('[data-lab-action="holdMix"]')){
      event.preventDefault();beginMix();
    }
  });
  window.addEventListener('pointerup',cancelMix);
  window.addEventListener('pointercancel',cancelMix);
  window.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key))cancelMix();});
  window.addEventListener('blur',cancelMix);
  actions.addEventListener('click',event=>{
    if(!event.target.closest('[data-lab-review]')||!working||!experiment.finished)return;
    if(working.id==='pcr'){
      pcrRun=true;
      lesson.open(true);
      schedule();
      return;
    }
    const step=reviewSteps[stationSteps[working.id]];
    if(!step)return;
    const heading=review.querySelector('h3');
    heading.textContent=working.name+' / '+step.title;
    review.querySelector('p').textContent=step.why;
    review.querySelector('ul').replaceChildren(...step.tasks.map(text=>{
      const item=document.createElement('li');
      item.textContent=text;
      return item;
    }));
    review.hidden=false;
    heading.focus({preventScroll:true});
  });
  for(const controls of [actions,objectButtons])controls.addEventListener('click',event=>{
    const button=event.target.closest('[data-lab-action]');
    if(button)perform(button.dataset.labAction);
  });
  entry.addEventListener('click',event=>{
    if(event.pointerType==='touch'){viewport.focus({preventScroll:true});entry.hidden=true;return;}
    capture();
  });
  function pointAt(event){
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  }
  function startTubeDrag(event,id){
    if(tubeDrag||working?.id!=='spin'||animating||transition||!id?.startsWith('handle:'))return false;
    tubeDrag={id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,active:false};
    return true;
  }

  function dropSlot(event){
    const label=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-lab-action^="slot:"]');
    if(label&&objectButtons.contains(label))return label.dataset.labAction;
    pointAt(event);
    raycaster.setFromCamera(pointer,camera);
    const slots=experiment.controls('spin').filter(id=>id.startsWith('slot:'));
    return raycaster.intersectObjects(slots.map(id=>lab.targets.get(id)),false)[0]?.object.userData.action;
  }

  viewport.addEventListener('pointermove',event=>{
    if(tubeDrag?.pointerId!==event.pointerId)return;
    if(!tubeDrag.active){
      if(Math.hypot(event.clientX-tubeDrag.x,event.clientY-tubeDrag.y)<7)return;
      viewport.setPointerCapture(event.pointerId);
      tubeDrag.active=true;
      perform(tubeDrag.id);
      tubeGhost.textContent=experiment.actions.get(tubeDrag.id);
      tubeGhost.hidden=false;
    }
    const rect=viewport.getBoundingClientRect();
    tubeGhost.style.left=(event.clientX-rect.left)+'px';
    tubeGhost.style.top=(event.clientY-rect.top)+'px';
    const slot=dropSlot(event);
    for(const button of objectButtons.children)button.toggleAttribute('data-lab-drop',button.dataset.labAction===slot);
  });

  function endTubeDrag(event){
    if(tubeDrag?.pointerId!==event.pointerId)return;
    const slot=tubeDrag.active&&event.type==='pointerup'?dropSlot(event):null;
    tubeDrag=null;
    tubeGhost.hidden=true;
    for(const button of objectButtons.children)button.removeAttribute('data-lab-drop');
    if(slot)perform(slot);
  }
  window.addEventListener('pointerup',endTubeDrag);
  window.addEventListener('pointercancel',endTubeDrag);
  viewport.addEventListener('lostpointercapture',endTubeDrag);

  function pickTarget(){
    if(!experiment||!working||transition||animating||autoQueue)return null;
    raycaster.setFromCamera(pointer,camera);
    const ids=experiment.controls(working.id);
    return raycaster.intersectObjects(ids.map(id=>lab.targets.get(id)).filter(Boolean),false)[0]?.object.userData.action??null;
  }
  canvas.addEventListener('click',event=>{
    if(skipClick){skipClick=false;return;}
    pointAt(event);
    const hit=pickTarget();
    if(hit){perform(hit);return;}
    if(event.pointerType!=='touch')capture();
  });
  promptButton.addEventListener('click',()=>{
    viewport.focus({preventScroll:true});
    enter();
  });
  viewport.addEventListener('keydown',event=>{
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
  window.addEventListener('blur',()=>{setMouse(false);stop();});
  viewport.addEventListener('focusout',event=>{
    if(!viewport.contains(event.relatedTarget))stop();
  });
  canvas.addEventListener('pointerdown',event=>{
    skipClick=false;
    if(event.button!==0||event.pointerType==='mouse'&&!working)return;
    pointAt(event);
    const hit=pickTarget();
    if(hit==='holdMix'){beginMix(event);return;}
    if(startTubeDrag(event,hit))return;
    viewport.focus({preventScroll:true});
    entry.hidden=true;
    canvas.setPointerCapture(event.pointerId);
    drag={x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointermove',event=>{
    if(working){pointAt(event);schedule();}
    if(drag){
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(skipClick||Math.hypot(dx,dy)>5){
        skipClick=true;
        look(dx*2,dy*2);
        drag={x:event.clientX,y:event.clientY};
      }
    }else if(!working&&mouseMode&&event.pointerType==='mouse'){
      look(event.movementX,event.movementY);
    }
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
