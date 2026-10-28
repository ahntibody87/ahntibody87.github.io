// Educational observation sequence. Timing and molecule counts are not measurements.
const C={ink:'#273b50',muted:'#64788b',dna:'#7893ad',myod:'#926482',tf:'#537cbb',rna:'#ad8432',actin:'#258c91',myosin:'#d58b35',stop:'#719270'};
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*clamp(t);
const txt=(s,x,y,size=17,color=C.ink)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" fill="${color}">${s}</text>`;
const line=(x,y,a,b,color=C.dna,w=3)=>`<path d="M${x},${y} L${a},${b}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const box=(x,y,w,h,fill,stroke='#dbe3ec',r=12)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const arrow=(d,color=C.tf)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" marker-end="url(#muscle-arrow)"/>`;
const group=(a,s)=>`<g opacity="${a}">${s}</g>`;
function dna(x,y,label,color,on){return line(x-68,y-5,x+68,y-5)+line(x-68,y+5,x+68,y+5)+Array.from({length:14},(_,i)=>line(x-65+i*10,y-5,x-65+i*10,y+5,C.dna,1)).join('')+box(x-33,y-10,66,20,on?color:'#e1e7ee','none',3)+txt(label,x,y-23,16,on?color:C.muted);}
function protein(x,y,color,label=''){return `<path d="M${x-14},${y+8} Q${x-23},${y-12} ${x-7},${y-13} Q${x},${y-26} ${x+9},${y-12} Q${x+24},${y-8} ${x+12},${y+9} Z" fill="${color}"/>`+(label?txt(label,x,y+31,15,color):'');}
function rna(x,y,label='mRNA'){return `<path d="M${x-29},${y} q10,-15 20,0 t20,0 t20,0" fill="none" stroke="${C.rna}" stroke-width="4"/>`+txt(label,x,y+24,14,C.rna);}
function actin(x,y,n=12){return Array.from({length:n},(_,i)=>`<circle cx="${x+i*9}" cy="${y+(i%2?2:-2)}" r="5" fill="${C.actin}"/>`).join('');}
function myosin(x,y,w=100){let s=line(x,y,x+w,y,C.myosin,6);for(let i=8;i<w;i+=20)s+=line(x+i,y,x+i-5,y-10,C.myosin,3)+`<circle cx="${x+i-6}" cy="${y-12}" r="4" fill="${C.myosin}"/>`;return s;}
function sarcomere(cx,y,compression=0,reveal=1){
  const half=135-compression*65,left=cx-half,right=cx+half;
  let s=line(left,y-42,left,y+42,C.dna,4)+line(right,y-42,right,y+42,C.dna,4);
  if(reveal>0){for(const dy of [-26,26]){s+=actin(left,y+dy,Math.ceil(12*reveal));s+=`<g transform="translate(${right},${y+dy}) scale(-1,1)">${actin(0,0,Math.ceil(12*reveal))}</g>`;}s+=myosin(cx-70,y,140*reveal);}
  return s;
}
export class MuscleDiagram{
  constructor(canvas){
    this.host=canvas.parentElement;canvas.hidden=true;
    this.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    this.svg.setAttribute('viewBox','0 0 1000 610');this.svg.setAttribute('role','img');this.svg.classList.add('muscle-diagram');this.host.append(this.svg);
    this.time=0;this.update(0);
  }
  view(){this.render();}
  render(){this.update(this.time,this.contraction);}
  update(time,contraction=0){
    this.time=time;this.contraction=contraction;const phase=Math.min(7,Math.floor(time)),p=time-phase;
    const progress=(start,duration=.8)=>clamp((time-start)/duration);
    const a=(start)=>time>=start?1:.18;
    let s=`<defs><marker id="muscle-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="${C.tf}"/></marker></defs>`;
    if(phase<6){
      s+=box(22,38,956,294,'#eef3f9')+txt('핵 · DNA와 유전자는 이곳에 남습니다',500,65,16,C.muted)+txt('세포질 · 리보솜에서 단백질 합성',500,367,16,C.muted);
      s+=line(40,338,960,338,'#b9c9da',2);
      const genes=[[155,138,'MyoD 유전자',C.myod,1],[435,138,'다른 전사 인자 유전자',C.tf,3],[760,120,'근육형 액틴 유전자',C.actin,4],[760,203,'마이오신 관련 유전자',C.myosin,4],[760,286,'세포 주기 정지 관련 유전자',C.stop,4]];
      for(const [x,y,label,color,start] of genes)s+=dna(x,y,label,color,time>=start);
      s+=group(a(2),arrow('M155,239 C60,225 50,90 124,114',C.myod)+txt('자기 발현 유지',139,93,13,C.myod));
      s+=group(a(3),arrow('M195,235 C280,235 280,138 393,138')+txt('발현 유도',303,190,14,C.tf));
      s+=group(a(4),arrow('M476,236 C575,236 575,120 714,120')+arrow('M575,203 L714,203')+arrow('M575,236 C575,286 650,286 714,286')+txt('함께 조절',588,96,14,C.tf));
      // Transcription, export, translation, then protein import occupy separate intervals.
      if(phase===0)s+=arrow('M56,218 L105,218')+txt('분화 신호',123,264,16,C.tf);
      if(time>=1){let q=progress(1);s+=rna(155,mix(185,405,q),'MyoD mRNA');s+=group(a(2),box(117,433,76,24,'#dee6ef')+txt('리보솜',155,477,14,C.muted));}
      if(time>=2){const q=progress(2);s+=protein(mix(155,190,q),mix(426,235,q),C.myod,'MyoD 단백질');s+=group(.8,arrow('M190,399 L190,277',C.myod));}
      if(time>=3){let q=progress(3,.4);s+=rna(435,mix(185,405,q),'mRNA');s+=box(397,433,76,24,'#dee6ef')+txt('리보솜',435,477,14,C.muted);if(p>.4||phase>3){q=progress(3.4,.4);s+=protein(mix(435,475,q),mix(426,236,q),C.tf,'다른 전사 인자');}}
      if(time>=4){for(let j=0;j<3;j++){const y=120+j*83;const q=progress(4+j*.13,.45);s+=group(q,rna(845,mix(y+27,400+j*55,q),j===0?'각 유전자의 mRNA':''));}}
      if(time>=5){const q=progress(5,.7);s+=box(630,382,335,184,'#fff');s+=txt('각 mRNA → 리보솜 → 단백질',798,405,15);for(let j=0;j<3;j++)s+=rna(670,430+j*52,'')+box(704,421+j*52,36,17,'#dee6ef')+arrow(`M746,${432+j*52} L768,${432+j*52}`);s+=actin(780,433,Math.max(1,Math.ceil(q*8)))+txt('액틴',913,439,14,C.actin);s+=myosin(780,485,Math.max(8,70*q))+txt('마이오신',913,491,14,C.myosin);s+=group(q,protein(800,537,C.stop)+txt('주기 정지',910,544,14,C.stop));}
      s+=txt(phase<3?'유전자 → mRNA → 단백질 → 핵 안에서 발현 조절':'전사 인자 → 여러 표적 유전자 → 서로 다른 단백질',500,595,17,C.muted);
    }else{
      s+=txt('합성된 단백질이 구조를 이루고 기능으로 이어집니다',500,40,21);
      s+=box(35,65,930,65,'#eef3f9')+txt('MyoD → 다른 전사 인자 → 근육형 액틴 · 마이오신 관련 유전자 발현',500,92,17)+txt('DNA의 유전정보 유지 · 전사와 번역을 거쳐 단백질 합성',500,116,14,C.muted);
      const q=phase===6?clamp(p/.8):1;
      s+=txt('가는 필라멘트 · 액틴',250,173,17,C.actin)+txt('굵은 필라멘트 · 마이오신',750,173,17,C.myosin);
      s+=actin(180,205,16)+myosin(680,205,140);
      s+=arrow('M250,225 L350,273')+arrow('M750,225 L650,273');
      s+=sarcomere(500,315,contraction,q)+txt('Z선',365+contraction*65,382,14,C.muted)+txt('Z선',635-contraction*65,382,14,C.muted);
      s+=txt(contraction>0?'수축: 필라멘트 길이는 유지되고 겹침이 커집니다':'근절 · 가는 필라멘트와 굵은 필라멘트의 규칙적인 배열',500,412,17);
      if(phase===6)s+=txt('단백질이 축적된 뒤 근절 구조로 조립됩니다',500,490,18,C.muted);
      else{
        const f=clamp(p/.75);s+=txt('여러 근아세포의 융합 → 다핵 근관 → 이후 성숙',500,466,18);
        for(let j=0;j<3;j++){let x=mix(270+j*230,320+j*180,f);s+=box(x-90,491,180,58,'#eff4f8',`rgba(120,147,173,${1-f})`,27)+`<ellipse cx="${x}" cy="520" rx="10" ry="6" fill="${C.dna}"/>`;}
        s+=group(f,`<rect x="230" y="491" width="540" height="58" rx="27" fill="none" stroke="${C.dna}" stroke-width="2"/>`);
        s+=txt('여러 핵이 남습니다 · 수축 관찰로 근절의 변화를 비교하세요',500,585,16,C.muted);
      }
    }
    this.svg.innerHTML=s;this.svg.setAttribute('aria-label',phase<6?'MyoD에서 다른 전사 인자, 근육형 액틴과 마이오신 합성으로 이어지는 발현 조절 도식':'액틴과 마이오신의 근절 배열, 근아세포 융합과 수축 도식');
  }
}
