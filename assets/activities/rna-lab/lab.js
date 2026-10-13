import {PRESETS, MISSIONS} from './missions.js';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const colors = {A:'#f4c86a', U:'#e89980', G:'#8bb9c8', C:'#b2c7a0'};
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
const completed = new Set(storage.read('completed', []).filter(id => MISSIONS.some(m => m.id === id)));

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
function partners(structure) {
  const pairs = Array(structure.length).fill(-1), stack = [];
  for (let i=0; i<structure.length; i++) {
    if (structure[i] === '(') stack.push(i);
    else if (structure[i] === ')') {
      const j = stack.pop();
      if (j === undefined) throw new Error('잘못된 구조 표기');
      pairs[i]=j; pairs[j]=i;
    }
  }
  if (stack.length) throw new Error('잘못된 구조 표기');
  return pairs;
}

// Draw stems and their loops from the pairing tree. This layout only displays
// the computed structure; it does not participate in the folding prediction.
export function layout(structure) {
  const pair = partners(structure), points = Array(structure.length);
  const gap=29, rise=25;
  function stem(i,j,x,y,angle) {
    const dx=Math.cos(angle),dy=Math.sin(angle),px=-dy,py=dx;
    let k=0;
    while(i+k<j-k && pair[i+k]===j-k) {
      points[i+k]={x:x+dx*rise*k-px*gap/2,y:y+dy*rise*k-py*gap/2};
      points[j-k]={x:x+dx*rise*k+px*gap/2,y:y+dy*rise*k+py*gap/2};
      k++;
    }
    const left=i+k-1,right=j-k+1;
    const tokens=[];
    for(let n=left+1;n<right;n++) {
      if(pair[n]>n) {tokens.push({index:n,child:pair[n]},{index:pair[n]});n=pair[n];}
      else tokens.push({index:n});
    }
    const count=tokens.length+2;
    const radius=gap/(2*Math.sin(Math.PI/count));
    const offset=Math.sqrt(Math.max(0,radius*radius-gap*gap/4));
    const baseX=x+dx*rise*(k-1),baseY=y+dy*rise*(k-1);
    const cx=baseX+dx*offset,cy=baseY+dy*offset;
    const first=angle-Math.PI+Math.PI/count;
    tokens.forEach((token,t)=>{
      const a=first+(t+1)*2*Math.PI/count;
      points[token.index]={x:cx+radius*Math.cos(a),y:cy+radius*Math.sin(a)};
    });
    for(const token of tokens) if(token.child) {
      const a=points[token.index],b=points[token.child],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      stem(token.index,token.child,mx,my,Math.atan2(my-cy,mx-cx));
    }
  }
  let cursor=0;
  for(let i=0;i<structure.length;i++) {
    if(pair[i]>i) {
      const j=pair[i];stem(i,j,0,0,-Math.PI/2);
      const group=points.slice(i,j+1),xs=group.map(p=>p.x);
      const min=Math.min(...xs),max=Math.max(...xs);
      group.forEach(p=>p.x+=cursor-min+15);
      cursor+=max-min+55;i=j;
    } else {points[i]={x:cursor,y:0};cursor+=gap;}
  }
  return points;
}
function svgNode(tag, attrs={}, text) {
  const element=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attrs)) element.setAttribute(key,String(value));
  if(text!==undefined) element.textContent=text;
  return element;
}
function setZoom(next) {
  zoom=Math.max(1,Math.min(4,next));
  const svg=$('rna-structure'),viewport=$('rna-viewport');
  svg.style.width=`${zoom*100}%`;svg.style.height=`${viewport.clientHeight*zoom}px`;
  $('zoom-out').disabled=zoom<=1;$('zoom-in').disabled=zoom>=4;
  if(zoom===1){viewport.scrollLeft=0;viewport.scrollTop=0;}
  else{const node=svg.querySelector('.selected');if(node)node.scrollIntoView({block:'nearest',inline:'nearest'});}
}
function renderStructure() {
  if(!result || result.sequence!==sequence) return;
  const structure=view==='target' && mission ? mission.target : result.structure;
  const pair=partners(structure),current=partners(result.structure),target=mission?partners(mission.target):null;
  const positions=layout(structure),svg=$('rna-structure');
  svg.replaceChildren();
  const xs=positions.map(p=>p.x),ys=positions.map(p=>p.y);
  const minX=Math.min(...xs)-36,minY=Math.min(...ys)-36;
  const width=Math.max(...xs)-minX+36,height=Math.max(...ys)-minY+40;
  // A minimum viewBox size prevents huge bases for very short examples.
  const w=Math.max(width,220),h=Math.max(height,210);
  svg.setAttribute('viewBox',`${minX-(w-width)/2} ${minY-(h-height)/2} ${w} ${h}`);
  const backbone=svgNode('g');
  positions.forEach((p,i)=>{
    if(i) backbone.append(svgNode('line',{x1:positions[i-1].x,y1:positions[i-1].y,x2:p.x,y2:p.y,class:'backbone'}));
    if(pair[i]>i) backbone.append(svgNode('line',{x1:p.x,y1:p.y,x2:positions[pair[i]].x,y2:positions[pair[i]].y,class:'pair'}));
  });
  svg.append(backbone);
  positions.forEach((p,i)=>{
    const locked=mission?.locked.includes(i);
    const mismatch=target && view==='current' && current[i]!==target[i];
    const node=svgNode('g',{class:`base-node${selected===i?' selected':''}${locked?' locked':''}${mismatch?' mismatch':''}`,transform:`translate(${p.x},${p.y})`,tabindex:i===selected?'0':'-1',role:'button','aria-label':`${i+1}번 ${sequence[i]}${locked?' 고정 염기':''}${pair[i]>=0?`, ${pair[i]+1}번과 결합`: ', 결합하지 않음'}`,'data-index':i});
    node.append(svgNode('circle',{r:12,fill:colors[sequence[i]]}));
    node.append(svgNode('text',{},sequence[i]));
    if(locked)node.append(svgNode('circle',{cx:9,cy:-9,r:3.8,class:'lock-dot'}));
    if((i+1)%5===0) node.append(svgNode('text',{x:0,y:21,class:'base-number'},String(i+1)));
    node.addEventListener('click',()=>selectBase(i));
    node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectBase(i);}});
    svg.append(node);
  });
  const first=positions[0],last=positions.at(-1);
  svg.append(svgNode('text',{x:first.x-26,y:first.y+5,class:'end-label'},'5′'));
  svg.append(svgNode('text',{x:last.x+16,y:last.y+5,class:'end-label'},'3′'));
  setZoom(zoom);
  $('structure-heading').textContent=view==='target'?'도전할 목표 구조':'지금 이 RNA의 예측 구조';
  $('stage-extra').textContent=mission ? '● 고정 염기 · 점선 테두리: 목표와 다른 자리' : '37 °C 기준';
}
function selectBase(index) {
  selected=Math.max(0,Math.min(sequence.length-1,index));
  if(view==='target') {
    view='current';
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  }
  renderSelection(); renderStructure();
}
function renderSelection() {
  const locked=mission?.locked.includes(selected);
  $('selected-label').textContent=`${selected+1}번 · ${sequence[selected]}${locked?' · 고정되어 있습니다':''}`;
  document.querySelectorAll('[data-base]').forEach(button=>{
    button.disabled=!ready || !!locked;
    button.setAttribute('aria-pressed',String(button.dataset.base===sequence[selected]));
  });
  $('undo').disabled=!history.length || !ready;
}
function setSequence(next,{remember=true}={}) {
  if(next===sequence && result?.sequence===sequence) return;
  if(remember && next!==sequence) {history.push(sequence);if(history.length>80)history.shift();}
  sequence=next;
  if(mode==='free'){freeSequence=next;storage.write('sequence',next);}
  selected=Math.min(selected,sequence.length-1);
  $('sequence').value=sequence;
  $('sequence-length').textContent=`${sequence.length} nt`;
  renderSelection(); error(); requestFold();
}
function changeBase(base) {
  if(!ready || mission?.locked.includes(selected) || sequence[selected]===base)return;
  const next=sequence.slice(0,selected)+base+sequence.slice(selected+1);
  setSequence(next);
}
function requestFold() {
  if(!valid(sequence))return;
  const id=++requestId;pending=true;
  $('fold-status').textContent='새 서열의 구조를 계산하고 있습니다…';
  $('energy').textContent='…';$('pairs').textContent='…';
  $('mission-feedback').hidden=true;
  clearTimeout(foldTimer);
  foldTimer=setTimeout(()=>{
    if(pending){$('fold-status').textContent='계산이 지연됩니다. 서열 적용을 다시 누르거나 페이지를 새로고침해 주세요.';error('계산 결과를 받지 못했습니다. 다시 시도해 주세요.');pending=false;}
  },20000);
  worker.postMessage({type:'fold',id,sequence});
}
function renderMetrics() {
  $('energy').textContent=result.energy.toFixed(2);
  $('pairs').textContent=String((result.structure.match(/\(/g)||[]).length);
  if(mission) {
    const current=partners(result.structure),target=partners(mission.target);
    const correct=current.filter((partner,i)=>partner===target[i]).length;
    $('third-label').textContent='목표 구조 일치';
    $('third-value').textContent=`${Math.round(correct/sequence.length*100)}%`;
    $('third-help').textContent=`결합 상대가 같은 자리 ${correct} / ${sequence.length}`;
    const changes=[...sequence].filter((base,i)=>base!==mission.start[i]).length;
    const budgetOk=!mission.maxChanges || changes<=mission.maxChanges;
    const solved=result.structure===mission.target && budgetOk;
    $('mission-rules').textContent=`${mission.locked.length?`● 표시 ${mission.locked.length}개 염기 고정 · `:''}${mission.maxChanges?`처음 서열과 다른 자리 ${changes} / ${mission.maxChanges}개`:'변경 횟수 제한 없음'} · 37 °C`;
    const feedback=$('mission-feedback');feedback.hidden=false;feedback.classList.toggle('success',solved);
    if(solved){
      feedback.textContent='✓ 목표 구조를 만들었습니다! 어떤 결합을 유도하고 어떤 결합을 막았는지 설명해 보세요.';
      completed.add(mission.id);storage.write('completed',[...completed]);renderMissionList();
    } else if(!budgetOk)feedback.textContent=`목표 구조와 변경 조건을 함께 맞춰야 합니다. 처음 서열과 다른 자리를 ${mission.maxChanges}개 이내로 줄여 보세요.`;
    else feedback.textContent=`아직 목표와 다른 자리가 ${sequence.length-correct}개 있습니다. ‘목표 구조’에서 결합 상대를 비교해 보세요.`;
  } else {
    $('third-label').textContent='GC 비율';
    $('third-value').textContent=`${Math.round((sequence.match(/[GC]/g)||[]).length/sequence.length*100)}%`;
    $('third-help').textContent='전체 염기 중 G와 C의 비율';
    $('mission-feedback').hidden=true;
  }
}
function showWorkspace() {
  $('mission-room').hidden=true;$('workspace').hidden=false;
  $('workspace').setAttribute('aria-labelledby',mission?'tab-missions':'tab-free');
  $('tab-missions').setAttribute('aria-controls',mission?'workspace':'mission-room');
  $('tab-free').setAttribute('aria-selected',String(!mission));
  $('tab-missions').setAttribute('aria-selected',String(!!mission));
  $('mission-brief').hidden=!mission;$('free-options').hidden=!!mission;
  $('hint-area').hidden=!mission;$('structure-toggle').hidden=!mission;
  $('sequence').readOnly=!!mission;
  $('fold-button').hidden=!!mission;
  $('sequence-help').textContent=mission?'미션에서는 그림의 염기를 눌러 바꿉니다. ● 표시 염기는 고정입니다.':'A, U, G, C로 8~120개 염기를 입력하세요.';
  $('hint').hidden=true;$('hint-button').setAttribute('aria-expanded','false');$('hint-button').textContent='힌트 보기';
  view='current';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  if(mission){
    $('mission-number').textContent=`MISSION ${String(MISSIONS.indexOf(mission)+1).padStart(2,'0')}`;
    $('mission-title').textContent=mission.title;$('mission-description').textContent=mission.description;
    $('hint').textContent=mission.hint;
  }
}
function openMission(item, sharedSequence) {
  mode='mission';mission=item;history=[];selected=0;startSequence=mission.start;
  showWorkspace();
  const shareValid=valid(sharedSequence) && sharedSequence.length===mission.start.length && mission.locked.every(i=>sharedSequence[i]===mission.start[i]);
  setSequence(shareValid?sharedSequence:mission.start,{remember:false});
  if(result?.sequence===sequence){renderMetrics();renderStructure();}
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
  if(!valid(normalized)){error('A·U·G·C로 8~120개 염기를 입력하세요. 공백과 줄바꿈은 생략할 수 있습니다.');return;}
  if(raw.includes('T'))toast('RNA 서열에 맞게 T를 U로 바꿨습니다.');
  if(normalized===sequence)requestFold();else setSequence(normalized);
});
$('sequence').addEventListener('input',()=>{
  if(!$('sequence').readOnly)$('sequence-length').textContent=`${$('sequence').value.replace(/\s+/g,'').length} nt · 적용 전`;
});
document.querySelectorAll('[data-base]').forEach(b=>b.addEventListener('click',()=>changeBase(b.dataset.base)));
$('previous-base').addEventListener('click',()=>selectBase(selected-1));
$('next-base').addEventListener('click',()=>selectBase(selected+1));
$('zoom-in').addEventListener('click',()=>setZoom(zoom+.5));
$('zoom-out').addEventListener('click',()=>setZoom(zoom-.5));
$('zoom-fit').addEventListener('click',()=>setZoom(1));
window.addEventListener('resize',()=>setZoom(zoom));
$('undo').addEventListener('click',()=>{const previous=history.pop();if(previous)setSequence(previous,{remember:false});});
$('reset').addEventListener('click',()=>setSequence(startSequence));
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||event.target.closest('textarea,input,select')||$('workspace').hidden)return;
  const key=event.key.toUpperCase();
  if(/^[ACGU]$/.test(key)){event.preventDefault();changeBase(key);}
  else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();selectBase(selected+(event.key==='ArrowLeft'?-1:1));}
});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderStructure();
}));
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
  const text=['RNA 설계 실험실',mission?`미션: ${mission.title}`:'자유 실험실',`염기서열 (5′ → 3′): ${sequence}`,`예측 2차 구조: ${result.structure}`,`최소 자유에너지: ${result.energy.toFixed(2)} kcal/mol`,`모형: RibossFold 0.0.5, Turner 2004, 37 °C`,mission?`목표 구조: ${mission.target}`:'','이 결과는 2차 구조의 계산상 예측이며 촉매 활성의 검증이 아닙니다.'].filter(Boolean).join('\n');
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
    result=data;renderStructure();renderMetrics();renderSelection();
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
