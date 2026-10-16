
(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('cat'),ctx=canvas.getContext('2d');
const W=900,H=550,S=4,COLS=W/S,ROWS=Math.ceil(H/S),N=COLS*ROWS;
const outline=new Path2D('M 166 297 C 140 294 121 274 126 245 C 105 226 108 193 120 174 L 114 102 Q 115 93 124 99 L 178 142 Q 199 134 220 143 L 265 100 Q 274 95 272 109 L 261 183 Q 282 211 269 245 C 281 264 310 261 342 249 C 415 220 530 231 590 263 C 627 281 646 295 663 310 C 706 304 743 283 755 251 C 771 212 765 179 746 154 C 729 132 741 114 758 123 C 801 152 811 204 797 253 C 783 309 738 347 681 357 C 688 380 683 408 670 424 L 684 461 Q 688 477 670 480 L 594 480 Q 576 478 584 461 L 608 450 L 589 396 Q 568 382 542 389 L 533 459 Q 537 477 519 480 L 469 480 Q 451 477 462 461 L 485 448 L 479 368 C 428 375 375 364 330 351 L 304 450 L 315 462 Q 326 478 307 481 L 255 481 Q 240 478 247 462 L 264 430 L 270 326 L 234 325 L 213 453 L 223 466 Q 231 479 214 481 L 165 481 Q 149 477 158 463 L 174 438 L 178 341 Q 158 322 166 297 Z');
const whitePath=new Path2D('M145 278 Q186 273 219 306 Q249 288 262 263 Q302 308 295 350 Q250 366 218 389 L195 472 L144 496 L133 370 Z M335 346 Q438 320 486 364 Q568 347 604 383 L606 433 L524 430 L469 413 Z M139 450 L232 450 L235 495 L137 495 Z M240 457 L327 457 L327 496 L237 496 Z M453 456 L545 456 L545 495 L452 495 Z M580 459 L699 453 L699 496 L580 496 Z M736 132 Q750 148 763 160 L792 143 L765 108 Z');
const inside=new Uint8Array(N),whiteMask=new Uint8Array(N),valid=[];
for(let i=0;i<N;i++){let x=(i%COLS)*S+S/2,y=Math.floor(i/COLS)*S+S/2;if(ctx.isPointInPath(outline,x,y)){inside[i]=1;valid.push(i);whiteMask[i]=ctx.isPointInPath(whitePath,x,y)?1:0;}}
let owners=new Int16Array(N),times=new Float64Array(N),parents=new Int32Array(N),founders=[],order=[],maxTime=1,progress=0,running=false,last=0,selected=0,selectionKind='clone',runNumber=0,raf=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function rand(){return Math.random();}
class Heap{constructor(){this.a=[];}push(item){let a=this.a,i=a.length;a.push(item);while(i>0){let p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p;}a[i]=item;}pop(){let a=this.a,root=a[0],last=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let c=2*i+1;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(last[0]<=a[c][0])break;a[i]=a[c];i=c;}a[i]=last;}return root;}}
function makeExperiment(){
 cancelAnimationFrame(raf);running=false;progress=0;runNumber++;owners.fill(-1);times.fill(Infinity);parents.fill(-1);founders=[];order=[];
 const count=+$('founders').value,p=+$('skew').value/100;
 const picked=[];
 for(let j=0;j<count;j++){let best=-1,bestDist=-1;for(let trial=0;trial<35;trial++){let candidate=valid[Math.floor(rand()*valid.length)];if(picked.includes(candidate))continue;let x=candidate%COLS,y=Math.floor(candidate/COLS),d=picked.length?Math.min(...picked.map(k=>(x-k%COLS)**2+(y-Math.floor(k/COLS))**2)):1;if(d>bestDist){bestDist=d;best=candidate;}}if(best<0)best=valid.find(k=>!picked.includes(k));picked.push(best);founders.push({index:best,orange:rand()<p});}
 const terrain=new Float32Array(N);for(const i of valid)terrain[i]=.6+rand()*.8;
 const heap=new Heap();founders.forEach((f,j)=>{times[f.index]=0;owners[f.index]=j;heap.push([0,f.index]);});
 while(heap.a.length){const [t,i]=heap.pop();if(t!==times[i])continue;order.push(i);const x=i%COLS,y=Math.floor(i/COLS);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){let nx=x+dx,ny=y+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;let k=ny*COLS+nx;if(!inside[k])continue;if(dx&&dy&&(!inside[y*COLS+nx]||!inside[ny*COLS+x]))continue;let arrival=t+(dx&&dy?Math.SQRT2:1)*(terrain[i]+terrain[k])/2;if(arrival<times[k]){times[k]=arrival;owners[k]=owners[i];parents[k]=i;heap.push([arrival,k]);}}}
 maxTime=Math.max(...valid.map(i=>times[i]));selected=0;selectionKind='clone';
 $('skew-value').innerHTML=$('skew').value+'<small>%</small>';$('founders-value').innerHTML=count+'<small>개</small>';
 const orange=founders.filter(f=>f.orange).length;$('founder-stats').textContent=`초기 선택 결과: 주황 ${orange}개 / 검정 ${count-orange}개`;
 $('status').textContent=`새 실험 ${runNumber}. 초기 계보 ${count}개 중 주황 ${orange}개, 검정 ${count-orange}개.`;
 updateDetail();draw();updateControls();
}
function updateDetail(){
 document.dispatchEvent(new CustomEvent('calico-selection',{detail:{selected,selectionKind,runNumber,founders:founders.map(f=>({...f}))}}));
 if(selectionKind==='white'){$('cell-detail').innerHTML='<strong>흰 반점 영역</strong>색소세포의 분포가 없는 영역을 나타냅니다.<br><span>두 X가 모두 꺼져서 흰색이 되는 것이 아닙니다. 왼쪽 핵 그림은 일반적인 XX 체세포의 모식도입니다.</span>';return;}
 const f=founders[selected],a=f.orange?'O':'o',b=f.orange?'o':'O';$('active-chromatin').setAttribute('stroke',f.orange?'#d9853d':'#34383f');
 $('cell-detail').innerHTML=`<strong class="selected-mark">클론 ${String(selected+1).padStart(2,'0')} · ${f.orange?'주황':'검정'} 계보</strong>활성 X: X<sup>${a}</sup><br>비활성 X: X<sup>${b}</sup> → 바소체<br><span>자손도 같은 X를 비활성으로 유지합니다.<br>두 대립유전자는 DNA에 모두 남아 있습니다.</span>`;
}
function draw(){
 const cutoff=progress*maxTime/100,showWhite=$('white').checked,borders=$('borders').checked;
 ctx.clearRect(0,0,W,H);ctx.save();ctx.fillStyle='#e9eee5';ctx.beginPath();ctx.ellipse(440,489,312,12,0,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.clip(outline);ctx.fillStyle='#dce3da';ctx.fillRect(0,0,W,H);
 let o=0,b=0,formed=0;
 for(const i of order){if(times[i]>cutoff)break;formed++;const f=founders[owners[i]],x=i%COLS*S,y=Math.floor(i/COLS)*S;ctx.fillStyle=f.orange?'#d9853d':'#34383f';ctx.fillRect(x,y,S+.3,S+.3);if(!(showWhite&&whiteMask[i])){if(f.orange)o++;else b++;}}
 if($('highlight-clone').checked&&selectionKind==='clone'){ctx.fillStyle='rgba(255,255,255,.79)';for(const i of order){if(times[i]>cutoff)break;if(owners[i]!==selected)ctx.fillRect(i%COLS*S,Math.floor(i/COLS)*S,S+.3,S+.3);}}
 if(borders){ctx.fillStyle='rgba(255,255,255,.65)';for(const i of order){if(times[i]>cutoff)break;let x=i%COLS*S,y=Math.floor(i/COLS)*S;if(i%COLS<COLS-1&&inside[i+1]&&times[i+1]<=cutoff&&owners[i]!==owners[i+1])ctx.fillRect(x+S-1,y,1,S);if(i+COLS<N&&inside[i+COLS]&&times[i+COLS]<=cutoff&&owners[i]!==owners[i+COLS])ctx.fillRect(x,y+S-1,S,1);}}
 if(showWhite){ctx.fillStyle='#fffdf5';ctx.fill(whitePath);}
 if(progress<17){founders.forEach((f,j)=>{if(showWhite&&whiteMask[f.index])return;let x=f.index%COLS*S+S/2,y=Math.floor(f.index/COLS)*S+S/2;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle=f.orange?'#d9853d':'#34383f';ctx.fill();ctx.strokeStyle='#fffdf5';ctx.lineWidth=1.5;ctx.stroke();});}
 ctx.restore();ctx.strokeStyle='#536154';ctx.lineWidth=2.2;ctx.stroke(outline);
 // Facial details are anatomical drawing accents, not additional genetic states.
 ctx.fillStyle='rgba(188,141,126,.40)';for(const pts of [[[124,116],[166,148],[134,158]],[[257,115],[230,151],[255,164]]]){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
 ctx.fillStyle='#d9ddbb';for(const x of [151,232]){ctx.beginPath();ctx.ellipse(x,211,12,7,x===151?.2:-.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#24322b';ctx.beginPath();ctx.ellipse(x,211,2.4,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d9ddbb';}
 ctx.fillStyle='#ad756c';ctx.beginPath();ctx.moveTo(183,236);ctx.lineTo(199,236);ctx.lineTo(191,245);ctx.closePath();ctx.fill();ctx.strokeStyle='#657166';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(191,245);ctx.lineTo(191,250);ctx.quadraticCurveTo(182,258,176,251);ctx.moveTo(191,250);ctx.quadraticCurveTo(200,258,206,251);for(const [x,y,x2,y2] of [[161,245,102,235],[160,252,99,255],[222,245,282,234],[222,253,283,258]]){ctx.moveTo(x,y);ctx.lineTo(x2,y2);}ctx.stroke();
 if(selectionKind==='clone'){const i=founders[selected].index,x=i%COLS*S+S/2,y=Math.floor(i/COLS)*S+S/2;if(!(showWhite&&whiteMask[i])){ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#245843';ctx.lineWidth=2;ctx.stroke();}}
 const ratio=o+b?o/(o+b)*100:0;$('orange-bar').style.width=(o+b?ratio:0)+'%';$('black-bar').style.width=(o+b?100-ratio:0)+'%';$('orange-ratio').textContent='주황 '+(o+b?ratio.toFixed(1)+'%':'—');$('black-ratio').textContent='검정 '+(o+b?(100-ratio).toFixed(1)+'%':'—');
 $('growth-label').textContent=`모형 영역 ${Math.round(formed/valid.length*100)}% 형성`;$('timeline').value=progress;$('progress').textContent=Math.round(progress)+'%';$('phase').textContent=progress===0?'초기 세포의 X 선택':progress>=100?'모자이크 형성 완료':'클론 확장 중';
}
function updateControls(){$('play').textContent=running?'Ⅱ 일시정지':progress>=100?'▶ 다시 재생':'▶ 재생';$('play').setAttribute('aria-pressed',String(running));}
function frame(now){if(!running)return;progress=Math.min(100,progress+Math.min(now-last,100)/180);last=now;draw();if(progress>=100){running=false;updateControls();$('status').textContent='모자이크 패턴 형성이 완료되었습니다.';}else raf=requestAnimationFrame(frame);}
function start(){if(running)return;if(progress>=100)progress=0;running=true;last=performance.now();updateControls();raf=requestAnimationFrame(frame);}
function pause(){cancelAnimationFrame(raf);running=false;updateControls();}
 $('play').addEventListener('click',()=>running?pause():start());
 $('reset').addEventListener('click',()=>{pause();progress=0;draw();updateControls();$('status').textContent='같은 초기 세포의 선택을 유지한 채 처음으로 돌아갔습니다.';});
 $('randomize').addEventListener('click',()=>{makeExperiment();if(!reduced)start();});
 for(const id of ['skew','founders'])$(id).addEventListener('input',()=>{makeExperiment();});
 for(const id of ['white','borders'])$(id).addEventListener('change',()=>{if(id==='white'&&selectionKind==='white'){selectionKind='clone';updateDetail();}draw();});
 $('timeline').addEventListener('input',()=>{pause();progress=+$('timeline').value;draw();updateControls();});
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height,i=Math.floor(y/S)*COLS+Math.floor(x/S);if(!inside[i])return;if($('white').checked&&whiteMask[i])selectionKind='white';else if(times[i]<=progress*maxTime/100){selectionKind='clone';selected=owners[i];}else{$('status').textContent='아직 채워지지 않은 영역입니다. 재생하거나 진행률을 높여 주세요.';return;}updateDetail();draw();});
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();selected=(selected+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+founders.length)%founders.length;selectionKind='clone';updateDetail();draw();});
 $('download').addEventListener('click',()=>{const a=document.createElement('a');a.href='/assets/activities/x-inactivation/standalone.html';a.download='calico-x-inactivation.html';a.click();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 makeExperiment();if(!reduced)start();
 // Shared selection and state connect the coat, molecular and lineage views.
 window.calicoModel={snapshot:()=>({owners:Array.from(owners),times:Array.from(times),parents:Array.from(parents),inside:Array.from(inside),founders:founders.map(f=>({...f})),progress,running,valid:valid.length,selected,selectionKind,runNumber}),selectClone:(id)=>{if(Number.isInteger(id)&&id>=0&&id<founders.length){selected=id;selectionKind='clone';updateDetail();draw();}},redraw:draw};
})();


(()=>{'use strict';
const $=id=>document.getElementById(id),model=window.calicoModel;
let selection=model.snapshot(),t=0,mode='normal',playing=false,frameId=0,stamp=0;
const stages=['XIST 전사','RNA 접힘·결합','같은 X에 축적','염색질 변화','바소체'];
const titles={normal:'정상', 'xist-off':'XIST 생성 차단','factor-off':'억제 단백질 결합 방해'};
const smooth=(v,a,b)=>{const z=Math.max(0,Math.min(1,(v-a)/(b-a)));return z*z*(3-2*z);};
function state(which){const coating=which==='xist-off'?0:smooth(t,8,52),effectors=which==='normal'?smooth(t,24,72):0,other=which==='xist-off'?0:smooth(t,37,88);return {coating,effectors,other,repression:which==='normal'?smooth(t,26,88):which==='factor-off'?other*.28:0,compaction:which==='normal'?smooth(t,42,100):which==='factor-off'?other*.22:0};}
function chosen(){return selection.founders[selection.selected];}
function identities(){const f=chosen();return{active:f.orange?'O':'o',target:f.orange?'o':'O',activeColor:f.orange?'#d9853d':'#34383f',targetColor:f.orange?'#34383f':'#d9853d'};}
function syncSelection(data){selection=data;const picker=$('clone-picker');picker.replaceChildren();selection.founders.forEach((f,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=`클론 ${String(i+1).padStart(2,'0')} · ${f.orange?'주황':'검정'} 계보`;picker.append(opt);});picker.value=selection.selected;const id=identities();$('clone-chip').textContent=`정상 결과: X${id.active} 활성 / X${id.target} 비활성`;$('white-lab-note').hidden=selection.selectionKind!=='white';render();}
function pathChromatin(c,cx,cy,sx,sy,color){c.beginPath();for(let j=0;j<=220;j++){const a=j/220*Math.PI*6,x=cx+sx*(Math.sin(a)*.7+Math.sin(a*2.3)*.24),y=cy+sy*(j/220*2-1)+Math.cos(a*1.4)*sy*.16;j?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=color;c.lineWidth=4.5;c.lineCap='round';c.stroke();}
function transcript(c,x,y,n){c.strokeStyle='#267ea0';c.lineWidth=2.5;for(let j=0;j<n;j++){let px=x+(j%3)*18,py=y+Math.floor(j/3)*13;c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+4,py-5,px+8,py);c.quadraticCurveTo(px+12,py+5,px+16,py);c.stroke();}}
function paintNucleus(id,which){const canvas=$(id),c=canvas.getContext('2d'),p=state(which),colors=identities();c.clearRect(0,0,560,350);c.fillStyle='#f8faf4';c.fillRect(0,0,560,350);c.beginPath();c.ellipse(280,171,238,145,0,0,Math.PI*2);c.fillStyle='#eff3e9';c.fill();c.strokeStyle='#b6c7b3';c.lineWidth=2;c.stroke();c.beginPath();c.ellipse(280,171,222,130,0,0,Math.PI*2);c.strokeStyle='#d4dfcf';c.lineWidth=1;c.stroke();
 const cx=363+p.compaction*91,cy=165,sx=65-p.compaction*46,sy=82-p.compaction*58;
 if(p.compaction>.82){c.beginPath();c.ellipse(cx,cy,30,40,0,0,Math.PI*2);c.fillStyle='#dcd2e1';c.fill();}
 pathChromatin(c,170,162,65,80,colors.activeColor);pathChromatin(c,cx,cy,sx,sy,colors.targetColor);
 // A source locus on the target chromosome, surrounded by RNA in the same territory.
 c.fillStyle='#a04a8c';c.fillRect(cx-5,cy+sy*.48,10,10);
 if($('show-rna').checked){for(let j=0;j<Math.round(p.coating*12);j++){const a=j*2.39996,rad=Math.sqrt((j+.5)/12),x=cx+Math.cos(a)*rad*(sx+18),y=cy+Math.sin(a)*rad*(sy+18);rnaStrand(c,x-10,y,26,.5);}}
 if($('show-factors').checked){for(let j=0;j<Math.round(p.effectors*12);j++){const a=j*2.39996;c.fillStyle='#247663';c.fillRect(cx+Math.cos(a)*(sx+10)-4,cy+Math.sin(a)*(sy+8)-4,8,8);}for(let j=0;j<Math.round(p.other*10);j++){const a=j*2.39996+.6,x=cx+Math.cos(a)*(sx+18),y=cy+Math.sin(a)*(sy+12);c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#727aaf';c.fillRect(-4,-4,8,8);c.restore();}}
 if($('show-transcripts').checked){transcript(c,115,266,9);transcript(c,335,266,Math.round(9*(1-p.repression)));}
 c.font='16px "Malgun Gothic",sans-serif';c.textAlign='center';c.fillStyle='#667464';c.fillText('간기 핵 · 염색질 영역 모식도',280,338);
 if(p.compaction>.82){c.beginPath();c.moveTo(cx+21,cy-20);c.lineTo(500,80);c.strokeStyle='#6b587b';c.lineWidth=1.5;c.stroke();c.fillStyle='#6b587b';c.font='bold 19px "Malgun Gothic",sans-serif';c.fillText('바소체',482,67);}
 canvas.setAttribute('aria-label',`${titles[which]}: XIST RNA ${rnaLevel(p)}, 표적 X의 일반 유전자 전사 ${transcriptionLevel(p,which)}. ${p.compaction>.82?'바소체가 형성된 개념도.':''}`);
}
function rnaLevel(p){return p.coating===0?'없음':p.coating<.4?'생성 시작':p.coating<.9?'축적 중':'축적됨';}
function transcriptionLevel(p,which){return p.repression<.05?'활발':which==='factor-off'?'억제 불완전':p.repression<.85?'감소 중':'대부분 억제';}
function readouts(id,which){const p=state(which),struct=p.compaction<.08?'느슨한 상태':p.compaction<.8?'구조 변화 중':'응축 · 바소체';$(id).innerHTML=`<dt>XIST RNA 축적</dt><dd>${rnaLevel(p)}</dd><dt>표적 X의 일반 유전자 전사</dt><dd>${transcriptionLevel(p,which)}</dd><dt>표적 X 염색질</dt><dd>${struct}</dd>`;}
function explain(){const phase=t<25?0:t<50?1:t<70?2:t<94?3:4,label=stages[phase];$('molecular-stage').textContent=`관찰 ${phase+1}/5 · ${label}`;document.querySelectorAll('[data-mol-time]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.molTime===phase*25)));let title,body;
 if(t<12){title='두 X의 DNA는 모두 남아 있습니다.';body='정상 계보에서 앞으로 비활성화될 X를 표적으로 선택했습니다. 이 시점에는 아직 응축된 바소체가 없고, 두 X의 일반 유전자 전사가 가능합니다.';}
 else if(mode==='xist-off'){title='시작 신호가 없으면 정상 경로를 시작하지 못합니다.';body='대조군에서는 XIST가 축적되지만, 실험군은 시작 전부터 XIST를 만들지 못합니다. 이 개념 모형에서는 XIST 의존적인 전사 억제와 바소체 형성이 진행되지 않습니다. 이미 확립된 비활성 X에서 RNA를 제거하는 실험과는 다릅니다.';}
 else if(mode==='factor-off'){title='RNA 축적과 전사 억제는 같은 현상이 아닙니다.';body='여기서는 XIST 축적이 유지된 채 주요 억제 단백질의 결합을 방해하는 조건을 가정합니다. RNA가 모여도 전사 억제는 크게 약해집니다. 다른 경로의 잔여 효과는 유전자·세포 상태에 따라 달라지므로 완전한 ON/OFF로 예측하지 않습니다.';}
 else if(t<40){title='비활성화될 X가 XIST RNA를 만듭니다.';body='자주 헷갈리는 점: XIST RNA는 앞으로 조용해질 X에서 만들어집니다. 긴 비암호화 RNA로, 단백질로 번역되는 중간체가 아니라 RNA 자체가 조절에 참여합니다.';}
 else if(t<68){title='RNA는 자신이 만들어진 X의 영역에 축적됩니다.';body='XIST와 결합하는 단백질들이 억제 경로를 가동합니다. 자홍색 가닥은 XIST RNA, 청록색 사각형은 억제 단백질 관련 인자, 보라색 마름모는 다른 억제 인자입니다. 가닥의 개수와 모양은 실제 분자를 그대로 재현한 것이 아닙니다.';}
 else if(t<94){title='전사 억제와 염색질 변화가 겹쳐 진행됩니다.';body='억제 단백질 관련 경로의 히스톤 탈아세틸화와 다른 경로의 억제성 표지 등 여러 기전이 기여합니다. 염색질이 먼저 완전히 뭉쳐야만 전사가 꺼지는 단순한 직렬 과정은 아닙니다.';}
 else{title='바소체는 조건적 이질염색질의 예입니다.';body='대부분의 유전자 전사가 억제된 비활성 X가 응축된 모습입니다. DNA와 대립유전자는 사라지지 않습니다. 일부 유전자는 불활성화를 회피하며, 실제 회피 양상은 유전자·조직·종에 따라 다릅니다.';}
 $('molecular-observation').innerHTML=`<strong>${title}</strong>${body}`;
}
function render(){if(!chosen())return;$('molecular-time').value=Math.round(t);$('molecular-play').textContent=playing?'Ⅱ 일시정지':t>=100?'▶ 처음부터 재생':'▶ 과정 재생';$('molecular-play').setAttribute('aria-pressed',String(playing));$('experiment-title').textContent='관찰 세포 · '+titles[mode];$('experiment-label').textContent=mode==='normal'?'기준 과정 확인':'시작 전부터 적용';const id=identities(),html=`<div>활성으로 남을 X<strong>X<sup>${id.active}</sup></strong></div><div>불활성화 표적 X<strong>X<sup>${id.target}</sup></strong></div>`;$('normal-identities').innerHTML=html;$('experiment-identities').innerHTML=html;paintNucleus('normal-nucleus','normal');paintNucleus('experiment-nucleus',mode);readouts('normal-readouts','normal');readouts('experiment-readouts',mode);explain();paintMechanism();}
function ink(c,text,x,y,color='#25342e',size=13,align='center'){c.fillStyle=color;c.font=`${size}px "Malgun Gothic",sans-serif`;c.textAlign=align;c.fillText(text,x,y);}
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
function rnaStrand(c,x,y,length=100,fold=0){const pts=[];for(let i=0;i<=100;i++){const u=i/100;pts.push([x+u*length*(1-fold*.4)+Math.sin(u*Math.PI*8)*fold*17,y+Math.sin(u*Math.PI*8)*(4+fold*16)]);}line(c,pts,'#a04a8c',3);}
function protein(c,x,y,bound=true){c.beginPath();c.moveTo(x-17,y-12);c.quadraticCurveTo(x-3,y-24,x+13,y-11);c.lineTo(x+19,y+6);c.lineTo(x+5,y+17);c.lineTo(x-1,y+7);c.lineTo(x-15,y+14);c.closePath();c.fillStyle=bound?'#28755e':'#c5cebf';c.fill();c.strokeStyle=bound?'#195744':'#8b9783';c.lineWidth=1;c.stroke();}
function arrow(c,x,y,x2,y2){line(c,[[x,y],[x2,y2]],'#8a9b87',1.5);const a=Math.atan2(y2-y,x2-x);line(c,[[x2-8*Math.cos(a-.45),y2-8*Math.sin(a-.45)],[x2,y2],[x2-8*Math.cos(a+.45),y2-8*Math.sin(a+.45)]],'#8a9b87',1.5);}
function dna(c,x,y,length){for(let k=0;k<2;k++){const pts=[];for(let i=0;i<=length;i+=2)pts.push([x+i,y+Math.sin(i/16+k*Math.PI)*11]);line(c,pts,k?'#b3c6a9':'#536c54',2);}for(let i=5;i<length;i+=13)line(c,[[x+i,y+Math.sin(i/16)*11],[x+i,y-Math.sin(i/16)*11]],'#bccbb5',1);}
function fitCanvas(id,height){const cv=$(id),width=Math.max(280,cv.clientWidth||780),dpr=Math.min(devicePixelRatio||1,2);if(cv.width!==Math.round(width*dpr)||cv.height!==height*dpr){cv.width=Math.round(width*dpr);cv.height=height*dpr;}cv.style.height=height+'px';cv.style.aspectRatio='auto';const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);return{c,w:width,h:height};}
function paintMechanism(){const narrow=($('mechanism-canvas').clientWidth||780)<500,{c,w,h}=fitCanvas('mechanism-canvas',narrow?370:320),p=state(mode),id=identities();c.fillStyle='#f7f9f2';c.fillRect(0,0,w,h);let title,caption,scene;
 if(t<25){scene='transcription';title='01 · DNA에서 XIST RNA가 만들어집니다';const u=smooth(t,0,25),start=35,len=w-70,px=start+len*(.15+u*.62),y=188;ink(c,'불활성화될 X의 일부',w/2,29,'#637169',12);c.fillStyle='#f0e2ed';c.fillRect(start+len*.1,y-27,len*.8,54);dna(c,start,y,len);ink(c,'XIST 유전자',w/2,245,'#805276',13);arrow(c,start+len*.15,266,start+len*.8,266);ink(c,'전사 진행 방향',w/2,289,'#637169',11);
 if(mode!=='xist-off'){c.fillStyle='#397fa0';c.beginPath();c.ellipse(px,y,28,23,0,0,Math.PI*2);c.fill();ink(c,'RNA 중합효소',Math.min(w-70,Math.max(70,px)),y-39,'#26718f',12);const length=Math.min(px-27,30+u*125);c.save();c.translate(px-3,y-18);c.rotate(-2.5);rnaStrand(c,0,0,length,0);c.restore();if(u>.05)ink(c,'길어지는 XIST RNA',Math.min(w-90,Math.max(90,px-55)),89,'#a04a8c',13);caption='RNA 중합효소가 XIST 유전자를 전사하면 단일 가닥 RNA가 길어집니다. 이 RNA는 단백질로 번역되지 않습니다.';}else{ink(c,'전사 차단',w/2,120,'#975640',17);line(c,[[w/2-16,143],[w/2+16,167]],'#975640',3);line(c,[[w/2+16,143],[w/2-16,167]],'#975640',3);caption='시작 전부터 XIST 전사를 막았습니다. RNA가 만들어지지 않아 뒤의 XIST 의존적 과정이 진행되지 않습니다.';}}
 else if(t<50){scene='binding';title='02 · 접힌 RNA에 억제 단백질이 결합합니다';const u=smooth(t,25,49),x=w*.23,y=160;ink(c,'XIST RNA 일부의 접힘과 결합 부위',w/2,30,'#637169',12);if(mode==='xist-off'){ink(c,'결합할 XIST RNA가 없습니다',w/2,165,'#975640',15);}else{rnaStrand(c,x,y,Math.min(w*.58,310),.3+u*.7);const bx=x+Math.min(w*.58,310)*.32,by=y-10;const py=mode==='factor-off'?by-65:by-65*(1-u);protein(c,bx,py,mode!=='factor-off');ink(c,'억제 단백질',bx,py-29,mode==='factor-off'?'#7d8178':'#245843',13);c.setLineDash([4,4]);arrow(c,bx,py+22,bx,by);c.setLineDash([]);ink(c,'접힌 XIST RNA',w/2,224,'#a04a8c',13);if(mode==='factor-off')ink(c,'결합 방해 → 억제 기능 약화',w/2,265,'#975640',13);else ink(c,u>.8?'RNA–단백질 복합체':'단백질이 RNA의 결합 부위로 접근',w/2,265,'#245843',13);}caption=mode==='factor-off'?'RNA는 만들어지지만 주요 억제 단백질의 결합을 방해한 가상 조건입니다. RNA의 존재만으로 정상적인 억제가 완성되는 것은 아닙니다.':'RNA가 접히면 단백질이 결합할 수 있는 구조가 생깁니다. 여기에 억제 단백질이 결합해 염색질을 조절하는 다른 단백질들의 작용을 연결합니다.';}
 else if(t<70){scene='localization';title='03 · 여러 복합체가 같은 X의 영역에 자리 잡습니다';const cx=w/2,cy=166,sx=Math.min(w*.3,180),sy=95;pathChromatin(c,cx,cy,sx,sy,id.targetColor);ink(c,'핵 안에서 접혀 있는 표적 X의 염색질',w/2,29,'#637169',12);const u=smooth(t,50,69),count=mode==='xist-off'?0:3+Math.floor(u*6);for(let j=0;j<count;j++){const a=j*2.39996,rx=cx+Math.cos(a)*sx*.65,ry=cy+Math.sin(a)*sy*.72;line(c,[[rx,ry],[rx+8,ry+14]],'#899884',2);rnaStrand(c,rx-19,ry-12,45,.9);if(mode!=='factor-off')protein(c,rx+5,ry-25);}ink(c,'RNA·단백질을 통한 염색질 영역과의 연결',w/2,285,'#637169',narrow?11:13);caption='여러 XIST RNA 분자가 단백질들과 함께 자신이 전사된 X의 영역에 머무릅니다. 핵 안에서 가까운 영역으로 퍼지는 과정을 단순화했습니다. RNA 한 가닥이 X 전체를 감싸는 모습이 아닙니다.';}
 else if(t<94){scene='chromatin';title='04 · 히스톤 표지와 유전자 전사가 달라집니다';const y=165,n=narrow?3:5,gap=Math.min((w-80)/(n-1),130),left=(w-gap*(n-1))/2,u=smooth(t,70,93),functional=mode==='normal';ink(c,'뉴클레오솜 확대 · DNA + 히스톤',w/2,27,'#637169',12);dna(c,left-30,y,gap*(n-1)+60);for(let j=0;j<n;j++){const x=left+j*gap;c.fillStyle='#bccfb6';c.beginPath();c.ellipse(x,y,20,18,0,0,Math.PI*2);c.fill();c.strokeStyle='#566e54';c.lineWidth=2;c.beginPath();c.ellipse(x,y,25,21,-.4,.15,Math.PI*1.9);c.stroke();line(c,[[x,y-18],[x+5,y-47]],'#899884',2);const released=functional?Math.max(0,u*n-j):0,ay=y-61-Math.min(released,1)*37;c.globalAlpha=1-Math.min(released,1)*.85;c.fillStyle='#387fa4';c.fillRect(x-5,ay-9,22,16);ink(c,'Ac',x+6,ay+3,'white',11);c.globalAlpha=1;if(mode!=='xist-off'&&j/n<p.other){c.fillStyle='#95638d';c.beginPath();c.arc(x+24,y-32,7,0,Math.PI*2);c.fill();}}
 if(functional){const ex=left+u*(n-1)*gap;c.fillStyle='#28755e';c.beginPath();c.ellipse(ex,y-42,24,13,0,0,Math.PI*2);c.fill();ink(c,'아세틸기 제거 효소',w/2,65,'#245843',13);arrow(c,w/2,72,ex,y-61);}else ink(c,mode==='xist-off'?'XIST 의존적 억제가 시작되지 않음':'주요 억제 경로의 작용 약화',w/2,65,'#975640',13);
 ink(c,'Ac: 아세틸기   ●: 억제와 관련된 히스톤 표지',w/2,230,'#637169',narrow?10:12);ink(c,functional?'일반 유전자 RNA 생성 감소':'정상적인 전사 억제 미완성',w/2,278,functional?'#245843':'#975640',13);caption='억제 단백질은 히스톤의 아세틸기를 제거하는 효소 등의 작용을 연결합니다. 다른 경로의 억제성 표지도 함께 기여합니다. 전사 억제와 염색질 구조 변화는 서로 겹쳐 진행됩니다.';}
 else{scene='barr';title='05 · 핵 전체로 돌아오면 비활성 X가 보입니다';const cx=w/2,cy=155,rx=Math.min(w*.43,235),ry=105;c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);c.fillStyle='#edf2e6';c.fill();c.strokeStyle='#bccbb5';c.stroke();pathChromatin(c,cx-rx*.43,cy,rx*.26,65,id.activeColor);pathChromatin(c,cx+rx*.6,cy,mode==='normal'?14:rx*.23,mode==='normal'?23:64,id.targetColor);if(mode==='normal'){ink(c,'바소체',cx+rx*.57,cy-65,'#6b587b',14);arrow(c,cx+rx*.57,cy-54,cx+rx*.6,cy-26);}else ink(c,'정상적인 비활성 상태 미확립',w/2,35,'#975640',13);ink(c,'DNA는 두 X에 모두 남아 있습니다',w/2,291,'#637169',12);caption=mode==='normal'?'대부분의 유전자 전사가 억제된 X가 응축된 모습입니다. 일부 유전자는 억제를 회피합니다. 정상적으로 확립된 비활성 상태는 이후 체세포 분열에서도 보통 유지됩니다.':'실험 조건에서는 정상적인 억제 과정이 충분히 진행되지 않았습니다. 이런 세포의 실제 생존·분열·털색 결과는 이 모형에서 예측하지 않습니다.';}
 $('mechanism-title').textContent=title;$('mechanism-caption').textContent=caption;$('mechanism-canvas').setAttribute('aria-label',title+'. '+caption);$('mechanism-canvas').dataset.scene=scene;
}

function stop(){cancelAnimationFrame(frameId);playing=false;}
function tick(now){if(!playing)return;t=Math.min(100,t+Math.min(now-stamp,100)/220);stamp=now;if(t>=100)playing=false;render();if(playing)frameId=requestAnimationFrame(tick);}
 $('clone-picker').addEventListener('change',e=>model.selectClone(+e.target.value));
 document.addEventListener('calico-selection',e=>syncSelection(e.detail));
 $('highlight-clone').addEventListener('change',()=>model.redraw());
 document.querySelectorAll('[name="perturbation"]').forEach(el=>el.addEventListener('change',()=>{stop();mode=el.value;t=0;render();}));
 $('molecular-time').addEventListener('input',()=>{stop();t=+$('molecular-time').value;render();});
 $('molecular-play').addEventListener('click',()=>{if(playing){stop();render();return;}if(t>=100)t=0;playing=true;stamp=performance.now();render();frameId=requestAnimationFrame(tick);});
 $('molecular-reset').addEventListener('click',()=>{stop();t=0;render();});
 document.querySelectorAll('[data-mol-time]').forEach(b=>b.addEventListener('click',()=>{stop();t=+b.dataset.molTime;render();}));
 for(const id of ['show-rna','show-factors','show-transcripts'])$(id).addEventListener('change',render);
 new ResizeObserver(paintMechanism).observe($('mechanism-canvas'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();render();}});
 window.cellLab={snapshot:()=>({t,mode,playing,clone:selection.selected,normal:state('normal'),experiment:state(mode)})};
 syncSelection(selection);
})();

