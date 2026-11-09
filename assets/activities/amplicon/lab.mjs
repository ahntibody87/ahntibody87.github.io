import {createState,freshTip,addReagent,resetTube,planRemainingTransfers,issues,nextIssues,timeline,frameAt,bands} from './model.mjs?v=pcr8';
import {stations,project,unproject,labMap,equipmentArt,molecule,temperatureGraph,quantityGraph} from './visuals.mjs?v=pcr8';

import {mountWorkbench} from './workbench.mjs?v=3';
import {coolerObjects,preparationObjects,electrophoresisObjects,sceneMarkup} from './workbench-ui.mjs?v=3';

import {mixEquipment} from './mix-equipment.mjs?v=batch5';

import {pcrEquipment} from './pcr-equipment.mjs';

const root=document.getElementById('amp-lab');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,extra='')=>`<button type="button" data-action="${action}" ${extra}>${text}</button>`;
const tick=(done,text)=>`<li class="${done?'amp-done':''}"><span aria-hidden="true">${done?'✓':'○'}</span> ${esc(text)}</li>`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let scenario,state,station=null,busy=false,quality=reduced.matches?'low':'normal',selected='A';
let benchScene=null,prepPosition=null,gelPosition=null,prepLiquid=null,gelLiquid=null;
let coolerOpen=false,coolerTransfer=0,carrying=false,transit=null;
const vortexHoldMs=1500;
let vortexTube=null,mixHold=null,spinSlots=[null,null,null,null],lidClosed=false,spinning=false;
const parkedPipette={x:5.1,y:.32,z:-1.25};
let player={x:4.8,y:4.8},target=null,keys=new Set(),previous=0,near=null,moveFrame=0,motion=null,molecularPaused=false;
const $=selector=>root.querySelector(selector);
const all=selector=>[...root.querySelectorAll(selector)];
const label=id=>id==='marker'?'DNA 크기 마커':scenario.samples.find(s=>s.id===id)?.label||id;
const material=id=>scenario.reagents.find(r=>r.id===id)?.label||scenario.samples.find(s=>`sample:${s.id}`===id)?.material||id;
const announce=text=>{const node=$('#amp-status');if(node)node.textContent=text;};
const rackReceived=()=>Object.values(state.tubes).every(tube=>tube.received);

