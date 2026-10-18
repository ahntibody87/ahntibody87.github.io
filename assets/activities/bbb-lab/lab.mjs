import {defaults,neutralFraction,properties,experiment} from './model.mjs';

const root=document.querySelector('#bbb-lab');
const $=id=>root.querySelector(`#bbb-${id}`);
const ids=['logp','mw','psa','hbd','pka','ph','kind','route','blood','release'];
const kindNames={base:'약한 염기형',acid:'약한 산형',neutral:'비이온화형'};
const canvas=$('scene'),ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let p={...defaults},runs=experiment(p),index=0,running=false,last=0,elapsed=0,raf=0,recordCount=0;
const records=[];
const fmt=(v,d=1)=>Number(v).toFixed(d);
const pct=v=>`${fmt(v)}%`;
const rand=(i,s=0)=>{const v=Math.sin(i*127.1+s*311.7)*43758.5453;return v-Math.floor(v);};
const circle=(x,y,r,fill,stroke)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};
function path(points,color,width=1){ctx.beginPath();ctx.moveTo(...points[0]);for(const pt of points.slice(1))ctx.lineTo(...pt);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function ellipse(x,y,rx,ry,fill,stroke,rotation=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function text(label,x,y,color='#b8cbd4',size=14,align='left'){ctx.font=`${size}px "Segoe UI","Malgun Gothic",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(label,x,y);}
function label(words,x,y,anchorX,anchorY,color='#b3cad2') {
  if(anchorX!==undefined)path([[x+4,y+8],[x+4,anchorY],[anchorX,anchorY]],color,.8);
  const w=Math.max(...words.map(t=>t.length))*13+18;
  ctx.fillStyle='rgba(13,30,42,.86)';ctx.fillRect(x-6,y-17,w,words.length*20+7);
  words.forEach((t,i)=>text(t,x,y+i*20,color,13));
}
function membrane(x,start,end) {
  for(let y=start;y<end;y+=9){
    circle(x,y,2.5,'#8cbdb8');circle(x+9,y,2.5,'#8cbdb8');
    path([[x+2,y],[x+6,y-1]],'#608c89',1);
  }
}
function transporter(x,y,color='#d2b16a'){
  ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(x,y,10,20,0,Math.PI*.24,Math.PI*1.76);ctx.strokeStyle=color;ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y,5,12,0,-Math.PI*.76,Math.PI*.76);ctx.stroke();
  ctx.lineWidth=1;
}
function drawStructure() {
  const g=ctx.createLinearGradient(0,0,1060,0);
  g.addColorStop(0,'#302733');g.addColorStop(.37,'#282b36');g.addColorStop(.40,'#112e37');g.addColorStop(1,'#102a36');
  ctx.fillStyle=g;ctx.fillRect(0,0,1060,680);
  // Capillary lumen: blood flows along, rather than through, the vessel wall.
  for(let i=0;i<8;i++){
    ctx.beginPath();ctx.moveTo(25+i*50,55);ctx.bezierCurveTo(i*50-5,220,i*50+60,450,35+i*50,640);ctx.strokeStyle='rgba(193,132,142,.07)';ctx.stroke();
  }
  text('혈관 내강',28,35,'#d9a5aa',17);text('BLOOD',28,55,'#a67c88',10);
  text('뇌 간질 · 뇌 조직',788,35,'#a4c8cc',17);text('BRAIN INTERSTITIUM',788,55,'#6e999e',10);
  path([[48,95],[48,155],[43,147],[48,155],[53,147]],'#ad7b87',1.4);text('혈류',63,126,'#bd919b',13);
  // Continuous endothelial layer and its two plasma membranes.
  const cellGradient=ctx.createLinearGradient(410,0,546,0);
  cellGradient.addColorStop(0,'#23555a');cellGradient.addColorStop(.5,'#386c6b');cellGradient.addColorStop(1,'#204b55');
  ctx.fillStyle=cellGradient;ctx.fillRect(410,65,136,562);
  membrane(411,65,627);membrane(535,65,627);
  for(const [y,h] of [[65,180],[247,202],[451,176]]){
    ellipse(484,y+h*.54,22,53,'#245058','#749b98',-.12);
    ellipse(483,y+h*.53,14,40,'#173b48');
    for(let i=0;i<7;i++)ellipse(448+rand(i,y)*69,y+18+rand(i,y+1)*(h-30),3,6,'#497a77');
  }
  // Junctional complexes span cell-cell contacts; no open paracellular gate.
  for(const y of [246,450]){
    path([[418,y],[536,y]],'#172c39',4);
    path([[418,y-3],[426,y+3],[434,y-3],[442,y+3],[450,y-3]],'#e0c1a0',3);
    for(let x=455;x<535;x+=10)path([[x,y-2],[x+5,y+2]],'#80a6a2',1);
  }
  // Basement membrane with embedded matrix, pericyte outside endothelium.
  ctx.fillStyle='#52686b';ctx.fillRect(550,65,14,562);
  for(let y=70;y<625;y+=13)path([[550,y],[563,y+9]],'#7b8b7e',.7);
  ellipse(582,163,16,58,'#867b74','#b0a190',.06);
  ellipse(583,165,7,24,'#504d58');
  ctx.beginPath();ctx.moveTo(579,105);ctx.bezierCurveTo(565,78,575,73,572,67);ctx.moveTo(580,217);ctx.bezierCurveTo(569,260,575,291,570,325);ctx.strokeStyle='#897f75';ctx.lineWidth=7;ctx.stroke();
  // Astrocytic processes and endfeet wrap the abluminal surface; they are not
  // an extra tight-junction barrier and do not make every molecule cross a soma.
  for(const [y,endY] of [[96,200],[322,370],[507,450],[602,490]]){
    ctx.beginPath();ctx.moveTo(800,385);ctx.bezierCurveTo(745,endY,658,y,595,y);ctx.strokeStyle='#456e82';ctx.lineWidth=10;ctx.stroke();
    ellipse(592,y,12,40,'#527e8b','#7196a0');
  }
  ellipse(817,389,40,46,'#3f637a','#7c9ba7',-.2);ellipse(819,390,16,22,'#243f5d');
  for(const [x,y] of [[947,250],[1015,430],[934,578]]){
    ctx.beginPath();ctx.moveTo(838,391);ctx.bezierCurveTo(895,370,x-20,y+25,x,y);ctx.strokeStyle='#456e82';ctx.lineWidth=5;ctx.stroke();
  }
  // Faint neuronal neurites in the interstitium, spatially separate from BBB.
  ctx.strokeStyle='#4a625f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1020,80);ctx.bezierCurveTo(950,110,962,142,1030,180);ctx.moveTo(979,121);ctx.lineTo(928,95);ctx.moveTo(1025,640);ctx.bezierCurveTo(942,609,976,559,1035,515);ctx.stroke();
  if($('background').checked) {
    // Red blood cells remain inside the lumen; no crossing animation.
    for(let i=0;i<7;i++){
      const x=110+rand(i,3)*235,y=80+((rand(i,4)*530+index*1.6)%535);
      ellipse(x,y,25,12,'#663c4b','#985665',rand(i,8)-.5);ellipse(x,y,13,5,'#422f3c',null,rand(i,8)-.5);
    }
    for(let i=0;i<42;i++){
      const x=27+rand(i,7)*355,y=75+((rand(i,9)*540+index*.8)%540);
      if(i%4===0){ellipse(x,y,8,5,'#8892a1');ellipse(x+5,y-3,4,4,'#8892a1');}
      else if(i%4===1){circle(x,y,2.7,'#cb7982');circle(x+4,y+1,2.7,'#cb7982');}
      else if(i%4===2){circle(x,y,3,'#7fa8cf');}
      else {ctx.fillStyle='#d2b261';ctx.fillRect(x-3,y-3,6,6);}
    }
    for(let i=0;i<9;i++)circle(650+rand(i,20)*355,80+rand(i,21)*520,2.5,i%2?'#cb7982':'#7fa8cf');
  }
  transporter(418,552);transporter(539,552);
  if(p.pro && p.route==='carrier'){transporter(418,345,'#b59ad1');transporter(539,345,'#b59ad1');}
  if($('labels').checked){
    label(['혈관 내피세포'],409,50);
    label(['치밀결합','세포 사이 이동 제한'],234,220,431,246,'#e0c1a0');
    label(['기저막'],608,76,559,89);
    label(['주위세포'],627,148,590,165,'#c6b6a3');
    label(['성상세포','발끝으로 혈관을 감쌈'],801,463,817,425);
    label(['포도당 운반체'],220,600,419,553,'#d9c087');
    if(p.pro && p.route==='carrier')label(['아미노산 운반체','맞는 구조를 선택적으로 운반'],180,338,417,345,'#c5afe0');
  }
  ctx.fillStyle='rgba(8,22,33,.6)';ctx.fillRect(0,645,1060,35);
  text('BBB 단면 모식도 · 크기·간격은 실제 축척이 아님',22,667,'#88a6b2',12);
}
const particles=Array.from({length:90},(_,i)=>({x:35+rand(i,31)*340,y:90+rand(i,32)*510}));
function drawParticles(snap=false){
  const amounts=runs.selected[index].y;
  for(let i=0;i<particles.length;i++){
    const q=(i+.5)/particles.length*100;
    let state=6,cumulative=0;
    for(let j=0;j<amounts.length;j++){cumulative+=amounts[j];if(q<cumulative){state=j;break;}}
    if(state===6)continue;
    const item=particles[i];
    const region=state<2?0:state<4?1:2;
    const x=region===0?35+rand(i,31)*340:region===1?435+rand(i,31)*89:630+rand(i,31)*390;
    let y=92+rand(i,32)*510;
    if(Math.abs(y-246)<20)y+=42;if(Math.abs(y-450)<20)y+=42;
    if(snap || reduced){item.x=x;item.y=y;}else{item.x+=(x-item.x)*.12;item.y+=(y-item.y)*.12;}
    const isPro=state%2===1;
    const r=3.5+(p.mw-100)/700*2;
    if(isPro){circle(item.x,item.y,r+3,null,'#b69ad5');circle(item.x,item.y,r*.65,'#b69ad5');}
    else {circle(item.x,item.y,r,'#eda565','#ffd0a0');}
    // Tiny dots sample the amount in each compartment, not individual trajectories.
  }
}
function scene(snap=false){drawStructure();drawParticles(snap);}
function phCurve(){
  const w=500,h=260,l=48,r=20,t=24,b=43,x=v=>l+(v-3)/8*(w-l-r),y=v=>h-b-v*(h-b-t);
  let svg='';
  for(const f of [0,.5,1])svg+=`<line x1="${l}" y1="${y(f)}" x2="${w-r}" y2="${y(f)}" stroke="#dce6e9" ${f===.5?'stroke-dasharray="4 4"':''}/><text x="${l-8}" y="${y(f)+4}" text-anchor="end" fill="#5d7480" font-size="11">${f*100}%</text>`;
  for(const ph of [3,5,7,9,11])svg+=`<text x="${x(ph)}" y="${h-22}" text-anchor="middle" fill="#5d7480" font-size="11">${ph}</text>`;
  const points=Array.from({length:161},(_,i)=>{const v=3+i*.05;return `${x(v)},${y(neutralFraction(p.kind,p.pka,v))}`;}).join(' ');
  const f=neutralFraction(p.kind,p.pka,p.ph);
  svg+=`<text x="${l}" y="14" fill="#526c79" font-size="11">중성 분자의 비율</text><polyline points="${points}" fill="none" stroke="#087b83" stroke-width="3"/><line x1="${x(p.ph)}" y1="${t}" x2="${x(p.ph)}" y2="${h-b}" stroke="#617a88" stroke-dasharray="4 4"/><circle cx="${x(p.ph)}" cy="${y(f)}" r="5" fill="#087b83" stroke="white" stroke-width="2"/><text x="${x(p.ph)+7}" y="${t+16}" fill="#466674" font-size="11">pH ${fmt(p.ph)}</text><text x="${w-r}" y="${h-4}" text-anchor="end" fill="#5d7480" font-size="11">주변 pH</text>`;
  if(p.kind!=='neutral')svg+=`<circle cx="${x(p.pka)}" cy="${y(.5)}" r="4" fill="#b87824"/><text x="${Math.min(w-95,x(p.pka)+9)}" y="${y(.5)-10}" fill="#93631e" font-size="11">pKa ${fmt(p.pka)}</text>`;
  $('ph-curve').innerHTML=svg;
}
function resultsCurve(){
  const w=680,h=270,l=45,r=16,t=22,b=40;
  const max=Math.max(5,...runs.direct.map(a=>a.y[4]),...runs.selected.map(a=>Math.max(a.y[4],a.y[5])));
  const ceiling=Math.ceil(max/5)*5;
  const x=i=>l+i/120*(w-l-r),y=v=>h-b-v/ceiling*(h-b-t);
  let svg='';
  for(let i=0;i<=4;i++){const v=ceiling*i/4;svg+=`<line x1="${l}" y1="${y(v)}" x2="${w-r}" y2="${y(v)}" stroke="#e2eaed"/><text x="${l-8}" y="${y(v)+4}" text-anchor="end" fill="#5d7480" font-size="10">${fmt(v,v%1?1:0)}%</text>`;}
  for(let i=0;i<=120;i+=30)svg+=`<text x="${x(i)}" y="${h-22}" text-anchor="middle" fill="#5d7480" font-size="10">${i/2}</text>`;
  const line=(samples,state,color,dash='')=>`<polyline points="${samples.slice(0,index+1).map((s,i)=>`${x(i)},${y(s.y[state])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.6" ${dash?'stroke-dasharray="6 4"':''}/>`;
  svg+=line(runs.direct,4,'#718997',true);
  if(p.pro){svg+=line(runs.selected,5,'#a782cc');svg+=line(runs.selected,4,'#087b83');}
  svg+=`<line x1="${x(index)}" x2="${x(index)}" y1="${t}" y2="${h-b}" stroke="#aac1c9" stroke-dasharray="3 4"/><text x="${l}" y="12" fill="#526c79" font-size="10">초기량 대비 비율 · 세로축 자동 조정</text><text x="${w-r}" y="${h-3}" text-anchor="end" fill="#5d7480" font-size="10">관찰 단계</text>`;
  $('result-curve').innerHTML=svg;
}
function readouts(){
  const y=runs.selected[index].y,direct=runs.direct[index].y[4];
  $('brain-active').innerHTML=`${fmt(y[4])}<small>%</small>`;
  $('brain-pro').innerHTML=`${fmt(y[5])}<small>%</small>`;
  $('brain-direct').innerHTML=`${fmt(direct)}<small>%</small>`;
  $('time').textContent=`관찰 단계 ${fmt(index/2,index%2?1:0)} / 60`;
  $('timeline').value=index;
  $('distribution').innerHTML=[['혈액 · 활성 약물',y[0]],['혈액 · 전구약물',y[1]],['내피세포 · 활성 약물',y[2]],['내피세포 · 전구약물',y[3]],['뇌 · 활성 약물',y[4]],['뇌 · 전구약물',y[5]],['제거된 양',y[6]]].map(([name,v])=>`<div><dt>${name}</dt><dd>${pct(v)}</dd></div>`).join('');
  $('result-caption').textContent=p.pro?`같은 원래 약물과 같은 초기량으로 비교합니다. 현재 전구약물 투여군의 뇌 속 활성 약물은 비교군보다 ${fmt(Math.abs(y[4]-direct))}%p ${y[4]>=direct?'많습니다':'적습니다'}.`:'원래 약물 투여군입니다. 전구약물을 선택하면 같은 분자 물성의 원래 약물 투여군을 함께 비교합니다.';
  const t=index/2;
  if(t===0)$('observation').textContent='초기량 100 단위를 혈액 쪽에 투여합니다. 실험 시작 또는 관찰 막대로 이동하세요. 조건을 바꾸면 처음부터 다시 계산합니다.';
  else if(p.pro){
    const route=p.route==='mask'?'극성 부분을 가린 전구약물이 세포막을 통해 양방향 이동합니다.':'아미노산 운반체를 활용하는 전구약물의 선택적 유입과 뇌 쪽 방출을 단순화해 표시합니다.';
    $('observation').textContent=`${route} 뇌에 남아 있는 활성 약물 ${pct(y[4])}, 아직 활성화되지 않은 전구약물 ${pct(y[5])}.`;
  }else $('observation').textContent=`약물은 내피세포의 혈액 쪽 막과 뇌 쪽 막을 거쳐 양방향으로 이동합니다. 현재 초기량의 ${pct(y[4])}가 뇌 속 활성 약물로 남아 있습니다. 세포 사이 치밀결합은 유지됩니다.`;
  resultsCurve();
}
function settings(){
  for(const [id,unit,d] of [['logp','',1],['mw',' Da',0],['psa',' Å²',0],['hbd','개',0],['pka','',1],['ph','',1]])$(id+'-value').textContent=fmt(p[id],d)+unit;
  const neutral=neutralFraction(p.kind,p.pka,p.ph);
  $('pka').disabled=p.kind==='neutral';
  $('pka-value').textContent=p.kind==='neutral'?'적용 안 함':fmt(p.pka);
  $('pro-settings').hidden=!p.pro;
  $('neutral-value').textContent=pct(neutral*100);
  $('neutral-bar').style.width=`${neutral*100}%`;
  $('neutral-note').textContent=p.kind==='neutral'?'이 pH 범위에서 이온화하지 않는 분자로 가정합니다.':`나머지 ${pct((1-neutral)*100)}는 ${p.kind==='acid'?'음':'양'}이온형입니다. 중성형이 수동 막 투과에 더 유리합니다.`;
  $('equilibrium').textContent=p.kind==='base'?'BH⁺ (양이온) ⇄ B (중성) + H⁺':p.kind==='acid'?'HA (중성) ⇄ A⁻ (음이온) + H⁺':'이 pH 범위에서는 중성 상태 유지';
  $('ion-explanation').textContent=p.kind==='base'?`염기형은 pH가 높아질수록 H⁺를 내놓아 중성형 B의 비율이 커집니다. 현재 pH ${fmt(p.ph)}, pKa ${fmt(p.pka)}에서 중성형은 ${pct(neutral*100)}입니다.`:p.kind==='acid'?`산형은 pH가 높아질수록 H⁺를 내놓아 음이온형 A⁻의 비율이 커집니다. 현재 pH ${fmt(p.ph)}, pKa ${fmt(p.pka)}에서 중성형은 ${pct(neutral*100)}입니다.`:'pKa가 필요한 산·염기 평형을 이 범위에서 적용하지 않습니다. 중성 분자도 극성과 수소결합 성질에 따라 통과 경향이 달라집니다.';
  $('route-note').textContent=p.route==='mask'?'극성 부분을 일시적으로 가린 뒤, 뇌에서 가림기를 떼어 원래 약물로 바꾸는 가상 설계입니다.':'아미노산을 운반하는 단백질이 인식하는 구조를 붙인 가상 설계입니다. 실제로 운반될 수 있는 특정 구조를 가정하며, 운반량에는 한계가 있습니다.';
  const ep=properties(p,true);
  $('effective-values').textContent=`logP ${fmt(ep.logp)} · ${ep.mw} Da · 극성 표면적 ${ep.psa} Å² · 공여체 ${ep.hbd}개`;
  phCurve();
}
function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0;$('play').textContent=index===120?'다시 실험':'실험 계속';}
function rebuild(){
  stop();index=0;elapsed=0;runs=experiment(p);settings();readouts();scene(true);$('play').textContent='실험 시작';
}
function input(){
  for(const id of ids)p[id]=['logp','mw','psa','hbd','pka','ph'].includes(id)?Number($(id).value):$(id).value;
  p.pro=root.querySelector('input[name="bbb-mode"]:checked').value==='pro';rebuild();
}
function apply(next){
  p={...next};for(const id of ids)$(id).value=p[id];
  root.querySelector(`input[name="bbb-mode"][value="${p.pro?'pro':'direct'}"]`).checked=true;rebuild();
}
function frame(now){
  if(!running)return;
  const dt=Math.min(.1,(now-last)/1000);last=now;
  if(document.hidden){raf=requestAnimationFrame(frame);return;}
  elapsed+=dt*Number($('speed').value)*4;
  const next=Math.min(120,Math.floor(elapsed));
  if(next!==index){index=next;readouts();}
  scene(reduced);
  if(index===120){scene(true);stop();return;}
  raf=requestAnimationFrame(frame);
}
for(const id of ids)$(id).addEventListener(['kind','route','blood','release'].includes(id)?'change':'input',input);
root.querySelectorAll('input[name="bbb-mode"]').forEach(el=>el.addEventListener('change',input));
$('play').addEventListener('click',()=>{
  if(running){stop();return;}
  if(index===120){index=0;elapsed=0;readouts();scene(true);}
  running=true;last=performance.now();$('play').textContent='일시 정지';raf=requestAnimationFrame(frame);
});
$('reset').addEventListener('click',()=>rebuild());
$('defaults').addEventListener('click',()=>{$('preset').value='balanced';apply(defaults);});
$('ph-reset').addEventListener('click',()=>{$('ph').value=7.4;input();});
$('preset').addEventListener('change',()=>{
  const presets={balanced:{},polar:{logp:.5,mw:360,psa:135,hbd:4,kind:'neutral'},ionized:{pka:9.5,kind:'base'},lipid:{logp:5.8,mw:420,psa:45,hbd:0,kind:'neutral'}};
  apply({...defaults,...presets[$('preset').value]});
});
$('timeline').addEventListener('input',()=>{stop();index=Number($('timeline').value);elapsed=index;readouts();scene(true);});
for(const id of ['background','labels'])$(id).addEventListener('change',()=>scene(true));
$('save').addEventListener('click',()=>{
  const y=runs.selected[index].y;
  recordCount++;
  const stability={stable:'안정성 높음',medium:'안정성 중간',fragile:'안정성 낮음'}[p.blood];
  const release={slow:'느린 활성화',balanced:'중간 활성화',fast:'빠른 활성화'}[p.release];
  const mode=p.pro?`${p.route==='mask'?'극성 가림형':'운반체형'} · ${stability} · ${release}`:'원래 약물';
  records.push([`${recordCount}. ${mode}`,`${fmt(p.logp)} / ${p.mw} / ${p.psa} / ${p.hbd}`,`${kindNames[p.kind]} · ${p.kind==='neutral'?'—':fmt(p.pka)} / ${fmt(p.ph)}`,fmt(index/2,index%2?1:0),pct(y[4]),pct(y[5]),pct(runs.direct[index].y[4])]);
  const tbody=$('records');tbody.replaceChildren();
  for(const row of records){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=value;tr.append(td);}tbody.append(tr);}
  $('record-status').textContent=`${records.length}개 실험을 기록했습니다. 표의 물성은 원래 약물 기준입니다. 기록은 이 페이지를 떠나면 사라집니다.`;
});
rebuild();
