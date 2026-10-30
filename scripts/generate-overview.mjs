import fs from 'node:fs';
import {parsePdb,fitPoints} from '../assets/activities/protein-lab/core.js';
import {defaults,simulate} from '../assets/activities/bbb-lab/model.mjs';
const dir=new URL('../assets/overview/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,dir),'utf8');
const write=(name,value)=>fs.writeFileSync(new URL(name,dir),value);
const n=v=>Number(v).toFixed(2);
const cyan='#76dce6',gold='#e7bc7c',purple='#b59ce8',muted='#7795a9',ink='#dcebf4';
const xml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,opts='')=>`<text x="${x}" y="${y}" ${opts}>${xml(s)}</text>`;
const line=(x1,y1,x2,y2,opts='')=>`<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${opts}/>`;
const circle=(x,y,r,opts='')=>`<circle cx="${n(x)}" cy="${n(y)}" r="${r}" ${opts}/>`;
function svg(title,body,width=1000,height=660){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title><defs><radialGradient id="surface"><stop stop-color="#0e2637"/><stop offset="1" stop-color="#06121d"/></radialGradient><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#7aa4bd" stroke-opacity=".055"/></pattern></defs><style>text{font-family:'Segoe UI','Malgun Gothic',Arial,sans-serif;fill:${ink};font-size:18px}path,polyline,line{stroke-linecap:round;stroke-linejoin:round}.label{font-size:13px;letter-spacing:2px;fill:${muted}}.muted{fill:${muted}}.small{font-size:14px}.mono{font-family:Consolas,monospace;font-size:19px;letter-spacing:3px}</style><rect width="${width}" height="${height}" fill="url(#surface)"/><rect width="${width}" height="${height}" fill="url(#grid)"/>${body}</svg>`;}
function projector(points,box,angles=[.55,-.35]){
 const [ay,ax]=angles;
 const rotate=([x,y,z])=>{let xx=x*Math.cos(ay)+z*Math.sin(ay),zz=-x*Math.sin(ay)+z*Math.cos(ay);return [xx,y*Math.cos(ax)-zz*Math.sin(ax),y*Math.sin(ax)+zz*Math.cos(ax)];};
 const p=points.map(rotate),min=[0,1,2].map(k=>Math.min(...p.map(v=>v[k]))),max=[0,1,2].map(k=>Math.max(...p.map(v=>v[k])));
 const scale=Math.min(box[2]/(max[0]-min[0]),box[3]/(max[1]-min[1])),center=min.map((v,k)=>(v+max[k])/2);
 return xyz=>{let v=rotate(xyz);return [box[0]+box[2]/2+(v[0]-center[0])*scale,box[1]+box[3]/2-(v[1]-center[1])*scale,v[2]];};
}
const reference=parsePdb(read('t4-reference.pdb')).chains.get('A').filter(r=>r.resi>=1&&r.resi<=162);
const variantMap=new Map(parsePdb(read('t4-l99a.pdb')).chains.get('A').map(r=>[r.resi,r]));
const pairs=reference.filter(r=>variantMap.has(r.resi)),a=pairs.map(r=>r.point),b=pairs.map(r=>variantMap.get(r.resi).point),fit=fitPoints(a,b);
const differences=pairs.filter(r=>r.one!==variantMap.get(r.resi).one).map(r=>({position:r.resi,from:r.one,to:variantMap.get(r.resi).one}));
if(differences.length!==1||differences[0].position!==99||differences[0].from!=='L'||differences[0].to!=='A')throw Error('Unexpected protein example sequence differences');
let protein=text(36,40,'T4 LYSOZYME / STRUCTURE COMPARISON','class="label"')+text(964,40,`${pairs.length} Cα · RMSD ${fit.rmsd.toFixed(2)} Å`,'class="small muted" text-anchor="end"');
protein+=circle(48,77,5,`fill="${cyan}"`)+text(64,82,'기준 구조 · WT','class="small"')+circle(244,77,5,`fill="${gold}"`)+text(260,82,'치환 변이 · L99A','class="small"');
protein+=`<image href="data:image/webp;base64,${fs.readFileSync(new URL('protein-overlay.webp',dir)).toString('base64')}" x="155" y="104" width="680" height="370" preserveAspectRatio="xMidYMid meet"/>`;
protein+=text(855,181,'L99 → A99','class="small"');
protein+=line(36,492,964,492,'stroke="#26434f"')+text(40,525,'SEQUENCE / 91–107','class="label"');
for(let i=90;i<107;i++){let r=pairs.find(p=>p.resi===i+1);if(!r)continue;let x=344+(i-90)*30;let mut=i===98;if(mut)protein+=`<rect x="${x-11}" y="537" width="25" height="64" rx="4" fill="#e7bc7c16" stroke="#e7bc7c55"/>`;protein+=text(x,559,r.one,`class="mono" text-anchor="middle" style="fill:${cyan}"`)+text(x,590,variantMap.get(r.resi).one,`class="mono" text-anchor="middle" style="fill:${mut?gold:muted}"`);}
protein+=text(40,560,'WT','class="small"')+text(40,590,'L99A','class="small"')+text(40,634,'공개 실험 구조 · 결정 조건에 따른 차이도 포함합니다.','class="small muted"');
write('protein-comparison.svg',svg('T4 라이소자임 기준 구조와 L99A 치환 변이의 실제 좌표 비교',protein));

const rnaMeta=JSON.parse(read('rna-hairpin.json'));
const atoms=read('rna-hairpin.pdb').split(/\r?\n/).filter(l=>l.startsWith('ATOM  ')).map(l=>({name:l.slice(12,16).trim(),base:l.slice(17,20).trim(),resi:Number(l.slice(22,26)),p:[30,38,46].map(i=>Number(l.slice(i,i+8)))}));
if(atoms.some(a=>a.p.some(x=>!Number.isFinite(x))))throw Error('Invalid RNA example coordinates');
let rna=text(36,40,'RNA / SECONDARY & TERTIARY STRUCTURE','class="label"')+text(964,40,'12 nt','class="small muted" text-anchor="end"');
rna+=text(250,96,'목표 이차 구조','text-anchor="middle"')+text(745,96,'예측 삼차 구조','text-anchor="middle"')+line(500,124,500,530,'stroke="#25404e"');
const flat=[[150,443],[150,380],[150,317],[150,254],[173,193],[223,165],[277,165],[327,193],[350,254],[350,317],[350,380],[350,443]];
rna+=`<polyline points="${flat.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#456676" stroke-width="3"/>`;
for(let i=0;i<4;i++)rna+=line(flat[i][0]+20,flat[i][1],flat[11-i][0]-20,flat[11-i][1],`stroke="${cyan}" stroke-width="2" stroke-dasharray="4 5" opacity=".65"`);
flat.forEach(([x,y],i)=>{let color=i<4?cyan:i<8?gold:'#98cdbb';rna+=circle(x,y,18,`fill="#0b2431" stroke="${color}" stroke-width="1.7"`)+text(x,y+6,rnaMeta.sequence[i],`text-anchor="middle" style="fill:${color};font-size:17px"`);});
rna+=text(130,489,'5′','class="small muted"')+text(359,489,'3′','class="small muted"');
rna+=`<image href="data:image/webp;base64,${fs.readFileSync(new URL('rna-fold.webp',dir)).toString('base64')}" x="545" y="132" width="400" height="360" preserveAspectRatio="xMidYMid meet"/>`;
rna+=text(746,518,'RNAbpFlow · CASP16','class="small muted" text-anchor="middle"')+line(36,550,964,550,'stroke="#25404e"')+text(50,589,'GGGGAAAACCCC','class="mono"')+text(950,589,'((((....))))','class="mono muted" text-anchor="end"')+text(50,631,'설계한 이차 구조를 조건으로 계산한 예시 · 실험 구조가 아닙니다.','class="small muted"');
write('rna-design.svg',svg('RNA 목표 헤어핀과 RNAbpFlow로 실제 계산한 삼차 구조 예시',rna));

const direct=simulate(defaults,false),prodrug=simulate(defaults,true),maxValue=Math.max(...direct.map(s=>s.y[4]),...prodrug.map(s=>s.y[4])),axisMax=Math.max(5,Math.ceil(maxValue/5)*5);
const chart={x:95,y:396,w:830,h:170},xy=(t,v)=>[chart.x+t/60*chart.w,chart.y+chart.h-v/axisMax*chart.h];
let bbb=text(36,40,'BLOOD–BRAIN BARRIER / DISTRIBUTION','class="label"')+text(964,40,'pH 7.4 · pKa 7.8','class="small muted" text-anchor="end"');
bbb+=`<rect x="42" y="73" width="916" height="84" rx="14" fill="#102838"/><rect x="42" y="274" width="916" height="54" rx="12" fill="#0d2930"/>`+text(65,107,'혈액','class="small"')+text(65,307,'뇌 조직','class="small"');
for(let i=0;i<6;i++){let x=43+i*153;bbb+=`<rect x="${x}" y="170" width="151" height="91" rx="18" fill="#13343e" stroke="#487d88" stroke-width="1.2"/>`+`<ellipse cx="${x+75}" cy="216" rx="22" ry="13" fill="#254c56"/>`;if(i<5)bbb+=line(x+151,185,x+151,247,'stroke="#a7c9c6" stroke-width="4"');}
bbb+=text(500,244,'내피세포','class="small" text-anchor="middle"');
for(let i=0;i<22;i++){let x=210+(i*47)%714,y=96+(i%3)*19;bbb+=circle(x,y,4+(i%2),`fill="${i%4===0?gold:cyan}" opacity="${.4+(i%3)*.18}"`);}
bbb+=`<style>.passing{animation:pass 8s linear infinite}@keyframes pass{0%{transform:translateY(0);opacity:0}15%{opacity:.8}85%{opacity:.8}100%{transform:translateY(181px);opacity:0}}@media(prefers-reduced-motion:reduce){.passing{animation:none}}</style>`;
for(const [x,delay] of [[274,0],[579,2.5],[884,5]])bbb+=`<circle class="passing" cx="${x}" cy="118" r="5" fill="${gold}" style="animation-delay:-${delay}s"/>`;
bbb+=text(43,369,'뇌 속 활성 약물 · 초기량 대비 (%)','class="small"');
for(let k=0;k<=4;k++){let v=axisMax*k/4,y=xy(0,v)[1];bbb+=line(chart.x,y,chart.x+chart.w,y,'stroke="#26414f" stroke-opacity=".75"')+text(76,y+5,Number(v.toFixed(1)),'class="small muted" text-anchor="end"');}
for(let t=0;t<=60;t+=20){let x=xy(t,0)[0];bbb+=text(x,594,t,'class="small muted" text-anchor="middle"');}
const curve=(samples,color,dash='')=>`<polyline points="${samples.map(s=>xy(s.t,s.y[4]).map(n).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3.5" ${dash}/>`;
bbb+=curve(direct,cyan,'stroke-dasharray="8 6"')+curve(prodrug,gold)+line(642,366,675,366,`stroke="${cyan}" stroke-width="3" stroke-dasharray="5 4"`)+text(685,371,'원래 약물','class="small"')+line(815,366,848,366,`stroke="${gold}" stroke-width="3"`)+text(858,371,'전구약물','class="small"');
bbb+=text(510,627,'모형 진행값 (임의 단위)','class="small muted" text-anchor="middle"');
write('bbb-simulation.svg',svg('혈액–뇌 장벽과 기존 교육용 모형에서 계산한 활성 약물 분포',bbb));

const colors=[cyan,gold,purple],columns=[{title:'산소 소비 속도',labels:['거의 멈춤','증가','감소'],values:[-2,1,-1]},{title:'산화적 ATP 합성 속도',labels:['크게 감소','크게 감소','크게 감소'],values:[-2,-2,-2]},{title:'H⁺ 전기화학적 기울기',labels:['시간이 지나며 감소','감소','증가'],values:[-1,-1,1]}];
let inquiry=text(36,40,'OXIDATIVE PHOSPHORYLATION / EVIDENCE','class="label"')+text(964,40,'QUALITATIVE MODEL','class="label" text-anchor="end"');
inquiry+=text(36,93,'정상 대조군에 비해 무엇이 달라졌을까요?','style="font-size:24px"');
columns.forEach((c,k)=>{let x=30+k*324,center=x+161;inquiry+=`<rect x="${x}" y="130" width="304" height="380" rx="10" fill="#0a1d2a" stroke="#1c3a48"/>`+text(x+152,171,c.title,'text-anchor="middle" style="font-size:18px"')+line(center,204,center,479,'stroke="#66828f" stroke-dasharray="3 5"')+text(center-63,215,'감소','class="small muted" text-anchor="middle"')+text(center+65,215,'증가','class="small muted" text-anchor="middle"');
 c.values.forEach((v,i)=>{let y=258+i*83,end=center+v*42;inquiry+=text(x+20,y+6,['A','B','C'][i],`style="fill:${colors[i]};font-size:17px"`)+`<rect x="${Math.min(center,end)}" y="${y-10}" width="${Math.abs(end-center)}" height="19" rx="3" fill="${colors[i]}" opacity=".85"/>`+circle(end,y,3.5,`fill="${colors[i]}"`)+text(x+152,y+37,c.labels[i],'class="small" text-anchor="middle"');});
});
inquiry+=circle(59,548,5,`fill="${cyan}"`)+text(75,554,'처리 A','class="small"')+circle(215,548,5,`fill="${gold}"`)+text(231,554,'처리 B','class="small"')+circle(371,548,5,`fill="${purple}"`)+text(387,554,'처리 C','class="small"')+text(36,600,'관찰 자료를 선택하고, 함께 해석해 판정의 근거를 세웁니다.','style="font-size:20px"')+text(36,634,'막대는 변화의 방향과 정성적 구분을 나타냅니다. 실측 수치가 아닙니다.','class="small muted"');
write('inquiry-evidence.svg',svg('세 약물 처리 조건의 산화적 인산화 변화 방향을 비교하는 교육용 개념 그래프',inquiry));
// Mobile art direction keeps scientific labels readable instead of shrinking
// the desktop figures. The data and model outputs are identical.
const mobileStyle='<style>text{font-size:21px}.small{font-size:18px}.label{font-size:16px;letter-spacing:1px}.mono{font-size:23px;letter-spacing:3px}</style>';
const proteinImage=fs.readFileSync(new URL('protein-overlay.webp',dir)).toString('base64');
const rnaImage=fs.readFileSync(new URL('rna-fold.webp',dir)).toString('base64');
let pm=mobileStyle+text(24,36,'T4 LYSOZYME / L99A','class="label"');
pm+=circle(37,76,5,`fill="${cyan}"`)+text(53,83,'기준 구조 · WT','class="small"')+circle(300,76,5,`fill="${gold}"`)+text(316,83,'치환 변이 · L99A','class="small"');
pm+=`<image href="data:image/webp;base64,${proteinImage}" x="22" y="104" width="556" height="370" preserveAspectRatio="xMidYMid meet"/>`+line(24,492,576,492,'stroke="#26434f"')+text(24,530,'서열 95–103','class="small muted"')+text(24,566,'WT','class="small"')+text(24,602,'L99A','class="small"');
for(let i=94;i<103;i++){let r=pairs.find(p=>p.resi===i+1),x=260+(i-94)*30;if(i===98)pm+=`<rect x="${x-12}" y="542" width="26" height="69" rx="4" fill="#e7bc7c16" stroke="#e7bc7c55"/>`;pm+=text(x,566,r.one,`class="mono" text-anchor="middle" style="fill:${cyan}"`)+text(x,602,variantMap.get(r.resi).one,`class="mono" text-anchor="middle" style="fill:${i===98?gold:muted}"`);}
pm+=text(24,641,`${pairs.length} Cα · RMSD ${fit.rmsd.toFixed(2)} Å · 공개 실험 구조`,'class="small muted"');
write('protein-comparison-mobile.svg',svg('T4 라이소자임 기준·L99A 비교, 휴대폰용 그림',pm,600,660));
let rm=mobileStyle+text(24,36,'RNA STRUCTURE / 12 nt','class="label"')+text(300,88,'목표 이차 구조','text-anchor="middle"');
const rf=flat.map(([x,y])=>[75+x*.9,45+y*.74]);rm+=`<polyline points="${rf.map(p=>p.map(n).join(',')).join(' ')}" fill="none" stroke="#456676" stroke-width="3"/>`;
for(let i=0;i<4;i++)rm+=line(rf[i][0]+19,rf[i][1],rf[11-i][0]-19,rf[11-i][1],`stroke="${cyan}" stroke-width="2" stroke-dasharray="4 5" opacity=".65"`);
rf.forEach(([x,y],i)=>{let color=i<4?cyan:i<8?gold:'#98cdbb';rm+=circle(x,y,18,`fill="#0b2431" stroke="${color}" stroke-width="1.7"`)+text(x,y+7,rnaMeta.sequence[i],`text-anchor="middle" style="fill:${color};font-size:21px"`);});
rm+=text(186,411,'5′','class="small muted"')+text(400,411,'3′','class="small muted"')+line(24,443,576,443,'stroke="#25404e"')+text(300,485,'예측 삼차 구조','text-anchor="middle"')+`<image href="data:image/webp;base64,${rnaImage}" x="46" y="507" width="508" height="320" preserveAspectRatio="xMidYMid meet"/>`+text(300,876,rnaMeta.sequence,'class="mono" text-anchor="middle"')+text(300,921,'RNAbpFlow · 목표 이차 구조로 조건화한 예측','class="small muted" text-anchor="middle"');
write('rna-design-mobile.svg',svg('동일 RNA의 목표 이차 구조와 예측 삼차 구조, 휴대폰용 그림',rm,600,960));
let bm=mobileStyle+text(24,36,'BLOOD–BRAIN BARRIER','class="label"')+text(24,67,'pH 7.4 · pKa 7.8','class="small muted"');
bm+=`<rect x="24" y="88" width="552" height="65" rx="12" fill="#102838"/><rect x="24" y="251" width="552" height="50" rx="12" fill="#0d2930"/>`+text(40,121,'혈액','class="small"')+text(40,283,'뇌 조직','class="small"');
for(let i=0;i<6;i++){let x=24+i*92;bm+=`<rect x="${x}" y="165" width="90" height="73" rx="16" fill="#13343e" stroke="#487d88"/>`+`<ellipse cx="${x+45}" cy="200" rx="14" ry="9" fill="#254c56"/>`;if(i<5)bm+=line(x+91,178,x+91,224,'stroke="#a7c9c6" stroke-width="3"');}
for(let i=0;i<13;i++)bm+=circle(168+(i*41)%390,108+(i%2)*20,4,`fill="${i%3?cyan:gold}" opacity=".7"`);
bm+=text(300,226,'내피세포','class="small" text-anchor="middle"')+text(24,344,'뇌 속 활성 약물 · 초기량 대비 (%)','class="small"');
bm+=line(48,378,78,378,`stroke="${cyan}" stroke-width="3" stroke-dasharray="6 5"`)+text(88,384,'원래 약물','class="small"')+line(310,378,340,378,`stroke="${gold}" stroke-width="3"`)+text(350,384,'전구약물','class="small"');
const mxy=(t,v)=>[75+t/60*490,420+225-v/axisMax*225];
for(let k=0;k<=2;k++){let v=axisMax*k/2,y=mxy(0,v)[1];bm+=line(75,y,565,y,'stroke="#26414f"')+text(57,y+6,v,'class="small muted" text-anchor="end"');}
for(let t=0;t<=60;t+=20)bm+=text(mxy(t,0)[0],682,t,'class="small muted" text-anchor="middle"');
for(const [data,color,dash]of [[direct,cyan,'stroke-dasharray="8 6"'],[prodrug,gold,'']])bm+=`<polyline points="${data.map(s=>mxy(s.t,s.y[4]).map(n).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3.5" ${dash}/>`;
bm+=text(320,728,'모형 진행값 (임의 단위)','class="small muted" text-anchor="middle"');
write('bbb-simulation-mobile.svg',svg('BBB 단면과 같은 모형 계산값의 분포 그래프, 휴대폰용 그림',bm,600,760));
let im=mobileStyle+text(24,38,'산화적 인산화 / 처리 조건 비교')+text(24,74,'정상 대조군 대비 변화','class="small muted"');
columns.forEach((c,k)=>{let y=100+k*292;im+=`<rect x="24" y="${y}" width="552" height="270" rx="12" fill="#0a1d2a" stroke="#1c3a48"/>`+text(48,y+36,c.title)+line(300,y+66,300,y+248,'stroke="#66828f" stroke-dasharray="3 5"')+text(204,y+76,'감소','class="small muted" text-anchor="middle"')+text(365,y+76,'증가','class="small muted" text-anchor="middle"');c.values.forEach((v,i)=>{let yy=y+112+i*56,end=300+v*51;im+=text(50,yy+7,['A','B','C'][i],`style="fill:${colors[i]}"`)+`<rect x="${Math.min(300,end)}" y="${yy-10}" width="${Math.abs(end-300)}" height="20" rx="3" fill="${colors[i]}" opacity=".85"/>`+circle(end,yy,4,`fill="${colors[i]}"`)+text(388,yy+7,c.labels[i],'class="small"');});});
im+=text(24,1011,'교육용 정성 모형 · 막대는 변화의 방향을 나타냅니다.','class="small muted"');
write('inquiry-evidence-mobile.svg',svg('세 처리 조건의 세 지표를 위아래로 비교하는 휴대폰용 개념 그래프',im,600,1050));
write('provenance.json',JSON.stringify({protein:{reference:'4S0W',variant:'7LX7',chain:'A',residues:pairs.length,differences,rmsd:fit.rmsd,method:'C-alpha rigid-body least-squares alignment using existing protein-lab core',kind:'experimental structures; crystal conditions differ'},rna:rnaMeta,bbb:{parameters:defaults,kind:'existing educational dimensionless compartment model',axisMax,direct:direct.map(s=>({t:s.t,active:s.y[4]})),prodrug:prodrug.map(s=>({t:s.t,active:s.y[4]}))},inquiry:{kind:'categorical qualitative changes, no empirical numeric magnitudes',source:'assets/activities/cell-energy/model.mjs',rows:{A:'cyanide',B:'dnp',C:'oligomycin'}}},null,2)+'\n');
console.log('Overview figures generated: protein '+pairs.length+' residues, RMSD '+fit.rmsd.toFixed(3)+' Å; RNA '+rnaMeta.sequence.length+' nt; BBB '+direct.length+' samples per series.');
