import {AMINO_ACIDS,GROUPS,PRESETS} from './amino-acids.js';
import {cleanSequence,mutationPositions,parsePdb,compareResidues,transformPdb} from './core.js';

const $=id=>document.getElementById('pl-'+id);
const root=document.getElementById('protein-lab');
let currentAA='G',filter='all',worker=null,busy=false,result=null,history=[],selected=[],foldViewer=null,compareViewer=null,comparison=null;
const slots={a:null,b:null};let toastTimer;
const aaByCode=Object.fromEntries(AMINO_ACIDS.map(a=>[a.code,a]));
const say=text=>{$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);};
const error=(id,text)=>{$(id).textContent=text??'';$(id).hidden=!text;};
const download=(name,text,type='text/plain')=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
const currentSeq=()=>{try{return cleanSequence($('sequence').value);}catch{return null;}};

function showPanel(name,focus=false){
  for(const tab of root.querySelectorAll('[data-panel]')){
    const active=tab.dataset.panel===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    $('panel-'+tab.dataset.panel).hidden=!active;if(active&&focus)tab.focus();
  }
  requestAnimationFrame(()=>{foldViewer?.resize();foldViewer?.render();compareViewer?.resize();compareViewer?.render();if(name==='learn')drawFormula();});
}
const tabs=[...root.querySelectorAll('[data-panel]')];
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>showPanel(tab.dataset.panel));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%3;if(e.key==='ArrowLeft')n=(i+2)%3;if(e.key==='Home')n=0;if(e.key==='End')n=2;if(n!==undefined){e.preventDefault();showPanel(tabs[n].dataset.panel,true);}});});

function aminoGrid(){
  $('amino-grid').replaceChildren();
  for(const aa of AMINO_ACIDS.filter(a=>filter==='all'||a.group===filter)){
    const button=document.createElement('button');button.className='pl-amino';button.dataset.code=aa.code;
    button.style.setProperty('--aa-color',GROUPS[aa.group].color);button.setAttribute('aria-pressed',String(aa.code===currentAA));button.setAttribute('aria-label',`${aa.name}, ${aa.three}, ${aa.code}`);
    const big=document.createElement('b');big.textContent=aa.code;const three=document.createElement('span');three.textContent=aa.three;const name=document.createElement('small');name.textContent=aa.name;
    button.append(big,three,name);button.addEventListener('click',()=>chooseAA(aa.code));$('amino-grid').append(button);
  }
}
function chooseAA(code){
  currentAA=code;const aa=aaByCode[code],group=GROUPS[aa.group];
  $('amino-detail').style.setProperty('--aa-color',group.color);
  for(const [id,text] of Object.entries({'aa-english':aa.english.toUpperCase(),'aa-name':aa.name,'aa-code':code,'aa-three':aa.three,'aa-one':code,'aa-group':group.label,'aa-charge':aa.code==='H'?'중성 우세 · 일부 양전하':group.charge,'aa-detail':aa.detail,'aa-side':aa.side}))$(id).textContent=text;
  root.querySelectorAll('.pl-amino').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.code===code)));drawFormula();
}
function drawFormula(){
  const aa=aaByCode[currentAA];$('aa-svg').setAttribute('aria-label',`${aa.name}의 비이온형 구조식`);
  if(!window.SmilesDrawer)return;
  try{
    const width=Math.max(240,Math.floor($('aa-formula').clientWidth));
    const drawer=new SmilesDrawer.SvgDrawer({width,height:220,bondThickness:1.4,bondLength:22,fontSizeLarge:13,fontSizeSmall:9,padding:22,terminalCarbons:false});
    SmilesDrawer.parse(aa.smiles,tree=>{drawer.draw(tree,'pl-aa-svg','light');$('aa-svg').setAttribute('role','img');$('aa-svg').setAttribute('aria-label',`${aa.name}의 비이온형 구조식`);},e=>{console.error('Structure formula:',e);say('구조식을 그리지 못했습니다. 다시 아미노산을 선택해 주세요.');});
  }catch(e){console.error('Amino acid drawing',e);}
}
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;root.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(filter!=='all'&&aaByCode[currentAA].group!==filter)chooseAA(AMINO_ACIDS.find(a=>a.group===filter).code);aminoGrid();});

