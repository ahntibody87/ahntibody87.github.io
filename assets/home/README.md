# 메인 페이지 시각 자료

## 회전하는 헤모글로빈

- `4hhb-hemoglobin.pdb`: RCSB PDB [4HHB](https://www.rcsb.org/structure/4HHB), 사람의 탈산소 헤모글로빈 사량체입니다. A·C는 알파 사슬, B·D는 베타 사슬이며, 네 개의 헴을 함께 표시합니다. 아미노산 574개와 철 원자 4개를 포함합니다.
- 원본: https://files.rcsb.org/download/4HHB.pdb (2026-10-15 조회). 리본용 N·CA·C·O와 HEM 전체 원자를 추출해 총 2468개 원자를 보존했습니다. HELIX와 해당 CONECT 기록을 유지했습니다. 물, 인산 이온 및 단백질 곁사슬은 표시하지 않습니다.
- 가로 배치를 위해 좌표의 평균을 원점으로 옮기고 주성분 축으로 강체 회전했습니다(가장 긴 축 X, 가장 짧은 축 Y, 오른손 좌표계). 상대 거리와 구조 형태는 보존되며 출력 좌표는 PDB 소수 셋째 자리입니다. wwPDB 이용 정책: https://www.wwpdb.org/about/usage-policies
- `hemoglobin-poster.webp`: 동일한 로컬 3Dmol 렌더러·스타일·20도 시작 각도에서 캡처한 1000×800 첫 프레임입니다. 생성형 이미지가 아닙니다. 첫 화면과 WebGL 모두 5:4 영역 및 같은 화면 맞춤을 사용하므로 로딩 후 다른 구조로 교체되지 않습니다. 모델·스타일·시작 각도를 바꾸면 이 이미지도 다시 캡처해야 합니다.
- 청록·파랑은 사슬 구분을 위한 디자인 색상이며 헴은 금빛 막대, 철은 작은 구로 표시합니다. 실제 원자의 색이나 분자 운동을 표현하는 것은 아닙니다.
- `vendor/3Dmol-2.5.5.min.js`: [3Dmol.js](https://3dmol.org/), BSD-3-Clause, 고정 버전 2.5.5. 라이선스는 같은 폴더의 `LICENSE-3Dmol.txt`, `3Dmol-min.js.LICENSE.txt`에 있습니다. 라이브러리와 좌표 모두 사이트 내부에서 제공하며 외부 CDN 요청이 없습니다.
- 회전은 초당 6도(1분에 360도), 최대 약 30fps입니다. 화면 밖이나 숨긴 탭에서는 쉬었다가 다시 보이면 이어집니다.
- 카메라는 전체 Y축 회전에서의 최대 가로 반경과 세로 반경에 표현 두께 3Å 및 8% 여백을 더해 맞춥니다. 영역 크기가 바뀌면 다시 계산합니다. 별도 영역의 overflow와 paint containment도 적용했습니다.
- WebGL·구조 로드 실패 시 같은 헤모글로빈의 정지 이미지를 표시합니다.
- `node scripts/check-home-protein.mjs`: 4사슬·4헴, 360개 각도에서의 투영 경계, 회전 속도와 수명주기를 검사합니다. 실제 브라우저에서도 8개 각도와 데스크톱·모바일 배치를 확인했습니다.
- 이전 `1tim-chain-a.pdb`, `protein-poster.webp`는 기존 자료이며 현재 메인 화면에서 로드하지 않습니다.

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
