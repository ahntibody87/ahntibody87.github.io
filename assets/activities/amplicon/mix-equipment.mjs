
const colors=['#64a9d0','#ae91cc','#54ad94','#b5a477'];
function tube(x,y,index,scale=1){
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-8-35H8V-12Q8-7 0 0Q-8-7-8-12Z" fill="#e0f5fc" stroke="#496779" stroke-width="1.5"/>
    <path d="M-6-15Q0-18 6-15V-11L0-3L-6-11Z" fill="${colors[index]}"/>
    <path d="M-9-36h18v6h-18z" fill="${colors[index]}" stroke="#496779"/>
    <path d="M-4-27v10" stroke="white" stroke-width="2"/>
  </g>`;
}

const holes=[[210,96],[276,156],[210,216],[144,156]];
export function mixEquipment({spin,active,closed,slots,sample,index,button,label,escape}){
  if(!spin)return `<div class="amp-machine amp-vortex" data-mix-drop>
    <svg viewBox="0 0 420 290" role="img" aria-label="고무 접촉판이 있는 볼텍스 믹서${sample?'와 장착한 반응관':''}">
      <ellipse cx="210" cy="252" rx="140" ry="16" fill="#cad7de"/>
      <path d="M115 226v20h31v-20m128 0v20h31v-20" fill="#263a48"/>
      <path d="M87 184l52-62h142l52 62v47H87Z" fill="#879fb1" stroke="#425f75" stroke-width="2"/>
      <path d="M87 184h246v47H87Z" fill="#e5eef3" stroke="#425f75" stroke-width="2"/>
      <rect x="119" y="196" width="84" height="20" rx="4" fill="#294151"/>
      <text x="161" y="210" text-anchor="middle" fill="#f4f8fb" font-size="10">VORTEX</text>
      <circle cx="292" cy="207" r="13" fill="#40596b"/><path d="M292 197v8" stroke="#fff" stroke-width="2"/>
      <circle class="amp-machine-light" cx="236" cy="207" r="5"/>
      <g class="amp-vibration">
        <path d="M165 126v20c0 18 90 18 90 0v-20Z" fill="#273b47"/>
        <ellipse cx="210" cy="126" rx="45" ry="15" fill="#4a606d" stroke="#213542" stroke-width="2"/>
        <ellipse cx="210" cy="126" rx="30" ry="9" fill="none" stroke="#8a9aa5"/>
        ${sample?`<g transform="translate(210 128) rotate(-8)">${tube(0,0,index,1.8)}</g>`:''}
      </g>
      ${sample?'<rect data-vortex-contact x="164" y="58" width="92" height="104" fill="transparent"/>':''}
    </svg>
    ${sample?`<span class="amp-machine-label">${escape(label(sample))} 반응관 / 접촉판 위</span>`:''}
  </div>`;

  return `<div class="amp-machine amp-centrifuge ${active?'amp-machine-running':''}">
    <svg viewBox="0 0 420 290" role="img" aria-label="투명 덮개와 균형 배치용 네 구멍이 있는 원심분리기">
      <ellipse cx="210" cy="261" rx="151" ry="15" fill="#cad7de"/>
      <rect x="79" y="55" width="262" height="205" rx="48" fill="#c1d3df" stroke="#57798c" stroke-width="2"/>
      <circle cx="210" cy="156" r="96" fill="#263f52" stroke="#f0f6fa" stroke-width="7"/>
      <g class="amp-rotor">
        <circle cx="210" cy="156" r="85" fill="#7394a9" stroke="#9bb4c5" stroke-width="2"/>
        <path d="M210 96v120m-66-60h132" stroke="#aac1cf" stroke-width="9"/>
        ${holes.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="16" fill="#263f52" stroke="#d5e5ee" stroke-width="2"/>
          ${slots[i]?`<g data-insert="${i}">${tube(x,y+8,slots[i].index,.9)}</g>`:''}`).join('')}
        <circle cx="210" cy="156" r="15" fill="#314d60" stroke="#d5e5ee" stroke-width="3"/>
      </g>
      ${closed?'<circle cx="210" cy="156" r="99" fill="#aee2f4" fill-opacity=".22" stroke="#42758e" stroke-width="5"/><path d="M134 118q14-31 43-40" fill="none" stroke="#e8fbff" stroke-width="5" stroke-linecap="round"/>':'<rect x="164" y="42" width="92" height="17" rx="6" fill="#567387"/>'}
      <circle class="amp-machine-light" cx="319" cy="218" r="5"/>
    </svg>
    ${!closed?holes.map(([x,y],i)=>button(slots[i]?escape(label(slots[i].id)):i+1,'spinSlot',
      `data-slot="${i}" class="amp-spin-slot ${slots[i]?'amp-slot-filled':''}" style="left:${x/4.2}%;top:${y/2.9}%" aria-label="${i+1}번 자리 ${slots[i]?escape(label(slots[i].id))+' 반응관 빼기':'반응관 꽂기'}"`)).join(''):''}
  </div>`;
}
