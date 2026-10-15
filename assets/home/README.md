# ATLL 메인 비주얼

## 회전하는 단백질 히어로

- `protein-poster.webp`: 승인된 단백질 리본 도안을 WebP로 변환한 초기·대체 이미지. 특정 실험 구조를 나타내지는 않습니다. 내장 image_gen으로 생성한 원본 PNG에서 변환했습니다.
- `1tim-chain-a.pdb`: RCSB PDB [1TIM](https://www.rcsb.org/structure/1TIM), 닭 근육의 트리오스인산 이성질화효소 **A 사슬만** 표시합니다. 효소 전체의 두 사슬 조립체는 표시하지 않습니다. 논문: Banner et al., Nature 255, 609–614 (1975), DOI: [10.1038/255609a0](https://doi.org/10.1038/255609a0).
- 원본 데이터: https://files.rcsb.org/download/1TIM.pdb (2026-10-15 조회). A 사슬의 N·CA·C·O 원자 988개와 해당 HELIX/SHEET 기록을 추출했습니다. 좌표와 잔기 번호는 원본 그대로이며 리본 표현에 필요 없는 원자는 제외했습니다. 아미노산 잔기는 247개입니다. wwPDB 데이터 이용 정책: https://www.wwpdb.org/about/usage-policies
- `vendor/3Dmol-2.5.5.min.js`: [3Dmol.js](https://3dmol.org/), BSD-3-Clause. 고정 버전 2.5.5를 https://unpkg.com/3dmol@2.5.5/build/3Dmol-min.js 에서 가져와 로컬로 제공합니다. 관련 고지는 같은 폴더의 `LICENSE-3Dmol.txt`, `3Dmol-min.js.LICENSE.txt`에 있습니다.
- 리본의 청록·파랑 색은 사이트 디자인을 위한 색이며, 원자의 실제 색이나 측정값을 의미하지 않습니다. 회전은 구조를 관찰하기 위한 연출이며 단백질의 실제 분자 운동을 시뮬레이션하지 않습니다.
- 3D 모델은 정지 도안의 색감과 리본 스타일을 실제 구조에 적용한 결과이므로 도안과 구체적인 형태는 다릅니다.
- 라이브러리와 좌표는 같은 사이트에서 가져옵니다. 페이지 표시 중 외부 구조 서비스나 CDN으로 요청하지 않습니다.
- 회전은 초당 6도(1분에 360도), 최대 약 30fps입니다. 화면에 보이는 동안 자동으로 계속 회전하며, 화면 밖이나 숨긴 탭에서는 렌더링을 쉬었다가 다시 보이면 회전을 이어갑니다.
- WebGL·라이브러리·구조 파일 로드 실패 또는 그래픽 컨텍스트 손실 시 정지 도안을 표시합니다.
- 검증: `node scripts/check-home-protein.mjs` 및 실제 브라우저 렌더링.

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
