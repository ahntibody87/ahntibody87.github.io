# 메인 페이지 시각 자료

## 비대칭 키나아제의 사선 회전

- `1atp-kinase.pdb`: RCSB PDB [1ATP](https://www.rcsb.org/structure/1ATP), cAMP 의존성 단백질 키나아제의 촉매 소단위체(E), 억제 펩타이드(I), ATP와 망가니즈 이온 2개입니다. 비대칭 구조이며 알파나선과 베타병풍이 함께 있습니다.
- 원본: https://files.rcsb.org/download/1ATP.pdb (2026-10-15 조회). 단백질 N·CA·C·O, ATP와 MN을 추출했습니다. 총 1457개 원자, 아미노산 잔기 356개이며 HELIX/SHEET 및 남은 원자 사이 CONECT 기록을 유지합니다. 물과 곁사슬은 제외합니다. SEP·TPO의 주사슬은 부모 잔기 SER·THR로 표기하고 인산기는 생략했습니다.
- 좌표 평균을 원점으로 옮기고 주성분 축으로 강체 회전했습니다(긴 축 X, 중간 축 Y, 짧은 축 Z, 오른손 좌표계). 상대 거리와 형태는 유지하며 PDB 소수 셋째 자리로 저장했습니다. wwPDB 이용 정책: https://www.wwpdb.org/about/usage-policies
- 베타병풍은 밝은 청록, 알파나선은 파랑, 연결 부위는 청록, 억제 펩타이드는 옅은 청회색입니다. ATP와 MN은 절제된 금빛입니다. 색은 디자인 구분이며 실제 원자 색이 아닙니다.
- 회전축은 정규화한 (0.93, 0.32, 0.18)입니다. 가로 윤곽을 유지하면서 앞뒤·위아래가 함께 변하는 사선 회전입니다. 초당 6도, 1분에 한 바퀴, 최대 약 30fps이며 화면 밖·숨긴 탭에서는 쉽니다. 단백질의 실제 분자 운동을 시뮬레이션하지 않습니다.
- 각 원자의 사선 회전을 Rodrigues 공식으로 분해해 모든 각도의 최대 가로·세로 반경을 계산합니다. 표현 두께 3Å와 8% 여백을 포함해 카메라를 맞추며 화면 크기가 바뀌면 재계산합니다.
- `kinase-poster.webp`: 같은 렌더러·스타일·20도 시작 각도로 캡처한 1000×800 첫 프레임입니다. 이미지와 WebGL은 동일한 5:4 영역을 사용합니다. 구조·스타일·각도가 바뀌면 이 이미지도 다시 캡처합니다. WebGL 실패 시에도 같은 모델의 정지 이미지가 남습니다.
- 데스크톱 시각 영역을 왼쪽으로 당겨 문구와의 간격을 줄였습니다. 모바일·태블릿에서는 본문 아래 중앙에 배치합니다. 모든 영역에 overflow 및 paint containment를 적용합니다.
- `vendor/3Dmol-2.5.5.min.js`: [3Dmol.js](https://3dmol.org/), BSD-3-Clause, 고정 버전 2.5.5. 라이선스는 같은 폴더의 `LICENSE-3Dmol.txt`, `3Dmol-min.js.LICENSE.txt`에 있습니다. 모델과 라이브러리는 같은 사이트에서 제공하며 외부 CDN을 사용하지 않습니다.
- `node scripts/check-home-protein.mjs`는 구조·알파나선·베타병풍, 사선 회전 360개 각도의 경계, 속도와 수명주기를 검사합니다. 실제 렌더링에서도 8개 각도 및 반응형 배치를 확인합니다.
- 이전 1TIM·4HHB 구조와 포스터는 보관 자료이며 현재 홈페이지에서는 로드하지 않습니다.

## 기존 코스 카드 이미지

2026-10-15, 내장 image_gen 도구로 생성한 장식용 생명과학 일러스트입니다. 첨부된 웹 시안의 어두운 네이비·시안 색감과 오른쪽 중심 구성을 참고했습니다. 과학적 측정 결과나 정확한 분자 구조 모형으로 사용하지 않습니다.

배포 파일은 WebP로 변환해 저장소 안에서 제공합니다. 원본 PNG는 웹에 로드하지 않습니다.

| 파일 | 크기 | 용도 |
| --- | --- | --- |
| life-science.webp | 1536 × 1024, 167818 bytes | 유전 카드 |
| cell.webp | 768 × 512, 68264 bytes | 통합과학 카드 |
| neuron.webp | 768 × 512, 53370 bytes | 고급 생명과학 카드 |

## 생성 프롬프트

### life-science.webp

Use case: stylized-concept. Asset type: full-bleed science education website hero background, landscape 1536x1024. Create cinematic intricate 3D scientific artwork of a luminous cyan and electric blue DNA double helix, with translucent blue cellular structures and very subtle molecular connections floating in dark navy black space. The main detailed helix dominates the RIGHT HALF, diagonal from lower center to upper right, several elegant loops, realistic molecular bead detail and restrained bloom. LEFT 45 percent almost black negative space, seamlessly fading into the scene, suitable for separately rendered website text. Small defocused cells at the far right and lower right, quiet particles, hints of lavender in the cell organelles. Premium life science research lab, intriguing educational atmosphere, sophisticated and spacious, similar to a high-end biotech visualization, not a busy futuristic game. Crisp strand detail, depth of field, cyan highlights with deep black shadows. NO text, NO letters, NO labels, NO UI, NO borders, NO watermark.

### cell.webp

Create a polished cinematic 3D life science illustration for a website course banner, wide landscape. A translucent animal cell cutaway with blue membrane and purple nucleus, fine organelles with cyan highlights, occupies the RIGHT HALF and extends beyond the right edge. LEFT HALF is near-black navy empty space. Very dark navy background, luminous electric blue, restrained cyan, touches of lavender, high detail and shallow depth of field, like a premium biological microscopy visualization. No text, labels, logos or UI. Educational atmosphere. Landscape 1536x1024.

### neuron.webp

Create a polished cinematic 3D life science illustration for a website course banner, wide landscape. A glowing blue cyan neuron with spherical cell body, branching delicate dendrites reaching into the surroundings, occupies the RIGHT HALF with some branches extending out of frame. LEFT HALF is near-black navy empty space. Deep navy and black background, cool electric blue and teal glowing membranes, tiny traces of lavender, intricate biological detail, subtle depth of field, high-end science visualization. No text, labels, logos or UI. Educational atmosphere. Landscape 1536x1024.
