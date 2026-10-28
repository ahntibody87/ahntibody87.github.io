import {geometricPairs,dotPairs,comparePairs,validateResult} from './tertiary-core.js?v=2';
import {inspectGeometry,viewerAtoms,atomPart,PART_COLORS,QUALITY_VERSION} from './tertiary-geometry.js?v=2';

const COLORS={A:'#b28b35',U:'#ad6175',G:'#416f99',C:'#4a8868'},NS='http://www.w3.org/2000/svg';
let viewerLibrary;
function library(){return viewerLibrary??=new Promise((resolve,reject)=>{
  if(window.$3Dmol)return resolve();
  const script=document.createElement('script');script.src='/assets/home/vendor/3Dmol-2.5.5.min.js';script.onload=resolve;
  script.onerror=()=>{viewerLibrary=null;script.remove();reject(Error('입체 구조 표시기를 불러오지 못했습니다.'));};document.head.append(script);
});}
function svgNode(tag,attrs){const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);return node;}
function saveFile(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function cache(mode,value){
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('rna-lab-3d',1);request.onupgradeneeded=()=>request.result.createObjectStore('results',{keyPath:'sequence'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('results',mode==='get'?'readonly':'readwrite'),store=tx.objectStore('results');
    const request=mode==='get'?store.get(value):store.put(value);let result;
    request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);
    if(mode==='put'){const all=store.getAll();all.onsuccess=()=>all.result.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).slice(5).forEach(r=>store.delete(r.sequence));}
  });}finally{db.close();}
}
function qualityText(q){return `골격 ${q.breaks} · 당 ${q.sugarOutliers} · 당–염기 ${q.glycosidicOutliers} · 염기 ${q.baseOutliers} · 인산 ${q.phosphateOutliers} · 충돌 ${q.clashes}`;}

