import {AMINO_ACIDS,GROUPS,PRESETS} from './amino-acids.js';
import {AMINO_STRUCTURES} from './amino-structures.js';
import {cleanSequence,mutationPositions,substituteSequence,parsePdb,compareResidues,transformPdb,residueRows} from './core.js?v=5';
import {createResidueInspector} from './residue-inspector.js?v=5';

const $=id=>document.getElementById('pl-'+id);
const root=document.getElementById('protein-lab');
let currentAA='G',filter='all',worker=null,busy=false,result=null,history=[],selected=[],foldViewer=null,compareViewer=null,comparison=null;
const slots={a:null,b:null};let toastTimer;
let aminoMode='2d',aminoViewer=null;
let foldInspector=null,compareInspector=null,foldRows=[],mutationBaseline=null;
const aaByCode=Object.fromEntries(AMINO_ACIDS.map(a=>[a.code,a]));
const say=text=>{$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);};
const error=(id,text)=>{$(id).textContent=text??'';$(id).hidden=!text;};
const download=(name,text,type='text/plain')=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
const inputLetters=()=>$('sequence').value.trim().split(/\r?\n/).filter(line=>!line.trim().startsWith('>')).join('').replace(/\s/g,'').toUpperCase();
const matchesResult=()=>!!result&&$('sequence').value.split(/\r?\n/).filter(line=>line.trim().startsWith('>')).length<=1&&inputLetters()===result.sequence;

function showPanel(name,focus=false){
  for(const tab of root.querySelectorAll('[data-panel]')){
    const active=tab.dataset.panel===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
    $('panel-'+tab.dataset.panel).hidden=!active;if(active&&focus)tab.focus();
  }
  requestAnimationFrame(()=>{foldViewer?.resize();foldViewer?.render();compareViewer?.resize();compareViewer?.render();if(name==='learn'){drawFormula();if(aminoMode==='3d')renderAmino3d();}});
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
  const structure=AMINO_STRUCTURES[code];$('aa-molecular-formula').textContent=structure.formula;$('aa-source').href=`https://pubchem.ncbi.nlm.nih.gov/compound/${structure.cid}`;$('aa-source').textContent=`PubChem · ${aa.three}`;
  if(aminoMode==='3d')renderAmino3d();
}
function drawFormula(){
  const svg=$('aa-svg'),aa=aaByCode[currentAA],{atoms,bonds}=AMINO_STRUCTURES[currentAA].layout;
  const unit=48,pad=22,xs=atoms.map(a=>a[0]*unit),ys=atoms.map(a=>-a[1]*unit);
  const minX=Math.min(...xs)-pad,minY=Math.min(...ys)-pad;
  svg.replaceChildren();svg.setAttribute('viewBox',`${minX} ${minY} ${Math.max(...xs)-minX+pad} ${Math.max(...ys)-minY+pad}`);
  svg.setAttribute('aria-label',`${aa.name}의 전체 구조식. 탄소·수소·질소·산소와 곁사슬의 모든 원자를 표시합니다.`);
  const add=(tag,attrs,parent=svg)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);parent.append(node);return node;};
  const title=add('title',{});title.textContent=`${aa.name} · 전체 원자 구조식`;
  const line=(x1,y1,x2,y2)=>add('line',{x1,y1,x2,y2,stroke:'#647780','stroke-width':1.7,'stroke-linecap':'round'});
  for(const [a,b,order,stereo] of bonds){
    const ax=xs[a],ay=ys[a],bx=xs[b],by=ys[b],dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
    if(stereo===1){add('polygon',{points:`${ax},${ay} ${bx+nx*4},${by+ny*4} ${bx-nx*4},${by-ny*4}`,fill:'#647780'});}
    else if(stereo===6){for(let n=1;n<=7;n++){const t=n/8,x=ax+dx*t,y=ay+dy*t;line(x-nx*4*t,y-ny*4*t,x+nx*4*t,y+ny*4*t);}}
    else{for(let n=0;n<order;n++){const d=(n-(order-1)/2)*4.5;line(ax+nx*d,ay+ny*d,bx+nx*d,by+ny*d);}}
  }
  const colors={C:'#263d48',H:'#71818a',N:'#287bb2',O:'#c4493e',S:'#927500'};
  atoms.forEach((atom,i)=>{add('circle',{cx:xs[i],cy:ys[i],r:8,fill:'#fff'});const text=add('text',{x:xs[i],y:ys[i],'text-anchor':'middle','dominant-baseline':'central',fill:colors[atom[2]],'font-size':14,'font-family':'Arial, sans-serif','font-weight':atom[2]==='H'?400:600});text.textContent=atom[2];});
}
function renderAmino3d(){
  if(!window.$3Dmol)return;
  try{
    aminoViewer??=$3Dmol.createViewer($('aa-3d-viewer'),{backgroundColor:'#f6f9fa',antialias:true});
    aminoViewer.removeAllModels();aminoViewer.addModel(AMINO_STRUCTURES[currentAA].sdf,'sdf');
    aminoViewer.setStyle({},{stick:{radius:.13,colorscheme:'Jmol'},sphere:{scale:.28,colorscheme:'Jmol'}});
    if(!$('aa-hydrogens').checked)aminoViewer.setStyle({elem:'H'},{});
    aminoViewer.resize();aminoViewer.zoomTo();aminoViewer.render();error('aa-error',null);
    $('aa-3d-viewer').setAttribute('aria-label',`${aaByCode[currentAA].name}의 전체 3D 구조. 드래그하여 회전하고 휠로 확대할 수 있습니다.`);
  }catch(e){error('aa-error','입체 구조를 표시하지 못했습니다. 페이지를 새로 열어 주세요.');}
}
for(const mode of ['2d','3d'])$('aa-mode-'+mode).addEventListener('click',()=>{
  aminoMode=mode;$('aa-formula').hidden=mode!=='2d';$('aa-3d-panel').hidden=mode!=='3d';
  for(const m of ['2d','3d'])$('aa-mode-'+m).setAttribute('aria-pressed',String(m===mode));
  if(mode==='3d')renderAmino3d();else drawFormula();
});
$('aa-hydrogens').addEventListener('change',renderAmino3d);
$('aa-fit').addEventListener('click',()=>{aminoViewer?.zoomTo();aminoViewer?.render();});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;root.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(filter!=='all'&&aaByCode[currentAA].group!==filter)chooseAA(AMINO_ACIDS.find(a=>a.group===filter).code);aminoGrid();});