async function init(){
  try{
    const response=await fetch(root.dataset.scenario,{cache:'no-cache'});
    if(!response.ok)throw new Error('scenario');
    scenario=await response.json();
    if(scenario.schemaVersion!==1||scenario.samples.length!==4||!scenario.warnings)throw new Error('schema');
    state=createState(scenario);render();
  }catch{
    root.innerHTML='<div class="amp-panel"><h2>실험 자료를 불러오지 못했습니다</h2><p>인터넷 연결을 확인하고 새로고침해 주세요. 로컬에서는 파일을 바로 열지 말고 HTTP 서버로 실행해 주세요.</p><button type="button" id="amp-reload">다시 불러오기</button></div>';
    $('#amp-reload').onclick=init;
  }
}
function checklist(){
  const tubes=Object.values(state.tubes),s=state.step;
  const flags=s===0?[true,true]:s===1?[rackReceived()]:s===2?[tubes.every(t=>t.additions.length>0&&!t.additions.some(a=>a.reused)),issues(state,scenario,2).length===0,tubes.every(t=>t.additions.length===5)]:s===3?[tubes.every(t=>t.mixed),tubes.every(t=>t.spun)]:s===4?[state.pcrLoaded.length===4,issues(state,scenario,4).length===0,state.amplified]:s===5?[state.recorded,state.lanes.every((x,i)=>x&&x===state.lanePlan[i]),state.polarity==='normal',state.gelRun]:[state.viewed,!!state.answer&&!!state.reason.trim(),state.submitted];
  return scenario.steps[s].tasks.map((t,i)=>tick(flags[i],t)).join('');
}
function render(){
  const active=document.activeElement;
  const focusId=root.contains(active)?active.id:'';
  const focusAction=root.contains(active)?active.dataset.action:null;
  const focusItem=active?.dataset?.id;
  const whyOpen=$('.amp-progress details')?.open;
  const step=scenario.steps[state.step];
  root.dataset.quality=quality;
  root.innerHTML=`<div class="amp-top"><div><span class="amp-kicker">분자 진단 탐구 · 10~20분</span><h2>AMPLICON <span>웹 구현 실험실</span></h2></div><label>애니메이션 <select id="amp-quality"><option value="normal" ${quality==='normal'?'selected':''}>표준</option><option value="low" ${quality==='low'?'selected':''}>저사양 · 움직임 줄이기</option></select></label></div>
  <div class="amp-layout"><aside class="amp-progress"><span class="amp-kicker">현재 단계 ${state.step} / 6</span><h3>${esc(step.title)}</h3><ol class="amp-step-list">${scenario.steps.map((s,i)=>`<li ${i===state.step?'aria-current="step"':''} class="${i<state.step?'amp-past':''}"><span>${i<state.step?'✓':i}</span>${esc(s.title)}</li>`).join('')}</ol><ul class="amp-checklist">${checklist()}</ul><details><summary>왜 이 과정을 할까요?</summary><p>${esc(step.why)}</p></details><div class="amp-side-actions">${state.step===0?button('실험 시작하기 →','next','class="amp-primary"'):state.step<6&&!carrying?button('다음 단계 →','next','class="amp-primary" '+(busy||transit?'disabled':'')):''}${state.step>0&&state.step<6?button('이전 단계','previous',busy||transit?'disabled':''):''}</div><p class="amp-small">실제 반응 시간은 단축했습니다.<br>답안은 저장되지 않으며 새로고침하면 처음부터 시작합니다.</p></aside>
  <div class="amp-main">${state.step===0?brief():station?workstation():explore()}</div></div>
  <p class="amp-status" id="amp-status" role="status" aria-live="polite"></p>
  <dialog class="amp-warning" id="amp-warning" aria-labelledby="amp-warning-title"></dialog>`;
  bind();benchScene=null;bindBenchScene();if(!station&&state.step>0)updatePlayer();
  if(whyOpen)$('.amp-progress details').open=true;
  const restored=focusId?root.querySelector(`[id="${focusId}"]`):focusAction?root.querySelector(`[data-action="${focusAction}"]${focusItem?`[data-id="${focusItem}"]`:''}`):null;
  if(restored&&!restored.disabled)restored.focus({preventScroll:true});
}
function brief(){return `<section class="amp-brief"><div class="amp-brief-visual">${equipmentArt('pcr')}<div><span class="amp-kicker">사건 01 · 분자 진단</span><h3>${esc(scenario.title)}</h3><p>${esc(scenario.brief)}</p></div></div><div class="amp-facts"><article><span>01 / 시료</span><h4>의심자 A와 B</h4><p>핵산 추출 완료<br>감염 여부는 아직 모릅니다.</p></article><article><span>02 / 표적</span><h4>${esc(scenario.target)} · 약 ${scenario.productBp}bp</h4><p>${esc(scenario.virus)}는 RNA 바이러스.<br>RNA → cDNA → DNA 증폭</p></article><article><span>03 / 대조군</span><h4>양성 대조군 + NTC</h4><p>바이러스 RNA: 증폭 확인<br>증류수: 오염 확인</p></article></div><div class="amp-route">시약 조제 <b>→</b> 역전사·PCR <b>→</b> 전기영동 <b>→</b> 근거로 판정</div><p>한 튜브에서 역전사와 PCR을 이어서 하는 <strong>RT-PCR</strong>을 사용합니다. 완성된 겔과 추출 RNA가 준비되어 있습니다.</p>${button('실험 시작하기 →','next','class="amp-primary"')}</section>`;}
function movePad(){return `<div class="amp-dpad" aria-label="터치 이동"><button type="button" data-move="up" aria-label="위로 이동">↑</button><button type="button" data-move="left" aria-label="왼쪽 이동">←</button><button type="button" data-action="interact" aria-label="가까운 기기 열기">E</button><button type="button" data-move="right" aria-label="오른쪽 이동">→</button><button type="button" data-move="down" aria-label="아래로 이동">↓</button></div>`;}
function explore(){if(transit)return `<section class="amp-explore"><h3>${transit.message}</h3><div class="amp-room-wrap">${labMap(transit.cargo)}</div></section>`;if(carrying)return `<section class="amp-explore"><div class="amp-panel-head"><h3>냉각 랙을 들고 작업대로 이동하세요</h3></div><div class="amp-room-wrap">${labMap(true)}${movePad()}</div><p class="amp-controls-note">방향키 / WASD 또는 바닥을 눌러 이동하세요. 작업대 가까이에서 E를 누르거나 지도에서 작업대를 누르세요.</p></section>`;return `<section class="amp-explore"><div class="amp-panel-head"><div><span class="amp-kicker">탐색 모드</span><h3>기기로 이동해 실험하세요</h3></div>${button('현재 단계 기기로 이동','goto','class="amp-soft"')}</div><div class="amp-room-wrap">${labMap(carrying)}${movePad()}</div><p class="amp-controls-note">WASD / 방향키 이동 · E로 조작 · 바닥을 클릭하거나 탭해 이동 · 기기를 누르면 가까이 이동해 열기</p><div class="amp-station-links" aria-label="기기 바로 이동">${stations.map(s=>button(s.label,'open',`data-id="${s.id}"`)).join('')}</div></section>`;}
function tubeCards(action='tube',ids=scenario.samples.map(s=>s.id)){
  return `<div class="amp-tubes">${ids.map(id=>{const t=state.tubes[id];return button(`<span class="amp-tube-drawing ${t.additions.length?'amp-filled':''}" aria-hidden="true"><i></i></span><strong>${esc(label(id))}</strong><small>${!t.received?'수령 전':`${t.additions.length}/5 성분`}${t.spun?' · 스핀 완료':t.mixed?' · 혼합 완료':''}</small>`,action,`data-id="${id}" class="amp-tube ${id===selected?'amp-selected':''}" aria-pressed="${id===selected}"`);}).join('')}</div>`;
}
function workstation(){
  const s=stations.find(s=>s.id===station),expected=scenario.steps[state.step].station;
  const relevant=station===expected||(state.step===3&&station==='spin');
  return `<section class="amp-work"><div class="amp-panel-head"><div class="amp-work-heading">${equipmentArt(station)}<div><span class="amp-kicker">작업 모드 · ${state.step}단계</span><h3 tabindex="-1" id="amp-work-title">${s.label}</h3></div></div>${button('← 실험실로','close',busy?'disabled':'')}</div>${!relevant?`<div class="amp-empty"><p>지금은 ‘${esc(scenario.steps[state.step].title)}’ 단계입니다.</p>${button('현재 단계 기기로 이동','goto','class="amp-primary"')}</div>`:station==='ice'?iceView():station==='bench'?benchView():station==='vortex'||station==='spin'?mixView():station==='pcr'?pcrView():station==='gel'?gelView():uvView()}</section>`;
}

