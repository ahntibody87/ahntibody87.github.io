import {validateResult} from './tertiary-core.js?v=2';
import {inspectGeometry,viewerAtoms,PART_COLORS} from './tertiary-geometry.js?v=2';
import {buildSchematic} from './tertiary-schematic.js';
import {MODEL_VERSION} from './rnabpflow-math.js';

const COLORS={A:'#b28b35',U:'#ad6175',G:'#416f99',C:'#4a8868'};
let viewerLibrary;
function library(){return viewerLibrary??=new Promise((resolve,reject)=>{
  if(window.$3Dmol)return resolve();const script=document.createElement('script');script.src='/assets/home/vendor/3Dmol-2.5.5.min.js';script.onload=resolve;
  script.onerror=()=>{viewerLibrary=null;script.remove();reject(Error('입체 표시기를 불러오지 못했습니다.'));};document.head.append(script);
});}
function saveFile(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function cache(mode,value){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('rna-lab-3d',1);r.onupgradeneeded=()=>r.result.createObjectStore('results',{keyPath:'sequence'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('results',mode==='get'?'readonly':'readwrite'),store=tx.objectStore('results'),r=mode==='get'?store.get(value):store.put(value);let result;
    r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);
    if(mode==='put'){const all=store.getAll();all.onsuccess=()=>all.result.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).slice(5).forEach(row=>store.delete(row.sequence));}
  });}finally{db.close();}
}
// Teaching display policy is separate from the stricter geometry report.
// Small local imperfections remain visible. Gross damage uses the component model,
// retaining calculated coordinates in details / saved JSON for inspection.
export function displayPolicy(q,n){
  return q.missingAtoms>n||q.unexpectedAtoms>n||q.severeBonds>Math.max(6,n*.3)||q.severeClashes>Math.max(12,n*2)||q.chirality>Math.max(3,n*.2)||q.severePlanarity>Math.max(3,n*.2)?'schematic':q.eligible?'prediction':'caution';
}
export function createTertiary(root,{getSequence,onSelect}){
  root.innerHTML=`<span class="rna-kicker">RNA IN 3D · 내 기기에서 계산</span>
    <h2>내 RNA를 입체로 살펴보기</h2>
    <p>2차 구조의 줄기와 고리를 입체 모형으로 살펴보고, RNAbpFlow로 실제 원자 좌표를 예측해 보세요.</p>
    <div class="tertiary-actions"><button class="rna-primary" id="rna-3d-run" disabled>RNAbpFlow로 예측하기</button><button id="rna-3d-stop" hidden>계산 중단</button></div>
    <p class="tertiary-note">API 키 없이 이 브라우저에서 계산 · 첫 예측 시 모델·계산기 약 78 MiB 다운로드 · 기기에 따라 수십 초~수 분</p>
    <p id="rna-3d-status" class="tertiary-status" role="status" aria-live="polite">2차 구조를 계산하면 입체 모형이 나타납니다.</p>
    <progress id="rna-3d-progress" class="tertiary-progress" max="1" hidden></progress>
    <div id="rna-3d-result" class="tertiary-pane tertiary-single" hidden>
      <div class="tertiary-model-heading"><h3 id="rna-3d-title"></h3><span class="tertiary-badge" id="rna-3d-kind"></span></div>
      <p id="rna-3d-explanation" class="tertiary-note"></p>
      <div class="tertiary-viewer" id="rna-3d-viewer" aria-label="회전·확대 가능한 RNA 입체 모형"></div>
      <p class="tertiary-note">드래그: 회전 · 휠/두 손가락: 확대 · 누르면 같은 번호의 뉴클레오타이드를 선택합니다.</p>
      <div class="tertiary-actions"><button id="rna-3d-fit">전체 보기</button><label>표시 <select id="rna-3d-representation"><option value="all">골격과 염기</option><option value="backbone">당–인산 골격만</option></select></label><label id="rna-3d-pair-control"><input id="rna-3d-pairs" type="checkbox">염기쌍 연결 보기</label></div>
      <div class="tertiary-legend tertiary-parts" aria-label="구성 성분 색상"><span><i style="background:${PART_COLORS.sugar}"></i>당</span><span><i style="background:${PART_COLORS.phosphate}"></i>인산</span>${Object.entries(COLORS).map(([b,c])=>`<span><i style="background:${c}"></i>염기 ${b}</span>`).join('')}</div>
      <p id="rna-3d-selected" class="tertiary-selected"></p>
      <p class="tertiary-note">굵은 당–인산 골격을 5′에서 3′ 방향으로 따라가 보세요.</p>
    </div>
    <details class="tertiary-details"><summary>계산 정보와 결과 파일</summary>
      <p id="rna-3d-meta" class="tertiary-note"></p><p id="rna-3d-quality" class="tertiary-note"></p>
      <div class="tertiary-actions"><button id="rna-3d-switch" hidden>계산된 원자 좌표 살펴보기</button><button id="rna-3d-save" disabled>결과 파일 저장</button><button id="rna-3d-pdb" disabled>원자 좌표 저장</button></div>
      <p class="tertiary-sequence" id="rna-3d-sequence"></p>
      <label>저장한 결과 열기 <input id="rna-3d-file" class="tertiary-file" type="file" accept=".json,application/json"></label>
      <p class="tertiary-note">단일 결과를 50단계로 계산합니다. 현재 2차 구조의 염기쌍 정보를 RNAbpFlow에 입력합니다. 모델은 구조의 정확도를 보증하지 않으며, 8~29개 염기는 원 모델의 학습 길이보다 짧습니다. 신뢰도 점수는 제공하지 않습니다.</p>
      <p class="tertiary-note">작은 이상은 안내와 함께 표시합니다. 크게 무너진 예측 대신 2차 구조 기반 모형을 보여주며, 계산된 원자 좌표도 여기서 확인하거나 저장할 수 있습니다. 입체 모형의 크기와 연결선은 교육용 표현입니다. 원자 좌표나 실제 접힘 경로가 아닙니다.</p>
      <p class="tertiary-note">최근 5개 결과를 이 브라우저에 보관합니다. 서열은 계산 서버로 보내지 않습니다. <a href="https://github.com/Bhattacharya-Lab/RNAbpFlow" target="_blank" rel="noopener">RNAbpFlow</a> · <a href="/assets/activities/rna-lab/TERTIARY-NOTICE.md" target="_blank" rel="noopener">출처·검증 기록</a></p>
    </details>`;
  const $=name=>root.querySelector('#rna-3d-'+name);
  let applied='',secondary=null,shown=null,prediction=null,viewer=null,worker=null,epoch=0,renderId=0,busy=false,timer=null,selected=0,wasDirty=false;
  const dirty=()=>getSequence()!==applied;
  const status=message=>{$('status').textContent=message;};
  function state(){
    $('run').disabled=busy||dirty()||!secondary||!/^[ACGU]{8,120}$/.test(applied);$('stop').hidden=!busy;
    $('save').disabled=!shown||dirty()||busy;$('pdb').disabled=!prediction||dirty()||busy;
    $('switch').hidden=!prediction;$('switch').disabled=busy||dirty();$('switch').textContent=shown?.format==='rna-lab-schematic-v1'?'계산된 원자 좌표 살펴보기':'2차 구조 기반 모형으로 보기';
  }
  function stop(message){epoch++;worker?.terminate();worker=null;busy=false;clearTimeout(timer);$('progress').hidden=true;state();if(message)status(message);}
  function modelData(){return shown?.format==='rna-lab-schematic-v1'?shown.atoms:shown?viewerAtoms(shown.residues).atoms:[];}
  function fit(){if(viewer){viewer.resize();viewer.zoomTo();viewer.zoom($('viewer').clientWidth<500 ? .65 : .88);viewer.render();}}
  function colors(){
    if(!viewer||!shown)return;viewer.setStyle({},{});
    const colorfunc=atom=>PART_COLORS[atom.properties.part]||COLORS[atom.resn.trim()]||'#879ba3';
    for(const [part,radius,sphere] of [['sugar',.21,.22],['phosphate',.23,.38],['base',.12,.15]]){
      if(part==='base'&&$('representation').value==='backbone')continue;
      viewer.setStyle({properties:{part}},{stick:{radius,colorfunc},sphere:{radius:sphere,colorfunc}});
    }
    viewer.removeAllShapes();
    if(shown.format==='rna-lab-schematic-v1'&&$('pairs').checked&&$('representation').value!=='backbone')for(const [a,b] of shown.pairs){
      const p=shown.baseCenters[a],q=shown.baseCenters[b];viewer.addLine({start:{x:p[0],y:p[1],z:p[2]},end:{x:q[0],y:q[1],z:q[2]},color:'#759995',dashed:true});
    }
    viewer.render();
  }
  function label(text,p,extra={}){if(p)viewer.addLabel(text,{position:{x:p[0],y:p[1],z:p[2]},backgroundColor:'#294c55',fontSize:13,...extra});}
  function select(index,atom){
    selected=index;if(!shown||dirty()||index<0||index>=applied.length)return;
    const schematic=shown.format==='rna-lab-schematic-v1',part=atom?{sugar:'당',phosphate:'인산',base:'염기'}[atom.properties.part]:null;
    $('selected').textContent=`${index+1}번 ${applied[index]}${part?' · '+part:''} · 2D와 입체 화면에서 같은 뉴클레오타이드`;
    if(viewer){viewer.removeAllLabels();
      const first=schematic?shown.poses[0].center:shown.residues[0].atoms.P||shown.residues[0].atoms["O5'"],last=schematic?shown.poses.at(-1).center:shown.residues.at(-1).atoms["O3'"];
      label('5′',first);label('3′',last);label(`${index+1} ${applied[index]}`,schematic?shown.poses[index].center:shown.residues[index].atoms["C1'"],{backgroundColor:'#6a6c4c'});viewer.render();
    }
  }
  async function display(data){
    shown=data;const revision=++renderId,schematic=data.format==='rna-lab-schematic-v1';
    $('result').hidden=dirty();$('title').textContent=schematic?'2차 구조를 접어 본 입체 모형':'RNAbpFlow의 예측 입체 구조';$('kind').textContent=schematic?'교육용 모형':'원자 좌표 예측';
    $('explanation').textContent=schematic?'줄기는 오른나선으로, 고리는 연결 관계에 따라 배치한 교육용 모형입니다. 실제 원자 좌표를 예측한 결과가 아닙니다.':data.quality.eligible?'예측한 원자 좌표입니다. 기본 구조 검사는 실제 접힘의 정확성을 보증하지 않습니다.':'결합이나 원자 충돌에 이상이 있는 예측입니다. 참고용으로 살펴보세요. 심하게 늘어난 결합선은 생략합니다.';
    $('pair-control').hidden=!schematic;$('sequence').textContent='적용된 서열: '+applied;state();
    $('meta').textContent=prediction?`${prediction.model} · ${applied.length}개 염기${Number.isFinite(prediction.seconds)?' · 계산 '+Math.round(prediction.seconds)+'초':''}`:'2차 구조 기반 입체 모형 · 원자 좌표와 Å 단위를 사용하지 않습니다.';
    const q=prediction?.quality;$('quality').textContent=q?`계산된 좌표 검사: 골격 이상 ${q.breaks} · 당 고리 ${q.sugarOutliers} · 당–염기 연결 ${q.glycosidicOutliers} · 원자 충돌 ${q.clashes} (심한 충돌 ${q.severeClashes})${prediction.refinement?.applied?' · 작은 기하 보정 적용':''}`:'';
    try{
      await library();if(revision!==renderId||dirty()||shown!==data)return;
      viewer??=window.$3Dmol.createViewer($('viewer'),{backgroundColor:'#f0f5f6'});
      viewer.removeAllModels();viewer.removeAllLabels();viewer.removeAllShapes();viewer.addModel().addAtoms(modelData());
      viewer.setClickable({},true,atom=>{const index=schematic?atom.resi-1:data.residues.findIndex(r=>r.number===atom.resi&&r.chain===atom.chain);if(index>=0){onSelect(index);select(index,atom);}});
      colors();if(schematic){viewer.rotate(18,'x');viewer.rotate(24,'y');}fit();select(Math.min(selected,applied.length-1));
    }catch(error){status(error.message+' 결과 파일은 저장할 수 있습니다.');}
  }
  function schematic(){if(secondary)return buildSchematic(applied,secondary);return null;}
  function savedResult(){
    const compact=p=>{if(!p)return;const {format,sequence,pdb,rawPdb,model,settings,seconds,refinement,savedAt}=p;return {format,sequence,pdb,rawPdb,model,settings,seconds,refinement,savedAt};};
    return shown?.format==='rna-lab-schematic-v1'?{format:shown.format,sequence:applied,structure:secondary,model:shown.model,savedAt:Date.now(),prediction:compact(prediction)}:compact(prediction);
  }
  function parsePrediction(data){const p=validateResult(data,applied);return {...p,quality:inspectGeometry(p.residues)};}
  async function acceptPrediction(data){
    prediction=parsePrediction(data);const current=prediction,policy=displayPolicy(prediction.quality,applied.length);
    await display(policy==='schematic'?schematic():prediction);if(prediction!==current||dirty())return;
    status(policy==='schematic'?'원자 좌표에 큰 이상이 있어 입체 모형을 유지합니다. 계산한 좌표는 ‘계산 정보와 결과 파일’에 보관했습니다.':policy==='caution'?'예측 완료 · 일부 구조 이상이 있습니다. 안내와 함께 살펴보세요.':'예측 완료 · 당–인산 골격과 염기를 살펴보세요.');
  }
  $('run').onclick=()=>{
    if(busy||dirty()||!secondary)return;stop();busy=true;state();const request=epoch,seq=applied,structure=secondary;
    $('progress').hidden=false;$('progress').removeAttribute('value');status('RNAbpFlow 계산기를 준비합니다…');
    worker=new Worker(new URL('./tertiary-worker.js?v=3',import.meta.url),{type:'module'});
    worker.onmessage=async({data})=>{
      if(request!==epoch||data.id!==epoch||data.sequence!==applied||secondary!==structure)return;
      if(data.type==='status')status(data.message);
      if(data.type==='download'){$('progress').value=data.loaded/data.total;status(`예측 모델 다운로드 · ${Math.round(data.loaded/1048576)} / ${Math.round(data.total/1048576)} MiB`);}
      if(data.type==='progress'){$('progress').value=data.value;status(`RNAbpFlow로 접힘 계산 중 · ${Math.round(data.value*100)}%`);}
      if(data.type==='error')stop('예측을 완료하지 못했습니다. 현재 입체 모형은 계속 살펴볼 수 있습니다. '+data.message);
      if(data.type==='complete'){
        stop();const completed=epoch;
        try{await acceptPrediction({format:'rna-lab-3d-v1',sequence:seq,...data,savedAt:Date.now()});if(epoch===completed&&!dirty())await cache('put',savedResult()).catch(()=>{});}
        catch(error){status('예측 좌표를 표시하지 못했습니다. 현재 모형을 유지합니다. '+error.message);}
      }
    };
    worker.onerror=()=>stop('계산기를 실행하지 못했습니다. 현재 모형은 계속 살펴볼 수 있습니다.');worker.postMessage({type:'fold',id:request,sequence:seq,structure});
    timer=setTimeout(()=>stop('계산이 오래 걸려 중단했습니다. 현재 모형은 계속 살펴볼 수 있습니다.'),1200000);
  };
  $('stop').onclick=()=>stop('계산을 중단했습니다. 현재 모형은 계속 살펴볼 수 있습니다.');
  $('representation').onchange=colors;$('pairs').onchange=colors;$('fit').onclick=fit;
  $('switch').onclick=()=>display(shown?.format==='rna-lab-schematic-v1'?prediction:schematic());
  $('save').onclick=()=>{if(shown&&!dirty())saveFile('RNA-입체-결과.json',JSON.stringify(savedResult(),null,2),'application/json');};
  $('pdb').onclick=()=>{if(prediction&&!dirty())saveFile('RNA-예측-원자좌표.pdb',prediction.pdb,'chemical/x-pdb');};
  $('file').onchange=async()=>{
    const file=$('file').files[0];if(!file)return;
    try{
      if(dirty()||!secondary)throw Error('입력한 서열을 먼저 적용하세요.');if(file.size>2000000)throw Error('2 MB 이하의 결과 파일을 선택하세요.');
      stop();const request=epoch,data=JSON.parse(await file.text());if(epoch!==request)return;
      if(data.format==='rna-lab-schematic-v1'){
        if(data.sequence!==applied||data.structure!==secondary)throw Error('현재 서열·2차 구조와 같은 모형 파일을 선택하세요.');
        const model=buildSchematic(applied,secondary),p=data.prediction?parsePrediction(data.prediction):null;prediction=p;await display(model);status('입체 모형 파일을 열었습니다.');
      }else{await acceptPrediction(data);}
    }catch(error){status(error.message);}finally{$('file').value='';}
  };
  let viewWidth=0;new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(viewer){if(Math.abs(width-viewWidth)>.5)fit();else{viewer.resize();viewer.render();}}viewWidth=width;}).observe($('viewer'));
  new IntersectionObserver(entries=>root.closest('.rna-lab')?.classList.toggle('rna-3d-in-view',entries[0].isIntersecting&&!root.hidden),{threshold:.1}).observe($('viewer'));
  window.addEventListener('pagehide',()=>stop());
  return {select,update(sequence,structure,free=true){
    root.hidden=!free;if(!free){if(busy)stop();return;}
    const changed=sequence!==applied||(structure&&structure!==secondary);
    if(changed){
      stop();renderId++;applied=sequence;secondary=structure;shown=null;prediction=null;$('result').hidden=true;state();
      if(structure){display(schematic());status('2차 구조 기반 모형입니다. RNAbpFlow 예측도 시작할 수 있습니다.');
        const current=epoch;cache('get',sequence).then(data=>{if(current!==epoch||busy||dirty()||prediction)return;const p=data?.format==='rna-lab-schematic-v1'?data.prediction:data;if(p?.settings?.engine===MODEL_VERSION&&p.settings.secondary===secondary)acceptPrediction(p).catch(()=>{});}).catch(()=>{});
      }else status('2차 구조를 계산하면 입체 모형이 나타납니다.');
    }
    if(dirty()){if(busy)stop();renderId++;$('result').hidden=true;wasDirty=true;status('서열을 수정했습니다. 먼저 ‘서열 적용하기’를 누르세요.');}
    else if(shown){$('result').hidden=false;if(!viewer||wasDirty){display(shown);status('적용된 서열의 입체 구조입니다.');}wasDirty=false;}
    state();
  }};
}
