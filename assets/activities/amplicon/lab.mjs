import {createState,freshTip,addReagent,resetTube,planSharedReagents,issues,nextIssues,timeline,frameAt,bands} from './model.mjs?v=2';
import {stations,project,unproject,labMap,equipmentArt,molecule,temperatureGraph,quantityGraph} from './visuals.mjs';

import {mountWorkbench} from './workbench.mjs?v=3';
import {coolerObjects,preparationObjects,electrophoresisObjects,sceneMarkup} from './workbench-ui.mjs?v=3';

const root=document.getElementById('amp-lab');
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(text,action,extra='')=>`<button type="button" data-action="${action}" ${extra}>${text}</button>`;
const tick=(done,text)=>`<li class="${done?'amp-done':''}"><span aria-hidden="true">${done?'✓':'○'}</span> ${esc(text)}</li>`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let scenario,state,station=null,busy=false,quality=reduced.matches?'low':'normal',selected='A';
let benchScene=null,prepPosition=null,gelPosition=null,prepLiquid=null,gelLiquid=null;
let coolerOpen=false,coolerTransfer=0;
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
  root.innerHTML=`<div class="amp-top"><div><span class="amp-kicker">분자 진단 탐구 · 10~20분</span><h2>AMPLICON <span>가상 과학실</span></h2></div><label>애니메이션 <select id="amp-quality"><option value="normal" ${quality==='normal'?'selected':''}>표준</option><option value="low" ${quality==='low'?'selected':''}>저사양 · 움직임 줄이기</option></select></label></div>
  <div class="amp-layout"><aside class="amp-progress"><span class="amp-kicker">현재 단계 ${state.step} / 6</span><h3>${esc(step.title)}</h3><ol class="amp-step-list">${scenario.steps.map((s,i)=>`<li ${i===state.step?'aria-current="step"':''} class="${i<state.step?'amp-past':''}"><span>${i<state.step?'✓':i}</span>${esc(s.title)}</li>`).join('')}</ol><ul class="amp-checklist">${checklist()}</ul><details><summary>왜 이 과정을 할까요?</summary><p>${esc(step.why)}</p></details><div class="amp-side-actions">${state.step===0?button('실험 시작하기 →','next','class="amp-primary"'):state.step<6?button('다음 단계 →','next','class="amp-primary" '+(busy?'disabled':'')):''}${state.step>0&&state.step<6?button('이전 단계','previous',busy?'disabled':''):''}</div><p class="amp-small">실제 반응 시간은 단축했습니다.<br>답안은 저장되지 않으며 새로고침하면 처음부터 시작합니다.</p></aside>
  <div class="amp-main">${state.step===0?brief():station?workstation():explore()}</div></div>
  <p class="amp-status" id="amp-status" role="status" aria-live="polite"></p>
  <dialog class="amp-warning" id="amp-warning" aria-labelledby="amp-warning-title"></dialog>`;
  bind();benchScene=null;bindBenchScene();if(!station&&state.step>0)updatePlayer();
  if(whyOpen)$('.amp-progress details').open=true;
  const restored=focusId?root.querySelector(`[id="${focusId}"]`):focusAction?root.querySelector(`[data-action="${focusAction}"]${focusItem?`[data-id="${focusItem}"]`:''}`):null;
  if(restored&&!restored.disabled)restored.focus({preventScroll:true});
}
function brief(){return `<section class="amp-brief"><div class="amp-brief-visual">${equipmentArt('pcr')}<div><span class="amp-kicker">사건 01 · 분자 진단</span><h3>${esc(scenario.title)}</h3><p>${esc(scenario.brief)}</p></div></div><div class="amp-facts"><article><span>01 / 시료</span><h4>의심자 A와 B</h4><p>핵산 추출 완료<br>감염 여부는 아직 모릅니다.</p></article><article><span>02 / 표적</span><h4>${esc(scenario.target)} · 약 ${scenario.productBp}bp</h4><p>${esc(scenario.virus)}는 RNA 바이러스.<br>RNA → cDNA → DNA 증폭</p></article><article><span>03 / 대조군</span><h4>양성 대조군 + NTC</h4><p>바이러스 RNA: 증폭 확인<br>증류수: 오염 확인</p></article></div><div class="amp-route">시약 조제 <b>→</b> 역전사·PCR <b>→</b> 전기영동 <b>→</b> 근거로 판정</div><p>한 튜브에서 역전사와 PCR을 이어서 하는 <strong>RT-PCR</strong>을 사용합니다. 완성된 겔과 추출 RNA가 준비되어 있습니다.</p>${button('실험 시작하기 →','next','class="amp-primary"')}</section>`;}
function explore(){return `<section class="amp-explore"><div class="amp-panel-head"><div><span class="amp-kicker">탐색 모드</span><h3>기기로 이동해 실험하세요</h3></div>${button('현재 단계 기기로 이동','goto','class="amp-soft"')}</div><div class="amp-room-wrap">${labMap()}<div class="amp-dpad" aria-label="터치 이동"><button type="button" data-move="up" aria-label="위로 이동">↑</button><button type="button" data-move="left" aria-label="왼쪽 이동">←</button><button type="button" data-action="interact" aria-label="가까운 기기 열기">E</button><button type="button" data-move="right" aria-label="오른쪽 이동">→</button><button type="button" data-move="down" aria-label="아래로 이동">↓</button></div></div><p class="amp-controls-note">WASD / 방향키 이동 · E로 조작 · 바닥을 클릭하거나 탭해 이동 · 기기를 누르면 가까이 이동해 열기</p><div class="amp-station-links" aria-label="기기 바로 이동">${stations.map(s=>button(s.label,'open',`data-id="${s.id}"`)).join('')}</div></section>`;}
function tubeCards(action='tube',ids=scenario.samples.map(s=>s.id)){
  return `<div class="amp-tubes">${ids.map(id=>{const t=state.tubes[id];return button(`<span class="amp-tube-drawing ${t.additions.length?'amp-filled':''}" aria-hidden="true"><i></i></span><strong>${esc(label(id))}</strong><small>${!t.received?'수령 전':`${t.additions.length}/5 성분`}${t.spun?' · 스핀 완료':t.mixed?' · 혼합 완료':''}</small>`,action,`data-id="${id}" class="amp-tube ${id===selected?'amp-selected':''}" aria-pressed="${id===selected}"`);}).join('')}</div>`;
}
function workstation(){
  const s=stations.find(s=>s.id===station),expected=scenario.steps[state.step].station;
  const relevant=station===expected||(state.step===3&&station==='spin');
  return `<section class="amp-work"><div class="amp-panel-head"><div class="amp-work-heading">${equipmentArt(station)}<div><span class="amp-kicker">작업 모드 · ${state.step}단계</span><h3 tabindex="-1" id="amp-work-title">${s.label}</h3></div></div>${button('← 과학실로','close',busy?'disabled':'')}</div>${!relevant?`<div class="amp-empty"><p>지금은 ‘${esc(scenario.steps[state.step].title)}’ 단계입니다.</p>${button('현재 단계 기기로 이동','goto','class="amp-primary"')}</div>`:station==='ice'?iceView():station==='bench'?benchView():station==='vortex'||station==='spin'?mixView():station==='pcr'?pcrView():station==='gel'?gelView():uvView()}</section>`;
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
    '<div class="amp-actions">'+(received?button('랙을 들고 작업대로 →','next','class="amp-primary"'):
      button(coolerOpen?'냉각 랙 꺼내기':'아이스박스 뚜껑 열기',coolerOpen?'liftRack':'openCooler','class="amp-primary" '+(busy?'disabled':'')))+'</div>';
}
function benchView(){
  const t=state.tubes[selected];
  const plan=planSharedReagents(state,scenario);
  return '<p>피펫을 <strong>팁 박스 → 시약병 → 반응 튜브 → 폐기통</strong> 순으로 옮기세요. 피펫을 끌거나 기구를 차례로 누를 수 있습니다. 팁이 끼워져 있다면 병에서 반응 튜브로 바로 끌어도 됩니다.</p>'+
    '<div class="amp-recipe">'+scenario.reagents.map((r,i)=>'<span>'+(i+1)+'. '+esc(r.label)+'</span>').join('<b>→</b>')+
    '<b>→</b><span>5. 해당 원본 시료</span></div>'+prepScene()+
    '<div class="amp-bench-readout" role="status" aria-live="polite" id="amp-scene-status">'+
    esc(prepLiquid?material(prepLiquid)+' 흡입됨':state.tip?(state.tip.used?'사용한 팁 · 폐기통에서 버리세요':'새 팁 장착 · 시약병에서 흡입하세요'):'팁 박스를 눌러 새 팁을 끼우세요')+'</div>'+
    '<div class="amp-actions">'+button('나머지 튜브에 공통 시약 넣기','autoCommon','class="amp-primary" '+(busy||!plan?.length||!state.ice||state.tip?'disabled':''))+
    (plan?.length?'<span>'+plan.length+'회 분주</span>':'')+
    (plan?.length===0?button('시료 넣기 ↓','samples','class="amp-soft"'):'')+
    '<label class="amp-inline"><input id="amp-ice" type="checkbox" '+(state.ice?'checked':'')+' '+(busy?'disabled':'')+'> 효소병을 얼음 위에 두기</label></div>'+
    '<p class="amp-small">한 튜브에 공통 시약을 순서대로 넣고 팁을 버리면 자동 분주를 시작할 수 있습니다. 원본 시료는 각각 직접 넣으세요.</p>'+
    '<div class="amp-actions">'+scenario.samples.map(s=>button(esc(s.label)+' 성분 보기','tube','data-id="'+s.id+'" aria-pressed="'+(selected===s.id)+'" '+(busy?'disabled':''))).join('')+'</div>'+
    '<div class="amp-contents"><h4>'+esc(label(selected))+' 반응 튜브 · '+t.additions.length+'개 성분</h4><ol>'+
    (t.additions.length?t.additions.map(a=>'<li>'+esc(material(a.reagent))+'</li>').join(''):'<li>빈 반응 튜브</li>')+
    '</ol>'+button('이 반응 튜브 새로 만들기','resetTube',busy?'disabled':'')+'</div>'+
    '<div class="amp-actions">'+button('혼합·스핀다운으로 →','next','class="amp-primary" '+(busy?'disabled':''))+'</div>';
}
function mixView(){
  const spinning=station==='spin';
  return `<p>${spinning?'혼합한 네 튜브를 미니 원심분리기에 넣고 스핀다운하세요.':'튜브를 하나씩 선택하거나 기기로 끌어 놓으세요. 놓으면 약 2.5초 동안 자동으로 섞입니다.'}</p><div class="amp-device-drop" data-drop="${station}">${equipmentArt(station)}<span>${busy?'작동 중…':'튜브 놓는 곳'}</span></div><div class="amp-tubes">${scenario.samples.map(s=>{const t=state.tubes[s.id],done=spinning?t.spun:t.mixed;return button(`<span class="amp-tube-drawing amp-filled" aria-hidden="true"><i></i></span><strong>${esc(s.label)}</strong><small>${done?'✓ 완료':spinning?'눌러 스핀다운':'눌러 혼합'}</small>`,spinning?'spinTube':'mixTube',`data-id="${s.id}" draggable="true" data-drag-tube="${s.id}" ${busy?'disabled':''}`);}).join('')}</div><div class="amp-actions">${button(spinning?'네 튜브 스핀다운':'네 튜브 혼합',spinning?'spinAll':'mixAll',`class="amp-primary" ${busy?'disabled':''}`)}${button(spinning?'볼텍스로 이동':'원심분리기로 이동','open',`data-id="${spinning?'vortex':'spin'}" ${busy?'disabled':''}`)}</div>`;
}
function pcrView(){
  if(motion)return molecularView();
  const fields=[['rt','역전사'],['initial','초기 변성'],['denature','반복 변성'],['anneal','결합'],['extend','연장'],['final','최종 연장'],['cycles','사이클 수']];
  return `<p>네 튜브를 넣고 프로그램을 확인하세요. 한 튜브에서 <strong>역전사 → PCR</strong>이 이어집니다.</p><div class="amp-load-pcr">${scenario.samples.map(s=>`<label><input type="checkbox" data-pcr-tube="${s.id}" ${state.pcrLoaded.includes(s.id)?'checked':''} ${state.amplified?'disabled':''}> ${esc(s.label)} 넣기</label>`).join('')}</div><label class="amp-inline"><input type="checkbox" id="amp-rt-enabled" ${state.program.rtEnabled?'checked':''} ${state.amplified?'disabled':''}> 역전사 단계 사용</label><div class="amp-program">${fields.map(([key,name])=>`<label>${name}<span><input type="number" data-program="${key}" value="${state.program[key]}" step="1" min="0" max="${key==='cycles'?60:110}" ${state.amplified?'disabled':''}> ${key==='cycles'?'회':'°C'}</span></label>`).join('')}</div><p class="amp-program-flow">50°C 역전사 → 95°C 초기 변성 → [95°C 변성 → 55°C 결합 → 72°C 연장] × 30회 → 72°C 최종 연장</p><p class="amp-small">온도 허용 범위는 이 학습 모형의 기준입니다. 실제 실험은 효소·프라이머·시료에 맞는 조건을 사용합니다.</p><div class="amp-actions">${state.amplified?'<strong class="amp-success">✓ RT-PCR 완료 · 전기영동으로 진행하세요.</strong>':button('기기 가동 · 분자 뷰 보기','runPcr','class="amp-primary"')}${button(state.amplified?'분자 뷰 다시 보기':'기본 프로그램으로 복원',state.amplified?'replayPcr':'defaultProgram')}</div>`;
}
function molecularView(){return `<div class="amp-molecular"><div class="amp-molecule-head"><strong id="amp-phase">역전사</strong><span id="amp-cycle">0 / ${state.program.cycles} 사이클</span><div>${button(molecularPaused?'계속 재생':'일시정지','pause')}${button('관찰 건너뛰기','skip')}</div></div><div id="amp-temp-graph"></div><div class="amp-molecule-pair"><article><h4>A 튜브 <span>${scenario.samples.find(s=>s.id==='A').positive?'표적 있음':'표적 없음'}</span></h4><div id="amp-mol-a"></div></article><article><h4>B 튜브 <span>${scenario.samples.find(s=>s.id==='B').positive?'표적 있음':'표적 없음'}</span></h4><div id="amp-mol-b"></div></article></div><div class="amp-molecule-legend"><span style="--amp-key:#ce8430">RNA</span><span style="--amp-key:#2885b3">주형 DNA</span><span style="--amp-key:#ce5a87">새 DNA</span><span style="--amp-key:#a17b0e">프라이머</span></div><div class="amp-molecular-bottom"><div id="amp-quantity"></div><div><strong id="amp-copy-count"></strong><p id="amp-phase-note"></p><p class="amp-small">Taq은 고온에서도 기능을 유지하는 내열성 DNA 중합효소입니다. 이론상 양은 2ⁿ이며 실제 반응은 효율·시약 고갈의 영향을 받습니다.</p></div></div></div>`;}
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
  if(status)status.textContent=message;
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
  if(id==='tips'&&state.tip)return sceneStatus('현재 팁을 폐기통에 버린 뒤 새 팁을 끼우세요.');
  if(id==='bin'&&!state.tip)return sceneStatus('피펫에 버릴 팁이 없습니다.');
  if(sourceTarget(id)&&!state.tip)return sceneStatus('먼저 팁 박스에서 팁을 끼우세요.');
  if(sourceTarget(id)&&prepLiquid)return sceneStatus('피펫에 든 용액을 분주하거나 팁과 함께 버리세요.');
  if(tubeTarget&&prepLiquid&&sourceTarget(from)&&from!==prepLiquid)
    return sceneStatus('피펫에 '+material(prepLiquid)+'이 들어 있습니다. 먼저 분주하거나 팁과 함께 버리세요.');
  if(tubeTarget&&!prepLiquid&&(!state.tip||!sourceTarget(from))){
    selected=id.slice(5);render();
    sceneStatus(state.tip?'먼저 시약병이나 원본 시료에서 흡입하세요.':'팁 박스에서 팁을 끼운 뒤 용액을 흡입하세요.');
    return;
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
        message=label(selected)+' 반응 튜브에 '+material(reagent)+' 분주 완료. 팁을 버리거나 계속 조작할 수 있습니다.';
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
  $('.amp-main [data-action="next"]')?.focus({preventScroll:true});
  announce('원본 시료 네 개가 들어 있는 냉각 랙을 꺼냈습니다.');
}
async function autoCommon(){
  const plan=planSharedReagents(state,scenario);
  if(!plan?.length||state.tip||prepLiquid||!state.ice)return;
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
  sceneStatus('공통 시약 자동 분주 완료. 원본 시료를 각각의 반응 튜브에 직접 넣으세요.');
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
  if(busy&&!['skip','pause'].includes(name))return;
  const id=node?.dataset.id;
  if(name==='next'){
    if(warn(nextIssues(state,scenario)))return;
    if(state.step===2&&state.tip){
      if(station!=='bench')open('bench');
      sceneStatus('마지막 팁을 폐기통에 버린 뒤 혼합·스핀다운으로 이동하세요.');
      $('#amp-target-bin')?.focus();
      return;
    }
    const fromIce=state.step===1;
    state.step=Math.min(6,state.step+1);station=fromIce?'bench':null;prepLiquid=null;gelLiquid=null;render();
    if(fromIce)$('#amp-work-title')?.focus({preventScroll:true});$('.amp-room')?.focus({preventScroll:true});
  }else if(name==='previous'){
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
  else if(name==='autoCommon'){await autoCommon();}
  else if(name==='samples'){$('[data-bench-target^="sample:"]')?.focus();}
  else if(name==='resetTube'){resetTube(state,selected);render();sceneStatus(label(selected)+' 반응 튜브를 새로 만들었습니다. 사용한 팁은 폐기통에 버리세요.');
  }else if(['mixTube','mixAll','spinTube','spinAll'].includes(name)){
    const spin=name.startsWith('spin'),ids=name.endsWith('All')?scenario.samples.map(s=>s.id):[id];
    if(warn(issues(state,scenario,2)))return;
    if(spin&&ids.some(i=>!state.tubes[i].mixed)){warn(ids.filter(i=>!state.tubes[i].mixed).map(tube=>({rule:'mix',tube})));return;}
    busy=true;render();$('.amp-device-drop')?.classList.add(spin?'amp-spinning':'amp-mixing');
    await new Promise(resolve=>setTimeout(resolve,2500));
    ids.forEach(i=>{if(spin)state.tubes[i].spun=true;else{state.tubes[i].mixed=true;state.tubes[i].spun=false;}});busy=false;render();announce(`${ids.map(label).join(', ')} ${spin?'스핀다운':'혼합'} 완료`);
  }else if(name==='defaultProgram'){state.program={...scenario.program.defaults};render();}
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
  all('[data-program]').forEach(n=>n.oninput=()=>{state.program[n.dataset.program]=n.value===''?NaN:Number(n.value);updateChecks();});
  all('[data-pcr-tube]').forEach(n=>n.onchange=()=>{const id=n.dataset.pcrTube;state.pcrLoaded=state.pcrLoaded.filter(s=>s!==id);if(n.checked)state.pcrLoaded.push(id);updateChecks();});
  if($('#amp-rt-enabled'))$('#amp-rt-enabled').onchange=e=>{state.program.rtEnabled=e.target.checked;updateChecks();};
  all('[data-lane-plan]').forEach(n=>n.onchange=()=>{state.lanePlan[Number(n.dataset.lanePlan)]=n.value;state.recorded=false;render();});
  if($('#amp-polarity'))$('#amp-polarity').onchange=e=>{state.polarity=e.target.value;updateChecks();};
  if($('#amp-conclusion')){
    all('[name="amp-answer"]').forEach(n=>n.onchange=()=>{state.answer=n.value;state.submitted=false;$('.amp-comparison')?.remove();updateChecks();});
    $('#amp-reason').oninput=e=>{state.reason=e.target.value;state.submitted=false;$('.amp-comparison')?.remove();updateChecks();};
    $('#amp-conclusion').onsubmit=e=>{e.preventDefault();if(!state.reason.trim()){announce('관찰한 근거를 한 문장 이상 적어 주세요.');$('#amp-reason').focus();return;}state.submitted=true;render();$('.amp-comparison')?.focus({preventScroll:true});announce('탐구 완료. 내 해석과 모범 해석을 비교하세요.');};
  }
  all('[draggable="true"]').forEach(n=>n.ondragstart=e=>e.dataTransfer.setData('text/plain',n.dataset.dragTube));
  all('[data-drop]').forEach(n=>{n.ondragover=e=>e.preventDefault();n.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(!state.tubes[id])return;action(n.dataset.drop==='spin'?'spinTube':'mixTube',{dataset:{id}});};});
  const room=$('.amp-room');
  if(room){
    room.onpointerdown=e=>{
      const equipment=e.target.closest('[data-station]');
      if(equipment){const s=stations.find(s=>s.id===equipment.dataset.station);target={x:s.x,y:s.y+1.2,station:s.id};}
      else{const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(room.getScreenCTM().inverse());const pos=unproject(point.x,point.y);target={x:Math.max(.4,Math.min(9.6,pos.x)),y:Math.max(.4,Math.min(9.6,pos.y))};}
      room.focus({preventScroll:true});startMovement();
    };
    all('[data-station]').forEach(n=>n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(n.dataset.station);}});
    room.onkeydown=e=>{const key=e.key.toLowerCase();if(key==='e'){e.preventDefault();if(near)open(near.id);}else if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)){e.preventDefault();keys.add(key);target=null;startMovement();}};
    room.onkeyup=e=>keys.delete(e.key.toLowerCase());
    room.onblur=()=>keys.clear();
  }
  all('[data-move]').forEach(n=>{const key='arrow'+n.dataset.move;n.onpointerdown=e=>{e.preventDefault();n.setPointerCapture(e.pointerId);keys.add(key);target=null;startMovement();};n.onpointerup=n.onpointercancel=n.onlostpointercapture=()=>keys.delete(key);});
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
  if(target){dx=target.x-player.x;dy=target.y-player.y;const d=Math.hypot(dx,dy);if(d<.15){const s=target.station;target=null;if(s){open(s);return;}}else{dx/=d;dy/=d;}}
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
window.addEventListener('blur',()=>{keys.clear();previous=0;});
document.addEventListener('visibilitychange',()=>{keys.clear();if(motion)motion.last=0;if(!document.hidden&&target)startMovement();});
init();
