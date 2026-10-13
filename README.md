# Ahntibody's Lifescience Lab

생명과학 교사 Ahntibody의 통합 수업 포털입니다. 과목 → 단원 → 활동 순서로 탐색합니다.

- 홈페이지: https://ahntibody87.github.io/
- 저장소: https://github.com/ahntibody87/ahntibody87.github.io
- GitHub Pages: **main 브랜치 / (root)**. 기존 게시 방식 유지.
- 백엔드, DB, 로그인 없이 작동합니다. RNA 실험실의 접힘 계산기는 저장소에 포함된 WebAssembly 라이브러리를 사용합니다.
- 생성된 HTML을 함께 커밋하므로 배포 서버의 Node.js나 별도 빌드 설정이 필요 없습니다.

## URL 구조

| 페이지 | URL 경로 |
| --- | --- |
| 통합 수업 포털 | `/` |
| 통합과학 | `/integrated-science/` |
| 생물의 유전 | `/genetics/` |
| 고급생명과학 | `/advanced-life-science/` |
| 1단원 · 세포의 에너지 | `/advanced-life-science/cell-energy/` |
| 2단원 · 생물의 조절과 방어 | `/advanced-life-science/regulation-defense/` |
| 3단원 · 유전자의 구조와 발현 | `/advanced-life-science/gene-expression/` |
| 4단원 · 생명 공학의 기술과 응용 | `/advanced-life-science/biotechnology/` |

각 경로에 실제 `index.html`이 있어 직접 접속과 새로고침을 지원합니다. 고급생명과학 3단원에는 RNA 설계 실험실이 등록되어 있으며, 통합과학과 생물의 유전은 준비 중입니다.

## RNA 설계 실험실

- 주소: `/advanced-life-science/gene-expression/rna-lab/`
- 자유 실험실: 8~120 nt 입력, 염기 선택·수정, 되돌리기, 설계 링크 공유, 결과 파일 저장
- 미션방: 서열이나 절대 염기 번호가 달라도 줄기 길이·루프 크기·벌지·가지 배치가 같으면 같은 모양으로 인정합니다. 구조 바깥의 꼬리와 독립된 헤어핀 사이 연결 구간의 길이는 무시하고, 내부 연결 구간과 가지 순서는 유지해 비교합니다. 모양과 고정 염기·변경 조건을 만족하면 성공 결과창이 나타나며, 기기 안에 완료 상태를 저장합니다. 일치율은 정규화된 구조 표기의 편집 거리로 계산한 모양 유사도이며 접힘 확률이 아닙니다. 붉은 표시와 염기쌍 비교도 위치를 대응시킨 뒤 표시합니다.
- 5번 미션: 다른 RNA를 자르는 가위 리보자임을 설계합니다. 수업용 가상 표적 3종 또는 직접 입력한 13 nt 표적을 선택하고, 표적 양쪽에 반대 방향으로 상보적인 6 nt 결합 구간 두 개와 4 bp 헤어핀을 만듭니다. 반응 핵심 부위, 헤어핀의 첫 G–C 쌍과 고리 GAAA는 제공됩니다. 표적 상보성 및 헤어핀 단독의 최소 자유에너지 구조를 검사합니다. 두 RNA의 전체 접힘이나 실제 절단 활성은 예측하지 않습니다. 절단 개념도, 표적별 기기 내 임시 저장, 설명 작성, 서열 공유와 결과 저장을 제공합니다. 기존 #m=ribozyme 링크는 새 미션으로 연결합니다.
- 표적 RNA 가위의 근거: Haseloff & Gerlach (1988), https://doi.org/10.1038/334585a0; Shao et al. (2007), https://doi.org/10.1186/1471-2105-8-469. 최소 trans-cleaving hammerhead의 표적 결합과 헤어핀을 수업용으로 단순화합니다. 6 nt 결합 구간, 4 bp 헤어핀, GUC 절단 부위는 이 활동의 설계 조건이며 모든 해머헤드의 보편 조건이 아닙니다.
- 구조 표시: 리보스·인산 골격, 퓨린·피리미딘 고리, 수소 결합 수, 5′→3′ 방향, 선택한 뉴클레오타이드의 확대 설명
- 전환: 염기 문자·색 즉시 반영, 약 0.76초 좌표 보간, 결합선 전환, 빠른 연속 수정 시 현재 위치에서 재시작. 움직임 감소 설정에서는 즉시 표시합니다. 애니메이션은 실제 접힘 경로나 속도의 시뮬레이션이 아닙니다.
- 표시 검사: `node scripts/check-rna-view.mjs`
- 가위 설계 검사: `node scripts/check-rna-scissors.mjs` (반대 방향 결합, 표적 변경, 실제 계산기로 헤어핀 구조 확인)
- 채점 검사: `node scripts/check-rna-grading.mjs` (실제 미션의 정답 서열을 포함하지 않는 독립 사례)
- 계산: RibossFold `ribossfold-wasm@0.0.5` (MIT), Turner 2004, 37 °C, dangles=2, 유사매듭 없는 최소 자유에너지 2차 구조
- 계산기 파일을 저장소에 포함하고 Web Worker에서 실행합니다. CDN, 외부 API, 학생 계정, 서버 저장이 필요 없습니다.
- 출처: https://github.com/mirditalab/RibossFold. 라이선스: `assets/activities/rna-lab/vendor/LICENSE-ribossfold.txt`.
- 이 도구는 구조의 계산상 예측을 표시하며, 3차 구조나 리보자임 촉매 활성을 검증하지 않습니다.
- 활동 본문은 `content/advanced-life-science/gene-expression/rna-lab.html`, 기능·미션·스타일은 `assets/activities/rna-lab/`에서 관리합니다.