const inputChoices=[{id:'custom',name:'직접 입력',sequence:'',note:'원하는 아미노산 서열을 아래에 직접 입력하거나 붙여넣으세요.'},...PRESETS];
for(const p of inputChoices){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;$('preset').append(o);}
const preset=()=>inputChoices.find(p=>p.id===$('preset').value);
function updateInputChoice(){const p=preset();$('preset-note').textContent=p.note;$('reset').textContent=p.id==='custom'?'입력 지우기':'예제 초기화';}
function rememberSequence(){history.push({value:$('sequence').value,baseline:mutationBaseline??preset().sequence});if(history.length>50)history.shift();}
function setSequence(seq,remember=true){if(remember)rememberSequence();$('sequence').value=seq;selected=[];updateSequence();}
function inputInspection(active){
  const linked=matchesResult()&&active?.row.chain===foldRows[0]?.chain;
  $('sequence-strip').querySelectorAll('.pl-residue').forEach((b,i)=>b.classList.toggle('inspected',!!linked&&i+1===active.row.position));
}
function syncMutationSelection(){
  $('sequence-strip').querySelectorAll('.pl-residue').forEach((b,i)=>{b.classList.toggle('selected',selected.includes(i+1));b.setAttribute('aria-pressed',String(selected.includes(i+1)));});
  $('sequence-selection').textContent=selected.length?`${selected.length}개 치환 위치 선택 · ${selected.join(', ')}`:'잔기를 눌러 치환 위치를 선택하세요.';
}
function updateSequence(){
  const raw=inputLetters();
  $('length').textContent=raw.length+' aa';$('undo').disabled=history.length===0;
  $('sequence-strip').replaceChildren();const original=mutationBaseline??preset().sequence;
  if(/^[ACDEFGHIKLMNPQRSTVWY]*$/.test(raw)&&raw.length<=256){
    [...raw].forEach((letter,i)=>{const b=document.createElement('button');b.className='pl-residue';if(selected.includes(i+1))b.classList.add('selected');if(original.length===raw.length&&original[i]!==letter)b.classList.add('changed');b.textContent=letter;b.title=`${i+1} · ${aaByCode[letter].name}`;b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(selected.includes(i+1)));if(i%10===0){const n=document.createElement('span');n.className='pl-pos';n.textContent=i+1;b.append(n);}
      const mapped=()=>matchesResult()?foldRows.find(r=>r.chain===foldRows[0]?.chain&&r.position===i+1):null;
      b.addEventListener('pointerenter',e=>{const r=mapped();if(r&&e.pointerType!=='touch')foldInspector?.hoverRow(r.key);});
      b.addEventListener('pointerleave',()=>foldInspector?.hoverRow(null));b.addEventListener('focus',()=>{const r=mapped();if(r)foldInspector?.hoverRow(r.key);});b.addEventListener('blur',()=>foldInspector?.hoverRow(null));
      b.addEventListener('click',()=>{if(busy)return;const at=selected.indexOf(i+1);if(at>=0)selected.splice(at,1);else selected.push(i+1);selected.sort((a,b)=>a-b);$('mutation').value=selected.join(', ');syncMutationSelection();const r=mapped();if(r)foldInspector?.selectRow(r.key);});$('sequence-strip').append(b);});
  }
  $('sequence-selection').textContent=selected.length?`${selected.length}개 위치 선택 · ${selected.join(', ')}`:'잔기를 눌러 위치를 선택하세요.';
  const stale=result&&!matchesResult();$('panel-fold').classList.toggle('pl-stale',!!stale);
  foldInspector?.reset();
  if(result){$('model-title').textContent=stale?'서열이 바뀌었습니다 · 다시 예측 필요':result.name;
    $('save-a').disabled=$('save-b').disabled=!!stale||busy;
  }
}
$('preset').addEventListener('change',()=>{rememberSequence();mutationBaseline=null;setSequence(preset().sequence,false);updateInputChoice();error('input-error',null);if(preset().id==='custom')$('sequence').focus();});
$('sequence').addEventListener('input',()=>{selected=[];mutationBaseline=null;updateSequence();});
$('sequence').addEventListener('beforeinput',()=>{if(history.at(-1)?.value!==$('sequence').value)rememberSequence();});
$('undo').addEventListener('click',()=>{if(history.length){const previous=history.pop();$('sequence').value=previous.value;mutationBaseline=previous.baseline;selected=[];$('mutation').value='';updateSequence();}});
$('reset').addEventListener('click',()=>{rememberSequence();mutationBaseline=null;$('mutation').value='';setSequence(preset().sequence,false);});
$('clear-mutation').addEventListener('click',()=>{selected=[];$('mutation').value='';syncMutationSelection();foldInspector?.reset();});
for(const aa of AMINO_ACIDS){const option=document.createElement('option');option.value=aa.code;option.textContent=`${aa.name} · ${aa.three} / ${aa.code}`;$('mutation-amino').append(option);}
$('mutation-amino').value='P';
$('apply-mutation').addEventListener('click',()=>{try{const seq=cleanSequence($('sequence').value),pos=mutationPositions($('mutation').value,seq.length),code=$('mutation-amino').value;mutationBaseline??=seq;setSequence(substituteSequence(seq,pos,code));selected=pos;syncMutationSelection();error('input-error',null);say(`${pos.length}개 위치를 ${aaByCode[code].name}(${aaByCode[code].three} / ${code})으로 치환했습니다.`);}catch(e){error('input-error',e.message);}});

