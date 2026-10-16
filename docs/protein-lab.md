# 단백질 설계 실험실

- 공개 경로: https://ahntibody87.github.io/advanced-life-science/cell-energy/protein-lab/
- 위치: 고급 생명과학 → 세포의 에너지
- 원본: `content/advanced-life-science/cell-energy/protein-lab.html`
- 기능: `assets/activities/protein-lab/`
- 생성된 HTML은 직접 편집하지 않고 `node scripts/build.mjs`로 생성합니다.

## 기능

1. 아미노산 20종의 한글/영문 이름, 3레터/1레터 코드, L형 비이온형 전체 구조식(모든 탄소·수소 원자 명시), 회전 가능한 전체 분자 3D, 곁사슬·전하 설명. 3D는 PubChem의 중성 자유 아미노산 계산 좌표를 로컬에 포함하며 별도 계정이나 실시간 API가 필요 없습니다. 글리신은 비키랄입니다. pH 약 7에서의 곁사슬 분류이며 히스티딘의 부분 양전하를 따로 설명합니다.
2. 10–256 aa 단일 사슬 및 단일 FASTA 입력, 맨 위 기본 선택인 ‘직접 입력’과 예제 3종, 위치/범위의 프롤린 치환, 되돌리기, 위치 선택, 실제 WebGPU 예측, 3Dmol 리본·곁사슬·색상, PDB 다운로드와 불러오기, 비교 A/B로 전달. 입력을 수정하면 이전 예측을 현재 결과로 저장하지 못하도록 표시·차단합니다.
3. 길이가 같은 야생형·치환 변이를 전체 위치별로 대응시켜 Cα 좌표를 비교합니다. RMSD 최소 제곱 겹침은 Horn quaternion 해법, TM-score는 동일 잔기 대응에서 여러 초기값과 반복 가중 최소 제곱으로 근사 최대화합니다. TM-score와 RMSD는 별도 최적화이며, 뷰어/거리 그래프는 RMSD 기준입니다. RCSB/TM-align 결과와 동일하다고 주장하지 않습니다. 사슬 선택, 두 구조 표시 전환, 위치별 거리 그래프, CSV 다운로드를 제공합니다.

## 예측 모델과 제한

- **Biohub ESMFold2 Experimental Fast base300M-step1500k**와 해당 ESM-C 300M/입력 shim. ESMFold v1이나 전체 크기의 ESMFold2 6B와 다른 경량 실험형 모델입니다. 사용자에게 모델명과 차이를 표시합니다.
- LocalFold WebGPU 구현 중 필요한 67개 모듈만 포함했습니다. 정확한 원본 revision과 파일 목록은 `vendor/localfold/PROVENANCE.json`에 있습니다. 모델 레지스트리만 필요한 두 번들로 제한했습니다.
- 신뢰도는 Synthyra의 별도 head이며 pLDDT는 0–100으로 환산합니다. distogram certainty를 pLDDT로 표시하지 않습니다. pTM과 두 구조 비교의 TM-score도 구분합니다.
- 첫 예측에서 약 270 MB(현재 257 MiB 정도)를 Hugging Face의 고정 revision에서 내려받습니다. 각 shard는 manifest의 SHA-256으로 검증하고 Cache Storage에 보관합니다. 이후 그래픽 계산은 기기 내부에서 수행합니다. 브라우저가 캐시를 정리하거나 캐시가 허용되지 않으면 파일을 다시 내려받습니다.
- ESM Atlas나 ColabFold MSA API를 사용하지 않으며, 입력 서열을 외부 예측 서버로 보내지 않습니다. 계정/API 키/DB/서버 환경변수가 필요 없습니다.
- Worker에서 실행하고, 중단 시 Worker를 종료합니다. 그래픽 장치가 끊기거나 메모리 예산을 초과하면 실패를 보고하며 가짜/대체 구조를 표시하지 않습니다. 그래픽 메모리 예산은 1.4 GiB로 제한합니다.
- WebGPU를 제공하지 않는 브라우저에서도 아미노산 학습과 PDB 관찰·비교는 가능합니다. 모든 학생 기기에서 같은 속도로 실행된다고 보장하지 않습니다. OS 보안 기능이나 관리 정책을 우회하지 않습니다.
- 구조는 정적 예측입니다. 접힘 경로, 변성 온도, 안정성, 약효 및 기능 상실을 계산하지 않습니다.

