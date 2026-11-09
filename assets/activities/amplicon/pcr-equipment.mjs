const tubeColors=['#68b1d5','#a996cb','#58b398','#bcaa75'];
export function pcrEquipment({loaded,active,complete,program}){
  const block=loaded?'네 반응관 장착':'반응관 블록 비어 있음';
  return `<svg class="amp-pcr-machine" viewBox="0 0 560 325" role="group" aria-label="RT-PCR 기기와 기본 프로그램">
    <ellipse cx="286" cy="298" rx="232" ry="17" fill="#cedbe4"/>
    <path d="M45 176L121 103H450L517 175V251L465 289H95L45 246Z" fill="#7190a6" stroke="#486477" stroke-width="3"/>
    <path d="M45 176L121 103H450L517 175L465 199H95Z" fill="#dae6ee" stroke="#486477" stroke-width="3"/>
    <path d="M95 199H465V289H95Z" fill="#eef5f8" stroke="#486477" stroke-width="3"/>
    <path d="M465 199l52-24v76l-52 38z" fill="#9bb1c0" stroke="#486477" stroke-width="3"/>
    <path d="M141 103l29-71h209l37 71z" fill="#93adbf" stroke="#486477" stroke-width="3"/>
    <path d="M155 98l25-54h190l30 54z" fill="#b9ccd9" stroke="#6a879a" stroke-width="2"/>
    <path d="M122 149l38-40h242l39 40-16 27H135Z" fill="#405b6b" stroke="#2c4758" stroke-width="3"/>
    <path d="M143 150l26-29h224l28 29-11 17H154Z" fill="#a4b8c5"/>
    ${tubeColors.map((color,i)=>`<ellipse cx="${185+i*63}" cy="147" rx="17" ry="9" fill="#253f51"/>`).join('')}
    ${loaded?`<g id="amp-pcr-tubes">${tubeColors.map((color,i)=>`<g transform="translate(${185+i*63} 147)">
      <path d="M-9-35H9V-13L0 0L-9-13Z" fill="#e0f3fa" stroke="#496779" stroke-width="2"/>
      <path d="M-6-15H6L0-4Z" fill="${color}"/><rect x="-11" y="-38" width="22" height="8" rx="3" fill="${color}" stroke="#496779"/>
    </g>`).join('')}</g>`:''}
    ${active||complete?'<path d="M139 143l24-33h235l30 33-16 27H153Z" fill="#93c6db" fill-opacity=".45" stroke="#5d8198" stroke-width="3"/>':''}
    <rect x="119" y="210" width="322" height="64" rx="8" fill="#18354a" stroke="#6f9eaf" stroke-width="2"/>
    <text x="132" y="229" fill="#a0e8ef" font-size="12">기본 프로그램 · ${block}</text>
    <text id="amp-phase" x="132" y="251" fill="#e6ffff" font-weight="700" font-size="17">${complete?'반응 완료':active?'역전사 준비':program.rt+'°C · 역전사 대기'}</text>
    <text id="amp-cycle" x="428" y="251" text-anchor="end" fill="#e6ffff" font-size="12">${complete?program.cycles:0} / ${program.cycles} 사이클</text>
    <text x="132" y="266" fill="#a0e8ef" font-size="11">${program.initial}°C 초기 변성 · ${program.denature} / ${program.anneal} / ${program.extend}°C 반복 · ${program.final}°C 최종 연장</text>
    <circle cx="481" cy="227" r="6" fill="${active?'#60f0b4':'#547388'}"/>
  </svg>`;
}
