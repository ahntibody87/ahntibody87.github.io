# RNA 입체 관찰 · RNAbpFlow

2026-10-28 현재 엔진은 RNAbpFlow CASP16입니다. 기존 RoseTTAFold3 / LocalFold 여러 후보 계산을 대체했습니다. API 키·서버·DB 없이 브라우저 Worker의 ONNX Runtime Web 1.21.0 / WASM에서 계산합니다. WebGPU는 필요하지 않습니다. 모델과 계산기 약 78 MiB를 처음 내려받으며 브라우저 저장 정책에 따라 다시 받을 수 있습니다. 입력 서열을 계산 서버로 보내지 않습니다.

## 출처·이용 조건

- Sumit Tarafder and Debswapna Bhattacharya, [RNAbpFlow](https://github.com/Bhattacharya-Lab/RNAbpFlow), [Nature Methods 논문](https://doi.org/10.1038/s41592-026-03128-4). 원본 commit `e8b1c077f7951d4d6ebe00c851d22c37777dfc9f`. GPL-3.0 원문과 원본 Python 소스를 `vendor/rnabpflow/`에 보존합니다. OpenFold 유래 Apache-2.0 고지와 라이선스도 보존합니다. 브라우저 이식부는 공개 저장소의 `rnabpflow-math.js`, `rnabpflow-engine.js`, `tertiary-worker.js`입니다.
- 가중치: 공식 [Zenodo 배포](https://zenodo.org/records/18305861)의 `checkpoint/CASP16.ckpt`, CC BY 4.0. 원 저자와 출처는 위와 같습니다. float32 ONNX로 변환했으며 재학습·양자화는 없습니다. 공식 묶음 MD5 `f79ce1555126ee77651594b65a95cb4b`를 확인했습니다. 체크섬·변경 내역은 `vendor/rnabpflow/PROVENANCE.json`에 기록합니다.
- [ONNX Runtime](https://github.com/microsoft/onnxruntime/tree/v1.21.0) 1.21.0, MIT. `vendor/onnxruntime/LICENSE.txt`, `ThirdPartyNotices.txt` 보존.
- 3Dmol.js 2.5.5, BSD-3-Clause. `/assets/home/vendor/LICENSE-3Dmol.txt` 보존.
- 2차 구조: RibossFold 0.0.5 / Turner 2004. 현재 염기쌍 지도를 세 채널에 반복하여 RNAbpFlow에 입력합니다. 원본이 지원하는 단일 지도 입력 방식입니다.

## 계산과 표시

8~120개 A·U·G·C 단일 가닥, 시료 하나, 50단계, seed 420입니다. 초기 분포는 원본과 같은 중심화 Gaussian 위치·균일 SO(3) 회전이지만 JavaScript 난수열은 다릅니다. 같은 seed가 원본과 같은 좌표를 뜻하지 않습니다. 8~29 nt는 원본 설정의 학습 길이 하한 30보다 짧습니다. RNAbpFlow는 pLDDT를 제공하지 않으므로 신뢰도 색상을 만들지 않으며 PDB B-factor는 0입니다.

화면에는 구조 하나만 표시합니다. 2차 구조가 준비되면 **2차 구조 기반 입체 모형**을 즉시 표시합니다. 줄기를 오른나선으로 배치하고 고리를 이어 연결 관계를 보여주는 성분 모형입니다. 실제 원자 좌표·Å 단위·접힘 과정·독립적인 3차 구조 예측이 아닙니다. 당 고리·인산·염기는 간략화한 표현이며 JSON으로만 저장합니다. 선택적 점선도 염기쌍 관계의 모식선입니다.

예측 원자 좌표는 실제 공유결합표에 있는 선만 표시합니다. 거리만으로 결합을 추가하지 않습니다. 당은 청회색, 인산은 주황, 염기는 종류별 색입니다. 골격만 보기와 5′·3′·선택 위치 표시를 제공합니다. 심하게 비정상적인 길이의 결합은 선으로 가리지 않습니다.

골격·당 고리·당–염기 연결·염기·인산 길이와 각도, 당 입체배치, 염기 평면, 비공유 원자 충돌을 검사합니다. 보수적인 구조 검사와 교육 화면 표시 정책을 분리했습니다. 작은 이상은 안내와 함께 보여줍니다. 큰 붕괴에서는 성분 모형을 유지하고 계산한 좌표는 상세 정보의 전환 버튼·PDB 저장·JSON 기록에 남깁니다. 오류·중단·시간 초과에서도 현재 모형을 비우지 않습니다. 작은 이상만 원자당 최대 0.3 Å 안에서 보정합니다. 분자동역학이나 실제 접힘 경로가 아닙니다.

자동 모형 유지 기준: 누락/불필요 원자 수 > 염기 수, 심한 결합 이상 > max(6, 0.3×염기 수), 심한 충돌 > max(12, 2×염기 수), 당 입체배치/심한 평면 이상 > max(3, 0.2×염기 수) 중 하나. 학술적인 적합성 판정이 아닌 교육 화면용 휴리스틱입니다. 미통과 좌표도 별도로 살펴볼 수 있습니다.

최근 5개 결과를 브라우저에 보관하며 서열·조건 2차 구조·엔진 버전이 같은 결과만 자동 재사용합니다. `rna-lab-3d-v1` 원자 좌표와 `rna-lab-schematic-v1` 성분 모형을 구별합니다. 성분 모형 JSON에도 계산된 예측을 선택적으로 보관합니다. 예전 LocalFold JSON은 현재 기준으로 다시 검사하여 참고용으로 표시합니다.

## 검증

[이식·검증 기록](/docs/rnabpflow-browser-port.md). 8·12·19·60·120 nt에서 ONNX와 PyTorch 단일 단계를 비교했습니다. 19 nt의 전체 50단계·원자 재구성을 브라우저와 원본 PyTorch에서 비교하여 최종 좌표 최대 차이 약 0.0000081 Å를 확인했습니다. 이는 이식의 수치 검사이며 실험 구조의 정확성을 증명하지 않습니다. 기기별 속도·메모리 차이가 있고 학생 기기 전체를 검사한 것은 아닙니다.
