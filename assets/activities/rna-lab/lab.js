import {PRESETS, MISSIONS} from './missions.js?v=4';
import {MoleculeView, BASES, pairInfo, partners} from './molecule.js?v=4';
import {gradeMission} from './grading.js?v=4';

const $ = id => document.getElementById(id);
const storage = {
  read(key, fallback) {try {return JSON.parse(localStorage.getItem(`rna-lab-v1-${key}`)) ?? fallback;} catch {return fallback;}},
  write(key, value) {try {localStorage.setItem(`rna-lab-v1-${key}`, JSON.stringify(value));} catch {/* Private browsing can disable storage. */}}
};
const valid = sequence => typeof sequence === 'string' && /^[ACGU]{8,120}$/.test(sequence);
const savedSequence = storage.read('sequence', PRESETS.hairpin);
let freeSequence = valid(savedSequence) ? savedSequence : PRESETS.hairpin;
let sequence = freeSequence;
let startSequence = sequence;
let mission = null;
let mode = 'free';
let view = 'current';
let zoom = 1;
let selected = 0;
let history = [];
let result = null;
let ready = false;
let requestId = 0;
let pending = false;
let toastTimer;
let foldTimer;
let successTimer;
const announcedSolutions=new Set();
const completed = new Set(storage.read('completed', []).filter(id => MISSIONS.some(m => m.id === id)));
const isRibozyme=()=>mission?.kind==='ribozyme';
const hasBlanks=()=>isRibozyme()&&sequence.includes('N');
function cancelSuccess(){clearTimeout(successTimer);if($('mission-success').open)$('mission-success').close();}

