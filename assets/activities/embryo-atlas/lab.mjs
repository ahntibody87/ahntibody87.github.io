import {EmbryoView} from './model3d.mjs?v=e860fb366ccd';
import {LayerView,MuscleView,GutView} from './lineage3d.mjs?v=nuclear20261028';
import {routes,myodStages,routeStep} from './lineage-data.mjs?v=nuclear20261028';
const root=document.getElementById('embryo-lab'),$=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const state={tab:'development',time:0,playing:false,speed:1,view:'section',labels:true,trail:true,layer:'ecto',layerTime:0,layerPlaying:false,myod:0,myodPlaying:false,myodSpeed:1,contractStart:null,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
const stages = [
  {name:'수정란',short:'수정란',day:'0일',phase:'01 / 난할',title:'수정으로 만들어진 하나의 세포',text:'정자와 난자의 수정으로 하나의 수정란이 만들어집니다. 이 세포에서 분열과 분화가 이어져 몸을 이루는 다양한 세포가 생깁니다.',key:'세포 수가 늘어나는 것과 세포의 종류가 달라지는 것은 다른 과정입니다.',fact:['세포 수','1개'],gene:'이후의 체세포 분열에서 DNA가 복제되어 딸세포에 전달됩니다.',caption:'초기 난할 · 배아 전체의 크기는 거의 일정'},
  {name:'2세포기',short:'2세포기',day:'약 1일',phase:'01 / 난할',title:'DNA를 복제한 뒤 두 세포로 분열합니다',text:'수정란이 첫 난할을 거쳐 두 세포가 됩니다. 분열 전에 복제된 DNA가 각각의 딸세포로 전달됩니다.',key:'난할에서는 세포 수가 늘어나지만 배아 전체의 크기는 거의 커지지 않습니다.',fact:['대표 세포 수','2개'],gene:'세포마다 다른 DNA를 나누어 갖는 것이 아닙니다.',caption:'크기는 거의 그대로 · 하나의 세포가 두 딸세포로'},
  {name:'4세포기',short:'4세포기',day:'약 2일',phase:'01 / 난할',title:'난할과 세포 크기의 변화',text:'난할이 이어지며 세포 수가 증가합니다. 모형에서 배아 바깥 경계와 개별 세포의 크기를 비교해 보세요.',key:'세포 수 증가와 개별 세포 크기 감소를 함께 관찰하세요.',fact:['대표 세포 수','4개'],gene:'초기에는 난자에 저장되어 있던 물질이 작용하며, 점차 배아 자신의 유전자 발현이 활발해집니다.',caption:'난할의 핵심 · 세포 수 증가, 개별 세포 크기 감소'},
  {name:'8세포기',short:'8세포기',day:'약 3일',phase:'01 / 난할',title:'세포 사이의 접촉과 밀착',text:'세포 사이의 접촉이 긴밀해지면서 조밀한 세포 덩어리로 바뀌어 갑니다. 실제 사람 배아에서는 모든 세포가 동시에 분열하지는 않습니다.',key:'겉의 경계는 비슷하지만 그 안의 세포 배열은 달라집니다.',fact:['대표 세포 수','8개'],gene:'세포의 위치와 이웃 세포의 신호는 이후 유전자 발현과 세포 운명에 영향을 줍니다.',caption:'8세포기 · 세포 사이 접촉이 긴밀해지는 시기'},
  {name:'상실배',short:'상실배',day:'약 3–4일',phase:'01 / 난할',title:'안과 밖이 구분되는 세포 덩어리',text:'난할이 이어져 조밀한 세포 덩어리가 됩니다. 내부와 외부에 놓인 세포들은 서로 다른 환경과 신호를 경험합니다.',key:'상실배는 아직 큰 내부 공간이 없는 조밀한 세포 덩어리입니다.',fact:['대표 세포 수','약 16–32개'],gene:'DNA가 달라지지 않아도 위치와 신호에 따라 발현 양상이 달라질 수 있습니다.',caption:'상실배 · 조밀한 세포 덩어리'},
  {name:'포배낭 (배반포)',short:'포배낭',day:'약 5–6일',phase:'02 / 배아원반으로',title:'내부 공간과 내세포덩어리',text:'속에 공간이 생기고 안쪽에 세포 집단이 모입니다. 안쪽 세포 집단에서 몸을 형성할 부분이 발달하며, 바깥 세포층은 태반 일부 등 발생을 돕는 구조로 이어집니다.',key:'배반포 전체가 그대로 몸이 되는 것은 아닙니다. 안쪽 세포 집단을 따라가 보세요.',fact:['관찰할 구조','내부 공간 + 안쪽 세포 집단'],gene:'안쪽과 바깥쪽 세포 사이에 서로 다른 유전자 발현 양상이 나타납니다.',caption:'사람의 포배 단계 · 배반포의 안쪽 세포 집단에 주목'},
  {name:'배아원반',short:'배아원반',day:'약 2주',phase:'02 / 배아원반으로',title:'내세포덩어리에서 배아원반으로',text:'착상 후, 안쪽 세포 집단에서 납작한 배아원반이 발달합니다. 위쪽의 몸을 만들 세포층을 상배엽이라고 합니다. 주변 보조 구조는 회색으로 단순화했습니다.',key:'상배엽에서 몸을 구성하는 외배엽·중배엽·내배엽이 모두 유래합니다.',fact:['확대해 보는 부분','몸을 만들 세포층 · 상배엽'],gene:'신호에 반응한 유전자 발현 변화가 세포의 이동과 분화를 이끕니다.',caption:'배반포 안쪽을 확대 · 두 층의 배아원반 (개념도)'},
  {name:'낭배 형성 · 세포 이동',short:'낭배 형성',day:'약 3주',phase:'03 / 세 배엽 형성',title:'세포의 이동과 내배엽 형성',text:'상배엽의 세포들이 원시선이라는 통로로 모여 아래로 들어갑니다. 먼저 들어간 세포들은 아래쪽 보조층을 대체하면서 몸의 내배엽을 형성합니다.',key:'입체 모형과 오른쪽 위의 가로 단면에서 같은 위치의 이동을 비교하세요.',fact:['먼저 형성하는 층','몸의 내배엽'],gene:'세포는 위치에 따른 신호에 반응하며 이동하고, 발현 양상도 달라집니다.',caption:'세포가 표면에서 안쪽으로 이동 · 오른쪽 위는 절개 위치의 가로 단면'},
  {name:'낭배 형성 · 세 배엽',short:'세 배엽',day:'약 3주',phase:'03 / 세 배엽 형성',title:'세 배엽의 형성',text:'이어서 들어가는 세포는 두 층 사이에 퍼져 중배엽을 형성합니다. 표면에 남은 세포들은 외배엽이 됩니다. 세 층은 함께 몸의 기본 구조를 이룹니다.',key:'외배엽·중배엽·내배엽은 모두 상배엽에서 유래합니다.',fact:['형성된 기본 층','외배엽 · 중배엽 · 내배엽'],gene:'같은 유전정보를 가진 세포들이 서로 다른 발현 양상을 갖게 됩니다.',caption:'색은 세포의 경로와 배엽을 표시 · 실제 세포의 색이 아닙니다'},
  {name:'몸의 접힘 · 신경관 형성',short:'접힘',day:'약 3–4주',phase:'04 / 몸의 구조 만들기',title:'원반의 접힘과 신경관·장관 형성',text:'배아가 머리·꼬리 방향과 양옆으로 접힙니다. 내배엽 일부는 몸 안으로 들어가 초기 장관을 이루고, 등 쪽의 신경 조직은 접혀 신경관을 형성합니다.',key:'외배엽은 표피와 신경계로, 내배엽 일부는 장관 상피로 이어집니다. 신경계도 몸 안쪽에 놓입니다.',fact:['새롭게 보이는 구조','신경관 · 초기 장관'],gene:'분화와 형태 변화는 서로 연결되며, 여러 발생 과정이 겹쳐 진행됩니다.',caption:'같은 배아를 회전하며 관찰 · 신경관과 장관은 서로 다른 구조'},
  {name:'기관 형성과 세포 분화',short:'기관 형성',day:'약 4–8주',phase:'04 / 몸의 구조 만들기',title:'배엽에서 조직과 기관으로',text:'신경계, 심장, 소화관 등 여러 기관의 기본 구조가 발달합니다. 세포들은 서로 다른 단백질을 합성하며 각자의 형태와 기능을 갖추어 갑니다.',key:'기관 형성과 세포 분화는 함께 진행됩니다. 한 기관에는 여러 배엽 유래 조직이 참여할 수 있습니다.',fact:['연결 학습','배엽에서 기관으로 → 세포 분화'],gene:'중배엽에서 골격근으로 이어지는 경로를 선택하면 MyoD의 역할을 볼 수 있습니다.',caption:'기관 형성기의 대표 구조를 함께 나타낸 모형 · 실제 축척 아님'}
];

const questions = [
  {q:'난할로 8세포기가 되면 배아 전체 크기도 약 8배가 될까요?',options:['그렇다','아니다'],answer:1,why:'초기 난할에서는 배아 전체 크기가 거의 일정하고, 개별 세포가 작아집니다.'},
  {q:'배반포의 바깥 세포층이 그대로 몸의 외배엽이 될까요?',options:['그렇다','아니다'],answer:1,why:'몸의 세 배엽은 상배엽에서 유래합니다. 배반포 바깥 세포층은 태반 일부 등으로 이어집니다.'},
  {q:'몸을 구성하는 세 배엽의 공통 출발점은?',options:['상배엽','세포마다 다른 DNA'],answer:0,why:'상배엽의 세포들이 이동하고 분화하여 외배엽·중배엽·내배엽을 형성합니다.'},
  {q:'골격근세포와 신경세포가 다른 주요 이유는?',options:['서로 다른 유전자만 보유','유전자 발현 양상이 다름'],answer:1,why:'일반적인 체세포는 같은 유전정보를 가지며, 발현되는 유전자의 종류와 양이 달라집니다.'}
];

const webglFailure=canvas=>()=>{const p=document.createElement('p');p.className='webgl-error';p.textContent='입체 모형을 표시할 수 없습니다. WebGL을 지원하는 브라우저에서 다시 열어 주세요.';canvas.parentElement.append(p);};
const development3d=new EmbryoView($('#embryoCanvas'),{labelHost:$('#developmentLabels'),sectionCanvas:$('#developmentSection'),onError:webglFailure($('#embryoCanvas'))});
let layers3d,locator3d,gut3d,muscle3d,lastStage=-1,lastRouteStage='',lastMyod=-1;
function drawDevelopment(){development3d.update(state.time,{section:state.view==='section',cut:+$('#cutDepth').value,opacity:+$('#outerOpacity').value,labels:state.labels,trail:state.trail});}
function ensureLayers(){
  if(layers3d)return;
  layers3d=new LayerView($('#layerCanvas'),$('#layerLabels'));
  locator3d=new EmbryoView($('#locatorCanvas'),{onError:webglFailure($('#locatorCanvas'))});
  gut3d=new GutView($('#gutCanvas'),$('#gutLabels'));
  selectLayer(state.layer,false);
}
function drawLayers(){
  if(!layers3d)return;layers3d.update(state.layer,state.layerTime);$('#layerProgress').value=state.layerTime;
  const i=routeStep(state.layerTime),key=state.layer+':'+i;
  if(lastRouteStage===key)return;lastRouteStage=key;const step=routes[state.layer].steps[i];
  $('#layerPhase').textContent='STEP '+String(i+1).padStart(2,'0')+' / 04';$('#layerProgressText').textContent=String(i+1).padStart(2,'0')+' / 04';
  $('#layerStageTitle').textContent=step.title;$('#layerStageDescription').textContent=step.text;$('#layerLook').textContent=step.look;
  $$('#routeSteps button').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-current',i===j?'step':'false');});
}
function layerPlay(on){state.layerPlaying=on;$('#layerPlay').textContent=on?'Ⅱ 일시정지':'▶ 경로 재생';}
function selectLayer(layer,reset=true){
  state.layer=layer;layerPlay(false);if(reset)state.layerTime=0;lastRouteStage='';const d=routes[layer];
  $('#layerEnglish').textContent=d.en;$('#routeTitle').textContent=d.title;$('#routeLocation').textContent=d.focus;$('#routeResult').textContent=d.result;
  $('#layerAction').hidden=layer!=='meso';
  $('#routeBranches').innerHTML=d.branches.map(([a,b])=>'<p><span>'+a+'</span><span aria-hidden="true">→</span><strong>'+b+'</strong></p>').join('');
  $('#routeSteps').innerHTML=d.steps.map((s,i)=>'<button type="button" data-route-step="'+i+'"><span>0'+(i+1)+'</span>'+s.name+'</button>').join('');
  $$('#routeSteps button').forEach((b,i)=>b.onclick=()=>{state.layerTime=i===3?1:(i+.55)/4;layerPlay(false);drawLayers();});
  $$('[data-layer]').forEach(b=>{const on=b.dataset.layer===layer;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  if(locator3d){locator3d.update(10.85,{section:false,opacity:.35,labels:false,trail:false,highlight:layer});}
  layers3d?.view('reset');drawLayers();
}
function drawMyod(){muscle3d?.update(state.myod);}
function updateMyod(){
  const i=Math.min(4,Math.floor(state.myod));$('#myodSlider').value=state.myod;$('#muscleContract').disabled=state.myod<4.85;
  if(i===3){const p=state.myod-3;$('#myodEvent').textContent=p<.18?'MyoD → 자기 발현 유지 · 다음 전사 인자 유전자':p<.38?'다른 전사 인자 유전자 → mRNA → 세포질':p<.57?'번역 → 다른 전사 인자 → 핵':p<.70?'전사 인자들의 작용 → 근육 관련 유전자':p<.84?'근육 관련 유전자의 전사 → mRNA 이동':'번역 → 근육 단백질 합성·배열';}if(lastMyod===i)return;lastMyod=i;const step=myodStages[i];
  $('#myodStageNumber').textContent='STEP '+String(i+1).padStart(2,'0')+' / 05';$('#myodTitle').textContent=step.title;$('#myodDescription').textContent=step.text;if(i!==3)$('#myodEvent').textContent=step.event;$('#myodLook').textContent=step.look;
  $('#myodSceneTitle').textContent=i<4?'근육 전구세포의 내부':'근아세포에서 다핵 근관과 근섬유로';$('#myodScale').textContent=i<4?'세포 내부 확대':'여러 세포와 조직 관찰';
  $$('#myodSteps button').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-current',i===j?'step':'false');});
}
function setMyodPlaying(on){state.myodPlaying=on;$('#myodPlay').textContent=on?'Ⅱ 일시정지':'▶ 분화 과정 재생';}
function seekMyod(time){state.myod=clamp(time,0,4.999);state.contractStart=null;setMyodPlaying(false);updateMyod();drawMyod();}
function stageIndex(){return Math.min(10,Math.floor(state.time));}
function updateStage(){
  const i=stageIndex(),s=stages[i];$('#timeSlider').value=state.time;$('#progressLabel').textContent=String(i+1).padStart(2,'0')+' / 11';$('#prev').disabled=i===0;$('#next').disabled=i===10;
  if(i===lastStage)return;lastStage=i;$('#stageTitle').textContent=s.name;$('#phaseName').textContent=s.phase;$('#stageTime').textContent='수정 후 '+s.day;$('#infoTitle').textContent=s.title;$('#infoText').textContent=s.text;$('#keyText').textContent=s.key;$('#factLabel').textContent=s.fact[0];$('#factValue').textContent=s.fact[1];$('#connectionText').textContent=s.gene;$('#viewCaption').textContent=s.caption+(i<4?' · 회청색 구: 핵 (DNA 포함)':'');$('#questionArea').hidden=true;$('#questionButton').setAttribute('aria-expanded','false');
  $$('#stageButtons button').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-current',i===j?'step':'false');});
}
function setPlaying(on){state.playing=on;$('#play').innerHTML=on?'Ⅱ <span>일시정지</span>':'▶ <span>재생</span>';$('#play').setAttribute('aria-label',on?'발생 일시정지':'발생 재생');}
function seek(time,stop=true){state.time=clamp(time,0,10.999);if(stop)setPlaying(false);updateStage();drawDevelopment();}
function selectTab(tab){
  state.tab=tab;setPlaying(false);setMyodPlaying(false);layerPlay(false);state.contractStart=null;
  $$('.tabs button').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});$$('[role="tabpanel"]').forEach(el=>el.hidden=el.id!==tab);
  if(tab==='development')drawDevelopment();
  if(tab==='layers'){ensureLayers();drawLayers();locator3d?.render();gut3d?.render();}
  if(tab==='expression'){muscle3d??=new MuscleView($('#myodCanvas'),$('#myodLabels'));updateMyod();drawMyod();}
}
function updateView(){
  $('#cutDepth').disabled=state.view!=='section';$('#sectionView').classList.toggle('active',state.view==='section');$('#outsideView').classList.toggle('active',state.view==='outside');$('#sectionView').setAttribute('aria-pressed',String(state.view==='section'));$('#outsideView').setAttribute('aria-pressed',String(state.view==='outside'));drawDevelopment();
}
function question(){
  const i=stageIndex(),q=questions[i<5?0:i===5?1:i<9?2:3],area=$('#questionArea');if(!area.hidden){area.hidden=true;$('#questionButton').setAttribute('aria-expanded','false');return;}
  area.hidden=false;$('#questionButton').setAttribute('aria-expanded','true');area.innerHTML='<p>'+q.q+'</p><div>'+q.options.map((s,j)=>'<button data-answer="'+j+'">'+s+'</button>').join('')+'</div><p class="feedback" role="status"></p>';
  area.querySelectorAll('button').forEach(b=>b.onclick=()=>area.querySelector('.feedback').textContent=(+b.dataset.answer===q.answer?'맞아요. ':'다시 생각해 보세요. ')+q.why);
}
function dialog(html){$('#dialogContent').innerHTML=html;$('#infoDialog').showModal();}
function init(){
  $('#stageButtons').innerHTML=stages.map((s,i)=>'<button data-stage="'+i+'">'+s.short+'<small>'+s.day+'</small></button>').join('');$$('[data-stage]').forEach(b=>b.onclick=()=>seek(+b.dataset.stage+.82));
  $$('[data-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
  $('.tabs').addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const tabs=$$('[data-tab]');let i=tabs.findIndex(b=>b.classList.contains('active'));i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;selectTab(tabs[i].dataset.tab);tabs[i].focus();});
  $$('[data-view]').forEach(b=>b.onclick=()=>development3d.view(b.dataset.view));$$('[data-layer-view]').forEach(b=>b.onclick=()=>layers3d?.view(b.dataset.layerView));$$('[data-muscle-view]').forEach(b=>b.onclick=()=>muscle3d?.view(b.dataset.muscleView));
  $('#cutDepth').oninput=drawDevelopment;$('#outerOpacity').oninput=drawDevelopment;
  $('#play').onclick=()=>{if(state.time>=10.998)seek(0);else if(!state.playing&&state.time%1>.998)seek(Math.floor(state.time)+1);setPlaying(!state.playing);};
  $('#prev').onclick=()=>seek(Math.max(0,stageIndex()-1)+.82);$('#next').onclick=()=>seek(Math.min(10,stageIndex()+1)+.82);$('#timeSlider').oninput=e=>seek(+e.target.value);$('#speed').onchange=e=>state.speed=+e.target.value;
  $('#sectionView').onclick=()=>{state.view='section';updateView();};$('#outsideView').onclick=()=>{state.view='outside';updateView();};$('#showLabels').onchange=e=>{state.labels=e.target.checked;drawDevelopment();};$('#showTrail').onchange=e=>{state.trail=e.target.checked;drawDevelopment();};
  $('#questionButton').onclick=question;$('#nextTopic').onclick=()=>selectTab('layers');$('#backGastrula').onclick=()=>{selectTab('development');seek(8.8);};$$('[data-layer]').forEach(b=>b.onclick=()=>selectLayer(b.dataset.layer));
  $('#layerProgress').oninput=e=>{state.layerTime=+e.target.value;layerPlay(false);drawLayers();};$('#layerPlay').onclick=()=>{if(state.layerTime>=.999)state.layerTime=0;layerPlay(!state.layerPlaying);drawLayers();};
  $('#layerAction').onclick=()=>{selectTab('expression');seekMyod(0);$('#tab-expression').focus();};$('#backMuscleRoute').onclick=()=>{selectTab('layers');selectLayer('meso');state.layerTime=1;drawLayers();$('#tab-layers').focus();};
  $$('[data-gut]').forEach(b=>b.onclick=()=>{$$('[data-gut]').forEach(other=>{const on=other===b;other.classList.toggle('active',on);other.setAttribute('aria-pressed',String(on));});gut3d?.highlight(b.dataset.gut);});
  $('#myodSteps').innerHTML=myodStages.map((s,i)=>'<button data-myod="'+i+'"><span>0'+(i+1)+'</span>'+s.name+'</button>').join('');$$('[data-myod]').forEach(b=>b.onclick=()=>seekMyod(+b.dataset.myod===4?4.999:+b.dataset.myod===3?3:+b.dataset.myod+.65));
  $('#myodPlay').onclick=()=>{if(state.myod>=4.998)state.myod=0;state.contractStart=null;setMyodPlaying(!state.myodPlaying);updateMyod();drawMyod();};$('#myodReset').onclick=()=>seekMyod(0);$('#myodSlider').oninput=e=>seekMyod(+e.target.value);$('#myodSpeed').onchange=e=>state.myodSpeed=+e.target.value;
  $('#muscleContract').onclick=()=>{if(state.myod<4.85)return;setMyodPlaying(false);if(state.reduced){muscle3d?.update(state.myod,.12);$('#myodEvent').textContent='수축: 근섬유의 길이가 짧아집니다. 다시 관찰하려면 진행 막대를 움직이세요.';}else state.contractStart=performance.now();};
  $('#fullScreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{dialog('<h2>수업 화면</h2><p>브라우저의 전체 화면 기능(F11)을 사용해 주세요.</p>');}};
  $('#help').onclick=()=>dialog('<h2>관찰 방법</h2><h3>01 · 발생의 큰 흐름</h3><p>시간 막대와 단계 버튼으로 이동하세요. 드래그·방향키로 회전하고 절개 깊이를 조절할 수 있습니다.</p><h3>02 · 조직 하나를 따라가기</h3><p>배엽을 선택하면 다른 확대 모형과 경로가 나타납니다. 작은 배아는 관찰 위치를 알려 줍니다. 경로 재생 또는 단계 버튼을 사용하고, 장벽에서는 두 배엽 유래 조직을 비교하세요.</p><h3>03 · 골격근으로 분화하기</h3><p>MyoD 유전자에서 전사·번역·발현 조절·세포 융합으로 이어지는 과정을 관찰하세요. 마지막 단계 끝에서 수축 관찰을 누를 수 있습니다. 답변은 저장하거나 전송하지 않습니다.</p>');
  $('#sources').onclick=()=>dialog('<h2>모형 안내 · 참고 자료</h2><p>사람의 발생과 골격근 분화를 고급 생명과학 수준으로 단순화한 입체 교육 모형입니다. 실제 세포 추적·현미경·분자 구조 데이터가 아닙니다. 색, 배율, 시간과 이동을 단순화했으며 실제 과정은 겹쳐 진행됩니다.</p><h3>발생과 조직 형성</h3><a href="https://embryology.med.unsw.edu.au/embryology/index.php/Neural_System_Development" target="_blank" rel="noopener">UNSW · 신경계 발생 ↗</a><br><a href="https://embryology.med.unsw.edu.au/embryology/index.php/Musculoskeletal_System_-_Muscle_Development" target="_blank" rel="noopener">UNSW · 근육 발생 ↗</a><br><a href="https://embryology.oit.duke.edu/GI/GI.html" target="_blank" rel="noopener">Duke · 장관 형성과 여러 배엽의 참여 ↗</a><h3>유전자 발현과 MyoD</h3><a href="https://www.ncbi.nlm.nih.gov/books/NBK26854/" target="_blank" rel="noopener">Molecular Biology of the Cell · 세포 유형과 유전자 발현 ↗</a><br><a href="https://pubmed.ncbi.nlm.nih.gov/3690668/" target="_blank" rel="noopener">Davis 등 · MyoD 분화 유도 원연구 ↗</a><p>MyoD는 다른 조절인자와 함께 작용하며 모든 세포나 근육의 운명을 단독으로 정하는 스위치가 아닙니다. 장벽은 대표적인 상피와 평활근만 표시합니다.</p>');
  $('.dialog-close').onclick=()=>$('#infoDialog').close();$('#infoDialog').addEventListener('click',e=>{if(e.target!==$('#infoDialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();});
  updateStage();updateMyod();drawDevelopment();$$('[data-tab]').forEach((b,i)=>b.tabIndex=i===0?0:-1);
}
let previous=0;
function tick(now){
  const dt=Math.min(.07,(now-previous)/1000)||0;previous=now;
  if(!document.hidden){
    if(state.playing&&state.tab==='development'){const before=stageIndex();let next=Math.min(10.999,state.time+dt*1.2*state.speed/9);if($('#pauseEach').checked&&Math.floor(next)>before){next=before+.999;setPlaying(false);}state.time=next;if(next>=10.999)setPlaying(false);updateStage();drawDevelopment();}
    if(state.layerPlaying&&state.tab==='layers'){state.layerTime=Math.min(1,state.layerTime+dt/18);if(state.layerTime>=1)layerPlay(false);drawLayers();}
    if(state.myodPlaying&&state.tab==='expression'){state.myod=Math.min(4.999,state.myod+dt*state.myodSpeed/(Math.floor(state.myod)===3?15:5.5));if(state.myod>=4.999)setMyodPlaying(false);updateMyod();drawMyod();}
    if(state.contractStart!==null&&state.tab==='expression'){const elapsed=(now-state.contractStart)/1800;muscle3d?.update(state.myod,Math.sin(clamp(elapsed)*Math.PI)**2*.12);if(elapsed>=1)state.contractStart=null;}
  }
  requestAnimationFrame(tick);
}
init();requestAnimationFrame(tick);