function prepScene(){
  return sceneMarkup(preparationObjects(state,scenario),'prep',esc,busy);
}
function iceView(){
  const received=rackReceived();
  const instructions=received?'냉각 랙을 꺼냈습니다. 원본 네 개를 랙째 작업대로 옮기세요.':
    coolerOpen?'냉각 랙을 눌러 꺼내세요. 오른쪽 받침으로 끌어 놓아도 됩니다.':'아이스박스 뚜껑을 열어 준비된 냉각 랙을 꺼내세요.';
  return '<p>'+instructions+'</p>'+
    sceneMarkup(coolerObjects(scenario,coolerOpen,coolerTransfer),'cooler',esc,busy)+
    '<div class="amp-actions">'+(received?button('랙을 들고 작업대로 →','carryRack','class="amp-primary"'):
      button(coolerOpen?'냉각 랙 꺼내기':'아이스박스 뚜껑 열기',coolerOpen?'liftRack':'openCooler','class="amp-primary" '+(busy?'disabled':'')))+'</div>';
}
function aReady(){return state.tubes.A.additions.length===scenario.reagents.length+1;}
function benchView(){
  const t=state.tubes[selected];
  const plan=planRemainingTransfers(state,scenario);
  return '<p><strong>'+(aReady()?(plan?.length===0?'네 반응관 준비 완료.':'남은 반응관은 자동으로 준비할 수 있습니다.'):'A 반응관부터 공통 시약 4종과 A의 추출 RNA를 차례로 넣으세요.')+'</strong></p><p>피펫을 <strong>팁 박스 → 시약병 → 반응 튜브 → 폐기통</strong> 순으로 옮기세요. 피펫을 끌거나 기구를 차례로 누를 수 있습니다. 팁이 끼워져 있다면 병에서 반응 튜브로 바로 끌어도 됩니다.</p>'+
    '<div class="amp-recipe">'+scenario.reagents.map((r,i)=>'<span>'+(i+1)+'. '+esc(r.label)+'</span>').join('<b>→</b>')+
    '<b>→</b><span>5. 해당 원본 시료</span></div>'+prepScene()+
    '<div class="amp-bench-readout" role="status" aria-live="polite" id="amp-scene-status">'+
    esc(prepLiquid?material(prepLiquid)+' 흡입됨':state.tip?(state.tip.used?'사용한 팁 · 폐기통에서 버리세요':'새 팁 장착 · 시약병에서 흡입하세요'):'팁 박스를 눌러 새 팁을 끼우세요')+'</div>'+
    '<div class="amp-actions">'+
    (aReady()&&plan?.length&&!state.tip&&!busy?'<strong>나머지 반응관에 공통 시약과 원본 시료를 자동으로 넣을까요?</strong>'+
      button('네.','autoPipette','class="amp-primary" '+(!state.ice?'disabled':'')):'')+
    '<label class="amp-inline"><input id="amp-ice" type="checkbox" '+(state.ice?'checked':'')+' '+(busy?'disabled':'')+'> 효소병을 얼음 위에 두기</label></div>'+
    '<div class="amp-actions">'+scenario.samples.map(s=>button(esc(s.label)+' 성분 보기','tube','data-id="'+s.id+'" aria-pressed="'+(selected===s.id)+'" '+(busy?'disabled':''))).join('')+'</div>'+
    '<div class="amp-contents"><h4>'+esc(label(selected))+' 반응 튜브 · '+t.additions.length+'개 성분</h4><ol>'+
    (t.additions.length?t.additions.map(a=>'<li>'+esc(material(a.reagent))+'</li>').join(''):'<li>빈 반응 튜브</li>')+
    '</ol>'+button('이 반응 튜브 새로 만들기','resetTube',busy?'disabled':'')+'</div>'+
    '<div class="amp-actions">'+button('혼합·스핀다운으로 →','next','class="amp-primary" '+(busy?'disabled':''))+'</div>';
}
function mixView(){
  const spin=station==='spin';
  const samples=scenario.samples;
  const ready=spinSlots.every(slot=>slot&&state.tubes[slot.id].mixed);
  const complete=ready&&spinSlots.every(slot=>state.tubes[slot.id].spun);
  const art=mixEquipment({spin,active:spinning,closed:lidClosed,slots:spinSlots,
    sample:vortexTube,index:samples.findIndex(s=>s.id===vortexTube),button,label,escape:esc});
  return `<p>${spin?'혼합한 반응관을 고르고 로터의 구멍을 누르거나 구멍에 끌어 놓으세요. 서로 마주 보는 1·3번과 2·4번에 같은 부피의 반응관을 배치합니다.':`반응관을 눌러 접촉판에 올리거나 접촉판으로 끌어 놓으세요. 약 ${vortexHoldMs/1000}초 동안 접촉판에 눌러 혼합하세요.`}</p>
    ${art}
    <div class="amp-tubes">${samples.map(({id})=>{
      const loaded=spinSlots.some(slot=>slot?.id===id);
      const done=spin?state.tubes[id].spun:state.tubes[id].mixed;
      return button(`<span class="amp-tube-drawing amp-filled" aria-hidden="true"><i></i></span><strong>${esc(label(id))}</strong><small>${done?'✓ 완료':spin&&loaded?'장착됨':vortexTube===id&&!spin?'접촉판 위':'선택'}</small>`,
        spin?'selectSpin':'placeVortex',`data-id="${id}" class="amp-tube" aria-pressed="${(spin?selected:vortexTube)===id}" ${busy||spin&&(loaded||lidClosed)?'disabled':`draggable="true" data-drag-tube="${id}"`}`);
    }).join('')}</div>
    <div class="amp-actions">${spin?
      button(lidClosed?'덮개 열기':'덮개 닫기','spinLid',busy?'disabled':'')+
      button(spinning?'회전 중…':complete?'✓ 스핀다운 완료':'네 반응관 스핀다운','spinAll',`class="amp-primary" ${!ready||!lidClosed||busy||complete?'disabled':''}`):
      `<button type="button" id="amp-vortex-hold" class="amp-primary" ${vortexTube?'':'disabled'}>접촉판에 누르고 있기</button><progress id="amp-vortex-progress" max="${vortexHoldMs}" value="0" aria-label="볼텍스 혼합 시간"></progress>`}
    ${spin?button("볼텍스로 이동","open",'data-id="vortex"'+(busy?" disabled":"")):""}</div>`;
}

function stopMix(complete=false){
  if(!mixHold)return;
  cancelAnimationFrame(mixHold.frame);
  mixHold=null;busy=false;
  if(complete){state.tubes[vortexTube].mixed=true;state.tubes[vortexTube].spun=false;render();}
  else {
    $('.amp-vortex')?.classList.remove('amp-machine-running');
    const progress=$('#amp-vortex-progress');if(progress)progress.value=0;
  }
  announce(complete?label(vortexTube)+' 반응관 혼합 완료.':`혼합하려면 ${vortexHoldMs/1000}초 동안 계속 누르세요.`);
}
function startMix(){
  if(busy||!vortexTube||warn(issues(state,scenario,2)))return;
  const start=performance.now();
  const progress=$('#amp-vortex-progress');
  busy=true;mixHold={frame:0};
  $('.amp-vortex').classList.add('amp-machine-running');
  announce('볼텍스 믹서 작동 중.');
  function advance(now){
    progress.value=now-start;
    if(now-start>=vortexHoldMs)stopMix(true);
    else mixHold.frame=requestAnimationFrame(advance);
  }
  mixHold.frame=requestAnimationFrame(advance);
}