for(const p of PRESETS){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;$('preset').append(o);}
const preset=()=>PRESETS.find(p=>p.id===$('preset').value);
function setSequence(seq,remember=true){if(remember)history.push($('sequence').value);$('sequence').value=seq;selected=[];updateSequence();}
function updateSequence(){
  const raw=$('sequence').value.replace(/^>.*$/gm,'').replace(/\s/g,'').toUpperCase();
  $('length').textContent=raw.length+' aa';$('undo').disabled=history.length===0;
  $('sequence-strip').replaceChildren();const original=preset().sequence;
  if(/^[ACDEFGHIKLMNPQRSTVWY]*$/.test(raw)&&raw.length<=256){
    [...raw].forEach((letter,i)=>{const b=document.createElement('button');b.className='pl-residue';if(selected.includes(i+1))b.classList.add('selected');if(original.length===raw.length&&original[i]!==letter)b.classList.add('changed');b.textContent=letter;b.title=`${i+1} · ${aaByCode[letter].name}`;b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(selected.includes(i+1)));if(i%10===0){const n=document.createElement('span');n.className='pl-pos';n.textContent=i+1;b.append(n);}
      b.addEventListener('click',()=>{const at=selected.indexOf(i+1);if(at>=0)selected.splice(at,1);else selected.push(i+1);selected.sort((a,b)=>a-b);$('mutation').value=selected.join(', ');updateSequence();if(result&&currentSeq()===result.sequence&&foldViewer){foldViewer.removeAllLabels();foldViewer.addLabel(`${i+1} ${letter}`,{position:foldViewer.getModel().selectedAtoms({atom:'CA'})[i],backgroundColor:'#203f49',fontColor:'white',fontSize:12});foldViewer.render();}});$('sequence-strip').append(b);});
  }
  $('sequence-selection').textContent=selected.length?`${selected.length}개 위치 선택 · ${selected.join(', ')}`:'잔기를 눌러 위치를 선택하세요.';
  const stale=result&&currentSeq()!==result.sequence;$('panel-fold').classList.toggle('pl-stale',!!stale);
  if(result){$('model-title').textContent=stale?'서열이 바뀌었습니다 · 다시 예측 필요':result.name;
    $('save-a').disabled=$('save-b').disabled=!!stale||busy;
  }
}
$('preset').addEventListener('change',()=>{setSequence(preset().sequence);$('preset-note').textContent=preset().note;});
$('sequence').addEventListener('input',()=>{selected=[];updateSequence();});
$('sequence').addEventListener('beforeinput',()=>{if(history.at(-1)!==$('sequence').value)history.push($('sequence').value);if(history.length>50)history.shift();});
$('undo').addEventListener('click',()=>{if(history.length){$('sequence').value=history.pop();selected=[];updateSequence();}});
$('reset').addEventListener('click',()=>setSequence(preset().sequence));
$('apply-pro').addEventListener('click',()=>{try{const seq=cleanSequence($('sequence').value),pos=mutationPositions($('mutation').value,seq.length);setSequence([...seq].map((c,i)=>pos.includes(i+1)?'P':c).join(''));selected=pos;updateSequence();error('input-error',null);say(`${pos.length}개 위치를 프롤린(P)으로 치환했습니다.`);}catch(e){error('input-error',e.message);}});

