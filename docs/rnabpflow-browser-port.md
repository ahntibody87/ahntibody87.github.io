# RNAbpFlow 브라우저 이식·검증

2026-10-28. 현재 RNA 실험실은 RNAbpFlow CASP16을 사용합니다. 이전의 세 후보 목록과 빈 결과 화면을 구조 하나로 대체했습니다. 2차 구조 기반 성분 모형을 즉시 표시하고 실제 원자 좌표를 예측하여 전환합니다. 작은 이상은 안내와 함께 표시하고 큰 붕괴 좌표도 상세 정보와 저장 파일에 보존합니다.

## 모델·변환

원본 [RNAbpFlow](https://github.com/Bhattacharya-Lab/RNAbpFlow), commit `e8b1c077f7951d4d6ebe00c851d22c37777dfc9f`, 저자 Sumit Tarafder·Debswapna Bhattacharya. 공식 Zenodo `18305861` 묶음의 MD5를 대조한 후 CASP16.ckpt만 추출했습니다. 원본 소스와 GPL-3.0·Apache-2.0 고지, 가중치 CC BY 4.0, 상세 체크섬은 `assets/activities/rna-lab/vendor/rnabpflow/`에 보존합니다.

float32, ONNX opset 17, 동적 길이·batch 1. 파일 68,455,757 bytes, SHA-256 `ca3fc6587ed7107d15add940227ce4362f8780700f445a436510b6ea4e41f46d`. 재학습·양자화는 없습니다. ONNX에서 지원하지 않는 회전행렬→quaternion 고유값 분해 대신 수학적으로 같은 정규화 quaternion의 오른쪽 행렬 합성을 사용했습니다. PyTorch가 내보낸 음수 Transpose 축도 양수로 정규화했습니다.

입력 one-hot A/U/G/C와 재구성 residue A/G/C/U 순서를 따로 유지합니다. 원본 atom23 상수·10개 rigid group 연결, translation Euler·SO(3) geodesic 업데이트, 50개 시간점, 최종 torsion 재구성을 유지했습니다. 초기 분포는 같지만 JavaScript RNG는 mulberry32·Box–Muller로 달라 같은 seed가 같은 난수열을 뜻하지 않습니다. 전체 비교에서는 같은 초기 배열을 양쪽에 직접 입력했습니다. 현재 2차 지도를 세 채널에 반복하는 원본 지원 방식을 사용합니다.

ONNX Runtime Web 1.21.0을 고정하여 포함합니다. Worker의 단일 스레드 WASM SIMD를 사용하므로 WebGPU·외부 API 키·계산 서버가 필요하지 않습니다. 첫 다운로드는 모델·계산기 약 78 MiB입니다.

## 수치 검사

| 검사 | 결과 |
|---|---|
| 원본 회전 합성 대 ONNX용 행렬 합성, 12 nt | translation 최대 0.00000954 Å, rotation 최대 0.00000211, torsion 최대 0.0000153 |
| PyTorch 대 ONNX CPU 단일 단계, 8/12/19/60/120 nt | 모든 출력 최대 절대 차이 < 0.000036 |
| 원본 atom23 대 JavaScript 재구성, 고정 8 nt 무작위 fixture | 최대 차이 0.000000704 Å |
| 실제 브라우저 WASM 대 PyTorch 단일 단계, 19 nt | translation 0.0000177 Å, rotation 0.00000242, torsion 0.0000178 이하 |
| 동일 시작 좌표로 전체 50단계·원자 재구성, 19 nt | 좌표 RMS 차이 0.00000184 Å, 최대 차이 0.00000805 Å |

19 nt 서열 `GGCGUACGUUUCGUACGCC`, 조건 `(((((((.....)))))))`. 해당 브라우저의 전체 검증은 모델 준비 포함 약 23초였습니다. 예측에는 골격 이상 4곳과 심한 충돌 6쌍이 남아 주의 안내와 함께 표시합니다. 이 수치는 변환이 원본과 일치한다는 검사이며 실험 구조를 맞혔다는 뜻이 아닙니다. 19 nt는 원본 설정의 학습 길이 하한보다 짧습니다.

상세 결과: [export 검사](rnabpflow-export-validation.json), [브라우저 검사](rnabpflow-browser-validation.json). 기존 1UUU 중원자 fixture의 결합표·손상 구조·제한 보정 검사도 유지합니다.

## 화면·파일 검사

- 캔버스 하나, 당·인산·염기 색, 골격만 보기, 위치 선택, 5′/3′ 표시. 후보 목록·별도 비교 패널·근거 없는 신뢰도 색상은 없습니다.
- 성분 모형은 실제 원자 좌표와 단위를 사용하지 않고 JSON `rna-lab-schematic-v1`로 저장합니다. 예측은 `rna-lab-3d-v1`과 PDB로 저장합니다. 큰 이상 결과도 모형 JSON 안에 보존할 수 있습니다.
- 중단·오류·20분 제한 뒤에도 현재 모형이 남습니다. 서열·조건·엔진이 일치하는 최근 5개 결과만 자동 재사용합니다. 적용 전 입력을 바꾸면 이전 그림과 저장을 숨기거나 비활성화합니다.
- 실제 브라우저에서 12 nt 예측 완료(모델 준비 제외 약 2초), 결과 저장, 모형/좌표 전환, 재접속 후 캐시 복원을 확인했습니다. 60 nt 중단 후 모형 유지와 재실행도 확인했습니다. `GGCGUACGUUUCGUACGCC` 세 번에 `AAA`를 붙인 60 nt의 실제 예측은 약 41초였으며 골격 이상 16곳, 당 고리·당–염기 연결 이상 0곳, 충돌 53쌍(심한 충돌 1쌍)으로 안내와 함께 유지했습니다. 사용자 이미지의 정확한 서열을 검사한 것은 아닙니다.

## 재현

390×844 작은 화면에서 가로 넘침 없이 캔버스 하나가 표시되고, 구조 끝이 화면 안에 들어오도록 맞춤 배율을 확인했습니다. 오류·중단·늦게 도착한 이전 결과 차단·적용 전 입력 변경·잘못된 서열 파일 거부도 [화면 회귀 검사](rnabpflow-ui-validation.json)를 통과했습니다. 1440×1000 및 1366×768에서 메인·과목·단원·활동의 상단 로고와 메뉴 좌표 차이는 0이었습니다([배너 검사](rnabpflow-header-validation.json)). 메인 문서는 동일한 `/index.html`로 불러 비교했습니다.

[데스크톱 화면](rnabpflow-desktop.png) · [모바일 화면](rnabpflow-mobile.png)

`node scripts/check-rnabpflow.mjs`: 8~120 nt 모형 전체 연결성·양방향 결합·성분 정보, 입력 채널 순서, 180° 회전 보간, 원본 atom23 fixture, PDB 왕복, 작은 이상 유지·큰 손상 모형 정책, 모델 SHA-256 검사.

Python에 `scripts/rnabpflow/requirements.txt`를 설치하고 공식 CASP16.ckpt를 준비한 뒤 아래와 같이 변환할 수 있습니다. 수업 사용 중에는 필요하지 않습니다.

```text
python scripts/rnabpflow/export_model.py --checkpoint <CASP16.ckpt 경로> --output <프로젝트 안 출력 폴더>
```

원본 체크포인트 SHA-256이 다르면 읽지 않고 멈춥니다. 길이별 ONNX/PyTorch 비교와 fixture도 출력합니다. 모델 경로에서 사용하지 않는 학습용 torch_scatter는 호출하면 명시적으로 실패하는 stub을 사용합니다. 원자 좌표 계산을 근사하는 대체 함수는 아닙니다.

실제 학생의 여러 노트북·태블릿에서 속도·메모리를 전수 검사하지 않았습니다. 길이 120까지 ONNX 연결을 검사했지만 임의 서열 전체의 구조 정확성·분자 설계 적합성을 검증한 것은 아닙니다. 상세 표시 기준과 출처는 [현재 고지](/assets/activities/rna-lab/TERTIARY-NOTICE.md)를 따릅니다.
