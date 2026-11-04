# AMPLICON · 교사용 운영 및 수정 안내

- 저장소: https://github.com/ahntibody87/ahntibody87.github.io
- 공개 경로: https://ahntibody87.github.io/advanced-life-science/biotechnology/amplicon/
- 배포: 기존 GitHub Pages main / root. 서버·DB·Supabase·Vercel 없음.
- 대상: 고급 생명과학 04 생명 공학의 기술과 응용 / Inquiry Activity / 10~20분.
- 학생 답안·실험 상태·경고 기록을 저장하거나 전송하지 않음. 새로고침하면 초기화됨. 과목 입장 상태는 기존 사이트 방식 그대로 유지됨.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `content/advanced-life-science/biotechnology/amplicon.html` | 기존 공통 페이지에 들어가는 활동 HTML 조각, 활동 전용 CSS·JS와 시나리오 경로 |
| `assets/activities/amplicon/lab.mjs` | 단계 UI, 키보드·포인터 이동, 기기 조작, 피펫 손 애니메이션, 경고창, 제출·비교 |
| `assets/activities/amplicon/lab.css` | `.amp-lab` 안에 한정된 스타일, 반응형, 저사양·움직임 감소 처리 |
| `assets/activities/amplicon/model.mjs` | 메모리 내 상태, 시약·오염·프로그램·레인 검사, 분자 뷰 시간축, 밴드 계산 |
| `assets/activities/amplicon/visuals.mjs` | SVG 아이소메트릭 과학실·기기·손·분자와 온도·증폭량 그래프 |
| `assets/activities/amplicon/scenarios/sars-cov-2.json` | 상황, 시료별 정답, 시약, 프로그램 범위, 경고 문구, 모범 해석 |
| `scripts/check-amplicon.mjs` | 정상 진행과 오조작·복구 상태 검사 |
| `data/site.json` | 승인받은 `biotechnology.activities` 항목만 등록 |
| `advanced-life-science/index.html` | 생성된 04단원 카드의 1개 활동 표시 |
| `advanced-life-science/biotechnology/index.html` | 생성된 단원 활동 카드 |
| `advanced-life-science/biotechnology/amplicon/index.html` | 생성된 실제 활동 URL |
| `index.html` | 기존 생성기가 자동 갱신한 LAST UPDATED 날짜만 변경(별도 승인) |

기존 생성기·헤더·내비게이션·전역 CSS·01~03단원·다른 과목·비밀번호 보호 코드는 수정하지 않는다. 외부 라이브러리·CDN·이미지 다운로드 없이 로컬 SVG와 기본 브라우저 API를 사용한다.

## 시나리오 JSON

`schemaVersion: 1` 형식이며 HTML의 `data-scenario`가 JSON 파일을 선택한다.

| 필드 | 의미 |
|---|---|
| `id`, `title`, `brief`, `virus`, `genome`, `target`, `productBp` | 상황과 표적 설명, 학습용 산물 크기 |
| `samples` | A·B·positive·NTC 네 역할의 `id`, 표시 이름 `label`, 시료 `material`, 표적 유무 `positive`, 대조군 여부 `control` |
| `samples[].bandsBp` | 선택 필드. 별도 밴드 크기 배열을 제공하면 해당 레인의 결과에 사용 |
| `reagents` | 넣는 순서대로 된 시약 배열. `id`, `label`, `missingRule`, 선택적 `enzyme` |
| `program.defaults` | 역전사 사용 여부, 각 온도, 사이클 수 |
| `program.limits` | 각 설정의 학습용 최솟값·최댓값과 경고 ID. 실제 실험의 보편적 한계가 아님 |
| `steps` | 각 단계 제목·권장 기기·체크리스트·접힌 ‘왜?’ 설명 |
| `warnings` | 규칙 ID → `cause`(원인), `molecule`(분자 변화), `consequence`(판정 영향·복구 안내) |
| `markerBp`, `answer`, `modelInterpretation`, `sources` | 마커, 감염자 선택 정답, 모범 해석 문단, 과학 출처 |

같은 One-step RT-PCR 흐름의 다른 상황은 JSON을 복사하고 위 필드를 바꾼 뒤 활동 HTML의 `data-scenario` 경로를 바꾼다. 시료 역할 ID A·B·positive·NTC는 유지하고 표시 이름·정답·재료를 변경한다. 경고 ID는 모델에서 참조하므로 유지한다. 새 경고 조건은 `model.mjs`의 `issues()`와 검사를 함께 추가한다.

친자 확인처럼 여러 유전자좌를 비교하거나, DNA 기반 GMO 검출처럼 역전사를 생략하는 활동은 JSON 추가와 함께 해당 실험 흐름·분자 뷰를 확장해야 한다. 현 버전은 요청한 RNA 바이러스 One-step RT-PCR을 정확하게 표현하는 엔진이다. 단순히 제목만 바꾸어 다른 검사로 사용하지 않는다.

## 로컬 실행

저장소 루트에서 Node.js로 실행한다. 추가 패키지는 필요 없다.

```text
node scripts/build.mjs
node scripts/check.mjs
node scripts/check-amplicon.mjs
node scripts/check-course-access.mjs
```

정적 HTTP 서버로 저장소 루트를 제공한다. Python이 설치되어 있으면 다음과 같이 실행할 수 있다.

```text
python -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8000/advanced-life-science/biotechnology/amplicon/`을 열고 기존 과목 비밀번호로 입장한다. `file://`로 직접 열면 JSON·모듈을 읽지 못하므로 HTTP 서버가 필요하다. 빌드는 기존 날짜 자동 갱신 규칙에 따라 홈 하단 날짜도 갱신한다.