function getViewer(which){
  if(!window.$3Dmol)throw Error('3D 뷰어를 준비하지 못했습니다. 페이지를 새로 열어 주세요.');
  const key=which==='fold'?'fold-viewer':'compare-viewer';
  const v=$3Dmol.createViewer($(key),{backgroundColor:'#142933',antialias:true});v.setProjection('orthographic');return v;
}
function plddtColor(atom){const b=atom.b;return b>=90?'#0053d6':b>=70?'#65cbf3':b>=50?'#ffdb13':'#ff7d45';}
function renderFold(){
  if(!result)return;try{
    foldViewer??=getViewer('fold');foldViewer.removeAllModels();foldViewer.removeAllLabels();foldViewer.addModel(result.pdb,'pdb');styleFold();foldViewer.zoomTo();foldViewer.render();$('stage-empty').hidden=true;
  }catch(e){error('input-error',e.message);}
}
function styleFold(){
  if(!foldViewer||!result)return;
  let color=$('color').value;const cartoon=color==='spectrum'?{color:'spectrum'}:color==='secondary'?{colorscheme:'ssPyMol'}:result.plddt?{colorfunc:plddtColor}:{color:'spectrum'};
  foldViewer.setStyle({},{cartoon});if($('sidechains').checked)foldViewer.addStyle({},{stick:{radius:.12,colorscheme:'Jmol'}});foldViewer.render();$('confidence-legend').hidden=color!=='confidence'||!result.plddt;
}
$('color').addEventListener('change',styleFold);$('sidechains').addEventListener('change',styleFold);
$('fit-view').addEventListener('click',()=>{foldViewer?.zoomTo();foldViewer?.render();});

function setBusy(state){
  busy=state;$('fold').disabled=state;$('cancel').hidden=!state;$('sequence').disabled=state;$('preset').disabled=state;$('apply-pro').disabled=state;$('reset').disabled=state;$('undo').disabled=state||!history.length;$('load-pdb').disabled=state;
  $('save-a').disabled=$('save-b').disabled=state||!result||currentSeq()!==result.sequence;
}
function finishPrediction(data){
  const p=preset(),name=data.sequence===p.sequence?p.name:`${p.name.split(' · ')[0]} · 편집 서열`;
  result={...data,name};$('model-title').textContent=name;$('panel-fold').classList.remove('pl-stale');
  $('count-metric').textContent=data.sequence.length+' aa';$('confidence-metric').textContent=Number.isFinite(data.meanPlddt)?data.meanPlddt.toFixed(1):'—';$('ptm-metric').textContent=Number.isFinite(data.ptm)?data.ptm.toFixed(3):'—';
  $('result-note').textContent=`${data.model} · ${(data.elapsed/1000).toFixed(1)}초 · pLDDT와 pTM은 예측 신뢰도이며 안정성 측정값이 아닙니다.`;
  $('download').disabled=false;$('color').value='confidence';renderFold();$('status').textContent='예측을 완료했습니다.';$('progress').value=1;$('progress-text').textContent='완료';setBusy(false);
}
function failFold(message){setBusy(false);error('input-error',message);$('status').textContent='예측을 완료하지 못했습니다.';$('progress-text').textContent='중단';worker?.terminate();worker=null;}
function createWorker(){
  const w=new Worker(new URL('./engine-worker.js',import.meta.url),{type:'module'});
  w.onmessage=({data})=>{
    if(data.type==='phase'){$('status').textContent=data.text;$('progress').removeAttribute('value');$('progress-text').textContent='';}
    if(data.type==='download'){const mib=n=>(n/1048576).toFixed(0);$('progress-text').textContent=`${mib(data.loaded)} / ${mib(data.total)} MiB`;$('progress').value=data.total?data.loaded/data.total:0;}
    if(data.type==='progress'){$('status').textContent='입체 구조와 신뢰도를 계산하고 있습니다.';$('progress').value=Math.min(.99,Math.max(0,data.value));$('progress-text').textContent=Math.round(data.value*100)+'%';}
    if(data.type==='complete')finishPrediction(data);
    if(data.type==='error')failFold(data.message);
    if(data.type==='device-lost'&&busy)failFold('그래픽 장치 연결이 끊겼습니다. 다른 그래픽 작업을 줄인 뒤 다시 시도해 주세요.');
    if(data.type==='gpu-error'){console.error('Protein GPU:',data.message);if(busy)failFold('이 기기에서 예측 계산에 문제가 생겼습니다. '+data.message.slice(0,200));}
  };
  w.onerror=e=>failFold('예측 엔진을 실행하지 못했습니다. '+(e.message||''));return w;
}
$('fold').addEventListener('click',()=>{
  try{const sequence=cleanSequence($('sequence').value);if(!navigator.gpu)throw Error('이 브라우저는 WebGPU를 지원하지 않습니다. 최신 Chrome·Edge에서 열어 주세요. PDB 파일 관찰·비교는 사용할 수 있습니다.');
    error('input-error',null);setBusy(true);$('progress-box').hidden=false;$('status').textContent='그래픽 장치와 예측 모델을 준비합니다.';$('progress').removeAttribute('value');$('progress-text').textContent='';worker??=createWorker();worker.postMessage({type:'fold',sequence});
  }catch(e){error('input-error',e.message);setBusy(false);}
});
$('cancel').addEventListener('click',()=>{worker?.terminate();worker=null;setBusy(false);$('status').textContent='계산을 중단했습니다. 내려받은 모델 캐시는 유지됩니다.';$('progress-text').textContent='중단';});
$('download').addEventListener('click',()=>{if(result)download('protein-prediction.pdb',result.pdb,'chemical/x-pdb');});
$('go-compare').addEventListener('click',()=>showPanel('compare'));