## 파일과 수정 위치

- `data/site.json`: 과목, 단원, 활동 목록의 단일 원본
- `scripts/build.mjs`: 공통 페이지 생성기 (헤더, 사이드바, 경로 탐색, 카드, 푸터)
- `assets/style.css`: 기존 스타일을 확장한 반응형 공통 디자인
- `assets/app.js`: 모바일 메뉴와 Escape 키 처리
- `index.html`, 각 하위 폴더의 `index.html`: 생성 결과. 직접 수정하지 않습니다.
- `scripts/check.mjs`: 생성 결과 최신 여부, 내부 링크, 앵커, 정적 파일 검사
- `content/`: 필요할 때 추가하는 개별 활동 HTML 조각. 현재는 생성하지 않습니다.

## 활동 추가

Node.js가 있는 작업 환경에서 진행합니다. npm 패키지 설치는 필요 없습니다.

1. `data/site.json`에서 해당 과목과 단원의 `activities` 배열에 항목을 추가합니다.
2. 외부 활동이면 `url`, 자체 공통 레이아웃 활동이면 `content` 중 **하나만** 지정합니다.
3. `node scripts/build.mjs`를 실행하면 목록 카드와 필요한 활동 페이지가 생성됩니다.
4. `node scripts/check.mjs`를 실행하고 브라우저에서도 실제 활동을 검사합니다.
5. 설정, 활동 파일, 생성된 HTML을 함께 커밋하고 main에 push합니다.

아래는 향후 실제 활동이 준비되었을 때 사용할 설정 예시이며, 지금 게시된 콘텐츠가 아닙니다.

### 자체 활동 페이지

3단원 `gene-expression`의 `activities`에 등록:

```json
{
  "id": "dna-replication",
  "title": "DNA 복제 시뮬레이션",
  "description": "실제 구현한 활동에 맞는 설명을 작성합니다.",
  "type": "simulation",
  "content": "content/advanced-life-science/gene-expression/dna-replication.html"
}
```

해당 `content` 경로에 활동 본문 HTML 조각을 만듭니다 (`html`, `head`, `body`, `h1`은 공통 템플릿이 제공합니다). 필요한 JS/CSS는 `/assets/activities/...`에 저장하고 본문에서 루트 절대 경로로 참조합니다. 신뢰할 수 있고 공개가 승인된 직접 작성 HTML만 넣습니다. 생성 URL은 `/advanced-life-science/gene-expression/dna-replication/`이며 전체 경로 탐색과 돌아가기 링크가 자동 추가됩니다.

### 기존 실습 페이지·PDF·외부 웹앱

```json
{
  "id": "activity-slug",
  "title": "실제 활동 이름",
  "description": "실제 활동 설명",
  "type": "external",
  "url": "https://example.org/actual-activity/"
}
```

`url`은 실제 공개 HTTPS 주소 또는 `/materials/파일.pdf` 같은 저장소 내 루트 경로를 사용합니다. 내부 파일은 함께 추가해야 합니다. 외부 링크는 새 창으로 열리며 카드에 이를 표시합니다. 기존 독립 웹앱은 그대로 연결할 수 있습니다. 외부 앱 자체의 내비게이션은 그 앱에서 관리합니다.

| type | 화면 표시 |
| --- | --- |
| `simulation` | 인터랙티브 시뮬레이션 |
| `inquiry` | 탐구 및 실험 활동 |
| `resource` | 학습 자료 |
| `external` | 외부 활동 |

## 단원·과목 확장

단원은 과목의 `units` 배열에 `{ "id": "unit-slug", "title": "단원명", "english": "UNIT NAME", "activities": [] }`를 추가하고 다시 생성합니다. 과목도 `courses`에 같은 구조로 추가합니다. 준비가 끝난 과목은 `status`를 `ready`로 바꿉니다. 카드 수와 메뉴는 데이터에서 자동 생성됩니다.

`id`는 소문자 영문·숫자·하이픈을 사용하며 같은 부모 안에서 중복될 수 없습니다. 배열 순서가 화면 순서입니다. 이미 공개된 `id`를 바꾸면 URL이 바뀌므로 가급적 유지하세요. 생성기는 다른 프로젝트나 기존 파일을 삭제하지 않습니다. 경로를 변경하거나 항목을 제거할 때는 이전 생성 페이지의 유지·리디렉션을 따로 검토해야 합니다.

## 미리보기와 GitHub Pages 주의 사항

- 파일을 더블클릭하는 `file://` 방식 대신 저장소 루트에서 정적 HTTP 서버를 실행합니다 (예: `python -m http.server 8000`).
- `/assets/...`와 같은 경로는 현재 사용자 사이트의 루트 배포 기준입니다. 프로젝트 사이트의 `/repo-name/` 하위로 옮길 경우 경로와 canonical URL을 변경해야 합니다.
- Pages 설정 **main / (root)**를 유지하고 생성된 HTML까지 push합니다. 설정 JSON만 편집해 push하면 화면은 갱신되지 않습니다.
- GitHub Actions의 `pages build and deployment` 성공 후 공개 주소를 확인합니다. 캐시 때문에 잠시 이전 내용이 보일 수 있습니다.
- JS가 없어도 모든 페이지·카드·경로 탐색은 정적 HTML로 작동합니다. 작은 화면의 접힌 과목 메뉴만 JS를 사용하며 본문 카드와 돌아가기 링크는 항상 작동합니다.
- 비밀값, 학생 개인정보, 정답, 교사용 비공개 자료를 저장소에 넣지 않습니다. Vercel·Supabase 설정을 추가하지 않습니다.
- 기존 별도 웹앱과 다른 저장소의 데이터는 변경하거나 삭제하지 않습니다.