function getViewer(which){
  if(!window.$3Dmol)throw Error('3D 뷰어를 준비하지 못했습니다. 페이지를 새로 열어 주세요.');
  const key=which==='fold'?'fold-viewer':'compare-viewer';
  const v=$3Dmol.createViewer($(key),{backgroundColor:'#142933',antialias:true});v.setProjection('orthographic');return v;
}
function plddtColor(atom){const b=atom.b;return b>=90?'#0053d6':b>=70?'#65cbf3':b>=50?'#ffdb13':'#ff7d45';}
function renderFold(){
  if(!result)return;try{
    foldInspector?.dispose();foldInspector=null;foldRows=residueRows(parsePdb(result.pdb),result);
    foldViewer??=getViewer('fold');foldViewer.removeAllModels();foldViewer.removeAllLabels();foldViewer.addModel(result.pdb,'pdb');styleFold();
    foldInspector=createResidueInspector({viewer:foldViewer,container:$('fold-inspector'),groups:[{model:0,label:'구조 결과',rows:foldRows}],restore:()=>styleFold(false),onActive:inputInspection});
    foldViewer.zoomTo();foldViewer.render();$('stage-empty').hidden=true;
  }catch(e){error('input-error',e.message);}
}
function styleFold(inspect=true){
  if(!foldViewer||!result)return;
  let color=$('color').value;const cartoon=color==='spectrum'?{color:'spectrum'}:color==='secondary'?{colorscheme:'ssPyMol'}:result.plddt?{colorfunc:plddtColor}:{color:'spectrum'};
  foldViewer.setStyle({},{cartoon});if($('sidechains').checked)foldViewer.addStyle({},{stick:{radius:.12,colorscheme:'Jmol'}});$('confidence-legend').hidden=color!=='confidence'||!result.plddt;
  if(inspect&&foldInspector)foldInspector.paint();else foldViewer.render();
}
$('color').addEventListener('change',styleFold);$('sidechains').addEventListener('change',styleFold);
$('fit-view').addEventListener('click',()=>{foldViewer?.zoomTo();foldViewer?.render();});