function loadSlot(key,record){
  const parsed=parsePdb(record.pdb);slots[key]={...record,parsed};const select=$(key+'-chain');select.replaceChildren();
  for(const [chain,residues] of parsed.chains){const o=document.createElement('option');o.value=chain;o.textContent=`${chain.trim()||'(이름 없음)'} · ${residues.length} aa`;select.append(o);}
  select.disabled=false;$(key+'-name').textContent=record.name;invalidateComparison();$('compare').disabled=!slots.a||!slots.b;
}
function invalidateComparison(){comparison=null;$('export-csv').disabled=true;$('compare-status').textContent=slots.a&&slots.b?'두 구조가 준비되었습니다. 비교를 시작하세요.':'접힘 예측 결과를 담거나 PDB 파일 두 개를 선택하세요.';$('distance-panel').hidden=true;$('rmsd').textContent=$('tm-score').textContent=$('aligned-count').textContent=$('change-count').textContent='—';compareViewer?.removeAllModels();compareViewer?.removeAllLabels();compareViewer?.render();$('compare-empty').hidden=false;}
for(const key of ['a','b']){
  $('save-'+key).addEventListener('click',()=>{if(!result||currentSeq()!==result.sequence)return;try{loadSlot(key,{...result});say(`현재 예측 결과를 비교 ${key.toUpperCase()}에 담았습니다.`);}catch(e){error('input-error',e.message);}});
  $(key+'-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>8_000_000)throw Error('8 MB 이하의 PDB 파일을 사용하세요.');loadSlot(key,{pdb:await file.text(),name:file.name,model:'불러온 PDB · 예측 조건 미확인'});error('compare-error',null);}catch(e){error('compare-error',e.message);}finally{e.target.value='';}});
  $(key+'-chain').addEventListener('change',invalidateComparison);
}
$('load-pdb').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;try{if(file.size>8_000_000)throw Error('8 MB 이하의 PDB 파일을 사용하세요.');const pdb=await file.text(),parsed=parsePdb(pdb),chain=[...parsed.chains.values()][0];
    result={pdb,name:file.name,sequence:chain.map(r=>r.one).join(''),model:'불러온 PDB',plddt:null};$('sequence').value=result.sequence;updateSequence();$('model-title').textContent=file.name;$('count-metric').textContent=result.sequence.length+' aa';$('confidence-metric').textContent=$('ptm-metric').textContent='—';$('result-note').textContent='PDB 파일을 불러왔습니다. 표시된 서열은 첫 사슬이며, 구조 뷰어에는 파일의 사슬들이 함께 보일 수 있습니다. 신뢰도는 자동으로 가정하지 않습니다.';$('color').value='spectrum';$('download').disabled=false;$('save-a').disabled=$('save-b').disabled=false;renderFold();error('input-error',null);
  }catch(e){error('input-error',e.message);}finally{e.target.value='';}
});