## 정상 진행 체크리스트

- [ ] 04 카드에 1개 활동이 표시되고 AMPLICON 카드가 열린다. 미입장 상태에서는 기존 비밀번호 화면이 먼저 나온다.
- [ ] 과학실에서 WASD·방향키 이동, E 상호작용, 바닥 클릭/탭 이동, 기기 클릭/탭, 터치 방향 패드가 작동한다. 바로 이동 버튼도 사용 가능하다.
- [ ] 아이스박스에서 A·B·양성 대조군·NTC를 각각 받아 랙에 놓는다. 클릭/탭과 데스크톱 드래그를 확인한다.
- [ ] 작업대에서 각 튜브에 버퍼·dNTP → 프라이머 → 역전사 효소 → Taq → 해당 시료 순으로 넣는다. 매번 ‘새 팁 끼우기’를 누른다. ‘분주 후 팁 버리기’는 기본 선택이다.
- [ ] 표준 품질에서 손이 팁 박스→용액→튜브→폐기통으로 이동한다. 각 튜브를 눌러 성분을 확인한다.
- [ ] 네 튜브를 약 2.5초 혼합하고 원심분리기로 이동해 스핀다운한다.
- [ ] PCR 기기에 네 튜브를 넣고 기본 프로그램으로 가동한다. 온도·분자·사이클이 함께 움직인다. 일시정지·계속·건너뛰기가 작동한다.
- [ ] A에는 역전사·DNA 증폭이 보이고 B에는 표적이 없어 프라이머만 떠다닌다. 모든 가닥 방향과 합성 방향을 확인한다.
- [ ] 레인 1 마커, 이후 A·B·양성 대조군·NTC를 기록하고 각각 로딩한다. 순서를 바꾸면 기록한 레인에 맞게 결과가 나온다.
- [ ] 웰 쪽 − 극을 확인하고 전원을 켠다. 작은 DNA가 더 멀리 이동한다.
- [ ] UV에서 A와 양성 대조군만 약 300bp 밴드가 보인다. A 선택·근거 작성·제출 후 내 글과 모범 해석이 나란히 나온다.
- [ ] 새로고침하면 브리핑부터 시작하고 답안이 남지 않는다.
- [ ] 1366×768 크롬북/노트북, 768×1024 태블릿에서 잘림 없이 진행한다. 저사양 옵션도 확인한다.

## 오조작 직접 확인

문제 상태에서 ‘다음 단계’ 또는 기기 가동을 누른다. 경고창은 ① 원인 → ② 분자 수준 → ③ 판정 영향 순서이며 ‘돌아가서 수정하기’ 버튼만 있다. 수정 전에는 단계가 넘어가지 않는다.

| 재현 | 복구 |
|---|---|
| ‘분주 후 팁 버리기’ 해제 후 사용한 팁으로 다음 용액/시료 분주 | 영향을 받은 튜브 새로 만들기 + 새 팁 |
| 버퍼·dNTP, 프라이머, 역전사 효소, Taq을 각각 빼고 조제 | 튜브 새로 만들고 순서대로 조제 |
| 시료 누락·중복·다른 시료 선택 | 해당 튜브 새로 조제 |
| 시료부터 먼저 넣기 | 해당 튜브 새로 조제 |
| 얼음 위 취급 해제 후 효소 넣기 | 얼음 위 취급 선택 후 튜브 새로 조제 |
| 대조군을 받기 전에 다음 단계 | 아이스박스로 돌아가 수령 |
| 혼합 후 스핀다운 없이 다음 단계 | 미니 원심분리기에서 스핀다운 |
| PCR 튜브를 일부만 넣기 | 네 튜브 선택 |
| 역전사 단계 해제 | 역전사 사용 선택 |
| 변성 72°C, 결합 80°C/25°C, 사이클 3회 | 기본 프로그램 복원 |
| 마커 미로딩·순서 미기록·기록과 다른 레인 | 순서 기록, 해당 레인 비우고 다시 로딩 |
| 웰 쪽 + 극 | 웰 쪽 − 극으로 수정 |

입장 보호는 기존 정적 사이트의 화면 입장 제한이며, 이 활동이 별도의 보안 방식이나 학생 데이터 수집을 추가하지 않는다.

## 과학 모형의 범위

실제 반응 시간·효율·분자 수를 재현하는 계산 모델이 아니라, 정상 반응의 방향성과 단계 관계를 보여 주는 개념 모형이다. 기본 재생은 약 57초, 이론적 증폭량은 2ⁿ으로 표시한다. RNA에서 cDNA를 만든 뒤 DNA를 증폭하며 새 가닥 합성은 프라이머 3′ 말단에서 항상 5′→3′로 진행된다. 초기 긴 산물과 정해진 길이 산물의 구분은 3번째 사이클 안내로 제시한다.

이 활동의 300bp 크기와 온도 허용 범위는 학습용이다. 실제 B 시료의 채취·추출 적절성을 검증하는 내부 대조군을 생략했음을 모범 해석에서 명시한다. 실제 진단의 실시간 RT-PCR과 전기영동 교육 활동도 구분한다.

출처: [NEB One-step RT-PCR](https://www.neb-online.de/en/pcr-and-dna-amplification/reverse-transcription-cdna-synthesis/onetaq-one-step/), [NIST 프라이머 정의](https://www.nist.gov/glossary-term/29811).