function setBusy(state){
  busy=state;$('fold').disabled=state;$('cancel').hidden=!state;$('sequence').disabled=state;$('preset').disabled=state;$('apply-mutation').disabled=state;$('mutation-amino').disabled=state;$('reset').disabled=state;$('undo').disabled=state||!history.length;$('load-pdb').disabled=state;
  $('save-a').disabled=$('save-b').disabled=state||!matchesResult();
}
function finishPrediction(data){
  const p=preset(),name=p.id==='custom'?'직접 입력한 서열':data.sequence===p.sequence?p.name:`${p.name.split(' · ')[0]} · 편집 서열`;
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
function invalidateComparison(){compareInspector?.dispose();compareInspector=null;comparison=null;$('export-csv').disabled=true;$('compare-status').textContent=slots.a&&slots.b?'두 구조가 준비되었습니다. 비교를 시작하세요.':'접힘 예측 결과를 담거나 PDB 파일 두 개를 선택하세요.';$('distance-panel').hidden=true;$('rmsd').textContent=$('tm-score').textContent=$('aligned-count').textContent=$('change-count').textContent='—';compareViewer?.removeAllModels();compareViewer?.removeAllLabels();compareViewer?.render();$('compare-empty').hidden=false;}
for(const key of ['a','b']){
  $('save-'+key).addEventListener('click',()=>{if(!matchesResult()||busy)return;try{loadSlot(key,{...result});say(`현재 예측 결과를 비교 ${key.toUpperCase()}에 담았습니다.`);}catch(e){error('input-error',e.message);}});
  $(key+'-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>8_000_000)throw Error('8 MB 이하의 PDB 파일을 사용하세요.');loadSlot(key,{pdb:await file.text(),name:file.name,model:'불러온 PDB · 예측 조건 미확인'});error('compare-error',null);}catch(e){error('compare-error',e.message);}finally{e.target.value='';}});
  $(key+'-chain').addEventListener('change',invalidateComparison);
}
$('load-pdb').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;try{if(file.size>8_000_000)throw Error('8 MB 이하의 PDB 파일을 사용하세요.');const pdb=await file.text(),parsed=parsePdb(pdb),chain=[...parsed.chains.values()][0];
    result={pdb,name:file.name,sequence:chain.map(r=>r.one).join(''),model:'불러온 PDB',plddt:null};rememberSequence();mutationBaseline=null;selected=[];$('mutation').value='';$('sequence').value=result.sequence;updateSequence();$('model-title').textContent=file.name;$('count-metric').textContent=result.sequence.length+' aa';$('confidence-metric').textContent=$('ptm-metric').textContent='—';$('result-note').textContent='PDB 파일을 불러왔습니다. 표시된 서열은 첫 사슬이며, 구조 뷰어에는 파일의 사슬들이 함께 보일 수 있습니다. 신뢰도는 자동으로 가정하지 않습니다.';$('color').value='spectrum';$('download').disabled=false;$('save-a').disabled=$('save-b').disabled=false;renderFold();error('input-error',null);
  }catch(e){error('input-error',e.message);}finally{e.target.value='';}
});

