import {GOAL,TARGET,TARGET_LENGTH,CUT_AFTER,START,validSequence,gradeScissors,topology} from './scissors-model.js?v=8';
import {BASES,pairInfo} from './molecule.js?v=10';
import {ScissorsView} from './scissors-view.js?v=10';

export function createScissors(root,onComplete){
  const displayTarget=[...TARGET].reverse().join('');
  root.innerHTML=`
    <section class="scissors-story"><img src="/assets/activities/rna-lab/classroom-lab.png" alt="코로나바이러스 모형이 교육용 홀로그램으로 떠 있는 밝은 생명과학 연구실" width="2172" height="724"><div><p class="rna-kicker">VIRTUAL RESEARCH NOTE · 05</p><h2>접히는 RNA, 가위가 되다</h2><p>코로나바이러스처럼 RNA를 유전물질로 가진 바이러스를 배운 여러분. 가상 연구실에서 <strong>RNA가 접힌 모양과 기능의 관계</strong>를 탐구합니다. 주어진 표적 주변에 구조를 만들고, 두 내부 고리가 만나는 순간을 관찰하세요.</p><span>수업용 가상 서열 · 기기 안에서 계산</span></div></section>
    <ol class="scissors-steps"><li><strong>01 · 전체 구조 설계</strong><span>염기를 바꿀 때마다 전체 서열이 다시 접힙니다.</span></li><li><strong>02 · 두 내부 고리</strong><span>염기쌍 구간 4개와 내부 고리 2개를 만드세요.</span></li><li><strong>03 · 만나고, 자르기</strong><span>성공하면 고리가 만나고 주황색 표적이 잘립니다.</span></li></ol>
    <section class="scissors-target" aria-label="제공된 표적 RNA"><div><strong>제공된 표적 RNA</strong><p>전체 표적 18개 염기 · 좌우 4개씩 결합</p></div><code>3′—${displayTarget.slice(0,4)}<mark title="왼쪽 결합 4개">${displayTarget.slice(4,8)}</mark>${displayTarget[8]}<b aria-label="절단 위치">│</b>${displayTarget[9]}<mark title="오른쪽 결합 4개">${displayTarget.slice(10,14)}</mark>${displayTarget.slice(14)}—5′</code><p>실제 코로나바이러스 서열이 아닌, 구조 학습용 가상 서열입니다.</p></section>
    <div class="scissors-grid"><aside class="scissors-editor" aria-label="RNA 서열 편집">
      <h3>나의 가위 RNA 설계</h3><div class="sequence-heading"><label for="scissors-input" class="rna-label">염기서열 <span>5′ → 3′</span></label><span id="scissors-length"></span></div><textarea id="scissors-input" rows="4" maxlength="160" spellcheck="false" autocomplete="off" aria-describedby="scissors-sequence-help"></textarea><p id="scissors-sequence-help" class="rna-help">가위 RNA만 입력하세요. 8~80개 염기 · 입력을 멈추면 자동으로 적용됩니다. 구조도의 염기를 눌러서도 바꿀 수 있습니다.</p><button id="scissors-apply">서열 적용하기</button><p id="scissors-input-error" class="rna-error" role="alert"></p>
      <div id="scissors-sequence" class="scissors-sequence" aria-label="가위 RNA 서열 5′에서 3′"></div>
      <p id="scissors-selected" class="rna-label" aria-live="polite"></p>
      <div class="base-palette">${['A','U','G','C'].map(b=>`<button data-scissors-base="${b}" class="base-${b}" aria-label="${BASES[b].name} ${b}로 바꾸기">${b}<small>${BASES[b].name}</small></button>`).join('')}</div>
      <div class="rna-tools"><button id="scissors-previous" aria-label="이전 염기 선택">← 이전</button><button id="scissors-next" aria-label="다음 염기 선택">다음 →</button><button id="scissors-undo" disabled>↶ 되돌리기</button><button id="scissors-reset">처음으로</button></div>
      <details><summary>설계 힌트</summary><p>목표 그림에서 마주 보는 염기를 찾아 A–U, G–C(또는 G–U) 짝을 생각해 보세요. 가위 내부의 염기쌍 구간 네 개는 각각 2쌍입니다. 내부 고리는 양쪽에 1개씩 짝 없는 염기가 있고, 끝의 헤어핀 고리는 4개 염기입니다.</p><p>원하는 짝을 만들어도 다른 곳과 먼저 짝을 이룰 수 있습니다. 가위의 처음 4개는 표적 왼쪽, 마지막 4개는 표적 오른쪽에 마주 보도록 결합합니다. 항상 <strong>내 설계</strong>의 전체 예측 구조로 돌아와 확인하세요.</p></details>
    </aside><section class="scissors-observation" aria-label="전체 RNA 구조 관찰">
      <div class="observation-heading"><div><span class="rna-kicker">SECONDARY STRUCTURE · 37 °C</span><h3 id="scissors-heading">내 설계의 전체 예측 구조</h3></div><div class="structure-toggle"><button data-scissors-view="current" aria-pressed="true">내 설계</button><button data-scissors-view="target" aria-pressed="false">목표 구조</button></div></div>
      <div class="rna-stage scissors-stage"><div class="rna-viewport" id="scissors-viewport"><svg id="scissors-molecule" viewBox="0 0 700 440" role="group" aria-label="서열에 따라 바뀌는 전체 RNA 접힘 모형"></svg></div><div id="scissors-celebration" class="scissors-celebration" role="status" hidden><strong>✓ 미션 성공!</strong><span id="scissors-success-detail"></span></div><div class="zoom-tools" aria-label="구조 확대와 축소"><button id="scissors-zoom-out" aria-label="구조 축소">−</button><button id="scissors-zoom-fit">맞춤</button><button id="scissors-zoom-in" aria-label="구조 확대">＋</button></div><div class="stage-caption"><span><i class="ribose-symbol"></i> 리보스</span><span><i class="phosphate-symbol"></i> 인산</span><span><i class="pair-line"></i> 수소 결합</span><span><i class="backbone-line"></i> 공유 결합</span><span class="scissors-target-key">주황: 표적</span><span>표적과 가위는 별도 가닥</span></div></div>
      <div class="scissors-inspector"><strong id="scissors-base-detail"></strong><span id="scissors-pair-detail"></span><small id="scissors-bond-detail"></small></div>
      <div class="rna-metrics"><div><span>자유에너지</span><strong id="scissors-energy">—</strong><small>kcal/mol · 가위 단독</small></div><div><span>염기쌍 구간</span><strong id="scissors-stems">— / 4</strong><small>목표: 각각 연속 2쌍</small></div><div><span>내부 고리</span><strong id="scissors-loops">— / 2</strong><small>목표: 양쪽에 1개씩</small></div></div>
      <p id="scissors-fold-status" role="status"></p><button id="scissors-retry" hidden>접힘 계산 다시 시도</button>
      <p class="rna-help"><strong>가위 RNA만 독립적으로 접힘을 계산</strong>합니다. 주황색 표적은 별도 가닥입니다. 좌우 4개씩의 상보성과 가위 구조를 확인한 뒤 접근·결합·고리의 만남·절단을 연출합니다. 결합 후 모습과 반응은 교육용 개념도입니다.</p>
    </section></div>
    <section id="scissors-summary" class="mission-summary" aria-live="polite"><div class="grading-heading"><span class="grading-state" id="scissors-state">구조 계산 중</span><strong id="scissors-grade-title">내부 고리 두 개가 있는 구조를 만들어 보세요.</strong></div><progress id="scissors-progress" max="100" value="0" aria-label="설계 조건 달성율"></progress><ul id="scissors-checks" class="grading-checks"></ul><p id="scissors-grade-detail"></p></section>
    <div class="scissors-result-actions"><button id="scissors-reaction" class="rna-primary" disabled>구조 완성 후 절단 장면 보기</button><button id="scissors-share">설계 링크 복사</button><button id="scissors-download">설계 결과 저장</button><span id="scissors-notice" role="status"></span></div>
    <section id="scissors-products" class="scissors-products" hidden><h3>성공! 표적 RNA가 두 조각으로 나뉘었습니다.</h3><div><code>3′—${displayTarget.slice(0,TARGET_LENGTH-CUT_AFTER-1)}—5′</code><span aria-hidden="true">✂</span><code>3′—${displayTarget.slice(TARGET_LENGTH-CUT_AFTER-1)}—5′</code></div><p>가위 RNA 접힘 → 표적에 접근 → 좌우 4쌍씩 결합 → 두 내부 고리의 만남 → 절단. 구조 조건을 만족한 뒤 보여주는 개념 애니메이션입니다.</p></section>
    <label class="rna-label" for="scissors-explanation">나의 설계 설명</label><textarea id="scissors-explanation" rows="3" maxlength="1500" placeholder="염기를 바꾸자 어떤 짝이 달라졌나요? 끝의 헤어핀 고리와 내부 고리는 어떻게 다른가요? 두 내부 고리가 만나면 어떤 일이 일어나는 것으로 표현했나요?"></textarea><p class="rna-help">설명은 이 브라우저에 저장됩니다. 공유 링크에는 서열만, 결과 파일에는 설명도 포함됩니다.</p>
    <details class="scissors-background"><summary>이 모형에서 관찰하는 것</summary><p>리보자임은 화학 반응을 돕는 RNA입니다. 이 활동은 염기쌍 구간 네 개와 내부 고리 두 개가 있는 형태를 목표로 삼습니다. 특정한 실제 리보자임의 촉매 서열을 재현하지 않습니다.</p><p>접힘은 다른 미션과 같은 RibossFold 계산기로 매번 다시 예측합니다. 성공 판정은 네 구간의 길이, 두 내부 고리와 끝 고리의 크기, 연결 관계, 표적의 위치를 함께 확인합니다. 고리가 만나는 움직임과 절단은 학습을 위한 연출입니다.</p><p>도입 이미지: AI로 생성한 가상 연구실과 코로나바이러스 모형.</p></details>`;
  const $=id=>root.querySelector('#'+id);
  let sequence=START,selected=0,prediction=null,request=0,worker,timeout,debounce,successTimer,cutTimer,inputTimer;
  let history=[],active=false,view='current',phase='design',zoom=1,pending=false,explanation='',announced='',inputDirty=false;
  try{const s=JSON.parse(localStorage.getItem('rna-scissors-v3'));if(validSequence(s?.sequence))sequence=s.sequence;if(typeof s?.explanation==='string')explanation=s.explanation.slice(0,1500);}catch{}
  const molecule=new ScissorsView($('scissors-molecule'),i=>{if(i<sequence.length)select(i);});
  let slots=[];
  function save(){try{localStorage.setItem('rna-scissors-v3',JSON.stringify({sequence,explanation}));}catch{}}
  function cancelReaction(){clearTimeout(successTimer);clearTimeout(cutTimer);if(phase!=='design')molecule.structure=null;phase='design';$('scissors-celebration').hidden=true;$('scissors-products').hidden=true;}
  function select(i){selected=Math.max(0,Math.min(sequence.length-1,i));renderSelection();}
  function renderSelection(){
    if(slots.length!==sequence.length){$('scissors-sequence').replaceChildren();slots=[...sequence].map((_,i)=>{const b=document.createElement('button');b.type='button';b.addEventListener('click',()=>select(i));$('scissors-sequence').append(b);return b;});}
    slots.forEach((b,i)=>{b.textContent=sequence[i];b.className='scissors-slot';b.setAttribute('aria-label',`가위 ${i+1}번 ${sequence[i]}`);b.setAttribute('aria-pressed',String(i===selected));});
    const info=BASES[sequence[selected]],locked=false;
    $('scissors-selected').textContent=`${selected+1}번 ${sequence[selected]}`;
    root.querySelectorAll('[data-scissors-base]').forEach(b=>{b.disabled=locked;b.setAttribute('aria-pressed',String(b.dataset.scissorsBase===sequence[selected]));});
    $('scissors-undo').disabled=!history.length;if(!inputDirty&&$('scissors-input').value!==sequence)$('scissors-input').value=sequence;$('scissors-length').textContent=`${sequence.length}개 염기`;
    $('scissors-base-detail').textContent=`${selected+1}번 ${sequence[selected]} · ${info.name} · ${info.family} · 고리 ${info.rings}개`;
    const mate=molecule.pair?.[selected]??-1,bond=mate>=0?pairInfo(sequence[selected],sequence[mate]):null;
    $('scissors-pair-detail').textContent=pending?'새 서열의 결합 상대를 계산하고 있습니다.':mate<0?'현재 그림에서 짝을 이루지 않는 염기':`${mate+1}번 ${sequence[mate]}와 마주 봄 · ${bond?.name||'상보적인 짝이 아님'}`;
    $('scissors-bond-detail').textContent=bond?`대표적인 수소 결합 ${bond.count}개 · 점선 표시`:'오각형: 리보스 · 사이의 원: 인산 · 염기는 리보스에 연결';
    molecule.selection(selected,Array.from({length:TARGET_LENGTH},(_,i)=>sequence.length+i));
  }
  function renderView(){
    if(phase!=='design')return;
    const current=prediction?.sequence===sequence?prediction.structure:null;
    const guide=view==='target',structure=guide?GOAL:current||'.'.repeat(sequence.length);
    molecule.display(guide?'N'.repeat(GOAL.length):sequence,structure,'design',Math.min(selected,structure.length-1));
    $('scissors-heading').textContent=view==='target'?'목표 구조 · 설계 안내 그림':'내 설계의 전체 예측 구조';
    root.querySelectorAll('[data-scissors-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scissorsView===view)));
    renderSelection();
  }
  function renderGrade(){
    const g=gradeScissors(sequence,prediction),has=g.hasPrediction;
    $('scissors-summary').classList.toggle('solved',g.solved);$('scissors-summary').dataset.solved=String(g.solved);
    $('scissors-state').textContent=g.solved?'✓ 미션 성공':pending?'구조 계산 중':'설계 중';
    $('scissors-grade-title').textContent=g.solved?'염기쌍 구간 4개와 내부 고리 2개를 완성했습니다!':`설계 조건 달성 ${g.shapePercent}%`;
    $('scissors-progress').value=g.shapePercent;
    const allThree=g.stems.length===4&&g.stems.every(s=>s.length===2);
    const checks=[[g.rightOk,`표적 왼쪽 상보성 ${g.arm5.filter(Boolean).length}/4쌍`],[g.leftOk,`표적 오른쪽 상보성 ${g.arm3.filter(Boolean).length}/4쌍`],[allThree,'가위 내부 구간 4개 · 각각 2쌍'],[g.loops.length===2&&g.loops.every(l=>l.length===2),'내부 고리 2개 · 각각 1+1개 염기'],[g.structureOk,'끝 고리 크기와 연결 관계'],[g.exposed,'가위 양 끝의 결합 구간이 열려 있음']];
    $('scissors-checks').replaceChildren(...checks.map(([ok,label])=>{const li=document.createElement('li');li.classList.toggle('passed',ok);li.textContent=`${ok?'✓':'○'} ${label}`;return li;}));
    $('scissors-grade-detail').textContent=g.solved?'구조 조건을 모두 만족했습니다. 두 내부 고리가 만나 표적을 자르는 장면을 관찰하세요.':pending?'가위 RNA 전체 서열의 접힘을 다시 계산하고 있습니다.':has?'현재 그림의 염기쌍 구간은 서로 짝을 이룬 염기가 이어진 부분입니다. 목표 그림과 고리 크기·연결 관계를 비교하세요.':'예측 결과를 받은 뒤 채점합니다.';
    $('scissors-energy').textContent=has?prediction.energy.toFixed(2):'—';$('scissors-stems').textContent=has?`${g.stems.length} / 4`:'— / 4';$('scissors-loops').textContent=has?`${g.loops.length} / 2`:'— / 2';
    $('scissors-reaction').disabled=!g.solved;$('scissors-reaction').textContent=g.solved?'성공! 절단 장면 다시 보기':'구조 완성 후 절단 장면 보기';
    $('scissors-download').disabled=!has;
    if(g.solved&&active){onComplete();if(announced!==sequence){announced=sequence;const expected=sequence;successTimer=setTimeout(()=>{if(active&&sequence===expected&&view==='current')reaction();},900);}}
    return g;
  }
  function setZoom(next){zoom=Math.max(1,Math.min(4,next));molecule.zoom=zoom;const svg=$('scissors-molecule'),vp=$('scissors-viewport');svg.style.width=`${zoom*100}%`;svg.style.height=`${vp.clientHeight*zoom}px`;$('scissors-zoom-out').disabled=zoom<=1;$('scissors-zoom-in').disabled=zoom>=4;if(zoom===1){vp.scrollTop=0;vp.scrollLeft=0;molecule.fit();}}
  function reaction(){
    if(!gradeScissors(sequence,prediction).solved||!active||inputDirty)return;
    cancelReaction();view='current';renderView();setZoom(1);const expected=sequence;
    const stages=[['approach','가위 RNA가 표적에 접근합니다.'],['bound','표적 왼쪽 4개 · 오른쪽 4개와 결합했습니다.'],['docking','두 내부 고리가 만나 반응 부위를 형성합니다.'],['cut','표적이 두 조각으로 잘렸습니다!']];
    function step(i){if(!active||sequence!==expected)return;const [next,message]=stages[i];phase=next;$('scissors-heading').textContent=message;$('scissors-celebration').hidden=false;$('scissors-success-detail').textContent=message;molecule.display(sequence,prediction.structure,phase,selected);if(next==='cut'){$('scissors-products').hidden=false;renderSelection();}else cutTimer=setTimeout(()=>step(i+1),molecule.reduced.matches?250:1450);}
    step(0);
  }
  function fail(message){clearTimeout(timeout);pending=false;prediction=null;$('scissors-fold-status').textContent=message;$('scissors-retry').hidden=false;renderGrade();}
  function startWorker(){
    worker?.terminate();worker=new Worker(new URL('./fold-worker.js',import.meta.url));
    worker.addEventListener('message',({data})=>{
      if(data.type==='init-error'){fail(data.error);return;}
      if(data.id!==request)return;
      if(data.type==='error'){fail(data.error);return;}
      if(data.type!=='result'||data.sequence!==sequence)return;
      clearTimeout(timeout);pending=false;prediction=data;$('scissors-fold-status').textContent='계산 완료 · 전체 서열의 접힘을 반영했습니다.';$('scissors-retry').hidden=true;
      renderView();renderGrade();
    });
    worker.addEventListener('error',()=>fail('접힘 계산기를 불러오지 못했습니다. 다시 시도해 주세요.'));
  }
  function predict(){
    clearTimeout(timeout);clearTimeout(debounce);cancelReaction();prediction=null;pending=true;const id=++request;
    $('scissors-fold-status').textContent='가위 RNA의 새로운 접힘을 계산하고 있습니다…';$('scissors-retry').hidden=true;
    if(molecule.nodes.length!==sequence.length+TARGET_LENGTH)renderView();else molecule.updateSequence(sequence+TARGET);renderSelection();renderGrade();
    debounce=setTimeout(()=>{worker.postMessage({type:'fold',id,sequence});timeout=setTimeout(()=>{if(id===request&&pending){++request;fail('계산이 지연됩니다. 아래 버튼으로 계산기를 다시 시작할 수 있습니다.');}},20000);},90);
  }
  function setSequence(next,{remember=true}={}){
    if(!validSequence(next))return;
    if(remember&&next!==sequence){history.push(sequence);if(history.length>80)history.shift();}
    clearTimeout(inputTimer);inputDirty=false;sequence=next;selected=Math.min(selected,sequence.length-1);view='current';announced='';save();$('scissors-input-error').textContent='';predict();
  }
  root.querySelectorAll('[data-scissors-base]').forEach(b=>b.addEventListener('click',()=>{setSequence(sequence.slice(0,selected)+b.dataset.scissorsBase+sequence.slice(selected+1));}));
  root.querySelectorAll('[data-scissors-view]').forEach(b=>b.addEventListener('click',()=>{cancelReaction();view=b.dataset.scissorsView;renderView();}));
  $('scissors-previous').addEventListener('click',()=>select(selected-1));$('scissors-next').addEventListener('click',()=>select(selected+1));
  $('scissors-undo').addEventListener('click',()=>{const previous=history.pop();if(previous)setSequence(previous,{remember:false});});
  $('scissors-reset').addEventListener('click',()=>{selected=0;setSequence(START);});
  $('scissors-apply').addEventListener('click',()=>{const next=$('scissors-input').value.toUpperCase().replace(/\s/g,'').replace(/T/g,'U');if(!validSequence(next)){$('scissors-input-error').textContent='가위 RNA를 A·U·G·C로 8~80개 입력하세요.';return;}setSequence(next);});
  $('scissors-input').addEventListener('input',()=>{inputDirty=true;cancelReaction();clearTimeout(inputTimer);clearTimeout(timeout);clearTimeout(debounce);++request;prediction=null;pending=false;renderGrade();inputTimer=setTimeout(()=>{const next=$('scissors-input').value.toUpperCase().replace(/\s/g,'').replace(/T/g,'U');if(validSequence(next))setSequence(next);else $('scissors-input-error').textContent='가위 RNA를 A·U·G·C로 8~80개 입력하세요.';},500);});
  $('scissors-retry').addEventListener('click',()=>{startWorker();predict();});
  $('scissors-zoom-in').addEventListener('click',()=>setZoom(zoom+.5));$('scissors-zoom-out').addEventListener('click',()=>setZoom(zoom-.5));$('scissors-zoom-fit').addEventListener('click',()=>setZoom(1));
  $('scissors-reaction').addEventListener('click',reaction);
  $('scissors-explanation').value=explanation;$('scissors-explanation').addEventListener('input',()=>{explanation=$('scissors-explanation').value;save();});
  $('scissors-share').addEventListener('click',async()=>{const p=new URLSearchParams({m:'scissors',v:'3',s:sequence}),url=new URL(location.href);url.hash=p.toString();try{await navigator.clipboard.writeText(url.href);$('scissors-notice').textContent='설계 링크를 복사했습니다.';}catch{location.hash=p.toString();$('scissors-notice').textContent='주소창의 설계 링크를 복사하세요.';}});
  $('scissors-download').addEventListener('click',()=>{const g=gradeScissors(sequence,prediction);if(!g.hasPrediction)return;const text=['RNA 구조 실험실 · 미션 5',`수업용 가상 표적(3′→5′): ${displayTarget}`,`가위 RNA 전체 서열: ${sequence}`,`예측 구조: ${prediction.structure}`,`자유에너지: ${prediction.energy} kcal/mol`,`구조 조건: ${g.solved?'성공':'설계 중'}`,`설명: ${explanation}`,'가위 RNA 단독 접힘 계산. 별도 표적에의 결합과 절단은 교육용 개념 연출.'].join('\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='RNA-미션5-설계결과.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  root.addEventListener('keydown',e=>{if(!active||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('textarea,input,select'))return;const k=e.key.toUpperCase();if(/^[ACGU]$/.test(k)){e.preventDefault();setSequence(sequence.slice(0,selected)+k+sequence.slice(selected+1));}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();select(selected+(e.key==='ArrowLeft'?-1:1));}});
  window.addEventListener('resize',()=>{if(active)setZoom(zoom);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelReaction();else if(active)renderView();});
  window.addEventListener('pagehide',e=>{if(!e.persisted)worker.terminate();});
  startWorker();
  return {
    open(params){active=true;cancelReaction();view='current';announced='';const shared=params?.get('s');if(params?.get('v')==='3'&&validSequence(shared)){sequence=shared;save();}else if(params?.has('d')||params?.has('t'))$('scissors-notice').textContent='이전 버전 링크입니다. 새 미션의 제공된 표적으로 시작합니다.';renderView();setZoom(zoom);predict();},
    close(){active=false;clearTimeout(inputTimer);cancelReaction();}
  };
}
