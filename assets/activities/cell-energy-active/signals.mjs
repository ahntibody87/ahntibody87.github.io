// All axes use arbitrary model units. Each trajectory spans the same model interval.
export const signals = {
  oxygen:{name:'산소 소비 속도', axis:'남은 산소량', start:100, end:[53,97,23,81], rate:true, note:'같은 시간 동안 산소량이 많이 줄수록 소비 속도가 큽니다.'},
  gradient:{name:'H⁺ 전기화학적 기울기',axis:'기울기의 크기',start:50,end:[50,14,9,82],note:'정상 대조군과 마지막 시점의 기울기 크기를 비교하세요.'},
  nadh:{name:'NADH/NAD⁺ 비율',axis:'환원 상태의 상대 지수',start:50,end:[50,83,19,78],note:'위쪽에 있는 곡선일수록 NADH/NAD⁺ 비율이 큽니다.'},
  atp:{name:'산화적 ATP 합성 속도',axis:'새로 합성된 ATP 누적량',start:0,end:[82,5,8,5],rate:true,note:'같은 시간에 새로 합성된 ATP 양을 비교하세요.'}
};
export const names=['시안화 이온','짝풀림제(DNP)','올리고마이신'];
export const mechanisms=[
  '복합체 IV에서 산소로 전자를 넘기는 단계가 막힙니다. H⁺ 펌핑이 멎고 기존 기울기도 차츰 줄어듭니다.',
  'H⁺가 ATP 합성 효소를 우회합니다. 기울기가 작아지면서 전자 전달과 산소 소비가 빨라져도 ATP 합성은 줄어듭니다.',
  'ATP 합성 효소의 H⁺ 통로가 막힙니다. 커진 기울기가 추가 펌핑을 어렵게 해 전자 전달과 산소 소비도 느려집니다.'
];
export const ids=['A','B','C'];
export const colors=['#526575','#b34334','#00766c','#72539a'];
export function value(m,i,t){
  const f=t/10;
  return m.start+(m.end[i]-m.start)*(m.rate?f:(1-Math.exp(-3*f))/(1-Math.exp(-3)));
}
export function direction(key,i){
  const m=signals[key], d=m.end[i+1]-m.end[0];
  return (key==='oxygen'?-d:d)>0?'증가':'감소';
}
export function chart(key,patient){
  const m=signals[key], series=[0,patient+1], x=t=>54+t*42,y=v=>151-v*1.2;
  const path=i=>Array.from({length:51},(_,n)=>(n?'L':'M')+x(n/5)+' '+y(value(m,i,n/5))).join(' ');
  return '<svg class="graph" viewBox="0 0 520 192" role="img" aria-label="'+m.axis+' 시간 그래프. 아래 탐침으로 각 값을 읽을 수 있습니다."><text x="12" y="18" font-size="14">'+m.axis+' · 모형 단위</text>'+
    [0,50,100].map(v=>'<path d="M54 '+y(v)+'h420" stroke="#d1dede"/><text x="43" y="'+(y(v)+5)+'" text-anchor="end" font-size="14">'+v+'</text>').join('')+
    series.map(i=>'<path class="trace" pathLength="1" d="'+path(i)+'" fill="none" stroke="'+colors[i]+'" stroke-width="3.5"/>').join('')+
    '<line id="er-probe" y1="26" y2="151" stroke="#758885" stroke-dasharray="4 4"/><text x="54" y="173">0</text><text x="474" y="173" text-anchor="end">10</text><text x="264" y="183" text-anchor="middle">시간 (모형 단위)</text></svg>';
}
function moving(label,color,path,dur,offset=0){
  return '<g><animateMotion path="'+path+'" dur="'+dur+'s" begin="-'+offset+'s" repeatCount="indefinite"/><circle r="10" fill="'+color+'"/><text text-anchor="middle" y="4" style="fill:white;font-size:10px">'+label+'</text></g>';
}
export function membrane(kind){
  const normal=kind===-1, block=kind===0, leak=kind===1, plug=kind===2;
  const speed=plug?5:leak?1.4:2.6;
  const protonPath='M90 131 L90 51',returnPath='M228 51 L228 131';
  return '<svg class="model" viewBox="0 0 344 170" role="img" aria-label="'+(normal?'정상 대조군':names[kind])+' 내막 모형"><text x="10" y="18">막 사이 공간</text><text x="10" y="157">기질</text><rect x="0" y="78" width="344" height="21" fill="#c4dcd5"/><rect x="61" y="66" width="60" height="46" rx="9" fill="#51827e"/><rect x="197" y="63" width="62" height="51" rx="12" fill="#456780"/><text x="91" y="94" text-anchor="middle" style="fill:white;font-size:13px">전달계</text><text x="228" y="94" text-anchor="middle" style="fill:white;font-size:13px">합성 효소</text>'+
    '<text x="150" y="121" font-size="13">O₂</text>'+
    (block?'<text x="125" y="113" style="fill:#9a382c">×</text>':moving('e⁻','#365482','M114 106 L152 113',speed))+
    (block?'':moving('H⁺','#287a6a',protonPath,speed,.4))+
    (plug?'<text x="224" y="55" style="fill:#9a382c">×</text>':moving('H⁺','#287a6a',returnPath,normal?2.2:7,1))+
    (leak?moving('H⁺','#a94c33','M301 42 L301 134',1.5,.7):'')+
    (normal||leak?moving('ATP','#986323','M234 126 L279 149',normal?2.2:7):'')+
    Array.from({length:plug?9:normal?5:2},(_,i)=>'<circle cx="'+(74+19*i)+'" cy="37" r="3" fill="#287a6a"/>').join('')+'</svg>';
}
