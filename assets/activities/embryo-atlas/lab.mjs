import { EmbryoView } from './model3d.mjs?v=6c6b683c843a';
'use strict';
const root = document.getElementById('embryo-lab');
const $ = s => root.querySelector(s);
const $$ = s => [...root.querySelectorAll(s)];
const C = { ecto:'#7198c8', meso:'#c8878d', endo:'#bf963e', cell:'#a4c1c5', nucleus:'#437f78', white:'#26364b', muted:'#5e6e80', line:'#c4cfdc', bg:'#f5f8fb', gray:'#84989e' };
const state = { tab:'development', time:0, playing:false, speed:1, view:'section', labels:true, trail:true, layer:'ecto', myod:0, myodPlaying:false, selectedCell:'neuron', reduced:matchMedia('(prefers-reduced-motion: reduce)').matches };
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
const layerData = {
  ecto:{name:'외배엽',en:'ECTODERM',desc:'몸 바깥을 덮는 표피와 신경계 등으로 이어집니다.',items:[['신경계','신경세포가 정보를 받아 전달합니다.'],['표피','바깥 환경으로부터 몸을 보호하는 장벽을 만듭니다.']],targets:['신경계','표피'],action:'신경세포의 유전자 발현 보기 →',cell:'neuron'},
  meso:{name:'중배엽',en:'MESODERM',desc:'골격근, 뼈, 혈액, 콩팥의 주요 조직 등으로 이어집니다.',items:[['골격근','근육 단백질의 작용으로 수축하여 몸을 움직입니다.'],['뼈 · 혈액 · 콩팥','지지, 물질 운반, 노폐물 배출 등 다양한 기능을 담당합니다.']],targets:['골격근','뼈 · 혈액 · 콩팥'],action:'골격근 분화와 MyoD 보기 →',cell:'muscle'},
  endo:{name:'내배엽',en:'ENDODERM',desc:'소화관과 호흡기의 상피, 간·췌장의 주요 기능 세포 등으로 이어집니다.',items:[['장 상피','소화된 영양소를 흡수합니다.'],['간 · 췌장 · 호흡기 상피','대사, 분비, 기체 교환 등과 관련된 기능을 담당합니다.']],targets:['장 상피','간 · 췌장 · 호흡기 상피'],action:'장 상피세포의 유전자 발현 보기 →',cell:'epithelial'}
};
const myodSteps = [
  {short:'신호 받기',title:'분화 신호를 받습니다.',desc:'골격근으로 분화할 수 있는 전구세포가 신호를 받습니다. MyoD 유전자는 이미 이 세포의 DNA에 들어 있습니다.'},
  {short:'MyoD 유전자 발현',title:'MyoD 유전자가 발현됩니다.',desc:'핵 속 DNA의 MyoD 유전자가 전사되어 mRNA가 만들어집니다. mRNA는 핵 밖으로 이동합니다.'},
  {short:'MyoD 단백질 합성',title:'조절 단백질이 만들어집니다.',desc:'세포질에서 mRNA가 번역되어 MyoD 단백질이 만들어집니다. 이 단백질이 핵으로 들어가 유전자 발현 조절에 참여합니다.'},
  {short:'근육 관련 유전자 발현',title:'여러 유전자의 발현을 조절합니다.',desc:'MyoD 단백질은 다른 조절인자와 함께 작용해 근육 분화 관련 유전자들의 발현을 조절합니다. 근육 단백질의 합성이 증가합니다.'},
  {short:'골격근 세포 분화',title:'형태와 기능이 달라집니다.',desc:'근아세포들이 길어지고 서로 융합해 여러 핵을 가진 근관을 형성합니다. 근육 단백질이 배열되고, 이후 성숙하면서 수축 기능을 갖춥니다.'}
];
const questions = [
  {q:'난할로 8세포기가 되면 배아 전체 크기도 약 8배가 될까요?',options:['그렇다','아니다'],answer:1,why:'초기 난할에서는 배아 전체 크기가 거의 일정하고, 개별 세포가 작아집니다.'},
  {q:'배반포의 바깥 세포층이 그대로 몸의 외배엽이 될까요?',options:['그렇다','아니다'],answer:1,why:'몸의 세 배엽은 상배엽에서 유래합니다. 배반포 바깥 세포층은 태반 일부 등으로 이어집니다.'},
  {q:'몸을 구성하는 세 배엽의 공통 출발점은?',options:['상배엽','세포마다 다른 DNA'],answer:0,why:'상배엽의 세포들이 이동하고 분화하여 외배엽·중배엽·내배엽을 형성합니다.'},
  {q:'골격근세포와 신경세포가 다른 주요 이유는?',options:['서로 다른 유전자만 보유','유전자 발현 양상이 다름'],answer:1,why:'일반적인 체세포는 같은 유전정보를 가지며, 발현되는 유전자의 종류와 양이 달라집니다.'}
];
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function ease(t){t=clamp(t);return t*t*(3-2*t);}
function rgba(hex,a){return hex+Math.round(clamp(a)*255).toString(16).padStart(2,'0');}
function context(id){const canvas=$(id);return canvas.getContext('2d');}
const mc=context('#myodCanvas');
const webglFailure=canvas=>()=>{canvas.parentElement.insertAdjacentHTML('beforeend','<p class="webgl-error">3차원 화면을 시작하지 못했습니다. WebGL을 지원하는 최신 브라우저에서 다시 열어 주세요.</p>');};
const development3d=new EmbryoView($('#embryoCanvas'),{labelHost:$('#developmentLabels'),sectionCanvas:$('#developmentSection'),onError:webglFailure($('#embryoCanvas'))});
const layers3d=new EmbryoView($('#layerCanvas'),{labelHost:$('#layerLabels'),sectionCanvas:$('#layerSection'),onError:webglFailure($('#layerCanvas'))});
state.layerTime=0;state.layerPlaying=false;
function viewOptions(){return {section:state.view==='section',cut:+$('#cutDepth').value,opacity:+$('#outerOpacity').value,labels:state.labels,trail:state.trail};}
function drawDevelopment(){development3d.update(state.time,viewOptions());}
function drawLayers(){layers3d.update(8.999+state.layerTime*1.999,{section:$('#layerCut').checked,cut:+$('#layerCutDepth').value,opacity:1,labels:true,trail:true,highlight:state.layer});$('#layerProgress').value=state.layerTime;$('#layerPhase').textContent=state.layerTime<.06?'세 배엽이 형성된 원반':state.layerTime<.5?'원반이 접히며 몸의 안과 밖이 정해집니다':'신경관·장관·근육으로 이어질 조직';}
function layerPlay(on){state.layerPlaying=on;$('#layerPlay').textContent=on?'Ⅱ 일시정지':'▶ 변화 과정 재생';}
function init3d(){
  $$('[data-view]').forEach(b=>b.onclick=()=>development3d.view(b.dataset.view));
  $$('[data-layer-view]').forEach(b=>b.onclick=()=>layers3d.view(b.dataset.layerView));
  $('#cutDepth').oninput=drawDevelopment;$('#outerOpacity').oninput=drawDevelopment;
  $('#layerCutDepth').oninput=drawLayers;$('#layerCut').onchange=drawLayers;
  $('#layerProgress').oninput=e=>{state.layerTime=+e.target.value;layerPlay(false);drawLayers();};
  $('#layerPlay').onclick=()=>{if(state.layerTime>=.999)state.layerTime=0;layerPlay(!state.layerPlaying);drawLayers();};
}