function styleCompare(inspect=true){
  if(!compareViewer||!comparison)return;compareViewer.setStyle({model:0},$('show-a').checked?{cartoon:{color:'#54c7b1'}}:{});compareViewer.setStyle({model:1},$('show-b').checked?{cartoon:{color:'#f4a45c'}}:{});if(inspect&&compareInspector)compareInspector.paint();else compareViewer.render();
}
$('show-a').addEventListener('change',styleCompare);$('show-b').addEventListener('change',styleCompare);$('compare-fit').addEventListener('click',()=>{compareViewer?.zoomTo();compareViewer?.render();});
$('compare').addEventListener('click',()=>{
  try{
    error('compare-error',null);if(!slots.a||!slots.b)throw Error('비교할 두 구조를 준비하세요.');
    const ca=$('a-chain').value,cb=$('b-chain').value,a=slots.a.parsed.chains.get(ca),b=slots.b.parsed.chains.get(cb);
    compareInspector?.dispose();compareInspector=null;comparison=compareResidues(a,b);comparison.a=a;comparison.b=b;
    compareViewer??=getViewer('compare');compareViewer.removeAllModels();compareViewer.removeAllLabels();compareViewer.addModel(transformPdb(slots.a.pdb,p=>p,ca),'pdb');compareViewer.addModel(transformPdb(slots.b.pdb,comparison.transform,cb),'pdb');styleCompare();compareViewer.zoomTo();compareViewer.render();$('compare-empty').hidden=true;
    $('rmsd').textContent=comparison.rmsd.toFixed(3);$('tm-score').textContent=comparison.tmScore.toFixed(3);$('aligned-count').textContent=`${a.length} / ${a.length}`;$('change-count').textContent=comparison.changes.length+'개';
    $('compare-status').textContent='같은 위치끼리 대응시켜 전체 Cα 좌표를 겹쳤습니다.';$('distance-panel').hidden=false;$('distance-chart').replaceChildren();
    const rowsA=residueRows(slots.a.parsed,slots.a).filter(r=>r.chain===ca),rowsB=residueRows(slots.b.parsed,slots.b).filter(r=>r.chain===cb);
    compareInspector=createResidueInspector({viewer:compareViewer,container:$('compare-inspector'),groups:[{model:0,label:'기준 A',rows:rowsA,visible:()=>$('show-a').checked},{model:1,label:'비교 B',rows:rowsB,visible:()=>$('show-b').checked}],restore:()=>styleCompare(false),distance:i=>comparison.distances[i],onActive:active=>{$('distance-chart').querySelectorAll('button').forEach((bar,i)=>bar.classList.toggle('inspected',active?.row.position===i+1));}});
    const max=Math.max(.5,...comparison.distances);
    comparison.distances.forEach((d,i)=>{const bar=document.createElement('button');bar.style.height=Math.max(3,d/max*135)+'px';bar.className=comparison.changes.includes(i+1)?'changed':'';bar.title=`위치 ${i+1} (${a[i].resid} / ${b[i].resid}) · ${a[i].one} → ${b[i].one} · ${d.toFixed(3)} Å`;bar.setAttribute('aria-label',bar.title);bar.addEventListener('click',()=>compareInspector?.selectPosition(i+1));$('distance-chart').append(bar);});
    $('changes').textContent=comparison.changes.length?'치환 위치: '+comparison.changes.map(n=>`${a[n-1].one}${n}${b[n-1].one}`).join(' · '):'두 사슬의 아미노산 종류가 같습니다. 구조의 차이는 예측 조건이나 실험 조건 등에 의해서도 생길 수 있습니다.';
    $('comparison-provenance').textContent=`A: ${slots.a.model??'예측 조건 미확인'} / B: ${slots.b.model??'예측 조건 미확인'}. 같은 모델·설정으로 비교하는 것이 좋습니다.`;$('export-csv').disabled=false;
  }catch(e){invalidateComparison();error('compare-error',e.message);}
});
$('export-csv').addEventListener('click',()=>{if(!comparison)return;const c=comparison;const rows=[['position','reference_residue_id','comparison_residue_id','reference_aa','comparison_aa','distance_angstrom','substitution'],...c.distances.map((d,i)=>[i+1,c.a[i].resid,c.b[i].resid,c.a[i].one,c.b[i].one,d.toFixed(6),c.changes.includes(i+1)?1:0])];const quote=x=>{let value=String(x);if(/^[=+@\-\t\r]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};download('protein-comparison.csv','\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');});

new ResizeObserver(()=>{foldViewer?.resize();foldViewer?.render();compareViewer?.resize();compareViewer?.render();aminoViewer?.resize();aminoViewer?.render();}).observe(root);
aminoGrid();chooseAA('G');$('sequence').value=preset().sequence;updateInputChoice();updateSequence();
window.addEventListener('load',drawFormula,{once:true});