function pcrView(){
  const loaded=state.pcrLoaded.length===scenario.samples.length;
  return pcrEquipment({loaded,active:!!motion,complete:state.amplified,program:state.program})+
    (motion?molecularView():`<p>네 반응관을 한 번에 장착하고 화면에 표시된 기본 프로그램으로 실행하세요.</p>
      <div class="amp-actions">${state.amplified?
        '<strong class="amp-success">✓ RT-PCR 완료 · 전기영동으로 진행하세요.</strong>'+button('분자 뷰 다시 보기','replayPcr'):
        button('네 튜브를 한 번에 넣기','loadPcr',loaded?'disabled':'')+
        button('기기 가동 · 분자 뷰 보기','runPcr','class="amp-primary" '+(loaded?'':'disabled'))}</div>`);
}
function molecularView(){return `<div class="amp-molecular"><div class="amp-molecule-head"><strong>분자 관찰</strong><div>${button(molecularPaused?'계속 재생':'일시정지','pause')}${button('관찰 건너뛰기','skip')}</div></div><div id="amp-temp-graph"></div><div class="amp-molecule-pair"><article><h4>스파이크 유전자가 있는 튜브</h4><div id="amp-mol-a"></div></article><article><h4>스파이크 유전자가 없는 튜브</h4><div id="amp-mol-b"></div></article></div><div class="amp-molecule-legend"><span style="--amp-key:#ce8430">RNA</span><span style="--amp-key:#2885b3">주형 DNA</span><span style="--amp-key:#ce5a87">새 DNA</span><span style="--amp-key:#a17b0e">프라이머</span></div><div class="amp-molecular-bottom"><div id="amp-quantity"></div><div><strong id="amp-copy-count"></strong><p id="amp-phase-note"></p><p class="amp-small">Taq은 고온에서도 기능을 유지하는 내열성 DNA 중합효소입니다. 이론상 양은 2ⁿ이며 실제 반응은 효율·시약 고갈의 영향을 받습니다.</p></div></div></div>`;}
function gelSvg(showBands=false,moving=false){
  const y=bp=>70+230*(1-Math.log(bp/75)/Math.log(8));
  return `<svg class="amp-gel ${moving?'amp-migrating':''}" viewBox="0 0 620 365" role="img" aria-label="${showBands?'레인별 전기영동 밴드 결과':'전기영동 겔과 다섯 레인의 웰'}"><rect x="70" y="40" width="480" height="280" rx="12" fill="${showBands?'#172942':'#e4edf7'}"/><text x="20" y="60" fill="#315efb" font-size="18">−</text><text x="20" y="310" fill="#c04566" font-size="18">+</text><path d="M35 85V280m-7-10 7 10 7-10" stroke="#8ca1ba" stroke-width="2" fill="none"/><text x="47" y="348" fill="#61718c" font-size="12">DNA 이동 ↓ · 웰은 − 극 쪽</text>${state.lanes.map((id,i)=>{const x=125+i*90;return `<g><text x="${x}" y="20" text-anchor="middle" fill="#354861" font-size="12">${i+1} ${esc(id?label(id):'빈 레인')}</text><rect x="${x-20}" y="50" width="40" height="9" rx="2" fill="${id?'#80a9ed':'#b5c4d6'}"/>${showBands&&id?bands(scenario,id).map(bp=>`<rect class="amp-band" x="${x-19}" y="${y(bp)}" width="38" height="5" rx="2" fill="#b0efdc" style="--amp-band-y:${y(bp)-56}px"/>`).join(''):''}</g>`;}).join('')}${showBands?scenario.markerBp.map(bp=>`<text x="78" y="${y(bp)+4}" fill="#a9bfce" font-size="10">${bp}</text>`).join(''):''}</svg>`;
}
function gelLoading(){
  return '<p>마커나 PCR 산물에서 흡입한 뒤 웰을 누르세요. 병에서 웰로 끌어 놓아도 됩니다. 로딩할 때마다 새 팁을 사용합니다.</p>'+
    sceneMarkup(electrophoresisObjects(state,scenario),'gel',esc,busy)+
    '<div class="amp-bench-readout" id="amp-scene-status" role="status">'+(gelLiquid?esc(label(gelLiquid))+' 흡입됨':'마커 또는 PCR 산물을 고르세요.')+'</div>'+
    '<div class="amp-actions">'+state.lanes.map((id,i)=>id?button((i+1)+'번 웰 비우기','clearLane','data-lane="'+i+'" aria-label="'+(i+1)+'번 웰 비우기"'):'').join('')+'</div>';
}
function gelView(){
  return `<p>레인 1은 DNA 크기 마커입니다. 나머지 레인의 순서를 정하고 <strong>기록한 뒤</strong> 로딩하세요.</p><div class="amp-lane-plan">${state.lanePlan.map((id,i)=>`<label>레인 ${i+1}<select data-lane-plan="${i}" ${state.gelRun?'disabled':''}>${['marker',...scenario.samples.map(s=>s.id)].map(v=>`<option value="${v}" ${v===id?'selected':''}>${esc(label(v))}</option>`).join('')}</select></label>`).join('')}</div><div class="amp-actions">${button('로딩 순서 기록','record',state.gelRun?'disabled':'')}<span>${state.recorded?'✓ 기록됨: '+state.lanePlan.map(label).join(' → '):'순서를 기록해 주세요.'}</span></div>${state.gelRun?gelSvg(true):gelLoading()}<label class="amp-inline">전극 연결<select id="amp-polarity" ${state.gelRun?'disabled':''}><option value="normal" ${state.polarity==='normal'?'selected':''}>웰 쪽 − / 겔 아래쪽 +</option><option value="reverse" ${state.polarity==='reverse'?'selected':''}>웰 쪽 + / 겔 아래쪽 −</option></select></label><p>DNA의 인산기는 음전하를 띱니다. DNA는 + 극으로 이동하며 작은 조각일수록 빠릅니다.</p><div class="amp-actions">${state.gelRun?'<strong class="amp-success">✓ 전기영동 완료 · UV 관찰기로 이동하세요.</strong>':button('전원 켜기','runGel','class="amp-primary" '+(busy?'disabled':''))}</div>`;
}
function uvView(){
  if(!state.viewed)return `<div class="amp-uv-cover">${equipmentArt('uv')}<h4>겔을 UV 관찰기에 놓으세요</h4><p>보호 덮개가 닫힌 관찰기로 밴드를 확인합니다.</p>${button('덮개 닫고 밴드 관찰','view','class="amp-primary"')}</div>`;
  return `${gelSvg(true)}<p class="amp-small">마커 눈금 단위: bp · 작은 DNA가 더 멀리 이동합니다. 표적 산물: 약 ${scenario.productBp}bp</p><form id="amp-conclusion"><fieldset><legend>누가 감염자라고 판단하나요?</legend>${[['A','A만'],['B','B만'],['both','A와 B 모두'],['neither','둘 다 아님']].map(([id,name])=>`<label><input type="radio" name="amp-answer" value="${id}" ${state.answer===id?'checked':''} required> ${name}</label>`).join('')}</fieldset><label for="amp-reason">밴드의 크기와 두 대조군을 근거로 설명하세요.</label><textarea id="amp-reason" rows="4" maxlength="3000" required placeholder="A와 B의 결과는… 양성 대조군과 NTC를 보면…">${esc(state.reason)}</textarea><p class="amp-small">답과 근거는 이 화면에서만 사용하며 저장·전송하지 않습니다.</p><button type="submit" class="amp-primary">제출하고 모범 해석과 비교</button></form>${state.submitted?`<section class="amp-comparison" tabindex="-1"><h3>${state.answer===scenario.answer?'판정이 일치합니다':'판정을 다시 비교해 보세요'}</h3><div class="amp-comparison-grid"><article><h4>내 해석</h4><p>${esc({A:'A만',B:'B만',both:'A와 B 모두',neither:'둘 다 아님'}[state.answer])}</p><p class="amp-student-reason">${esc(state.reason)}</p></article><article><h4>모범 해석</h4>${scenario.modelInterpretation.map(t=>`<p>${esc(t)}</p>`).join('')}</article></div><p>내 글에 ‘약 ${scenario.productBp}bp’, ‘양성 대조군’, ‘NTC’의 근거가 모두 있는지 스스로 확인하세요. 서술형 답안은 자동 채점하지 않습니다.</p><details><summary>과학적 근거</summary>${scenario.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a></p>`).join('')}</details><strong class="amp-success">✓ 탐구 완료</strong></section>`:''}`;
}

function warn(found){
  if(!found.length)return false;
  const dialog=$('#amp-warning'),focus=document.activeElement;
  dialog.innerHTML=`<h3 id="amp-warning-title">수정한 뒤 진행해 주세요</h3><p>${found.length}개 확인 사항이 있습니다.</p><div class="amp-warning-list">${found.map(({rule,tube})=>{const w=scenario.warnings[rule];const reuse=rule==='tip'&&state.tubes[tube]?.additions.find(a=>a.reused&&a.previousTransfer);
  const evidence=reuse?' '+label(reuse.previousTransfer.tube)+' 반응 튜브에 '+material(reuse.previousTransfer.reagent)+'을 분주한 팁을 '+label(tube)+' 반응 튜브에 다시 사용했습니다.':'';
  return `<article>${tube?`<strong>${esc(label(tube))} 튜브</strong>`:''}<p><b>① 문제 원인</b> ${esc(w.cause+evidence)}</p><p><b>② 분자 수준</b> ${esc(w.molecule)}</p><p><b>③ 판정 영향</b> ${esc(w.consequence)}</p></article>`;}).join('')}</div>${button('돌아가서 수정하기','fix','class="amp-primary"')}`;
  dialog.oncancel=e=>e.preventDefault();dialog.showModal();
  dialog.querySelector('button').onclick=()=>{dialog.close();focus?.focus();};
  return true;
}
function open(id){
  if(busy)return;
  if(carrying){
    const bench=stations.find(s=>s.id==='bench');
    if(id!==bench.id||Math.hypot(player.x-bench.x,player.y-bench.y-.9)>1.8){
      announce('랙을 들고 작업대 가까이로 이동하세요.');return;
    }
    carrying=false;state.step=2;
  }
  keys.clear();target=null;station=id;render();$('#amp-work-title')?.focus({preventScroll:true});
  if(quality!=='low'&&!reduced.matches){
    $('[data-bench-scene] canvas')?.animate(
      [{transform:'scale(.95)',opacity:.72},{transform:'scale(1)',opacity:1}],
      {duration:300,easing:'ease-out'});
  }
}
function invalidateAfter(step){
  if(step<=3){state.amplified=false;state.pcrLoaded=[];}
  if(step<=4){state.gelRun=false;state.lanes=[null,null,null,null,null];state.recorded=false;}
  state.viewed=false;state.submitted=false;
}

function sceneStatus(message){
  const status=$('#amp-scene-status');
  if(status){status.classList.remove('amp-error');status.textContent=message;}
  else announce(message);
}
function bindBenchScene(){
  const container=$('[data-bench-scene]');
  if(!container)return;
  const gel=container.dataset.benchScene==='gel';
  if(container.dataset.benchScene==='cooler'){
    benchScene=mountWorkbench(container,
      ()=>coolerObjects(scenario,coolerOpen,coolerTransfer),
      ()=>({position:null,tip:false,liquid:false}),
      id=>{
        if(id==='lid')action('openCooler');
        if(id==='rack'||id==='shelf')action('liftRack');
      });
    return;
  }
  benchScene=mountWorkbench(container,
    ()=>gel?electrophoresisObjects(state,scenario):preparationObjects(state,scenario),
    ()=>({position:state.step===1?null:(gel?gelPosition:prepPosition)??parkedPipette,tip:gel?!!gelLiquid:!!state.tip,liquid:gel?!!gelLiquid:!!prepLiquid}),
    (id,from)=>gel?handleGelTarget(id,from):handlePrepTarget(id,from));
}
async function moveTool(id,gel=false,auto=false){
  const position=await benchScene?.move(id,quality==='low'||reduced.matches?0:auto?110:250);
  if(gel)gelPosition=position;else prepPosition=position;
}
async function handlePrepTarget(id,from){
  if(busy)return;
  const sourceTarget=target=>!!target&&(target.startsWith('sample:')||scenario.reagents.some(r=>r.id===target));
  const tubeTarget=id.startsWith('tube:');
  const reject=message=>{
    const status=$('#amp-scene-status');
    status.textContent='✕ '+message;
    status.classList.add('amp-error');
  };
  const destination=tubeTarget?id.slice(5):null;
  const source=sourceTarget(id)?id:tubeTarget?(prepLiquid||(sourceTarget(from)?from:null)):null;
  const expected=tube=>scenario.reagents[state.tubes[tube].additions.length]?.id??
    (state.tubes[tube].additions.length===scenario.reagents.length?'sample:'+tube:null);
  const candidates=(aReady()?scenario.samples.map(s=>s.id):['A']).filter(tube=>expected(tube));
  if(id==='tips'&&state.tip)return reject('현재 팁을 폐기통에 버린 뒤 새 팁을 끼우세요.');
  if(id==='bin'&&!state.tip)return reject('팁 박스에서 새 팁을 끼우세요.');
  if(prepLiquid&&(sourceTarget(id)||sourceTarget(from)&&from!==prepLiquid))return reject('피펫에 든 용액을 먼저 분주하거나 팁과 함께 버리세요.');
  if(source||destination){
    if(!aReady()&&destination&&destination!=='A')return reject('A 반응관을 먼저 완성하세요.');
    if(!state.tip||state.tip.used)return reject(state.tip?'사용한 팁을 버리고 새 팁을 끼우세요.':'팁 박스에서 새 팁을 끼우세요.');
    if(!source)return reject('먼저 '+(expected(destination)?material(expected(destination))+'을 흡입하세요.':'빈 반응관을 선택하세요.'));
    if(scenario.reagents.find(r=>r.id===source)?.enzyme&&!state.ice)return reject('효소병을 얼음 위에 둔 뒤 흡입하세요.');
    if(destination&&expected(destination)!==source)return reject(expected(destination)?
      label(destination)+' 반응관에는 지금 '+material(expected(destination))+'을 넣으세요. 잘못 흡입했다면 팁과 함께 버리세요.':
      label(destination)+' 반응관은 완성됐습니다. 다음 반응관을 준비하세요.');
    if(!destination&&!candidates.some(tube=>expected(tube)===source)){
      return reject(candidates.length?'지금 넣을 성분은 '+[...new Set(candidates.map(tube=>material(expected(tube))))].join(' 또는 ')+'입니다.':'모든 반응관이 완성됐습니다.');
    }
  }
  busy=true;
  let message;
  try{
    if(tubeTarget&&!prepLiquid&&sourceTarget(from)){
      await moveTool(from);
      prepLiquid=from;
      benchScene.draw();
    }
    await moveTool(id);
    if(id==='tips'){
      freshTip(state);message='새 팁을 끼웠습니다. 시약병에서 용액을 흡입하세요.';
    }else if(id==='bin'){
      state.tip=null;prepLiquid=null;message='팁을 버렸습니다.';
    }else if(tubeTarget){
      selected=id.slice(5);
      const reagent=prepLiquid;
      if(addReagent(state,selected,reagent,false)){
        prepLiquid=null;
        message=label(selected)+' 반응 튜브에 '+material(reagent)+' 분주 완료. 폐기통에 팁을 버리세요.';
      }
    }else if(sourceTarget(id)){
      prepLiquid=id;message=material(id)+' 흡입 완료. 반응 튜브에 분주하세요.';
    }
  }finally{
    busy=false;render();
    if(message)sceneStatus(message);
  }
}
async function liftRack(){
  if(!coolerOpen||rackReceived())return;
  busy=true;render();
  try{
    if(quality!=='low'&&!reduced.matches){
      const start=performance.now();
      await new Promise(resolve=>{
        function lift(now){
          coolerTransfer=Math.min(1,(now-start)/470);
          benchScene.refresh();
          if(coolerTransfer<1)requestAnimationFrame(lift);else resolve();
        }
        requestAnimationFrame(lift);
      });
    }
    coolerTransfer=1;
    for(const tube of Object.values(state.tubes))tube.received=true;
  }finally{
    busy=false;render();
  }
  $('.amp-main [data-action="carryRack"]')?.focus({preventScroll:true});
  announce('원본 시료 네 개가 들어 있는 냉각 랙을 꺼냈습니다.');
}
async function autoPipette(){
  const plan=planRemainingTransfers(state,scenario);
  if(!aReady()||!plan?.length||state.tip||prepLiquid||!state.ice)return;
  busy=true;render();
  const low=quality==='low'||reduced.matches;
  try{
    for(const [index,{tube,reagent}] of plan.entries()){
      sceneStatus('자동 분주 '+(index+1)+' / '+plan.length+' · '+material(reagent)+' → '+label(tube));
      await moveTool('tips',false,true);
      freshTip(state);benchScene.draw();
      await moveTool(reagent,false,true);
      prepLiquid=reagent;benchScene.draw();
      await moveTool('tube:'+tube,false,true);
      addReagent(state,tube,reagent,false);
      prepLiquid=null;benchScene.draw();
      await moveTool('bin',false,true);
      state.tip=null;benchScene.draw();
      if(low)await new Promise(resolve=>setTimeout(resolve,45));
    }
  }finally{
    busy=false;render();
  }
  sceneStatus('공통 시약과 원본 시료 분주 완료. 혼합·스핀다운으로 진행하세요.');
}
async function handleGelTarget(id,from){
  if(busy||state.gelRun)return;
  if(id==='bin'){
    if(!gelLiquid)return;
    busy=true;
    await moveTool(id,true);
    gelLiquid=null;busy=false;render();sceneStatus('흡입한 용액을 폐기했습니다.');
    return;
  }
  const well=id.startsWith('well:')?Number(id.slice(5)):null;
  if(well!==null&&state.lanes[well])return sceneStatus('이미 채운 웰입니다. 해당 웰을 비운 뒤 다시 넣으세요.');
  if(well!==null&&gelLiquid&&from?.startsWith('load:')&&from.slice(5)!==gelLiquid)
    return sceneStatus('피펫에 '+label(gelLiquid)+'이 들어 있습니다. 먼저 웰에 넣거나 폐기하세요.');
  if(well!==null&&!gelLiquid&&!from?.startsWith('load:'))return sceneStatus('먼저 마커나 PCR 산물을 골라 흡입하세요.');
  if(id.startsWith('load:')&&gelLiquid)return sceneStatus('피펫에 든 용액을 웰에 넣거나 폐기통에서 버리세요.');
  busy=true;
  let message;
  try{
    if(well!==null&&!gelLiquid){
      await moveTool(from,true);
      gelLiquid=from.slice(5);benchScene.draw();
    }
    await moveTool(id,true);
    if(well===null){
      gelLiquid=id.slice(5);
      message=label(gelLiquid)+' 흡입 완료. 넣을 웰을 고르세요.';
    }else{
      state.lanes[well]=gelLiquid;
      message=(well+1)+'번 웰에 '+label(gelLiquid)+' 로딩 완료.';
      gelLiquid=null;
    }
  }finally{
    busy=false;render();
    if(message)sceneStatus(message);
  }
}
async function action(name,node){
  if(transit||busy&&!['skip','pause'].includes(name))return;
  const id=node?.dataset.id;
  if(name==='next'){
    if(state.step===3&&station!=='spin'&&!Object.values(state.tubes).every(t=>t.spun)){
      if(warn(issues(state,scenario,3).filter(issue=>issue.rule!=='spin')))return;
      transferTo('vortex','spin','tubes','혼합한 반응관을 들고 원심분리기로 이동 중');
      return;
    }
    if(warn(nextIssues(state,scenario)))return;
    if(state.step===2&&state.tip){
      if(station!=='bench')open('bench');
      sceneStatus('마지막 팁을 폐기통에 버린 뒤 혼합·스핀다운으로 이동하세요.');
      $('#amp-target-bin')?.focus();
      return;
    }
    if(state.step===1)return action('carryRack');
    state.step=Math.min(6,state.step+1);station=null;prepLiquid=null;gelLiquid=null;render();
    $('.amp-room')?.focus({preventScroll:true});
  }else if(name==='carryRack'){
    if(carrying||state.step!==1||!rackReceived())return;
    const ice=stations.find(s=>s.id==='ice');
    player={x:ice.x,y:ice.y+1.2};station=null;carrying=true;render();$('.amp-room').focus();
  }else if(name==='previous'){
    carrying=false;vortexTube=null;spinSlots=[null,null,null,null];lidClosed=false;
    prepLiquid=null;gelLiquid=null;state.tip=null;state.step=Math.max(0,state.step-1);invalidateAfter(state.step);station=null;render();
  }else if(name==='close'){station=null;render();$('.amp-room')?.focus({preventScroll:true});}
  else if(name==='goto')open(scenario.steps[state.step].station);
  else if(name==='open')open(id);
  else if(name==='interact'&&near)open(near.id);
  else if(name==='openCooler'){
    if(state.step!==1||station!=='ice')return;
    coolerOpen=true;render();$('#amp-target-rack')?.focus({preventScroll:true});
  }else if(name==='liftRack'){
    if(state.step===1&&station==='ice')await liftRack();
  }else if(name==='tube'){selected=id;render();announce(`${label(id)}: ${state.tubes[id].additions.map(a=>material(a.reagent)).join(', ')||'빈 튜브'}`);}
  else if(name==='autoPipette'){await autoPipette();}
  else if(name==='samples'){$('[data-bench-target^="sample:"]')?.focus();}
  else if(name==='resetTube'){resetTube(state,selected);render();sceneStatus(label(selected)+' 반응 튜브를 새로 만들었습니다. 사용한 팁은 폐기통에 버리세요.');
  }else if(name==='placeVortex'){
    vortexTube=id;render();$('#amp-vortex-hold')?.focus({preventScroll:true});
  }else if(name==='selectSpin'){
    selected=id;render();
  }else if(name==='spinSlot'){
    if(lidClosed)return;
    const slot=Number(node.dataset.slot),tube=id||selected;
    if(!id&&spinSlots[slot])spinSlots[slot]=null;
    else{
      if(spinSlots[slot]||spinSlots.some(entry=>entry?.id===tube))return announce('아직 꽂지 않은 반응관과 빈 구멍을 선택하세요.');
      if(!state.tubes[tube]?.mixed)return warn([{rule:'mix',tube}]);
      spinSlots[slot]={id:tube,index:scenario.samples.findIndex(sample=>sample.id===tube)};
      selected=scenario.samples.find(sample=>!spinSlots.some(entry=>entry?.id===sample.id))?.id||tube;
    }
    render();
    if(spinSlots[slot])$('[data-insert="'+slot+'"]')?.classList.add('amp-inserting');
    $('[data-slot="'+slot+'"]')?.focus({preventScroll:true});
  }else if(name==='spinLid'){
    if(!lidClosed&&!spinSlots.every(slot=>slot&&state.tubes[slot.id].mixed))return announce('마주 보는 두 쌍의 구멍에 혼합한 반응관 네 개를 꽂으세요.');
    lidClosed=!lidClosed;render();
  }else if(name==='spinAll'){
    if(!lidClosed||!spinSlots.every(slot=>slot&&state.tubes[slot.id].mixed)||warn(issues(state,scenario,2)))return;
    spinning=true;busy=true;render();announce('원심분리기 회전 중.');
    await new Promise(resolve=>setTimeout(resolve,2500));
    for(const {id} of spinSlots)state.tubes[id].spun=true;
    spinning=false;busy=false;render();announce('네 반응관의 스핀다운이 완료됐습니다.');
  }else if(name==='loadPcr'){
    if(state.step!==4||station!=='pcr')return;
    state.pcrLoaded=scenario.samples.map(sample=>sample.id);render();
    $('#amp-pcr-tubes')?.classList.add('amp-inserting');
    $('[data-action="runPcr"]')?.focus({preventScroll:true});
  }
  else if(name==='runPcr'||name==='replayPcr'){
    if(warn(issues(state,scenario,4)))return;
    motion={frames:timeline(state.program),time:0,last:0,raf:0};molecularPaused=false;busy=true;render();paintMolecules();motion.raf=requestAnimationFrame(animateMolecules);
  }else if(name==='skip'){finishPcr();}
  else if(name==='pause'){molecularPaused=!molecularPaused;node.textContent=molecularPaused?'계속 재생':'일시정지';if(motion)motion.last=0;}
  else if(name==='record'){state.recorded=true;render();announce('레인 순서를 기록했습니다.');}
  else if(name==='clearLane'){state.lanes[Number(node.dataset.lane)]=null;render();}
  else if(name==='runGel'){
    if(warn(issues(state,scenario,5)))return;
    busy=true;all('button,select,input').forEach(n=>n.disabled=true);
    const scene=$('[data-bench-scene]');if(scene)scene.outerHTML=gelSvg(true,true);await new Promise(resolve=>setTimeout(resolve,2200));
    state.gelRun=true;busy=false;render();announce('DNA가 + 극으로 이동했습니다. 전기영동 완료.');
  }else if(name==='view'){state.viewed=true;render();announce('밴드를 관찰하고 대조군과 비교해 보세요.');}
}
function bind(){
  all('[data-action]').forEach(n=>n.onclick=()=>action(n.dataset.action,n));
  $('#amp-quality').onchange=e=>{quality=e.target.value;root.dataset.quality=quality;};
  if($('#amp-ice'))$('#amp-ice').onchange=e=>{if(!busy){state.ice=e.target.checked;render();}};
  all('[data-lane-plan]').forEach(n=>n.onchange=()=>{state.lanePlan[Number(n.dataset.lanePlan)]=n.value;state.recorded=false;render();});
  if($('#amp-polarity'))$('#amp-polarity').onchange=e=>{state.polarity=e.target.value;updateChecks();};
  if($('#amp-conclusion')){
    all('[name="amp-answer"]').forEach(n=>n.onchange=()=>{state.answer=n.value;state.submitted=false;$('.amp-comparison')?.remove();updateChecks();});
    $('#amp-reason').oninput=e=>{state.reason=e.target.value;state.submitted=false;$('.amp-comparison')?.remove();updateChecks();};
    $('#amp-conclusion').onsubmit=e=>{e.preventDefault();if(!state.reason.trim()){announce('관찰한 근거를 한 문장 이상 적어 주세요.');$('#amp-reason').focus();return;}state.submitted=true;render();$('.amp-comparison')?.focus({preventScroll:true});announce('탐구 완료. 내 해석과 모범 해석을 비교하세요.');};
  }
  all('[draggable="true"]').forEach(n=>n.ondragstart=e=>e.dataTransfer.setData('text/plain',n.dataset.dragTube));
  all('[data-mix-drop],[data-slot]').forEach(n=>{
    n.ondragover=e=>e.preventDefault();
    n.ondrop=e=>{
      e.preventDefault();
      const id=e.dataTransfer.getData('text/plain');
      if(!state.tubes[id])return;
      action(n.hasAttribute('data-slot')?'spinSlot':'placeVortex',{dataset:{...n.dataset,id}});
    };
  });
  const hold=$('#amp-vortex-hold');
  if(hold){
    for(const surface of [hold,$('[data-vortex-contact]')].filter(Boolean)){
      surface.onpointerdown=e=>{if(e.button===0){surface.setPointerCapture(e.pointerId);startMix();}};
      surface.onpointerup=surface.onpointercancel=surface.onlostpointercapture=()=>stopMix();
    }
    hold.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)startMix();}};
    hold.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();stopMix();}};
    hold.onblur=()=>stopMix();
  }
  const room=$('.amp-room');
  if(room&&!transit){
    room.onpointerdown=e=>{
      const equipment=e.target.closest('[data-station]');
      if(equipment){const s=stations.find(s=>s.id===equipment.dataset.station);target={x:s.x,y:s.y+1.2,station:s.id};}
      else{const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(room.getScreenCTM().inverse());const pos=unproject(point.x,point.y);target={x:Math.max(.4,Math.min(9.6,pos.x)),y:Math.max(.4,Math.min(9.6,pos.y))};}
      room.focus({preventScroll:true});startMovement();
    };
    all('[data-station]').forEach(n=>n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(carrying){const s=stations.find(s=>s.id===n.dataset.station);target={x:s.x,y:s.y+1.2,station:s.id};startMovement();}else open(n.dataset.station);}});
    room.onkeydown=e=>{const key=e.key.toLowerCase();if(key==='e'){e.preventDefault();if(near)open(near.id);}else if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();keys.add(key);target=null;startMovement();}};
    room.onkeyup=e=>keys.delete(e.key.toLowerCase());
    room.onblur=()=>keys.clear();
  }
  all('[data-move]').forEach(n=>{const key='arrow'+n.dataset.move;n.onpointerdown=e=>{e.preventDefault();n.setPointerCapture(e.pointerId);keys.add(key);target=null;startMovement();};n.onpointerup=n.onpointercancel=n.onlostpointercapture=()=>keys.delete(key);});
}
function transferTo(from,to,cargo,message){
  const start=stations.find(s=>s.id===from),end=stations.find(s=>s.id===to);
  keys.clear();station=null;transit={cargo,message};
  player={x:start.x,y:start.y+1.2};
  target={x:end.x,y:end.y+1.2,station:to};
  render();$('.amp-room')?.focus({preventScroll:true});startMovement();
}
function updateChecks(){const list=$('.amp-checklist');if(list)list.innerHTML=checklist();}
function updatePlayer(){
  const p=project(player.x,player.y),node=$('#amp-player');if(node)node.setAttribute('transform',`translate(${p.x} ${p.y})`);
  near=stations.map(s=>({...s,distance:Math.hypot(s.x-player.x,s.y+.9-player.y)})).sort((a,b)=>a.distance-b.distance)[0];if(near.distance>1.8)near=null;
  all('[data-station]').forEach(n=>n.querySelector('.amp-station-halo').setAttribute('opacity',n.dataset.station===near?.id?'1':'0'));
  if($('#amp-near text'))$('#amp-near text').textContent=near?`${near.label} · E / 탭으로 조작`:'';
}
function startMovement(){if(!moveFrame){previous=0;moveFrame=requestAnimationFrame(move);}}
function move(now){
  moveFrame=0;if(station||document.hidden)return;
  const dt=previous?Math.min((now-previous)/1000,.05):.016;previous=now;
  let dx=0,dy=0;
  if(target){dx=target.x-player.x;dy=target.y-player.y;const d=Math.hypot(dx,dy);if(d<.15){const s=target.station;target=null;if(s){transit=null;open(s);return;}}else{dx/=d;dy/=d;}}
  else{
    const horizontal=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const vertical=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    dx=horizontal+vertical;dy=vertical-horizontal;const d=Math.hypot(dx,dy);if(d){dx/=d;dy/=d;}
  }
  player.x=Math.max(.4,Math.min(9.6,player.x+dx*dt*4));player.y=Math.max(.4,Math.min(9.6,player.y+dy*dt*4));updatePlayer();
  if(target||keys.size)moveFrame=requestAnimationFrame(move);
}
function paintMolecules(){
  if(!motion)return;
  const f=frameAt(motion.frames,motion.time),p=(motion.time-f.start)/f.duration;
  $('#amp-phase').textContent=`${f.temp}°C · ${f.label}`;$('#amp-cycle').textContent=`${f.cycle} / ${state.program.cycles} 사이클`;
  $('#amp-temp-graph').innerHTML=temperatureGraph(motion.frames,motion.time);
  const progress=quality==='low'?Math.round(p*4)/4:p;
  $('#amp-mol-a').innerHTML=molecule(f,progress,scenario.samples.find(s=>s.id==='A').positive);$('#amp-mol-b').innerHTML=molecule(f,progress,scenario.samples.find(s=>s.id==='B').positive);
  const completed=f.phase==='extend'&&p>.9||f.phase==='final'?f.cycle:Math.max(0,f.cycle-1);
  $('#amp-quantity').innerHTML=quantityGraph(completed,state.program.cycles);
  $('#amp-copy-count').textContent=`이론상 상대량: 2^${completed} = ${(2**completed).toLocaleString('ko-KR')}배`;
  $('#amp-phase-note').textContent=f.cycle>=3?`3번째 사이클 무렵부터 양 끝이 프라이머 위치로 정해진 약 ${scenario.productBp}bp 산물이 생깁니다. 이후 빠른 재생으로 진행합니다.`:f.phase==='rt'?'역방향 프라이머의 3′ 말단에서 cDNA를 5′→3′로 합성합니다.':'RNA 자체를 PCR로 증폭하지 않습니다. cDNA가 먼저 만들어져야 합니다.';
}
function animateMolecules(now){
  if(!motion)return;
  if(!document.hidden&&!molecularPaused){if(motion.last)motion.time+=Math.min(now-motion.last,100);if(!motion.painted||now-motion.painted>(quality==='low'?180:50)){paintMolecules();motion.painted=now;}}
  motion.last=now;
  if(motion.time>=motion.frames.at(-1).end){finishPcr();return;}
  motion.raf=requestAnimationFrame(animateMolecules);
}
function finishPcr(){if(!motion)return;cancelAnimationFrame(motion.raf);motion=null;state.amplified=true;busy=false;render();announce('RT-PCR 완료. 전기영동으로 진행하세요.');}
window.addEventListener('blur',()=>{keys.clear();previous=0;stopMix();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMix();keys.clear();if(motion)motion.last=0;if(!document.hidden&&target)startMovement();});
init();
