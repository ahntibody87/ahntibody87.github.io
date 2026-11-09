export function electrodeDiagram(reversed,running){
  const negative=reversed?125:65,positive=reversed?65:125;
  return `<svg class="amp-electrode-diagram" viewBox="0 0 520 174" role="img"
    aria-label="전원 장치. ${reversed?'검정 음극은 겔 반대쪽, 빨강 양극은 웰 쪽':'검정 음극은 웰 쪽, 빨강 양극은 겔 반대쪽'}">
    <rect x="24" y="35" width="159" height="108" rx="11" fill="#e8eff6" stroke="#567288" stroke-width="2"/>
    <rect x="38" y="51" width="93" height="34" rx="5" fill="#253e51"/>
    <text x="84" y="73" text-anchor="middle" fill="#f1f7fc" font-size="14">전원 장치</text>
    <circle cx="61" cy="111" r="6" fill="${running?'#48b87a':'#8998a4'}"/>
    <text x="76" y="116" fill="#41576e" font-size="12">${running?'가동 중':'대기'}</text>
    <rect x="340" y="37" width="151" height="112" rx="13" fill="#bfd4e0" stroke="#628299" stroke-width="2"/>
    <rect x="369" y="54" width="98" height="78" rx="4" fill="#d8eee6"/>
    <path d="M381 68h9m5 0h9m5 0h9m5 0h9m5 0h9" stroke="#527a74" stroke-width="5"/>
    <text x="418" y="23" text-anchor="middle" fill="#334a5d" font-size="15">웰 쪽</text>
    <text x="418" y="168" text-anchor="middle" fill="#334a5d" font-size="15">겔 반대쪽</text>
    <path d="M161 65 C243 65 263 ${negative} 349 ${negative}" fill="none" stroke="#263440" stroke-width="6"/>
    <path d="M161 125 C243 125 263 ${positive} 349 ${positive}" fill="none" stroke="#f3f7fb" stroke-width="10"/>
    <path d="M161 125 C243 125 263 ${positive} 349 ${positive}" fill="none" stroke="#b53955" stroke-width="6"/>
    <circle cx="161" cy="65" r="11" fill="#263440"/><circle cx="161" cy="125" r="11" fill="#b53955"/>
    <circle cx="349" cy="${negative}" r="11" fill="#263440"/><circle cx="349" cy="${positive}" r="11" fill="#b53955"/>
    <g fill="#fff" text-anchor="middle" font-size="16" font-weight="700">
      <text x="161" y="70">−</text><text x="161" y="130">+</text>
      <text x="349" y="${negative+5}">−</text><text x="349" y="${positive+5}">+</text>
    </g>
    ${running?'<path class="amp-dye-front" d="M383 85h67" stroke="#557aba" stroke-width="4" stroke-opacity=".45"/>':''}
  </svg>`;
}

export function uvEquipment(placed,closed){
  return `<svg class="amp-uv-machine" viewBox="0 0 500 260" role="img" aria-label="UV 관찰기 · ${closed?'보호 덮개 닫힘':placed?'겔 장착, 보호 덮개 열림':'받침 비어 있음, 보호 덮개 열림'}">
    <ellipse cx="256" cy="231" rx="192" ry="15" fill="#cedae5"/>
    <path d="M77 169l75-58h235l44 58v43l-48 20H111l-34-20Z" fill="#667a91" stroke="#334b61" stroke-width="3"/>
    <path d="M77 169l75-58h235l44 58-48 24H111Z" fill="#aabbd0" stroke="#334b61" stroke-width="3"/>
    <path d="M137 169l40-40h187l30 40-26 12H155Z" fill="${closed?'#797cd2':'#42586e'}" stroke="#52677c" stroke-width="3"/>
    ${placed?`<g id="amp-uv-gel"><path d="M173 165l25-28h144l20 28-16 7H184Z" fill="${closed?'#9eeada':'#b6decd'}" stroke="#5e9d95" stroke-width="2"/><path d="M204 145h13m12 0h13m12 0h13m12 0h13m12 0h13" stroke="#588c89" stroke-width="3"/></g>`:''}
    ${closed?
      '<path d="M94 153l60-55h229l35 55-44 30H121Z" fill="#6756a0" fill-opacity=".72" stroke="#433673" stroke-width="4"/><path d="M127 151l46-42h194l22 42-30 18H143Z" fill="#a392e8" fill-opacity=".24" stroke="#a79de0" stroke-width="2"/>':
      '<path d="M152 112l14-78h200l22 78z" fill="#665890" stroke="#413766" stroke-width="4"/><path d="M171 102l11-53h168l17 53z" fill="#a496cc" stroke="#7867a4" stroke-width="2"/>'}
    <rect x="131" y="203" width="127" height="18" rx="4" fill="#25384e"/>
    <text x="194" y="216" text-anchor="middle" fill="#e3eef7" font-size="10">UV TRANSILLUMINATOR</text>
    <circle cx="352" cy="211" r="5" fill="${closed?'#7ef4c3':'#a3b0bc'}"/>
  </svg>`;
}
