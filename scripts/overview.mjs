const activity = (unit, id) => `/advanced-life-science/${unit}/${id}/`;
const link = (url, text) => `<a class="overview-link" href="${url}">${text}<span aria-hidden="true">↗</span></a>`;
const mobileHeights={'protein-comparison':660,'rna-design':960,'bbb-simulation':760,'inquiry-evidence':1050};
const figure = (name, alt, caption, version) => `<figure class="overview-figure"><picture><source media="(max-width:600px)" srcset="/assets/overview/${name}-mobile.svg?v=${version}" width="600" height="${mobileHeights[name]}"><img src="/assets/overview/${name}.svg?v=${version}" width="1000" height="660" loading="lazy" decoding="async" alt="${alt}"></picture><figcaption>${caption}</figcaption></figure>`;

export function platformOverview(version) {
  return `<section class="platform-overview" id="about" aria-labelledby="about-title" tabindex="-1">
    <header class="overview-intro">
      <p class="overview-eyebrow" lang="en">AHNTIBODY’S LIFESCIENCE LAB</p>
      <h2 id="about-title" lang="en">Platform Overview</h2>
      <p>단백질·RNA 설계, 생명현상 시뮬레이션, 사례 기반 탐구 활동을 소개합니다.</p>
    </header>

    <section class="overview-section" aria-labelledby="overview-design-title">
      <header class="overview-section-heading"><span class="overview-number" aria-hidden="true">01</span><h3 id="overview-design-title" lang="en">Molecular Design Studio</h3></header>
      <div class="overview-feature">
        <div class="overview-copy">
          <p class="overview-topic">단백질 구조 비교</p>
          <p>단백질의 아미노산 서열을 바꾸어 입체 구조를 예측하고, 기준 구조와 치환 변이를 비교합니다. 바꿀 위치를 정하고 결과를 살펴보는 과정에서 분자의 구조와 기능에 관한 연구 질문을 만들어 볼 수 있습니다.</p>
          <p>예측 결과와 공개된 실험 구조를 같은 화면에서 관찰하고, 관심 있는 아미노산을 서열과 구조에 연결해 살펴봅니다.</p>
          <div class="overview-use"><span>수업에서</span><p>치환 위치를 정한 이유와 구조에서 관찰한 차이를 기록하고, 기능에 관한 가설을 설명해 봅니다.</p></div>
          ${link(activity('cell-energy','protein-lab'),'단백질 설계 실험실 열기')}
        </div>
        ${figure('protein-comparison','T4 라이소자임 기준 구조와 L99A 치환 변이를 Cα 좌표로 정렬해 겹친 비교 예시. 99번 잔기 위치와 두 서열을 함께 표시합니다.','구조 비교 참고 예시 · 공개 실험 구조 4S0W / 7LX7 · 예측 결과가 아닙니다.',version)}
      </div>
      <div class="overview-feature overview-feature-secondary">
        ${figure('rna-design','GGGGAAAACCCC 서열의 목표 헤어핀 이차 구조와, 같은 이차 구조를 조건으로 RNAbpFlow가 예측한 삼차 구조.','RNA 예시 · 목표 이차 구조로 조건화한 삼차 구조 예측 · 촉매 활성 검증 결과가 아닙니다.',version)}
        <div class="overview-copy">
          <p class="overview-topic">RNA 구조 설계</p>
          <p>RNA의 이차 구조와 3차원 접힘을 살펴보고, 리보자임을 염두에 둔 구조 설계에도 도전합니다. 원하는 염기쌍과 고리 구조를 만들기 위해 서열을 수정하며 설계를 발전시킵니다.</p>
          <p>그 구조가 촉매 기능과 어떻게 연결될지 가설을 세우고, 설계한 RNA의 활성을 확인하려면 어떤 실험이 필요할지 생각해 보는 출발점입니다.</p>
          <div class="overview-use"><span>수업에서</span><p>목표 구조와 설계 결과를 비교하고, 구조 예측만으로 알 수 있는 것과 추가 실험이 필요한 것을 구분해 봅니다.</p></div>
          ${link(activity('gene-expression','rna-lab'),'RNA 설계 실험실 열기')}
        </div>
      </div>
    </section>

    <section class="overview-section" aria-labelledby="overview-simulation-title">
      <header class="overview-section-heading"><span class="overview-number" aria-hidden="true">02</span><h3 id="overview-simulation-title" lang="en">Interactive Simulation</h3></header>
      <div class="overview-feature overview-feature-wide">
        ${figure('bbb-simulation','혈액·내피세포·뇌 조직으로 나눈 혈액–뇌 장벽 개념도와, 동일 조건의 원래 약물 및 전구약물에 대한 뇌 속 활성 약물 비율 그래프.','BBB 약물 설계 · 기존 활동의 교육용 구획 모형 계산값 · 실제 시간이나 임상 도달률이 아닙니다.',version)}
        <div class="overview-copy">
          <p class="overview-topic">BBB 약물 설계</p>
          <p>혈액–뇌 장벽을 사이에 둔 분자의 이동을 관찰하고, 약물의 성질과 주변 환경이 분포에 어떤 영향을 주는지 살펴봅니다.</p>
          <p>원래 약물과 전구약물의 뇌 속 활성 약물 비율을 그래프로 비교하며, 조건에 따른 차이를 해석할 수 있습니다.</p>
          <div class="overview-use"><span>수업에서</span><p>분자의 성질을 바꾸기 전에 결과를 예상하고, 한 가지 조건씩 조절해 분포와 그래프의 변화를 확인합니다.</p></div>
          ${link(activity('regulation-defense','bbb-lab'),'BBB 약물 설계 실험실 열기')}
        </div>
      </div>
      <div class="overview-related" aria-label="다른 시뮬레이션 예시">
        <a href="${activity('regulation-defense','neuron-lab')}"><img src="/assets/activity-previews/neuron-lab.png" alt="신경 입력과 막전위 그래프 예시" width="640" height="360" loading="lazy"><div><h4>신경회로 실험실</h4><p>입력의 시간 차이와 억제, 실제 뉴런 기록과의 비교</p></div></a>
        <a href="${activity('gene-expression','x-inactivation')}"><img src="/assets/activity-previews/x-inactivation.png" alt="삼색 고양이와 X 염색체 불활성화 모형" width="640" height="360" loading="lazy"><div><h4>X 염색체 불활성화</h4><p>유전자 발현과 세포 계보에 따른 무늬의 형성</p></div></a>
        <a href="${activity('gene-expression','embryo-atlas')}"><img src="/assets/activities/embryo-atlas/preview.webp" alt="사람 배아의 초기 발생 구조 모형" width="640" height="360" loading="lazy"><div><h4>사람의 발생과 세포 분화</h4><p>초기 발생의 관찰부터 배엽과 조직의 형성까지</p></div></a>
      </div>
    </section>

    <section class="overview-section" aria-labelledby="overview-inquiry-title">
      <header class="overview-section-heading"><span class="overview-number" aria-hidden="true">03</span><h3 id="overview-inquiry-title" lang="en">Inquiry Activity</h3></header>
      <div class="overview-feature">
        <div class="overview-copy">
          <h4 class="overview-topic">사례로 시작하는 생명과학 탐구</h4>
          <p>약물 처리에 따른 세포 대사의 변화처럼, 주어진 상황을 여러 관찰 결과와 연결해 해석합니다. 어떤 검사가 필요한지 선택하고, 서로 다른 결과를 함께 검토하며 원인을 추론합니다.</p>
          <p>같은 ATP 합성 감소가 나타나더라도 산소 소비와 H⁺ 기울기는 다를 수 있습니다. 판정의 근거를 설명하고, 더 확인해야 할 점을 찾아가는 탐구를 경험합니다.</p>
          <div class="overview-use"><span>수업에서</span><p>모둠별로 검사 선택의 이유를 논의하고, 결과 해석과 판정의 근거를 비교합니다.</p></div>
          ${link('/advanced-life-science/cell-energy/','관련 탐구 활동 살펴보기')}
        </div>
        ${figure('inquiry-evidence','세 처리 조건에서 산소 소비 속도, 산화적 ATP 합성 속도, H⁺ 기울기의 증가·감소를 정상 대조군과 비교한 개념 그래프.','약물 처리와 산화적 인산화 · 정상 대조군 대비 변화의 방향을 나타내는 교육용 정성 모형',version)}
      </div>
      <ol class="overview-process" aria-label="탐구 활동의 흐름">
        <li><span aria-hidden="true">01</span><h4>상황 파악</h4><p>무엇이 달라졌고, 무엇을 알아내야 할까요?</p></li>
        <li><span aria-hidden="true">02</span><h4>검사 선택</h4><p>가능한 원인을 구별할 자료를 선택합니다.</p></li>
        <li><span aria-hidden="true">03</span><h4>결과 해석</h4><p>여러 관찰 결과를 함께 검토합니다.</p></li>
        <li><span aria-hidden="true">04</span><h4>판정과 근거 분석</h4><p>판정의 이유와 아직 남은 질문을 설명합니다.</p></li>
      </ol>
    </section>

    <section class="overview-author" aria-labelledby="overview-author-title">
      <div><p class="overview-eyebrow" lang="en">ABOUT THE CREATOR</p><h3 id="overview-author-title" lang="en">Created by<br> AHNTIBODY</h3><span class="overview-author-rule" aria-hidden="true"></span></div>
      <div class="overview-author-copy">
        <p>ATLL은 서울특별시 고등학교 교사 안영준이 제작한 생명과학 탐구 플랫폼입니다. 생명과학을 가르치며 학생들과 함께 더 깊이 들여다보고 싶었던 주제와 활동, 탐구에 도움이 되는 연구 엔진과 도구를 이곳에 조금씩 담고 있습니다.</p>
        <p>학생들이 생명과학 연구를 조금 더 가깝게 느끼고, 궁금한 것을 직접 확인하며 상상력을 구체화하고 아이디어를 실현하는 성공 경험을 쌓을 수 있도록 노력하고 있습니다. 그 경험을 바탕으로 자신만의 질문과 아이디어를 세상에 펼쳐 나가기를 응원하며, ATLL은 학생들의 생명과학적 사고가 시작되고 뻗어 나가는 데 필요한 작은 프라이머가 되고자 합니다.</p>
      </div>
    </section>
  </section>`;
}