function ellipse(c,x,y,rx,ry,fill,stroke,line=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
function line(c,points,color,width=2,dash=[]){c.beginPath();c.moveTo(...points[0]);points.slice(1).forEach(p=>c.lineTo(...p));c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
function text(c,str,x,y,size=17,color=C.white,align='center',weight=400){c.font=`${weight} ${size}px "Pretendard ATLL", Pretendard, sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(str,x,y);}
function roundRect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function arrow(c,x1,y1,x2,y2,color=C.muted,width=2){const a=Math.atan2(y2-y1,x2-x1);line(c,[[x1,y1],[x2,y2]],color,width);c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-9*Math.cos(a-.48),y2-9*Math.sin(a-.48));c.lineTo(x2-9*Math.cos(a+.48),y2-9*Math.sin(a+.48));c.closePath();c.fillStyle=color;c.fill();}
function bezier(c,a,b,d,e,color,width=2,dash=[]){c.beginPath();c.moveTo(...a);c.bezierCurveTo(...b,...d,...e);c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
function bezPoint(a,b,c,d,t){const n=1-t;return [n*n*n*a[0]+3*n*n*t*b[0]+3*n*t*t*c[0]+t*t*t*d[0],n*n*n*a[1]+3*n*n*t*b[1]+3*n*t*t*c[1]+t*t*t*d[1]];}
function cell(c,x,y,r,color=C.cell,sy=1,selected=false){const g=c.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r);g.addColorStop(0,rgba(color,.94));g.addColorStop(1,rgba(color,.56));ellipse(c,x,y,r,r*sy,g,rgba(color,.95),1.8);ellipse(c,x+r*.08,y+r*.02,r*.24,r*.24*sy,rgba('#1d5457',.8),rgba(color,.65),1);ellipse(c,x+r*.13,y-r*.04,r*.07,r*.07,rgba(color,.6));if(selected)ellipse(c,x,y,r+6,(r+6)*sy,null,'#f8e5a6',2);}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,.12));g.addColorStop(1,rgba(color,0));ellipse(c,x,y,r,r,g);}
function background(c,w,h){c.clearRect(0,0,w,h);c.fillStyle=C.bg;c.fillRect(0,0,w,h);c.fillStyle='#9abbb40d';for(let x=25;x<w;x+=30)for(let y=25;y<h;y+=30)ellipse(c,x,y,.8,.8,c.fillStyle);}
function label(c,str,x,y,tx,ty,color=C.muted){if(!state.labels)return;const align=x<tx?'right':'left';line(c,[[tx,ty],[x+(align==='right'?12:-12),y]],rgba(color,.65),1);ellipse(c,tx,ty,3,3,color);text(c,str,x,y,17,color,align);}
function drawNeuron(c,x,y,s=1,dark=true){c.save();c.translate(x,y);c.scale(s,s);const color=C.ecto;c.lineCap='round';for(let k=0;k<7;k++){const a=k*5.1/7+1;const p=[Math.cos(a)*70,Math.sin(a)*60];line(c,[[0,0],p],color,4);for(let j=-1;j<=1;j+=2)line(c,[p,[p[0]+Math.cos(a+j*.6)*27,p[1]+Math.sin(a+j*.6)*27]],color,2);}line(c,[[15,0],[150,3],[180,-17]],color,4);line(c,[[150,3],[180,27]],color,3);for(let k=0;k<4;k++)roundRect(c,40+k*26,-3,19,12,5,dark?'#c9dbed':'#d8e6f6');cell(c,0,0,21,color,1.05);c.restore();}
function drawMuscle(c,x,y,s=1,dark=true){c.save();c.translate(x,y);c.scale(s,s);roundRect(c,-115,-35,230,70,28,dark?'#b96977':'#e7a2a8',C.meso);for(let j=-90;j<=90;j+=12)line(c,[[j,-29],[j,29]],dark?'#f0b6ba66':'#a6637070',3);for(let j=-75;j<100;j+=58)ellipse(c,j,-20,8,5,'#704556');line(c,[[-100,2],[102,2]],'#f8d3c788',1);c.restore();}
function drawEpithelial(c,x,y,s=1,dark=true){c.save();c.translate(x,y);c.scale(s,s);for(let i=0;i<5;i++){const xx=-90+i*39;roundRect(c,xx,-33,34,78,6,dark?'#ccad67':'#ead29c',C.endo);ellipse(c,xx+17,16,7,11,'#9b8044');for(let j=0;j<4;j++)line(c,[[xx+4+j*8,-33],[xx+4+j*8,-48]],C.endo,3);}line(c,[[-100,49],[114,49]],dark?'#b7bbb3':'#9aada4',3);c.restore();}
function dna(c,x,y,w,color='#9bc8b8',active=false){for(let j=0;j<=w;j+=10){const yy=Math.sin(j*.065)*15;line(c,[[x+j,y+yy],[x+j,y-yy]],rgba(color,.5),2);ellipse(c,x+j,y+yy,2.5,2.5,color);ellipse(c,x+j,y-yy,2.5,2.5,color);}if(active){roundRect(c,x+w*.3,y-24,w*.42,48,6,'#dcba5c22','#e2c574');}}
function drawMyod(){background(mc,1100,470);const step=Math.min(4,Math.floor(state.myod)),p=state.myod-step;
  if(step===4){const f=ease(p);text(mc,'근아세포',220,65,22,C.meso);text(mc,'다핵 근관 → 성숙한 골격근 섬유',760,65,22,C.meso);for(let j=0;j<3;j++){mc.globalAlpha=1-ease((p-.5)/.25);cell(mc,lerp(180+j*50,640+j*120,f),lerp(160+j*74,240,f),lerp(42,65,f),C.meso,lerp(.58,.85,f));mc.globalAlpha=1;if(state.trail)arrow(mc,310,170+j*65,480,235,C.meso,2);}mc.globalAlpha=ease((p-.4)/.45);drawMuscle(mc,760,240,1.8,false);mc.globalAlpha=1;if(f>.65){for(let j=0;j<4;j++)arrow(mc,580+j*100,350,610+j*80,350,C.meso,2);text(mc,'근육 단백질이 배열되어 수축 기능을 갖춥니다',750,402,19,C.muted);text(mc,'여러 핵',760,130,17,C.muted);}text(mc,'융합',420,310,18,C.muted);return;}
  glow(mc,490,240,260,C.cell);ellipse(mc,480,240,350,170,'#8cbdb80c','#7facab66',2);ellipse(mc,365,240,142,112,'#d5e2ed','#6f999f',2);text(mc,'핵',365,151,17,C.muted);text(mc,'세포질',700,373,17,C.muted);dna(mc,265,222,200,'#507f8c',step===1);text(mc,'MyoD 유전자',365,269,17,step>=1?'#8c6a21':C.muted);text(mc,'이미 DNA 안에 있습니다',365,299,13,C.muted);
  for(let j=0;j<3;j++){ellipse(mc,115-j*15,180+j*37,6,6,'#e4c56a');}if(step===0){arrow(mc,105,240,184,240,C.endo,3);text(mc,'분화 신호',100,116,19,C.endo);text(mc,'골격근으로 분화 가능한 전구세포',500,435,19,C.muted);return;}
  const mrnaT=step===1?ease(p):1;const mx=lerp(385,620,mrnaT),my=lerp(200,205,mrnaT);bezier(mc,[mx-35,my],[mx-20,my-23],[mx+15,my+23],[mx+38,my-5],C.endo,4);text(mc,'mRNA',mx,my-40,17,C.endo);if(state.trail)arrow(mc,440,180,585,180,'#e5c97566',2);
  if(step>=2){ellipse(mc,625,220,38,18,'#657c83','#97b3b7',1);text(mc,'단백질 합성',655,290,17,C.muted);const t=step===2?ease(p):1;const [px,py]=bezPoint([670,220],[720,350],[430,380],[403,330],t);roundRect(mc,px-17,py-14,34,28,7,'#e6a2b8','#f4d4df');text(mc,'MyoD 단백질',px,py+38,17,'#a65776');if(state.trail)bezier(mc,[690,240],[720,365],[520,387],[453,320],'#ecb4cb65',2,[5,6]);}
  if(step===3){roundRect(mc,820,80,250,300,14,'#e6edf5','#52737c');text(mc,'핵 속 유전자 · 확대',945,108,17,C.muted);text(mc,'근육 분화 관련 유전자들',945,138,16,C.meso);for(let j=0;j<3;j++){dna(mc,850,185+j*65,180,C.meso);const f=clamp(p*3-j*.35);roundRect(mc,850,209+j*65,180*f,5,2,C.endo);if(f>.2)roundRect(mc,857,158+j*65,21,18,4,'#e6a2b8','#f4d4df');}text(mc,'발현 증가 → 근육 단백질 합성',940,405,15,C.endo);bezier(mc,[440,310],[670,390],[700,200],[810,200],C.meso,2,[5,6]);text(mc,'다른 조절인자와 함께 작용',510,439,17,C.muted);}
}
function stageIndex(){return Math.min(10,Math.floor(state.time));}
let lastStage=-1;
function updateStage(force=false){const i=stageIndex(),s=stages[i];$('#timeSlider').value=state.time;$('#progressLabel').textContent=`${String(i+1).padStart(2,'0')} / 11`;$('#prev').disabled=i===0;$('#next').disabled=i===10;if(i===lastStage&&!force)return;lastStage=i;$('#stageTitle').textContent=s.name;$('#phaseName').textContent=s.phase;$('#stageTime').textContent=`수정 후 ${s.day}`;$('#infoTitle').textContent=s.title;$('#infoText').textContent=s.text;$('#keyText').textContent=s.key;$('#factLabel').textContent=s.fact[0];$('#factValue').textContent=s.fact[1];$('#connectionText').textContent=s.gene;$('#viewCaption').textContent=s.caption;$('#questionArea').hidden=true;$('#questionButton').setAttribute('aria-expanded','false');$$('#stageButtons button').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-current',i===j?'step':'false');});}
function setPlaying(value){state.playing=value;$('#play').innerHTML=value?'Ⅱ <span>일시정지</span>':'▶ <span>재생</span>';$('#play').setAttribute('aria-label',value?'발생 일시정지':'발생 재생');}
function seek(t,stop=true){state.time=clamp(t,0,10.999);if(stop)setPlaying(false);updateStage();drawDevelopment();}
function selectTab(tab){state.tab=tab;setPlaying(false);setMyodPlaying(false);layerPlay(false);$$('.tabs button').forEach(b=>{const on=b.dataset.tab===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});$$('[role="tabpanel"]').forEach(el=>el.hidden=el.id!==tab);if(tab==='development')drawDevelopment();if(tab==='layers')drawLayers();if(tab==='expression'){drawComparisons();drawMyod();}}
function selectLayer(layer){state.layer=layer;const d=layerData[layer];$('#layerEnglish').textContent=d.en;$('#layerName').textContent=d.name;$('#layerDescription').textContent=d.desc;$('#layerAction').textContent=d.action;$('#tissueList').innerHTML=d.items.map(([name,desc])=>`<div class="tissue-item"><strong>${name}</strong><p>${desc}</p></div>`).join('');$$('[data-layer]').forEach(b=>{const on=b.dataset.layer===layer;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});drawLayers();}
const cells=[{id:'neuron',name:'신경세포',layer:'외배엽 유래',fn:'길게 뻗은 돌기로 신호 전달',values:[95,8,18,80]}, {id:'muscle',name:'골격근세포',layer:'중배엽 유래',fn:'정렬된 근육 단백질로 수축',values:[15,95,12,80]}, {id:'epithelial',name:'장 상피세포',layer:'내배엽 유래',fn:'표면의 구조와 운반 단백질로 흡수',values:[12,10,95,80]}];
function setupComparisons(){const genes=['신경 기능 관련','골격근 수축 관련','장 흡수 기능 관련','공통 생명 유지'];$('#cellComparison').innerHTML=cells.map(d=>`<article class="cell-card" data-cell="${d.id}"><div class="cell-card-top"><h3>${d.name}</h3><span>${d.layer}</span></div><canvas width="400" height="180" aria-label="${d.name} 형태 모형"></canvas><p class="cell-function">${d.fn}</p><div class="dna-row"><span>같은 유전자 목록</span><span class="dna-strip">ATGC·ATGC</span></div>${genes.map((g,j)=>`<div class="gene-row"><span>${g}</span><div class="gene-bar" role="img" aria-label="${g} 유전자 발현: ${d.values[j]>70?'높음':'낮음'}"><i style="width:${d.values[j]}%;background:${j===3?'#7eaa96':C[['ecto','meso','endo'][cells.indexOf(d)]]}"></i></div><small>${d.values[j]>70?'높음':'낮음'}</small></div>`).join('')}</article>`).join('');}
function drawComparisons(){cells.forEach(d=>{const el=$(`[data-cell="${d.id}"]`),c=el.querySelector('canvas').getContext('2d');el.classList.toggle('selected',d.id===state.selectedCell);c.clearRect(0,0,400,180);if(d.id==='neuron')drawNeuron(c,160,95,1,false);if(d.id==='muscle')drawMuscle(c,200,95,1.25,false);if(d.id==='epithelial')drawEpithelial(c,200,87,1.1,false);});}
let lastMyod=-1;
function updateMyod(){const i=Math.min(4,Math.floor(state.myod));$('#myodSlider').value=state.myod;if(lastMyod===i)return;lastMyod=i;$('#myodStageNumber').textContent=`STEP ${String(i+1).padStart(2,'0')}`;$('#myodTitle').textContent=myodSteps[i].title;$('#myodDescription').textContent=myodSteps[i].desc;$$('#myodSteps button').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-current',i===j?'step':'false');});}
function setMyodPlaying(on){state.myodPlaying=on;$('#myodPlay').textContent=on?'Ⅱ 일시정지':'▶ 분화 과정 재생';}
function question(){const i=stageIndex();const q=questions[i<5?0:i===5?1:i<9?2:3];const area=$('#questionArea');if(!area.hidden){area.hidden=true;$('#questionButton').setAttribute('aria-expanded','false');return;}area.hidden=false;$('#questionButton').setAttribute('aria-expanded','true');area.innerHTML=`<p>${q.q}</p><div>${q.options.map((s,j)=>`<button data-answer="${j}">${s}</button>`).join('')}</div><p class="feedback" role="status"></p>`;area.querySelectorAll('button').forEach(b=>b.onclick=()=>{area.querySelector('.feedback').textContent=(+b.dataset.answer===q.answer?'맞아요. ':'다시 생각해 보세요. ')+q.why;});}
function dialog(html){$('#dialogContent').innerHTML=html;$('#infoDialog').showModal();}
function init(){
  init3d();
  $('#stageButtons').innerHTML=stages.map((s,i)=>`<button data-stage="${i}">${s.short}<small>${s.day}</small></button>`).join('');
  $$('[data-stage]').forEach(b=>b.onclick=()=>seek(+b.dataset.stage+.82));
  $$('[data-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));
  $('.tabs').addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const tabs=$$('[data-tab]');let i=tabs.findIndex(b=>b.classList.contains('active'));i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;selectTab(tabs[i].dataset.tab);tabs[i].focus();});
  $('#play').onclick=()=>{if(state.time>=10.998)seek(0);else if(!state.playing&&state.time%1>.998)seek(Math.floor(state.time)+1);setPlaying(!state.playing);};
  $('#prev').onclick=()=>seek(Math.max(0,stageIndex()-1)+.82);$('#next').onclick=()=>seek(Math.min(10,stageIndex()+1)+.82);
  $('#timeSlider').oninput=e=>seek(+e.target.value);$('#speed').onchange=e=>state.speed=+e.target.value;
  $('#sectionView').onclick=()=>{state.view='section';updateView();};$('#outsideView').onclick=()=>{state.view='outside';updateView();};
  $('#showLabels').onchange=e=>{state.labels=e.target.checked;drawDevelopment();};$('#showTrail').onchange=e=>{state.trail=e.target.checked;drawDevelopment();};
  $('#questionButton').onclick=question;$('#nextTopic').onclick=()=>selectTab('layers');$('#backGastrula').onclick=()=>{selectTab('development');seek(7);setPlaying(true);};
  $$('[data-layer]').forEach(b=>b.onclick=()=>selectLayer(b.dataset.layer));
  $('#layerAction').onclick=()=>{state.selectedCell=layerData[state.layer].cell;selectTab('expression');if(state.layer==='meso')$('.myod-header').scrollIntoView({behavior:state.reduced?'instant':'smooth',block:'start'});};
  $('#myodSteps').innerHTML=myodSteps.map((s,i)=>`<button data-myod="${i}"><span>0${i+1}</span>${s.short}</button>`).join('');
  $$('[data-myod]').forEach(b=>b.onclick=()=>{state.myod=+b.dataset.myod+.85;setMyodPlaying(false);updateMyod();drawMyod();});
  $('#myodPlay').onclick=()=>{if(state.myod>=4.998)state.myod=0;setMyodPlaying(!state.myodPlaying);};
  $('#myodReset').onclick=()=>{state.myod=0;setMyodPlaying(false);updateMyod();drawMyod();};
  $('#myodSlider').oninput=e=>{state.myod=+e.target.value;setMyodPlaying(false);updateMyod();drawMyod();};
  $('#fullScreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{dialog('<h2>수업 화면</h2><p>현재 브라우저에서는 전체 화면 전환이 제한되어 있습니다. 브라우저의 전체 화면 기능(F11)을 사용해 주세요.</p>');}};
  $('#help').onclick=()=>dialog('<h2>관찰 방법</h2><h3>01 · 시간을 움직이기</h3><p>화면을 드래그하면 모형이 회전합니다. 방향키로도 회전할 수 있습니다. 절개 깊이와 겉층 불투명도를 조절해 내부를 확인하세요. 재생 버튼을 누르거나 아래 시간 막대를 드래그하세요. 단계 이름을 누르면 해당 단계의 모습을 바로 볼 수 있습니다. 낭배 형성은 위에서 본 모습과 단면을 함께 관찰하세요.</p><h3>02 · 배엽에서 기관으로</h3><p>외배엽·중배엽·내배엽을 선택하고 변화 과정 재생을 눌러 원반이 접히는 모습을 관찰하세요. 연결 버튼을 누르면 해당 세포의 유전자 발현 비교로 이동합니다.</p><h3>03 · 같은 DNA, 다른 기능</h3><p>세 세포의 발현 양상을 비교한 뒤 MyoD 분화 과정을 재생하세요. 진행 막대로 전사, 단백질 합성, 발현 조절, 분화 장면을 다시 살펴볼 수 있습니다.</p><h3>수업에 활용하기</h3><p>‘단계마다 멈춤’으로 설명 시간을 확보하고 ‘생각해 보기’로 학생의 예측을 확인하세요. 모든 재생은 사용자가 시작하며, 답변은 저장하거나 전송하지 않습니다.</p>');
  $('#sources').onclick=()=>dialog('<h2>모형 안내 · 참고 자료</h2><p>사람 발생을 고급생명과학 수준으로 단순화한 교육용 시각화입니다. 현미경 영상이나 실제 세포 추적 데이터가 아니며, 세포 수·크기·시간·색과 이동 경로는 핵심 개념을 설명하기 위한 표현입니다.</p><h3>표현 범위</h3><p>시간은 수정 후 경과 시간입니다. 초기 난할은 대표 단계를 보여주며, 기관 형성·분화는 실제로 겹쳐 진행됩니다. 주변 배외 구조와 세부 조절인자는 생략하거나 흐리게 표현했습니다. 모형은 회전·절개할 수 있는 3차원 교육용 구조입니다. 실제 배아의 영상에서 재구성한 자료나 세포 역학 계산은 아닙니다. 배엽의 두께와 세포 크기를 확대하고 배외 구조를 일부 생략했습니다.</p><h3>발생과 배엽</h3><a href="https://embryology.med.unsw.edu.au/embryology/index.php/BGDA_Practical_3_-_Gastrulation" target="_blank" rel="noopener">UNSW Embryology · 사람의 낭배 형성 ↗</a><br><a href="https://embryology.med.unsw.edu.au/embryology/index.php/ANAT2341_Lab_5_-_Trilaminar_Embryo" target="_blank" rel="noopener">UNSW Embryology · 세 배엽과 배아의 접힘 ↗</a><h3>세포 분화와 MyoD</h3><a href="https://www.ncbi.nlm.nih.gov/books/NBK26854/" target="_blank" rel="noopener">Molecular Biology of the Cell · 세포 유형과 유전자 발현 ↗</a><br><a href="https://journals.biologists.com/dev/article/132/12/2685/42910/The-circuitry-of-a-master-switch-Myod-and-the" target="_blank" rel="noopener">Development · MyoD와 골격근 발현 조절 ↗</a>');
  $('.dialog-close').onclick=()=>$('#infoDialog').close();$('#infoDialog').addEventListener('click',e=>{if(e.target===$('#infoDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  setupComparisons();selectLayer('ecto');updateStage();updateMyod();drawDevelopment();$$('[data-tab]').forEach((b,i)=>b.tabIndex=i===0?0:-1);
}
function updateView(){$('#cutDepth').disabled=state.view!=='section';$('#sectionView').classList.toggle('active',state.view==='section');$('#outsideView').classList.toggle('active',state.view==='outside');$('#sectionView').setAttribute('aria-pressed',String(state.view==='section'));$('#outsideView').setAttribute('aria-pressed',String(state.view==='outside'));drawDevelopment();}
let previous=0;
function tick(now){const dt=Math.min(.07,(now-previous)/1000)||0;previous=now;if(!document.hidden){if(state.playing&&state.tab==='development'){const before=stageIndex();let next=Math.min(10.999,state.time+dt*state.speed/9);if($('#pauseEach').checked&&Math.floor(next)>before){next=before+.999;setPlaying(false);}state.time=next;if(state.time>=10.999)setPlaying(false);updateStage();drawDevelopment();}if(state.layerPlaying&&state.tab==='layers'){state.layerTime=Math.min(1,state.layerTime+dt*state.speed/18);if(state.layerTime>=1)layerPlay(false);drawLayers();}if(state.myodPlaying&&state.tab==='expression'){state.myod=Math.min(4.999,state.myod+dt/6);if(state.myod>=4.999)setMyodPlaying(false);updateMyod();drawMyod();}}requestAnimationFrame(tick);}
init();requestAnimationFrame(tick);