## 검사 — 2026-10-16

- `node scripts/check-protein-lab.mjs`: FASTA·입력·치환 범위 검사, 알려진 회전/이동에 대한 RMSD 0, 거울 반사 거부, 비강체 변형 검출, PDB 다중 모델 처리, 좌표 변환, TM-score의 동일 구조 1/변형 시 감소, 71개 로컬 ES 모듈 의존 경로 통과.
- `node scripts/build.mjs`, `node scripts/check.mjs`: 전체 페이지 생성 및 내부 링크 검사 통과.
- 실제 Codex 브라우저에서 HP35 35 aa 예측 성공: pLDDT 약 81.0, pTM 약 0.725. 첫 모델 준비 후 추론 16.2초. 이 특정 기기에서 측정한 값으로 기기간 성능 보장이 아닙니다.
- 같은 엔진·seed 0으로 A8P/M12P/T13P/R14P 변이 예측 성공: 워밍 상태 추론 약 3.7초.
- 두 실제 예측의 PDB 다운로드 및 두 파일 재업로드 비교 성공. 전체 35쌍 RMSD 8.0361077 Å.
- TM-score 추가 후 최신 버전에서 같은 두 서열을 다시 실제 예측·비교: RMSD 8.036 Å, 위치 고정 TM-score 0.559. 잘못된 X 입력의 예측 차단, 서열 수정 후 이전 결과의 비교 전송 차단, 계산 중단도 실제 UI로 확인했습니다.
- 브라우저 CSV의 RMSD를 별도의 Python/NumPy SVD로 검산: 차이 5.2e-9 Å. 저장된 두 PDB 모두 Cα 35개와 정상 범위(3.68–3.94 Å)의 이웃 Cα 간격 확인. 이는 입체 구조의 생물학적 정확도를 보장하는 검사가 아닙니다.
- 20종 구조식 모두 실제 SVG 원소 생성 확인. 최종 확인 구간에서 새 콘솔 오류 없음.
- 390 px와 1280 px 화면에서 가로 넘침 없음, 모바일에서 학습 카드와 구조식을 세로 배치.

실측 PDB·CSV·검산 결과·화면 이미지는 작업 루트의 `.tmp/protein-verification/`에 보관합니다. 예측 사례를 공개 정답으로 미리 넣지 않습니다.

## 라이선스

`assets/activities/protein-lab/NOTICE.txt` 및 각 vendor 라이선스를 확인하세요. 모델 원본의 MIT 고지와 third-party notices를 유지하고, LocalFold 코드는 Beer-Ware, SmilesDrawer 2.1.7은 MIT, 3Dmol.js 2.5.5는 BSD-3-Clause, Synthyra/FastPLMs 코드는 Apache-2.0 조건을 따릅니다.

## 2026-10-16 화면 개선

- 시작할 단백질 목록 맨 위를 ‘직접 입력’으로 두고 빈 서열 입력칸을 기본으로 제공합니다. 예제 3종도 유지합니다.
- 1레터 코드에 공통 산세리프 글씨체를 적용했습니다.
- 실험실에만 있던 `.page` 폭 제한을 제거하여 다른 페이지와 같은 중앙 정렬과 폭을 따릅니다.
- PubChem 2D 좌표를 사용해 구조식의 모든 탄소·수소 원자를 표시하며, 전체 아미노산의 2D/3D 전환 및 수소 표시·화면 맞춤을 제공합니다. PubChem CID·분자식·원자 수·좌표 출처와 해시는 `amino-structures-source.json`에 기록했습니다. 3D는 정해진 한 conformer이며 수용액에서의 주요 이온화 상태를 나타내지 않습니다.

- 개선 후 실제 브라우저 검사: 20종 모두 2D 원자 수가 분자식과 일치하고 3D 전환 시 오류가 없습니다. 1920 px에서 다른 활동과 같은 1280 px 본문 폭과 중앙 정렬을 확인했으며, 390 px에서 가로 넘침이 없습니다. 직접 입력 모드의 HP35 예측은 pLDDT 81.0으로 완료되고 결과명이 ‘직접 입력한 서열’로 표시됩니다. 콘솔 오류 없음.
