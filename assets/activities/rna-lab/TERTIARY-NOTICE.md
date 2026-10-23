# RNA 3차 구조 예측

계산은 사용자의 브라우저 Web Worker와 WebGPU에서 실행합니다. 입력 서열을 외부 계산 서버로 전송하지 않습니다. 모델 파일을 받으려면 첫 실행 시 인터넷 연결이 필요합니다. 브라우저 캐시는 저장 공간 부족 등에 따라 지워질 수 있습니다.

## 출처

- 실행 코드: [sokrypton/localfold](https://github.com/sokrypton/localfold), commit `ab5bd38f92a7e6213c3b915a97f01a67442f4de9`. 포함 파일과 변경은 `vendor/localfold/PROVENANCE.json`에 기록합니다. 코드의 Beerware 고지는 `vendor/localfold/LICENSE`에 보존합니다.
- 예측 방법: [RoseTTAFold3 / Rosetta Commons Foundry](https://github.com/RosettaCommons/foundry). [BSD-3-Clause 이용 조건](https://github.com/RosettaCommons/foundry/blob/production/LICENSE.md). 원 모델의 저자와 기여자를 출처로 표기합니다. 브라우저용 모델은 원본의 int5 변환본이며, 원본과 수치적으로 동일한 결과를 보장하지 않습니다.
- 모델 파일: [LocalFold 공개 묶음](https://huggingface.co/sokrypton/localfold/tree/6634c1398a781455e5be3b06573179f896ae8ad8/rosettafold3-int5), 약 266 MiB. 다운로드 주소를 위 revision에 고정합니다. 모델 가중치는 이 홈페이지의 Git 저장소에 포함하지 않습니다.
- 3D 표시: 기존 홈페이지에 포함된 3Dmol.js 2.5.5, BSD-3-Clause. 고지: `/assets/home/vendor/LICENSE-3Dmol.txt`.
- 빠른 2차 예측: RibossFold 0.0.5 / Turner 2004. 3차 계산에 2차 예측 결과를 제약으로 넣지 않습니다.

## 설정과 표시

표준 A·U·G·C로 이루어진 단일 가닥 8~120 nt를 받습니다. 단일 서열, MSA 없음, 구조 주형 없음, diffusion 200 steps, recycle 1, seed 0으로 실행합니다. 신뢰도 색상은 모델이 제공한 원자별 pLDDT를 사용합니다. 이는 실제 정답 확률이 아닙니다. 기기에 따라 GPU 지원, 속도와 메모리 한계가 다릅니다. 계산 중단 시 Worker를 종료합니다.

2D 비교의 아래쪽 곡선은 3D 좌표에서 다음 조건으로 찾은 **기하학적 염기쌍 후보**입니다. FR3D 또는 DSSR의 정밀 주석이 아니며, 비정형 결합과 여러 대안은 다루지 않습니다.

- A–U: N6–O4, N1–N3; G–C: O6–N4, N1–N3, N2–O2; G–U: O6–N3, N1–O2.
- 각 거리 2.3~3.8 Å, C1′ 간 거리 8~13 Å, 평면 법선 차이 30° 이내, 상대 평면으로부터 거리 1.5 Å 이내, 서열상 4자리 이상 떨어진 염기.
- 겹치는 후보는 접촉 거리의 2.9 Å로부터의 평균 편차가 작은 것부터 선택하며 한 염기당 한 짝만 표시합니다. 교차하는 쌍도 곡선으로 표시할 수 있습니다.
- 인접 O3′–P가 1.2~2.3 Å 범위를 벗어나면 연결 구조의 이상 가능성을 표시합니다. 이것은 전체 구조 품질 검사가 아닙니다.

임의 서열의 실제 구조·안정성·생물학적 기능은 실험으로 확인해야 합니다. 2차·3차 예측의 일치가 정확성을 증명하지 않습니다. 최근 5개의 서열과 결과를 이 브라우저에 보관하며, 저장한 JSON을 다른 기기에서 열 수 있습니다. 파일의 모델 출처는 작성자 기록으로 표시합니다.

## 검사 기록

2026-10-23: 실제 WebGPU 브라우저에서 16 nt 서열을 200단계로 실행하여 원자 좌표 341개를 생성했습니다. 계산 단계 약 42초(다운로드 제외). 이는 해당 검사 환경의 기록이며 학생 기기 전체의 속도·호환성을 보장하지 않습니다. 통합 화면의 예측·저장·불러오기·서열 변경 검사는 프로젝트 문서에 기록합니다.
