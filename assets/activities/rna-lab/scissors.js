import {TARGETS,INITIAL_DESIGN,COMPLEMENT,HAIRPIN_STRUCTURE,hairpinSequence,ribozymeSequence,validDesign,gradeScissors} from './scissors-model.js?v=5';
import {MoleculeView} from './molecule.js?v=5';

const NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
const fields=[['arm3','왼쪽 표적을 붙잡는 구간',6],['arm5','오른쪽 표적을 붙잡는 구간',6],['stem5','헤어핀의 앞쪽',4],['stem3','헤어핀의 뒤쪽',4]];
const fixed=(key,i)=>(key==='stem5'&&i===0)||(key==='stem3'&&i===3);
export function createScissors(root,onComplete){
  root.innerHTML=`
    <div class="scissors-intro"><p class="rna-kicker">DESIGN AN RNA SCISSOR</p><h2>내가 고른 RNA를 붙잡아 자르려면?</h2><p>리보자임은 화학 반응을 돕는 RNA입니다. 여기서는 <strong>다른 RNA를 자르는 가위</strong>를 설계합니다. 반응 핵심 부위는 주어지고, 표적을 붙잡는 두 구간과 헤어핀의 염기쌍을 직접 만듭니다.</p></div>
    <ol class="scissors-steps"><li><strong>1 · 표적 고르기</strong><span>어떤 단백질의 생산을 줄이고 싶은지 생각하세요.</span></li><li><strong>2 · 염기서열 설계하기</strong><span>표적과 짝을 이루는 두 구간, 염기쌍 4개의 헤어핀을 만드세요.</span></li><li><strong>3 · 확인하고 설명하기</strong><span>설계 조건을 확인하고, 자른 뒤 생길 변화를 설명하세요.</span></li></ol>
    <div class="scissors-target"><label class="rna-label" for="scissors-target">자를 표적 RNA</label><select id="scissors-target"></select><p id="scissors-purpose"></p><p class="rna-help">제공된 표적은 수업용 가상 서열입니다. 실제 유전자의 서열은 아닙니다.</p><div id="scissors-custom" hidden><label class="rna-label" for="scissors-custom-sequence">직접 정한 표적 · 5′ → 3′</label><input id="scissors-custom-sequence" maxlength="30" spellcheck="false" autocomplete="off" placeholder="예: ACAGGUCAUGCUA"><p class="rna-help">13개 염기로 입력하세요. 이 활동에서는 가운데 절단 부위를 GUC로 정합니다: 앞 4개 + GUC + 뒤 6개.</p><button id="scissors-custom-apply">표적으로 적용</button><p id="scissors-custom-error" role="alert"></p></div></div>
    <div class="scissors-grid"><section class="scissors-editor" aria-label="가위 RNA 설계"><h3>가위 RNA의 염기 선택</h3><p class="rna-help">모든 입력 서열은 5′ → 3′입니다. 그림에서는 표적과 반대 방향으로 놓입니다. ?를 누르고 A·U·G·C를 고르세요.</p><div id="scissors-fields"></div><p id="scissors-selected" aria-live="polite"></p><div class="scissors-palette" aria-label="가위 RNA의 선택 자리 바꾸기">${['A','U','G','C'].map(b=>`<button type="button" data-scissors-base="${b}" class="base-${b}">${b}</button>`).join('')}</div><div class="scissors-tools"><button id="scissors-next">다음 빈 자리</button><button id="scissors-clear">선택 자리 비우기</button><button id="scissors-reset">이 표적 설계 처음으로</button></div><details><summary>막히면 힌트 보기</summary><p>A–U, G–C가 짝을 이룹니다. 표적을 왼쪽부터 읽었다면, 입력할 가위 서열은 반대 순서로 생각하세요. 헤어핀 앞쪽과 뒤쪽도 서로 반대 방향입니다.</p></details><details><summary>주어진 반응 핵심 부위 보기</summary><p><code>CUGAUGA</code>와 <code>GAA</code> 사이에 헤어핀이 놓입니다. 헤어핀의 첫 G–C 염기쌍과 고리 부분 GAAA도 제공됩니다. 이 핵심 부위는 바꾸지 않습니다.</p><p>가위 전체 서열 · 5′ → 3′</p><code id="scissors-full-sequence"></code></details></section>
    <section class="scissors-observation"><h3>표적과 가위는 서로 다른 RNA 가닥입니다</h3><p class="rna-help">파랑: 표적 RNA · 초록: 가위 RNA · 주황: 표적에서 잘릴 결합. 초록 점선은 맞는 짝, 붉은 표시는 맞지 않는 짝입니다.</p><div class="scissors-diagram-scroll"><svg id="scissors-diagram" viewBox="0 0 720 460" role="img" aria-label="표적 RNA와 가위 RNA의 결합 설계도"></svg></div><p class="scissors-caption">결합 설계도입니다. 두 RNA의 실제 접힘이나 입체 구조를 계산한 그림은 아닙니다.</p><details id="scissors-fold-panel"><summary>내 헤어핀의 예측 구조 확인</summary><p id="scissors-fold-status" role="status"></p><div class="rna-stage scissors-hairpin"><svg id="scissors-hairpin" viewBox="0 0 700 440" role="group" aria-label="가위를 지탱하는 헤어핀의 예측 2차 구조"></svg></div><p class="rna-help">헤어핀 12개 염기만 따로 계산합니다. 가위 전체나 표적과의 결합을 예측한 결과는 아닙니다.</p></details></section></div>
    <section id="scissors-summary" class="mission-summary" aria-label="RNA 가위 설계 조건" aria-live="polite"><strong id="scissors-grade-title"></strong><ul id="scissors-checks" class="grading-checks"></ul><p id="scissors-grade-detail"></p></section>
    <div class="scissors-result-actions"><button id="scissors-reaction" disabled>설계 조건 완성 후 절단 모형 보기</button><button id="scissors-share">설계 링크 복사</button><button id="scissors-download">설계 결과 저장</button><span id="scissors-notice" role="status"></span></div>
    <section id="scissors-products" class="scissors-products" hidden><h3>표적 RNA만 두 조각으로 나뉩니다</h3><p>절단이 일어났을 때의 개념도입니다. 실제 반응을 계산하거나 실험한 결과는 아닙니다.</p><div id="scissors-product-sequences"></div><p>가위 RNA는 이 반응에서 잘리지 않습니다. 잘린 mRNA에서는 단백질 생산이 줄어들 수 있지만, 세포 안에서의 효과는 별도로 확인해야 합니다.</p></section>
    <label class="rna-label" for="scissors-explanation">나의 설계 설명</label><textarea id="scissors-explanation" rows="3" maxlength="1500" placeholder="무엇을 자르려고 했나요? 두 결합 구간과 헤어핀은 어떤 역할을 하나요? 자른 뒤 어떤 변화가 생길까요?"></textarea><p class="rna-help">설명은 이 기기의 브라우저에 저장됩니다. 링크로 공유할 때는 서열만 포함되며, 결과 파일에는 설명도 포함됩니다.</p>
    <details class="scissors-background"><summary>실제 리보자임과 이 활동의 관계</summary><p>다른 RNA를 자르도록 설계한 해머헤드 리보자임을 단순화한 활동입니다. 두 결합 구간은 표적을 붙잡고, 반응 핵심 부위와 헤어핀은 절단에 필요한 배치를 돕습니다. 세 방향의 염기쌍 형성 구간 중 두 개는 서로 다른 RNA 사이에 생깁니다.</p><p>채점은 표적과의 A–U·G–C 짝, 핵심 부위 유지, 헤어핀 단독의 예측 구조를 확인합니다. 이 활동에서 정한 6쌍·4쌍·GUC 조건은 수업용 설계 조건입니다. 실제 기능에는 두 RNA의 전체 접힘, 정확한 입체 배치와 이온 조건, 실험 검증이 필요합니다.</p><p><a href="https://doi.org/10.1038/334585a0" target="_blank" rel="noopener noreferrer">표적 RNA 가위의 설계 연구 ↗</a> · <a href="https://doi.org/10.1186/1471-2105-8-469" target="_blank" rel="noopener noreferrer">구조와 절단 활성 연구 ↗</a></p></details>`;
  const $=id=>root.querySelector('#'+id);
  let target=TARGETS[0],d={...INITIAL_DESIGN},selection=['arm3',0],prediction=null,request=0,engineReady=false,timeout;
  const worker=new Worker(new URL('./fold-worker.js',import.meta.url));
  const molecule=new MoleculeView($('scissors-hairpin'),i=>{if(i<4)select('stem5',i);else if(i>=8)select('stem3',i-8);});
  const drafts={};let explanation='',initialized=false;
  try{const saved=JSON.parse(localStorage.getItem('rna-scissors-v1'));if(saved?.drafts)Object.assign(drafts,saved.drafts);}catch{}
  function save(){drafts[target.id]={design:{...d},explanation,target};try{localStorage.setItem('rna-scissors-v1',JSON.stringify({drafts}));}catch{}}
  function select(key,i){if(fixed(key,i))return;selection=[key,i];render();}
  function nextBlank(){const slots=fields.flatMap(([key,,n])=>Array.from({length:n},(_,i)=>[key,i])).filter(([k,i])=>!fixed(k,i));const start=slots.findIndex(([k,i])=>k===selection[0]&&i===selection[1]);for(let n=1;n<=slots.length;n++){const slot=slots[(start+n)%slots.length];if(d[slot[0]][slot[1]]==='N'){selection=slot;break;}}render();}
  function renderFields(){
    $('scissors-fields').replaceChildren();
    for(const [key,label,n] of fields){const group=document.createElement('div');group.className='scissors-field';const title=document.createElement('p');title.textContent=label+' · 5′ → 3′';group.append(title);for(let i=0;i<n;i++){const b=document.createElement('button');const locked=fixed(key,i);b.type='button';b.textContent=d[key][i]==='N'?'?':d[key][i];b.disabled=locked;b.className='scissors-slot';b.setAttribute('aria-label',`${label} ${i+1}번`+` · ${d[key][i]==='N'?'빈 자리':d[key][i]}${locked?' · 고정':''}`);b.setAttribute('aria-pressed',String(selection[0]===key&&selection[1]===i));b.addEventListener('click',()=>select(key,i));group.append(b);} $('scissors-fields').append(group);}
    const [key,i]=selection;$('scissors-selected').textContent=`선택: ${fields.find(f=>f[0]===key)[1]} ${i+1}번`;
    root.querySelectorAll('[data-scissors-base]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scissorsBase===d[key][i])));
    $('scissors-clear').disabled=d[key][i]==='N';$('scissors-next').disabled=!ribozymeSequence(d).includes('N');
    $('scissors-full-sequence').textContent=ribozymeSequence(d);
  }
  function diagram(grade){
    const svg=$('scissors-diagram');svg.replaceChildren();
    const text=(x,y,t,cls='')=>svg.append(svgEl('text',{x,y,class:cls},t));
    const path=(points,cls)=>svg.append(svgEl('path',{d:points,class:cls,fill:'none'}));
    text(25,35,'표적 RNA · 5′ → 3′','target-label');text(25,205,'가위 RNA · 아래 가닥은 3′ ← 5′','enzyme-label');
    const seq=target.left+target.cut+target.right;
    path('M 75 82 H 645','target-backbone');
    path('M 75 155 H 300 Q 323 155 323 225 L 323 300 M 397 300 L 397 225 Q 397 155 420 155 H 645','enzyme-backbone');
    for(let i=0;i<13;i++){
      const x=90+i*45;svg.append(svgEl('circle',{cx:x,cy:82,r:16,class:'target-base'}));text(x,87,seq[i],'diagram-base');
      if(i===6)continue;
      const left=i<6,index=left?5-i:12-i,key=left?'arm3':'arm5',base=d[key][index],ok=left?grade.arm3Pairs[i]:grade.arm5Pairs[i-7];
      path(`M ${x} 100 V 137`,base==='N'?'unfilled-pair':ok?'good-pair':'bad-pair');
      svg.append(svgEl('circle',{cx:x,cy:155,r:16,class:'enzyme-base'+(selection[0]===key&&selection[1]===index?' diagram-selected':'')}));text(x,160,base==='N'?'?':base,'diagram-base');
    }
    text(61,87,'5′','direction');text(671,87,'3′','direction');text(61,160,'3′','direction');text(671,160,'5′','direction');
    path('M 382 51 V 104','cut-position');text(440,45,'C 바로 뒤 결합 절단','cut-label');
    svg.append(svgEl('rect',{x:260,y:230,width:200,height:42,rx:12,class:'core-box'}));text(360,255,'반응 핵심 부위 · 고정','core-label');
    path('M 323 300 V 390 Q 360 457 397 390 V 300','enzyme-backbone');
    for(let i=0;i<4;i++){
      const y=300+i*29,ok=grade.stemPairs[i];path(`M 340 ${y} H 380`,d.stem5[i]==='N'||d.stem3[3-i]==='N'?'unfilled-pair':ok?'good-pair':'bad-pair');
      for(const [x,b,key,index] of [[323,d.stem5[i],'stem5',i],[397,d.stem3[3-i],'stem3',3-i]]){svg.append(svgEl('circle',{cx:x,cy:y,r:13,class:'enzyme-base'+(selection[0]===key&&selection[1]===index?' diagram-selected':'')}));text(x,y+5,b==='N'?'?':b,'diagram-base');}
    }
    text(360,429,'G A A A','loop-label');text(510,330,'헤어핀','enzyme-label');text(510,354,'염기쌍 4개 + 고리 염기 4개','diagram-note');
    svg.setAttribute('aria-label',`${target.name}: 표적 ${seq}, 가위의 왼쪽 결합 ${grade.arm3Pairs.filter(Boolean).length}/6쌍, 오른쪽 결합 ${grade.arm5Pairs.filter(Boolean).length}/6쌍. C 다음 결합을 자르는 설계도.`);
  }
  function render(){
    const grade=gradeScissors(target,d,prediction);renderFields();diagram(grade);
    $('scissors-summary').classList.toggle('solved',grade.solved);$('scissors-summary').dataset.solved=String(grade.solved);
    $('scissors-grade-title').textContent=grade.solved?'✓ 표적 RNA 가위의 설계 조건을 완성했습니다!':'표적 결합과 헤어핀 구조를 확인하세요';
    $('scissors-checks').replaceChildren();
    for(const [ok,label] of [[grade.complete,'빈 자리 모두 채우기'],[grade.leftOk,`왼쪽 표적 결합 ${grade.arm3Pairs.filter(Boolean).length}/6쌍`],[grade.rightOk,`오른쪽 표적 결합 ${grade.arm5Pairs.filter(Boolean).length}/6쌍`],[grade.stemOk,`헤어핀 염기쌍 ${grade.stemPairs.filter(Boolean).length}/4쌍`],[grade.hairpinOk,'헤어핀 단독의 예측 구조 일치'],[true,'주어진 반응 핵심 부위 유지']]){const li=document.createElement('li');li.textContent=`${ok?'✓':'○'} ${label}`;li.classList.toggle('passed',ok);$('scissors-checks').append(li);}
    $('scissors-grade-detail').textContent=grade.solved?'표적을 붙잡는 두 구간과 헤어핀 조건을 만족하는 후보입니다. 실제 절단 가능성은 입체 구조와 실험으로 확인해야 합니다.':!grade.leftOk||!grade.rightOk?'표적과 반대 방향으로 놓였을 때 A–U, G–C가 마주 보도록 두 결합 구간을 바꿔 보세요.':!grade.stemOk?'헤어핀 앞쪽과 뒤쪽이 반대 방향으로 짝을 이루도록 바꿔 보세요.':'헤어핀 단독의 예측 구조가 염기쌍 4개와 고리 염기 4개를 유지하는지 확인하세요.';
    $('scissors-reaction').disabled=!grade.solved;$('scissors-reaction').textContent=grade.solved?'표적이 잘린 뒤의 모형 보기':'설계 조건 완성 후 절단 모형 보기';
    if(!grade.solved)$('scissors-products').hidden=true;
    if(grade.solved)onComplete();
  }
  function predict(){
    clearTimeout(timeout);const seq=hairpinSequence(d);const id=++request;prediction=null;$('scissors-products').hidden=true;
    if(seq.includes('N')){$('scissors-fold-status').textContent='헤어핀의 빈 자리를 모두 채우면 구조를 자동으로 예측합니다.';molecule.show({sequence:seq,structure:HAIRPIN_STRUCTURE,selected:1,locked:[0,4,5,6,7,11]});render();return;}
    $('scissors-fold-status').textContent=engineReady?'헤어핀 단독의 구조를 계산하고 있습니다…':'계산기를 준비하고 있습니다…';render();
    worker.postMessage({type:'fold',id,sequence:seq});
    timeout=setTimeout(()=>{if(request===id&&!prediction){++request;$('scissors-fold-status').textContent='계산이 지연됩니다. 헤어핀 염기를 다시 선택하거나 페이지를 새로고침하세요.';render();}},20000);
  }
  function loadTarget(next,{useSavedTarget=true}={}){
    if(initialized)save();target=next;const draft=drafts[target.id];if(useSavedTarget&&target.id==='custom'&&draft?.target&&/^[ACGU]{4}GUC[ACGU]{6}$/.test(draft.target.left+draft.target.cut+draft.target.right))target={...target,...draft.target};d=validDesign(draft?.design)?{...draft.design}:{...INITIAL_DESIGN};explanation=typeof draft?.explanation==='string'?draft.explanation.slice(0,1500):'';selection=['arm3',0];initialized=true;
    $('scissors-explanation').value=explanation;$('scissors-purpose').textContent=target.purpose;$('scissors-target').value=target.id;$('scissors-custom').hidden=target.id!=='custom';
    $('scissors-custom-sequence').value=target.id==='custom'?target.left+target.cut+target.right:'';
    $('scissors-notice').textContent='';save();predict();
  }
  for(const item of [...TARGETS,{id:'custom',name:'내가 정한 표적 RNA'}]){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;$('scissors-target').append(option);}
  $('scissors-target').addEventListener('change',()=>loadTarget(TARGETS.find(t=>t.id===$('scissors-target').value)||{...TARGETS[0],id:'custom',name:'내가 정한 표적 RNA',purpose:'자를 RNA와 절단 후 기대하는 변화를 직접 정하세요.'}));
  $('scissors-custom-apply').addEventListener('click',()=>{const s=$('scissors-custom-sequence').value.toUpperCase().replace(/\s/g,'').replace(/T/g,'U');if(!/^[ACGU]{4}GUC[ACGU]{6}$/.test(s)){$('scissors-custom-error').textContent='13개 염기와 가운데 GUC를 확인하세요: 앞 4개 + GUC + 뒤 6개.';return;}$('scissors-custom-error').textContent='';save();target={...target,left:s.slice(0,6),cut:'C',right:s.slice(7)};save();predict();});
  root.querySelectorAll('[data-scissors-base]').forEach(b=>b.addEventListener('click',()=>{const [key,i]=selection;const wasBlank=d[key][i]==='N';d[key]=d[key].slice(0,i)+b.dataset.scissorsBase+d[key].slice(i+1);save();if(key.startsWith('stem'))predict();else{render();$('scissors-products').hidden=true;}if(wasBlank)nextBlank();}));
  $('scissors-next').addEventListener('click',nextBlank);
  $('scissors-clear').addEventListener('click',()=>{const [key,i]=selection;d[key]=d[key].slice(0,i)+'N'+d[key].slice(i+1);save();if(key.startsWith('stem'))predict();else render();});
  $('scissors-reset').addEventListener('click',()=>{d={...INITIAL_DESIGN};selection=['arm3',0];save();predict();});
  $('scissors-explanation').addEventListener('input',()=>{explanation=$('scissors-explanation').value;save();});
  $('scissors-reaction').addEventListener('click',()=>{if(!gradeScissors(target,d,prediction).solved)return;$('scissors-products').hidden=!$('scissors-products').hidden;$('scissors-product-sequences').replaceChildren();for(const [label,seq] of [['앞 조각 · 7개 염기',target.left+target.cut],['뒤 조각 · 6개 염기',target.right]]){const box=document.createElement('div');const title=document.createElement('strong');title.textContent=label;const code=document.createElement('code');code.textContent='5′—'+seq+'—3′';box.append(title,code);$('scissors-product-sequences').append(box);}});
  $('scissors-share').addEventListener('click',async()=>{const p=new URLSearchParams({m:'scissors',t:target.id,d:[d.arm5,d.arm3,d.stem5,d.stem3].join('-')});if(target.id==='custom')p.set('target',target.left+target.cut+target.right);const url=new URL(location.href);url.hash=p.toString();try{await navigator.clipboard.writeText(url.href);$('scissors-notice').textContent='표적과 설계 서열의 링크를 복사했습니다.';}catch{location.hash=p.toString();$('scissors-notice').textContent='주소창에 설계 링크를 표시했습니다. 주소를 복사하세요.';}});
  $('scissors-download').addEventListener('click',()=>{const grade=gradeScissors(target,d,prediction);const text=['표적 RNA 가위 설계',`표적: ${target.name}`,`표적 서열(5′→3′): ${target.left+target.cut} | ${target.right}`,`가위 서열(5′→3′): ${ribozymeSequence(d)}`,`왼쪽 표적 결합 구간(5′→3′): ${d.arm3}`,`오른쪽 표적 결합 구간(5′→3′): ${d.arm5}`,`헤어핀 단독 서열: ${hairpinSequence(d)}`,`헤어핀 단독 예측 구조: ${prediction?.structure||'미확인'}`,`설계 조건: ${grade.solved?'완성':'수정 필요'}`,`나의 설계 설명: ${explanation}`,'표적 결합은 상보성 검사이며, 두 RNA 전체의 접힘과 실제 절단 활성을 예측하지 않습니다.','근거: https://doi.org/10.1038/334585a0'].join('\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='표적-RNA-가위-설계.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  worker.addEventListener('message',({data})=>{if(data.type==='ready'){engineReady=true;return;}if(data.type==='init-error'){$('scissors-fold-status').textContent=data.error;return;}if(data.id!==request)return;clearTimeout(timeout);if(data.type==='result'){prediction=data;molecule.show({sequence:data.sequence,structure:data.structure,selected:1,locked:[0,4,5,6,7,11]});$('scissors-fold-status').textContent=`헤어핀 단독 예측: ${data.structure===HAIRPIN_STRUCTURE?'목표 구조와 같습니다':'목표 구조와 다릅니다'} · ${data.energy.toFixed(2)} kcal/mol · 37 °C`;}else{$('scissors-fold-status').textContent=data.error;}render();});
  worker.addEventListener('error',()=>{clearTimeout(timeout);++request;prediction=null;$('scissors-fold-status').textContent='계산기를 불러오지 못했습니다. 새로고침해 주세요.';render();});
  window.addEventListener('pagehide',e=>{if(!e.persisted)worker.terminate();});
  return {open(params){
    let next=TARGETS.find(t=>t.id===params?.get('t'))||TARGETS[0];const custom=params?.get('target');if(params?.get('t')==='custom'&&/^[ACGU]{4}GUC[ACGU]{6}$/.test(custom||''))next={...TARGETS[0],id:'custom',name:'내가 정한 표적 RNA',purpose:'자를 RNA와 절단 후 기대하는 변화를 직접 정하세요.',left:custom.slice(0,6),cut:'C',right:custom.slice(7)};
    loadTarget(next,{useSavedTarget:!custom});const values=params?.get('d')?.split('-');if(values?.length===4){const shared={arm5:values[0],arm3:values[1],stem5:values[2],stem3:values[3]};if(validDesign(shared)){d=shared;save();predict();}}
  }};
}