function styleCompare(){
  if(!compareViewer||!comparison)return;compareViewer.setStyle({model:0},$('show-a').checked?{cartoon:{color:'#54c7b1'}}:{});compareViewer.setStyle({model:1},$('show-b').checked?{cartoon:{color:'#f4a45c'}}:{});compareViewer.render();
}
$('show-a').addEventListener('change',styleCompare);$('show-b').addEventListener('change',styleCompare);$('compare-fit').addEventListener('click',()=>{compareViewer?.zoomTo();compareViewer?.render();});
$('compare').addEventListener('click',()=>{
  try{
    error('compare-error',null);if(!slots.a||!slots.b)throw Error('비교할 두 구조를 준비하세요.');
    const ca=$('a-chain').value,cb=$('b-chain').value,a=slots.a.parsed.chains.get(ca),b=slots.b.parsed.chains.get(cb);
    comparison=compareResidues(a,b);comparison.a=a;comparison.b=b;
    compareViewer??=getViewer('compare');compareViewer.removeAllModels();compareViewer.removeAllLabels();compareViewer.addModel(transformPdb(slots.a.pdb,p=>p,ca),'pdb');compareViewer.addModel(transformPdb(slots.b.pdb,comparison.transform,cb),'pdb');styleCompare();compareViewer.zoomTo();compareViewer.render();$('compare-empty').hidden=true;
    $('rmsd').textContent=comparison.rmsd.toFixed(3);$('tm-score').textContent=comparison.tmScore.toFixed(3);$('aligned-count').textContent=`${a.length} / ${a.length}`;$('change-count').textContent=comparison.changes.length+'개';
    $('compare-status').textContent='같은 위치끼리 대응시켜 전체 Cα 좌표를 겹쳤습니다.';$('distance-panel').hidden=false;$('distance-chart').replaceChildren();
    const max=Math.max(.5,...comparison.distances);
    comparison.distances.forEach((d,i)=>{const bar=document.createElement('button');bar.style.height=Math.max(3,d/max*135)+'px';bar.className=comparison.changes.includes(i+1)?'changed':'';bar.title=`위치 ${i+1} (${a[i].resid} / ${b[i].resid}) · ${a[i].one} → ${b[i].one} · ${d.toFixed(3)} Å`;bar.setAttribute('aria-label',bar.title);bar.addEventListener('click',()=>{say(bar.title);compareViewer.removeAllLabels();compareViewer.addLabel(`${i+1} · ${d.toFixed(2)} Å`,{position:{x:a[i].point[0],y:a[i].point[1],z:a[i].point[2]},fontColor:'white',backgroundColor:'#263e47',fontSize:13});compareViewer.render();});$('distance-chart').append(bar);});
    $('changes').textContent=comparison.changes.length?'치환 위치: '+comparison.changes.map(n=>`${a[n-1].one}${n}${b[n-1].one}`).join(' · '):'두 사슬의 아미노산 종류가 같습니다. 구조의 차이는 예측 조건이나 실험 조건 등에 의해서도 생길 수 있습니다.';
    $('comparison-provenance').textContent=`A: ${slots.a.model??'예측 조건 미확인'} / B: ${slots.b.model??'예측 조건 미확인'}. 같은 모델·설정으로 비교하는 것이 좋습니다.`;$('export-csv').disabled=false;
  }catch(e){comparison=null;error('compare-error',e.message);}
});
$('export-csv').addEventListener('click',()=>{if(!comparison)return;const c=comparison;const rows=[['position','reference_residue_id','comparison_residue_id','reference_aa','comparison_aa','distance_angstrom','substitution'],...c.distances.map((d,i)=>[i+1,c.a[i].resid,c.b[i].resid,c.a[i].one,c.b[i].one,d.toFixed(6),c.changes.includes(i+1)?1:0])];const quote=x=>{let value=String(x);if(/^[=+@\-\t\r]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};download('protein-comparison.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');});

new ResizeObserver(()=>{foldViewer?.resize();foldViewer?.render();compareViewer?.resize();compareViewer?.render();}).observe(root);
aminoGrid();chooseAA('G');$('sequence').value=PRESETS[0].sequence;$('preset-note').textContent=PRESETS[0].note;updateSequence();
window.addEventListener('load',drawFormula,{once:true});