export function createTertiary(root,{getSequence,onSelect}){
  root.innerHTML=`
    <span class="rna-kicker">TERTIARY STRUCTURE · 내 기기에서 계산</span>
    <h2>내 RNA를 입체로 살펴보기 · 실험적 예측</h2>
    <p>같은 서열로 세 후보를 계산하고, 결합과 원자 충돌을 검사해 표시할 구조를 고릅니다.</p>
    <div class="tertiary-actions"><button class="rna-primary" id="rna-3d-run">3차 구조 예측하기</button><button id="rna-3d-stop" hidden>계산 중단</button><button id="rna-3d-save" disabled>결과 파일 저장</button><button id="rna-3d-pdb" disabled>3D 좌표 저장</button></div>
    <p class="tertiary-note">첫 실행 시 모델 약 266 MiB 다운로드 · WebGPU 지원 기기 필요 · 후보 3개를 계산하므로 이전보다 오래 걸립니다. 서열은 계산 서버로 보내지 않습니다.</p>
    <p id="rna-3d-status" class="tertiary-status" role="status" aria-live="polite">서열을 적용한 뒤 예측을 시작하세요.</p>
    <progress id="rna-3d-progress" class="tertiary-progress" max="1" hidden></progress>
    <p id="rna-3d-warning" class="tertiary-warning" role="status" hidden></p>
    <details id="rna-3d-candidates" hidden><summary>후보별 구조 검사</summary><p class="tertiary-note">통과는 기본적인 구조 검사 결과이며, 실제 접힘의 정확성을 뜻하지 않습니다. 숫자는 이상이 발견된 결합 또는 원자쌍 수입니다.</p><div id="rna-3d-candidate-list" class="tertiary-candidates"></div></details>
    <div id="rna-3d-result" hidden>
      <p id="rna-3d-meta" class="tertiary-note"></p>
      <div class="tertiary-panes">
        <section class="tertiary-pane"><h3>예측 3차 구조</h3>
          <div class="tertiary-viewer" id="rna-3d-viewer" aria-label="회전·확대 가능한 RNA 예측 입체 구조"></div>
          <p class="tertiary-note">드래그: 회전 · 휠/두 손가락: 확대 · 원자를 누르면 같은 번호의 염기를 선택합니다.</p>
          <div class="tertiary-actions"><button id="rna-3d-fit">전체 보기</button>
            <label>색상 <select id="rna-3d-color"><option value="components">당·인산·염기 구분</option><option value="confidence">예측 신뢰도</option></select></label>
            <label>표시 <select id="rna-3d-representation"><option value="all">골격과 염기</option><option value="backbone">당–인산 골격만</option></select></label>
          </div>
          <div id="rna-3d-parts" class="tertiary-legend tertiary-parts" aria-label="구성 성분 색상">
            <span><i style="background:${PART_COLORS.sugar}"></i>당: 청회색</span><span><i style="background:${PART_COLORS.phosphate}"></i>인산: 주황</span>
            ${Object.entries(COLORS).map(([b,c])=>`<span><i style="background:${c}"></i>염기 ${b}</span>`).join('')}
          </div>
          <p id="rna-3d-selected" class="tertiary-selected"></p>
          <p id="rna-3d-confidence" class="tertiary-note" hidden>파랑: 높음 · 청록 · 노랑 · 주황: 낮음. 보정 전 모델의 신뢰도이며 정답 확률이 아닙니다.</p>
          <p class="tertiary-note">굵은 당–인산 결합을 5′에서 3′ 방향으로 따라가 보세요. 염기 사이의 수소 결합은 이 입체 화면에서 막대로 표시하지 않습니다.</p>
        </section>
        <section class="tertiary-pane"><h3>두 예측의 염기쌍 비교</h3>
          <svg id="rna-3d-arc" class="tertiary-arc" viewBox="0 0 700 330" role="group" aria-label="위쪽은 빠른 2차 예측, 아래쪽은 3차 좌표의 염기쌍 후보"></svg>
          <div class="tertiary-legend"><span><i class="tertiary-dot" style="background:#327469"></i>공통</span><span><i class="tertiary-dot" style="background:#84939e"></i>2차 예측에만</span><span><i class="tertiary-dot" style="background:#c88443"></i>3D 후보에만</span></div>
          <p id="rna-3d-compare"></p><p class="tertiary-note">3D 후보는 원자 간 거리와 염기 평면으로 찾은 A–U·G–C·G–U 짝입니다. 후보가 없다고 실제 염기쌍이 없는 것은 아닙니다.</p>
          <div class="tertiary-quality"><strong>표시한 구조의 검사</strong><p id="rna-3d-quality"></p><p id="rna-3d-refinement" class="tertiary-note"></p></div>
        </section>
      </div><p class="tertiary-sequence" id="rna-3d-sequence"></p>
    </div>
    <details><summary>다른 기기에서 계산한 결과 열기</summary><p>같은 염기서열을 적용한 뒤 이 실험실에서 저장한 JSON 결과를 열 수 있습니다. 예전 결과도 새 기준으로 다시 검사합니다.</p><label>RNA 실험실 결과 파일 <input id="rna-3d-file" class="tertiary-file" type="file" accept=".json,application/json"></label></details>
    <details><summary>예측의 범위와 모델 정보</summary><p>RoseTTAFold3 / LocalFold int5 · 단일 RNA 서열 · 진화적 서열 정렬과 구조 주형 없음. 2차 구조는 독립적으로 예측하며, 후보 선별 기준으로 강제하지 않습니다.</p><p>후보마다 확산 계산 200단계 · 재순환 설정 1 · seed 0·1·2. 심한 연결 이상·충돌이 있는 후보는 제외합니다. 가벼운 기하 보정은 각 원자를 최대 약 0.3 Å 이내로 움직이며 실제 분자 운동이나 새 접힘 예측이 아닙니다.</p><p>실제 공유결합표에 있는 결합만 표시하며, 길이가 심하게 비정상적인 결합은 선으로 잇지 않습니다. 최근 5개 결과를 이 브라우저에 보관합니다.</p><p><a href="https://github.com/sokrypton/localfold" target="_blank" rel="noopener">LocalFold</a> · <a href="/assets/activities/rna-lab/TERTIARY-NOTICE.md" target="_blank" rel="noopener">출처·검사 기준</a></p></details>`;
  const $=id=>root.querySelector('#rna-3d-'+id);
  let applied='',secondary=null,result=null,viewer=null,worker=null,id=0,busy=false,timer=null,selected=0,candidateReports=[];
  function status(message){$('status').textContent=message;}
  function state(){const dirty=getSequence()!==applied;$('run').disabled=busy||dirty||!/^[ACGU]{8,120}$/.test(applied);$('stop').hidden=!busy;$('save').disabled=!result||dirty||busy;$('pdb').disabled=!result||dirty||busy;}
  function stop(message){id++;worker?.terminate();worker=null;busy=false;clearTimeout(timer);$('progress').hidden=true;state();if(message)status(message);}
  function showCandidates(reports){
    candidateReports=reports;$('candidates').hidden=!reports.length;
    const list=$('candidate-list');list.replaceChildren();
    for(const report of reports.filter(r=>r&&Number.isInteger(r.seed)&&(r.error||r.quality))){const row=document.createElement('p');row.className='tertiary-candidate';
      row.textContent=report.error?`후보 ${report.seed+1}: 계산하지 못했습니다.`:`후보 ${report.seed+1}: ${report.quality.eligible?'통과':'미통과'} · ${qualityText(report.quality)} · 심한 충돌 ${report.quality.severeClashes} · 당 입체배치 ${report.quality.chirality} · 심한 평면 이상 ${report.quality.severePlanarity} · 빠진 원자 ${report.quality.missingAtoms}${result?.settings?.seed===report.seed?' · 선택됨':''}`;
      list.append(row);
    }
  }
  function color(){
    if(!viewer||!result)return;viewer.setStyle({},{});
    const confidence=$('color').value==='confidence';
    const colorfunc=atom=>confidence?(atom.b>=90?'#236ac9':atom.b>=70?'#65cbe5':atom.b>=50?'#f0d35b':'#e69248'):(PART_COLORS[atomPart(atom.atom)]||COLORS[atom.resn.trim()]||'#879ba3');
    for(const [part,radius,sphere] of [['sugar',.21,.22],['phosphate',.23,.31],['base',.12,.15]]){
      if(part==='base'&&$('representation').value==='backbone')continue;
      viewer.setStyle({properties:{part}},{stick:{radius,colorfunc},sphere:{radius:sphere,colorfunc}});
    }
    $('confidence').hidden=!confidence;$('parts').hidden=confidence;viewer.render();
  }
  function addLabel(text,point,extra={}){if(point)viewer.addLabel(text,{position:{x:point[0],y:point[1],z:point[2]},backgroundColor:'#243b42',fontSize:13,...extra});}
  function select(index,atom){
    selected=index;if(!result)return;const residue=result.residues[index];if(!residue)return;
    const part=atom?{sugar:'당',phosphate:'인산',base:'염기'}[atomPart(atom.atom)]:null;
    $('selected').textContent=`${index+1}번 ${residue.base} · ${part?`${part} ${atom.atom} · `:''}2D와 3D에서 같은 뉴클레오타이드`;
    if(viewer){viewer.removeAllLabels();const first=result.residues[0],last=result.residues.at(-1);
      addLabel('5′',first.atoms.P||first.atoms["O5'"],{backgroundColor:'#587986'});addLabel('3′',last.atoms["O3'"],{backgroundColor:'#587986'});
      addLabel(`${index+1} ${residue.base}`,residue.atoms["C1'"]);viewer.render();
    }
  }
  function comparison(){
    if(!result)return;
    const three=geometricPairs(result.residues),two=secondary?dotPairs(secondary):[],c=comparePairs(two,three),svg=$('arc');svg.replaceChildren();
    const n=applied.length,x=i=>25+i*650/(n-1),keys=new Set(c.shared.map(p=>p.join(':')));
    for(const [label,y] of [['빠른 2차 예측',20],['3차 좌표에서 찾은 후보',320]]){const t=svgNode('text',{x:20,y,fill:'#536a71','font-size':14});t.textContent=label;svg.append(t);}
    for(const [pairs,sign,baseColor] of [[two,-1,'#84939e'],[three,1,'#c88443']])for(const [i,j] of pairs){const h=Math.min(130,20+(j-i)*110/n),p=svgNode('path',{d:`M ${x(i)} 165 Q ${(x(i)+x(j))/2} ${165+sign*h*2} ${x(j)} 165`,fill:'none',stroke:keys.has([i,j].join(':'))?'#327469':baseColor,'stroke-width':2});const title=svgNode('title',{});title.textContent=`${i+1}–${j+1}`;p.append(title);svg.append(p);}
    for(let i=0;i<n;i++){
      const g=svgNode('g',{role:'button',tabindex:0,'aria-label':`${i+1}번 ${applied[i]} 선택`});g.append(svgNode('circle',{cx:x(i),cy:165,r:Math.max(2,Math.min(8,250/n)),fill:COLORS[applied[i]]}));
      const choose=()=>{select(i);onSelect(i);};g.addEventListener('click',choose);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});svg.append(g);
      if(i===0||i===n-1||(i+1)%10===0){const t=svgNode('text',{x:x(i),y:189,'text-anchor':'middle','font-size':11,fill:'#536a71'});t.textContent=i+1;svg.append(t);}
    }
    $('compare').textContent=secondary?`공통 ${c.shared.length}쌍 · 2차 예측에만 ${c.only2d.length}쌍 · 3D 후보에만 ${c.only3d.length}쌍`:'빠른 2차 계산이 끝나면 함께 비교합니다.';
  }
  function exportResult(){const {sequence,pdb,rawPdb,model,settings,seconds,refinement,candidates,savedAt}=result;return {format:'rna-lab-3d-v1',sequence,pdb,rawPdb,model,settings,seconds,refinement,candidates,savedAt};}
  async function display(data,source){
    const current=id,parsed=validateResult(data,applied),quality=inspectGeometry(parsed.residues),rendered={...parsed,quality};result=rendered;
    $('result').hidden=false;$('meta').textContent=`${data.model} · ${applied.length}개 염기 · ${source}${Number.isFinite(data.seconds)?` · 총 ${Math.round(data.seconds)}초`:''}`;$('sequence').textContent='예측에 사용한 서열: '+applied;
    $('warning').hidden=quality.eligible;$('warning').textContent='이 파일의 좌표는 구조 검사를 통과하지 못했습니다. 참고용으로만 표시하며 비정상적인 결합은 선으로 잇지 않습니다. '+qualityText(quality);
    $('quality').textContent=(quality.eligible?'기본 검사 통과 · ':'검사 미통과 · ')+qualityText(quality)+` · 당 입체배치 이상 ${quality.chirality} · 결합각 이상 ${quality.angleOutliers} · 염기 평면 이상 ${quality.nonplanarBases} · 빠진 원자 ${quality.missingAtoms}`;
    $('refinement').textContent=data.refinement?.applied&&Number.isFinite(data.refinement.maxDisplacement)?`가벼운 기하 보정 적용 · 최대 이동 ${data.refinement.maxDisplacement.toFixed(3)} Å. 보정 전 좌표도 결과 JSON에 보관합니다. 구조 검사 통과가 실제 접힘의 정확성을 보장하지 않습니다.`:'구조 검사 통과가 실제 접힘의 정확성을 보장하지 않습니다.';
    comparison();showCandidates(Array.isArray(data.candidates)?data.candidates:[]);state();
    try{
      await library();if(current!==id||result!==rendered||getSequence()!==applied)return;
      if(!viewer)viewer=window.$3Dmol.createViewer($('viewer'),{backgroundColor:'#f0f5f6'});
      viewer.removeAllModels();viewer.removeAllLabels();
      const model=viewer.addModel(),explicit=viewerAtoms(parsed.residues);model.addAtoms(explicit.atoms);
      viewer.setClickable({},true,atom=>{const i=parsed.residues.findIndex(r=>r.number===atom.resi&&r.chain===atom.chain);if(i>=0){onSelect(i);select(i,atom);}});
      color();viewer.zoomTo();viewer.zoom(.85);viewer.resize();select(Math.min(selected,applied.length-1));
    }catch(e){status(e.message+' 결과 파일 저장은 가능합니다.');}
  }
  $('run').onclick=()=>{
    if(getSequence()!==applied||busy)return;stop();result=null;$('result').hidden=true;$('warning').hidden=true;showCandidates([]);busy=true;state();$('progress').hidden=false;$('progress').removeAttribute('value');
    const request=id,sequence=applied;status('그래픽 장치와 예측 모델을 준비합니다…');worker=new Worker(new URL('./tertiary-worker.js?v=2',import.meta.url),{type:'module'});
    worker.onmessage=async({data})=>{
      if(data.id!==id||data.sequence!==applied)return;
      if(data.type==='status')status(data.message);
      if(data.type==='download'&&data.total>0){$('progress').value=data.loaded/data.total;status(`모델 다운로드 ${Math.round(data.loaded/1048576)} / ${Math.round(data.total/1048576)} MiB`);}
      if(data.type==='progress'){$('progress').value=data.value;status(`구조 후보 ${data.candidate}/${data.total} 계산 중 · 전체 ${Math.round(data.value*100)}%`);}
      if(data.type==='candidate')showCandidates([...candidateReports,data.candidate]);
      if(data.type==='error')stop(data.message);
      if(data.type==='rejected'){stop(data.message);result=null;state();showCandidates(data.candidates);$('candidates').open=true;$('warning').hidden=false;$('warning').textContent='표시할 구조를 얻지 못했습니다. 세 후보의 검사 결과를 확인해 보세요. 결합선을 강제로 이어서 보완하지 않습니다.';}
      if(data.type==='complete'){
        stop();const saved={format:'rna-lab-3d-v1',sequence,pdb:data.pdb,rawPdb:data.rawPdb,model:data.model,settings:data.settings,seconds:data.seconds,refinement:data.refinement,candidates:data.candidates,savedAt:Date.now()};
        try{await display(saved,'이 기기에서 예측');if(request!==id-1||getSequence()!==sequence)return;status('세 후보 검사 완료 · 기본 검사를 통과한 구조를 표시합니다.');await cache('put',exportResult()).catch(()=>{});}
        catch(e){result=null;$('result').hidden=true;state();status(e.message);}
      }
    };
    worker.onerror=e=>stop('계산기를 실행하지 못했습니다. '+e.message);worker.postMessage({type:'fold',id:request,sequence});
    timer=setTimeout(()=>stop('계산 시간이 20분을 넘어 중단했습니다. 더 짧은 서열로 시도하세요.'),1200000);
  };
  $('stop').onclick=()=>stop('계산을 중단했습니다.');$('color').onchange=color;$('representation').onchange=color;$('fit').onclick=()=>{viewer?.zoomTo();viewer?.zoom(.85);viewer?.render();};
  $('save').onclick=()=>{if(result)saveFile('RNA-3D-결과.json',JSON.stringify(exportResult(),null,2),'application/json');};
  $('pdb').onclick=()=>{if(result)saveFile('RNA-예측구조.pdb',result.pdb,'chemical/x-pdb');};
  $('file').onchange=async()=>{
    const file=$('file').files[0];if(!file)return;const seq=applied;if(getSequence()!==seq){status('입력한 서열을 먼저 적용하세요.');return;}if(file.size>2000000){status('2 MB 이하의 결과 파일을 선택하세요.');return;}
    stop();const request=id;try{const data=JSON.parse(await file.text());if(id!==request)return;validateResult(data,seq);await display(data,'불러온 파일 · 출처는 파일의 기록');status(result.quality.eligible?'결과 파일을 열고 구조를 다시 검사했습니다.':'결과 파일을 열었습니다. 구조 검사 미통과 안내를 확인하세요.');}catch(e){status(e.message);}finally{$('file').value='';}
  };
  new ResizeObserver(()=>{viewer?.resize();viewer?.render();}).observe($('viewer'));window.addEventListener('pagehide',()=>stop());
  new IntersectionObserver(entries=>root.closest('.rna-lab')?.classList.toggle('rna-3d-in-view',entries[0].isIntersecting&&!root.hidden),{threshold:.1}).observe($('viewer'));
  return {select,update(sequence,structure,free=true){
    root.hidden=!free;if(!free){if(busy)stop('자유 실험실에서 3D 예측을 시작할 수 있습니다.');return;}secondary=structure;
    if(sequence!==applied){
      stop();applied=sequence;result=null;$('result').hidden=true;$('warning').hidden=true;showCandidates([]);status('적용된 서열로 세 개의 3차 구조 후보를 예측할 수 있습니다.');
      const current=id;cache('get',sequence).then(data=>{
        if(data&&id===current&&!busy&&!result&&getSequence()===sequence&&data.settings?.qualityVersion===QUALITY_VERSION){const parsed=validateResult(data,sequence);if(inspectGeometry(parsed.residues).eligible)display(data,'이 브라우저에 저장된 결과').catch(e=>status(e.message));}
      }).catch(()=>{});
    }
    state();if(getSequence()!==applied){if(busy)stop();$('result').hidden=true;status('서열을 수정했습니다. 먼저 ‘서열 적용하기’를 누르세요.');}else if(result){$('result').hidden=false;comparison();}
  }};
}