function toast(message) {
  $('rna-toast').textContent = message;
  $('rna-toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('rna-toast').hidden = true, 2600);
}
function error(message = '') {
  $('input-error').textContent = message;
  $('input-error').hidden = !message;
}
const molecule = new MoleculeView($('rna-structure'), selectBase);
function setZoom(next) {
  zoom=Math.max(1,Math.min(4,next));molecule.zoom=zoom;
  const svg=$('rna-structure'),viewport=$('rna-viewport');
  svg.style.width=`${zoom*100}%`;if(viewport.clientHeight)svg.style.height=`${viewport.clientHeight*zoom}px`;
  $('zoom-out').disabled=zoom<=1;$('zoom-in').disabled=zoom>=4;
  if(zoom===1){viewport.scrollLeft=0;viewport.scrollTop=0;molecule.fit();}
  else{const node=svg.querySelector('.selected');if(node)node.scrollIntoView({block:'nearest',inline:'nearest'});}
}
function renderInspector() {
  const base=sequence[selected],info=BASES[base];
  const region=isRibozyme()?mission.stems.find(stem=>stem.pairs.some(pair=>pair.includes(selected)))?.name:null;
  $('base-detail').textContent=base==='N'?`${selected+1}번 · 아직 비어 있는 자리`:`${selected+1}번 ${base} · ${info.name}`;
  $('base-family').textContent=base==='N'?`${region||'루프·연결 구간'} · A, U, G, C 중 하나를 선택하세요.`:`${info.family} · 고리 ${info.rings}개${region?` · ${region}`:''} · 리보스의 1′ 탄소에 연결`;
  const guide=hasBlanks()||view==='target';
  const hasResult=result?.sequence===sequence;
  const alignedTarget=mission&&hasResult&&gradeMission(mission,sequence,result.structure).structureOk?result.structure:mission?.target;
  const structure=guide&&mission?alignedTarget:hasResult?result.structure:null;
  const mate=structure?partners(structure)[selected]:-1;
  const bond=mate>=0?pairInfo(base,sequence[mate]):null;
  $('pair-detail').textContent=!structure?'새 서열의 결합 상대를 계산하고 있습니다.':mate<0?`${guide?'설계도':'현재 예측'}에서 짝 없음`:`${guide?'설계도: ':''}${mate+1}번 ${sequence[mate]==='N'?'미정':sequence[mate]}와 짝 · ${bond?.name||(base==='N'||sequence[mate]==='N'?'염기 선택 필요':'비상보적 배치')}${bond?.wobble?' 흔들림 염기쌍':''}`;
  $('bond-detail').textContent=isRibozyme()&&selected===7?'절단 자리 C8 · 이 염기 다음의 8 | 9 골격 결합이 반응 자리입니다.':bond?`대표적인 수소 결합 ${bond.count}개 · ${guide?'목표 배치의 모식도':'점선으로 표시'}`:guide&&mate>=0?'설계도의 결합 관계입니다. 예측 결과는 모든 자리를 채운 뒤 확인합니다.':'인산은 이웃한 리보스 사이의 골격을 연결합니다.';
  $('nucleotide-sketch').classList.toggle('unassigned-sketch',base==='N');
  $('detail-base-letter').textContent=base==='N'?'?':base;
  $('detail-base-ring').setAttribute('points',info.rings===2?'195,47 207,40 219,47 219,61 207,68 195,61':'190,47 202,40 214,47 214,61 202,68 190,61');
  $('detail-base-pent').setAttribute('display',info.rings===2?'':'none');
  $('detail-base-letter').setAttribute('x',info.rings===2?'207':'202');
  $('detail-glyco').setAttribute('x2',info.rings===2?'177':'190');
  $('detail-rings').style.setProperty('--base-color',info.color);
}
function renderStructure() {
  const blank=hasBlanks(),hasResult=result?.sequence===sequence;
  if(!blank&&!hasResult)return;
  const guide=blank||view==='target';
  const grade=mission?gradeMission(mission,sequence,hasResult?result.structure:null):null;
  const structure=guide&&mission?(grade.structureOk?result.structure:mission.target):result.structure;
  const mismatches=guide?[]:grade?.mismatches||[];
  molecule.show({sequence,structure,selected,locked:mission?.locked||[],mismatches,cleavageAfter:isRibozyme()?mission.cleavageAfter:null});
  molecule.nodes.forEach((node,i)=>node.g.classList.toggle('conserved-base',!!isRibozyme()&&mission.locked.includes(i)));
  $('structure-heading').textContent=blank?'리보자임 설계도 · 물음표 자리를 채우세요':guide?'목표 RNA의 결합 관계':'현재 RNA의 예측 2차 구조';
  $('stage-extra').textContent=isRibozyme()?`${guide?'설계도 점선: 목표 결합 위치 · ':''}자물쇠: 보존 염기 · 주황색 골격: 8 | 9 절단 자리`:mission?'작은 자물쇠: 고정 염기 · 붉은 윤곽: 목표와 다른 자리':'화살표: 5′ → 3′';
  renderInspector();
}
function selectBase(index) {
  selected=Math.max(0,Math.min(sequence.length-1,index));
  if(view==='target'&&!hasBlanks()) {
    view='current';
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  }
  renderSelection(); renderStructure();
}
function renderSelection() {
  const locked=mission?.locked.includes(selected);
  $('selected-label').textContent=`${selected+1}번 · ${sequence[selected]==='N'?'미정 자리':sequence[selected]}${locked?' · 고정되어 있습니다':''}`;
  document.querySelectorAll('button[data-base]').forEach(button=>{
    button.disabled=!ready || !!locked;
    button.setAttribute('aria-pressed',String(button.dataset.base===sequence[selected]));
  });
  $('undo').disabled=!history.length || !ready;
  $('clear-base').disabled=!ready||!!locked||sequence[selected]==='N';
  $('next-blank').disabled=!hasBlanks();
  if(molecule.nodes.length) molecule.selection(selected,mission?.locked||[],molecule.mismatches||[]);
  renderInspector();
}
function setSequence(next,{remember=true}={}) {
  if(next===sequence && result?.sequence===sequence) return;
  if(remember && next!==sequence) {history.push(sequence);if(history.length>80)history.shift();}
  sequence=next;
  if(mode==='free'){freeSequence=next;storage.write('sequence',next);}
  selected=Math.min(selected,sequence.length-1);
  $('sequence').value=sequence;
  $('sequence-length').textContent=`${sequence.length} nt`;
  molecule.updateSequence(sequence);
  renderSelection(); error(); requestFold();
}
function changeBase(base) {
  if(!ready || mission?.locked.includes(selected) || sequence[selected]===base)return;
  const next=sequence.slice(0,selected)+base+sequence.slice(selected+1);
  const wasBlank=sequence[selected]==='N';setSequence(next);
  if(wasBlank&&hasBlanks())nextBlank();
}
function nextBlank(){
  for(let offset=1;offset<=sequence.length;offset++){
    const i=(selected+offset)%sequence.length;if(sequence[i]==='N'){selectBase(i);return;}
  }
}
function requestFold() {
  cancelSuccess();clearTimeout(foldTimer);
  if(hasBlanks()){
    ++requestId;pending=false;view='target';syncViewButtons();
    $('energy').textContent='—';$('pairs').textContent='—';
    $('fold-status').textContent='빈 자리의 염기를 모두 정하면 구조를 예측합니다. 현재 그림은 설계도입니다.';
    renderStructure();renderMetrics();return;
  }
  if(!valid(sequence))return;
  const id=++requestId;pending=true;
  $('fold-status').textContent='새 서열의 구조를 계산하고 있습니다…';
  $('energy').textContent='…';$('pairs').textContent='…';
  $('mission-feedback').hidden=true;
  if(mission)renderMissionGrade(gradeMission(mission,sequence));
  foldTimer=setTimeout(()=>{
    if(pending){$('fold-status').textContent='계산이 지연됩니다. 서열 적용을 다시 누르거나 페이지를 새로고침해 주세요.';error('계산 결과를 받지 못했습니다. 다시 시도해 주세요.');pending=false;}
  },20000);
  worker.postMessage({type:'fold',id,sequence});
}
function renderMetrics() {
  if(hasBlanks()){
    const grade=gradeMission(mission,sequence);$('third-label').textContent='내가 채운 자리';
    $('third-value').textContent=`${grade.assigned-mission.locked.length} / ${sequence.length-mission.locked.length}`;
    $('third-help').textContent='모두 채우면 접힘을 자동 계산합니다.';
    renderMissionGrade(grade);return;
  }
  if(!result||result.sequence!==sequence)return;
  $('energy').textContent=result.energy.toFixed(2);
  $('pairs').textContent=String((result.structure.match(/\(/g)||[]).length);
  if(mission) {
    const grade=gradeMission(mission,sequence,result.structure);
    $('third-label').textContent='목표 모양 일치';
    $('third-value').textContent=`${grade.shapePercent}%`;
    $('third-help').textContent='줄기·루프·가지 배치 비교 · 염기 번호 무관';
    renderMissionGrade(grade);
    if(grade.solved){
      completed.add(mission.id);storage.write('completed',[...completed]);renderMissionList();announceSuccess(grade);
    }
  } else {
    $('third-label').textContent='GC 비율';
    $('third-value').textContent=`${Math.round((sequence.match(/[GC]/g)||[]).length/sequence.length*100)}%`;
    $('third-help').textContent='전체 염기 중 G와 C의 비율';
    $('mission-feedback').hidden=true;
  }
}
function renderMissionGrade(grade){
  const summary=$('mission-summary'),feedback=$('mission-feedback');
  summary.classList.toggle('solved',grade.solved);summary.dataset.solved=String(grade.solved);
  $('mission-state').textContent=grade.solved?'✓ 미션 성공':!grade.complete?'빈 자리 채우기':pending?'접힘 계산 중':'자동 채점';
  $('grading-title').textContent=grade.solved?'목표와 같은 줄기·루프 모양을 만들었습니다!':!grade.complete?`아직 ${sequence.length-grade.assigned}자리가 비어 있습니다.`:pending?'현재 서열의 구조를 확인하고 있습니다.':`모양 일치 ${grade.shapePercent}% · 대응하는 염기쌍 ${grade.targetPairs.length-grade.missing.length} / ${grade.targetPairs.length}개`;
  const message=grade.solved?(isRibozyme()?'해머헤드의 목표 모양을 완성했습니다. 실제 리보자임 기능에는 촉매 핵과 절단 자리의 정확한 배치, 3차 구조와 실험 검증이 필요합니다.':'줄기 길이·루프 크기·가지 배치가 목표와 같습니다. 염기서열이나 구조가 놓인 염기 번호가 달라도 정답입니다.'):!grade.complete?'빈 자리에는 A·U·G·C를 선택하세요. 완성 전 그림은 목표 배치이며, 접힘 예측이 아닙니다.':pending?'염기 번호를 맞춰 비교하지 않고, 줄기·루프·가지가 이루는 모양을 확인합니다.':!grade.budgetOk?`모양과 변경 조건을 함께 맞춰야 합니다. 처음 서열과 다른 자리를 ${mission.maxChanges}개 이내로 줄여 보세요.`:'목표 구조와 줄기의 염기쌍 수, 루프의 염기 수, 가지 배치를 비교하세요. 양 끝의 꼬리와 독립된 헤어핀 사이 연결 구간의 길이는 채점하지 않습니다.';
  $('grading-detail').textContent=message;feedback.textContent=message;feedback.hidden=!grade.hasPrediction;feedback.classList.toggle('success',grade.solved);
  $('grading-progress').value=!grade.complete?(grade.assigned-mission.locked.length)/(sequence.length-mission.locked.length)*100:grade.shapePercent;
  $('grading-checks').replaceChildren();
  const checks=[{ok:grade.complete,text:`염기 선택 ${grade.assigned} / ${sequence.length}`},{ok:grade.lockedOk,text:`고정 염기 ${mission.locked.length}개 유지`}];
  if(isRibozyme()){
    const current=grade.hasPrediction?partners(result.structure):null;
    mission.stems.forEach(stem=>checks.push({ok:!!current&&stem.pairs.every(([i,j])=>grade.nodeMap.has(i)&&grade.nodeMap.has(j)&&current[grade.nodeMap.get(i)]===grade.nodeMap.get(j)),text:`${stem.name} 모양`}));
  }
  checks.push({ok:grade.structureOk,text:'줄기·루프·가지 모양 일치'});
  if(mission.maxChanges)checks.push({ok:grade.budgetOk,text:`변경 ${grade.changes} / ${mission.maxChanges}개`});
  for(const check of checks){const li=document.createElement('li');li.classList.toggle('passed',check.ok);li.textContent=`${check.ok?'✓':'○'} ${check.text}`;$('grading-checks').append(li);}
  $('mission-rules').textContent=isRibozyme()?'54자리 · 보존 염기 16개 · 줄기 I 5쌍 / II 4쌍 / III 6쌍 · 37 °C':`${mission.locked.length?`고정 염기 ${mission.locked.length}개 · `:''}${mission.maxChanges?`처음 서열과 다른 자리 ${grade.changes} / ${mission.maxChanges}개`:'변경 횟수 제한 없음'} · 37 °C`;
  $('reaction-toggle').disabled=!grade.solved;
  $('reaction-toggle').textContent=grade.solved?'절단 원리 보기':'설계 조건 통과 후 절단 원리 보기';
  if(!grade.solved){$('reaction-principle').hidden=true;$('reaction-toggle').setAttribute('aria-expanded','false');}
}
function announceSuccess(grade){
  const item=mission,seq=sequence,key=`${item.id}:${seq}`;
  if(announcedSolutions.has(key)||mode!=='mission')return;
  clearTimeout(successTimer);
  successTimer=setTimeout(()=>{
    if(mode!=='mission'||mission!==item||sequence!==seq||pending||!grade.solved)return;
    announcedSolutions.add(key);
    $('success-title').textContent='미션 성공!';$('success-mission').textContent=item.title;
    $('success-detail').textContent=isRibozyme()?'해머헤드의 목표 모양을 직접 설계했습니다. 모양 채점은 촉매 핵의 정확한 배치나 실제 효소 활성을 검증하지 않습니다.':'예측 구조의 줄기 길이·루프 크기·가지 배치가 목표와 같습니다. 서열과 염기 번호가 달라도 같은 모양이면 정답입니다.';
    $('success-proof').textContent=`목표 모양 100% 일치 · ${grade.targetPairs.length}개 염기쌍 · ${result.energy.toFixed(2)} kcal/mol`;
    $('success-next').textContent=isRibozyme()?'절단 원리 살펴보기 →':'다음 미션 →';
    $('mission-success').showModal();
  },850);
}
function syncViewButtons(){document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
function showWorkspace() {
  cancelSuccess();
  $('mission-room').hidden=true;$('workspace').hidden=false;
  $('workspace').setAttribute('aria-labelledby',mission?'tab-missions':'tab-free');
  $('tab-missions').setAttribute('aria-controls',mission?'workspace':'mission-room');
  $('tab-free').setAttribute('aria-selected',String(!mission));
  $('tab-missions').setAttribute('aria-selected',String(!!mission));
  $('mission-brief').hidden=!mission;$('free-options').hidden=!!mission;
  $('mission-summary').hidden=!mission;$('ribozyme-guide').hidden=!isRibozyme();$('ribozyme-reaction').hidden=!isRibozyme();$('blank-tools').hidden=!isRibozyme();
  $('hint-area').hidden=!mission;$('structure-toggle').hidden=!mission;
  $('sequence').readOnly=!!mission&&!isRibozyme();
  $('fold-button').hidden=!!mission&&!isRibozyme();
  $('sequence-help').textContent=isRibozyme()?'54자리를 직접 입력해도 됩니다. N은 미정 자리이며, 자물쇠 표시 16자리는 유지하세요. 전부 채우면 예측합니다.':mission?'미션에서는 구조도의 염기를 눌러 바꿉니다. 자물쇠 표시 염기는 고정입니다.':'A, U, G, C로 8~120개 염기를 입력하세요.';
  $('hint').hidden=true;$('hint-button').setAttribute('aria-expanded','false');$('hint-button').textContent='힌트 보기';
  view='current';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  if(mission){
    $('mission-number').textContent=`MISSION ${String(MISSIONS.indexOf(mission)+1).padStart(2,'0')}`;
    $('mission-title').textContent=mission.title;$('mission-description').textContent=mission.description;
    $('hint').textContent=mission.hint;
  }
  $('stem-navigation').replaceChildren();
  if(isRibozyme()){
    for(const stem of mission.stems){const button=document.createElement('button');button.textContent=`${stem.name} · ${stem.pairs.length}쌍`;button.addEventListener('click',()=>{view='target';syncViewButtons();selected=stem.pairs[0][0];renderSelection();renderStructure();$('rna-stage').scrollIntoView({behavior:'smooth',block:'center'});});$('stem-navigation').append(button);}
    const cut=document.createElement('button');cut.textContent='절단 자리 · 8 | 9';cut.addEventListener('click',()=>{selectBase(7);$('rna-stage').scrollIntoView({behavior:'smooth',block:'center'});});$('stem-navigation').append(cut);
  }
  setZoom(zoom);
}
function openMission(item, sharedSequence) {
  announcedSolutions.clear();
  mode='mission';mission=item;history=[];selected=0;startSequence=mission.start;
  showWorkspace();
  const shareValid=typeof sharedSequence==='string'&&(isRibozyme()?/^[ACGUN]+$/.test(sharedSequence):valid(sharedSequence)) && sharedSequence.length===mission.start.length && mission.locked.every(i=>sharedSequence[i]===mission.start[i]);
  setSequence(shareValid?sharedSequence:mission.start,{remember:false});
  if(result?.sequence===sequence){renderMetrics();renderStructure();}
  $('mission-brief').scrollIntoView({block:'start'});
}
function openFree() {
  mode='free';mission=null;history=[];selected=0;startSequence=freeSequence;
  showWorkspace();setSequence(freeSequence,{remember:false});
  if(result?.sequence===sequence){renderMetrics();renderStructure();}
}
function renderMissionList() {
  $('mission-list').replaceChildren();
  MISSIONS.forEach((item,i)=>{
    const card=document.createElement('article');card.className=`mission-card${completed.has(item.id)?' completed':''}`;
    const number=document.createElement('span');number.className='mission-index';number.textContent=String(i+1).padStart(2,'0');
    const title=document.createElement('h3');title.textContent=item.title;
    const description=document.createElement('p');description.textContent=item.description;
    const button=document.createElement('button');button.textContent=completed.has(item.id)?'다시 도전하기 ↗':'미션 시작하기 ↗';
    button.addEventListener('click',()=>openMission(item));
    card.append(number,title,description,button);$('mission-list').append(card);
  });
  $('mission-progress').textContent=`${completed.size} / ${MISSIONS.length} 완료`;
}
function openRoom() {
  cancelSuccess();
  mode='room';$('mission-room').hidden=false;$('workspace').hidden=true;
  $('tab-free').setAttribute('aria-selected','false');$('tab-missions').setAttribute('aria-selected','true');
  $('tab-missions').setAttribute('aria-controls','mission-room');renderMissionList();
}

$('tab-free').addEventListener('click',openFree);
$('tab-missions').addEventListener('click',openRoom);
$('mission-back').addEventListener('click',openRoom);
document.querySelectorAll('[role=tab]').forEach(tab=>tab.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    event.preventDefault();const other=tab.id==='tab-free'?$('tab-missions'):$('tab-free');other.focus();other.click();
  }
}));
$('preset').addEventListener('change',()=>{startSequence=PRESETS[$('preset').value];setSequence(startSequence);});
$('fold-button').addEventListener('click',()=>{
  const raw=$('sequence').value.trim().toUpperCase().replace(/\s+/g,'');
  const normalized=raw.replace(/T/g,'U');
  if(isRibozyme()){
    if(!/^[ACGUN]{54}$/.test(normalized)){error('A·U·G·C 또는 미정 자리 N으로 정확히 54자리를 입력하세요.');return;}
    if(!mission.locked.every(i=>normalized[i]===mission.start[i])){error('보존 염기와 절단 자리 16개는 바꿀 수 없습니다. 자물쇠 표시 자리를 유지하세요.');return;}
  }else if(!valid(normalized)){error('A·U·G·C로 8~120개 염기를 입력하세요. 공백과 줄바꿈은 생략할 수 있습니다.');return;}
  if(raw.includes('T'))toast('RNA 서열에 맞게 T를 U로 바꿨습니다.');
  if(normalized===sequence)requestFold();else setSequence(normalized);
});
$('sequence').addEventListener('input',()=>{
  if(!$('sequence').readOnly)$('sequence-length').textContent=`${$('sequence').value.replace(/\s+/g,'').length} nt · 적용 전`;
});
document.querySelectorAll('button[data-base]').forEach(b=>b.addEventListener('click',()=>changeBase(b.dataset.base)));
$('previous-base').addEventListener('click',()=>selectBase(selected-1));
$('next-base').addEventListener('click',()=>selectBase(selected+1));
$('zoom-in').addEventListener('click',()=>setZoom(zoom+.5));
$('zoom-out').addEventListener('click',()=>setZoom(zoom-.5));
$('zoom-fit').addEventListener('click',()=>setZoom(1));
window.addEventListener('resize',()=>setZoom(zoom));
$('undo').addEventListener('click',()=>{const previous=history.pop();if(previous)setSequence(previous,{remember:false});});
$('reset').addEventListener('click',()=>{announcedSolutions.clear();setSequence(startSequence);});
$('next-blank').addEventListener('click',nextBlank);
$('clear-base').addEventListener('click',()=>{if(isRibozyme()&&!mission.locked.includes(selected))setSequence(sequence.slice(0,selected)+'N'+sequence.slice(selected+1));});
$('success-next').addEventListener('click',()=>{
  $('mission-success').close();
  if(isRibozyme()){$('reaction-toggle').click();$('ribozyme-reaction').scrollIntoView({behavior:'smooth',block:'center'});}
  else openMission(MISSIONS[MISSIONS.indexOf(mission)+1]);
});
$('reaction-toggle').addEventListener('click',()=>{
  if($('reaction-toggle').disabled)return;
  const expanded=$('reaction-principle').hidden;$('reaction-principle').hidden=!expanded;
  $('reaction-toggle').setAttribute('aria-expanded',String(expanded));$('reaction-toggle').textContent=expanded?'절단 원리 접기':'절단 원리 보기';
});
document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('textarea,input,select')||$('workspace').hidden||$('mission-success').open)return;
  const key=event.key.toUpperCase();
  if(/^[ACGU]$/.test(key)){event.preventDefault();changeBase(key);}
  else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();selectBase(selected+(event.key==='ArrowLeft'?-1:1));}
});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.view==='current'&&hasBlanks()){toast('빈 자리를 모두 채우면 예측 구조를 볼 수 있습니다.');return;}
  view=button.dataset.view;syncViewButtons();renderStructure();
}));
$('detail-toggle').addEventListener('click',()=>{
  const expanded=$('nucleotide-sketch').classList.toggle('expanded');
  $('detail-toggle').setAttribute('aria-expanded',String(expanded));
  $('detail-toggle').textContent=expanded?'확대 설명 접기':'뉴클레오타이드 확대 보기';
});
$('hint-button').addEventListener('click',()=>{
  $('hint').hidden=!$('hint').hidden;$('hint-button').setAttribute('aria-expanded',String(!$('hint').hidden));
  $('hint-button').textContent=$('hint').hidden?'힌트 보기':'힌트 접기';
});
$('share').addEventListener('click',async()=>{
  const url=new URL(location.href);const params=new URLSearchParams({s:sequence});if(mission)params.set('m',mission.id);url.hash=params.toString();
  try{await navigator.clipboard.writeText(url.href);toast('현재 설계의 링크를 복사했습니다.');}
  catch{const area=document.createElement('textarea');area.value=url.href;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const copied=document.execCommand('copy');area.remove();toast(copied?'현재 설계의 링크를 복사했습니다.':'링크를 주소창에 표시했습니다. 주소를 복사해 주세요.');if(!copied)location.hash=params.toString();}
});
$('download').addEventListener('click',()=>{
  if(!result||result.sequence!==sequence||pending){toast('계산이 끝난 뒤 결과를 저장해 주세요.');return;}
  const grade=mission?gradeMission(mission,sequence,result.structure):null;
  const text=['RNA 설계 실험실',mission?`미션: ${mission.title}`:'자유 실험실',`염기서열 (5′ → 3′): ${sequence}`,`예측 2차 구조: ${result.structure}`,`최소 자유에너지: ${result.energy.toFixed(2)} kcal/mol`,`모형: RibossFold 0.0.5, Turner 2004, 37 °C`,mission?`목표 구조(모양 참고): ${mission.target}`:'',grade?`자동 채점: ${grade.solved?'설계 조건 통과':'수정 필요'} · 목표 모양 일치 ${grade.shapePercent}% · 줄기·루프·가지 배치 비교, 염기 번호 무관`:'',isRibozyme()?'해머헤드 모양 설계 · 참고 설계도의 절단 자리 8|9 · 실제 핵 배치와 절단 활성은 별도 검증 필요':'',isRibozyme()?`설계 근거: ${mission.source}`:'','이 결과는 2차 구조의 계산상 예측이며 촉매 활성의 검증이 아닙니다.'].filter(Boolean).join('\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='RNA-설계-결과.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('설계 결과를 저장했습니다.');
});

const worker=new Worker(new URL('./fold-worker.js',import.meta.url));
worker.addEventListener('message',({data})=>{
  if(data.type==='ready'){
    ready=true;$('engine-state').textContent='기기 안에서 계산 · 37 °C';$('engine-state').classList.add('ready');$('fold-button').disabled=false;renderSelection();
  } else if(data.type==='init-error'){
    error(data.error);$('engine-state').textContent='계산기 로드 실패';$('fold-status').textContent=data.error;
  } else if(data.id===requestId){
    clearTimeout(foldTimer);pending=false;
    if(data.type==='error'){error(data.error);$('fold-status').textContent='계산하지 못했습니다. 서열을 확인해 주세요.';return;}
    result=data;if(isRibozyme()){view='current';syncViewButtons();}renderStructure();renderMetrics();renderSelection();
    $('fold-status').textContent='계산 완료 · 염기를 눌러 다른 결합을 탐색하세요.';
  }
});
worker.addEventListener('error',()=>{
  clearTimeout(foldTimer);pending=false;ready=false;$('engine-state').textContent='계산기를 불러오지 못했습니다';error('계산기 파일을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');renderSelection();$('fold-button').disabled=true;
});
window.addEventListener('pagehide',event=>{if(!event.persisted)worker.terminate();});
renderMissionList();
const shared=new URLSearchParams(location.hash.slice(1));
const sharedMission=MISSIONS.find(item=>item.id===shared.get('m'));
if(sharedMission)openMission(sharedMission,shared.get('s'));
else{
  if(valid(shared.get('s'))){freeSequence=shared.get('s');sequence=freeSequence;startSequence=sequence;}
  showWorkspace();$('sequence').value=sequence;$('sequence-length').textContent=`${sequence.length} nt`;renderSelection();requestFold();
}
