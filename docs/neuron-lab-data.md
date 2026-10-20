# 신경회로 실험실의 실측 뉴런 자료

이 자료는 **Allen Institute for Brain Science의 Allen Cell Types Database에서 내려받은 실제 전기생리 기록**의 발췌입니다. 모델이 생성한 막전위나 합성 발화 기록은 포함하지 않습니다. 취득일은 2026-10-20입니다.

- 브라우저 자료: `assets/activities/neuron-lab/data/allen-recordings.json` (약 2.46 MB)
- 재현 스크립트: `scripts/prepare-neuron-data.py`
- 원본 NWB·API 응답·임시 라이브러리: 저장소 밖 `../.tmp/neuron-lab/`
- 공개 데이터베이스: [Allen Cell Types Database](https://celltypes.brain-map.org/)
- 자료 취득 방식: [Allen API 공식 문서](https://brain-map.org/support/documentation/cell-types-database-api)
- NWB 단위와 발화 시점 확인: [AllenSDK 공식 NWB 자료 접근 모듈](https://github.com/AllenInstitute/AllenSDK/blob/master/allensdk/core/nwb_data_set.py)

## 세포와 실험 조건

두 세포 모두 **생쥐(Mus musculus), 일차 시각피질 5층, 뇌 절편(in vitro)의 단일 세포 전류고정 기록**입니다. 실제 살아 있는 사람의 뇌 전체 또는 청각 뇌간 회로의 활동을 측정한 자료가 아닙니다. 세포에 주입한 전류(pA)는 시냅스 가중치와 같은 양이 아닙니다.

| 세포 ID | 원본 Cre 표지 | 수상돌기 표기 | 원본 sweep | 주입 전류(pA) | 수업용 역할 |
|---|---|---|---|---|---|
| [464212183](https://celltypes.brain-map.org/mouse/experiment/electrophysiology/464212183) | Sst-IRES-Cre | aspiny | 27 / 29 / 30 / 31 / 32 | 50 / 90 / 110 / 130 / 150 | fit / test / fit / test / test |
| [485909730](https://celltypes.brain-map.org/mouse/experiment/electrophysiology/485909730) | Cux2-CreERT2 | spiny | 31 / 32 / 33 / 34 / 35 | 30 / 50 / 70 / 90 / 110 | fit / test / fit / test / test |

Cre 계통과 수상돌기 표기는 원자료의 관찰·표지 메타데이터입니다. 각 기록을 전체 세포 유형의 대표값으로 일반화하지 않습니다. 원본 API의 영역은 `Primary visual area, layer 5` / `VISp5`입니다.

원본은 200,000 samples/s이며 Long Square 프로토콜의 1초 직사각형 전류를 사용합니다. 원본 sweep의 자극은 1020~2020 ms이고, 여기서는 920~2120 ms를 발췌하여 표시 시간을 0~1200 ms로 이동했습니다. 따라서 표시 자극 구간은 100~1100 ms입니다. 처음의 장비 시험용 짧은 펄스는 이 발췌 구간에 포함되지 않습니다.

### 실제 기록의 발화 적응 예

아래 수치는 원본 NWB의 Allen 발화 시점으로 계산했습니다. early/late ISI는 각각 첫 3개/마지막 3개 발화 사이 간격의 평균입니다. 첫 발화 지연은 자극 시작으로부터의 시간입니다.

| 세포 / sweep | 전류 | 발화 수 | 첫 발화 지연 | 초반 ISI | 후반 ISI | 후반/초반 |
|---|---|---|---|---|---|---|
| Sst 464212183 / 30 | 110 pA | 19 | 30.780 ms | 42.745 ms | 60.447 ms | 1.4141 |
| Cux2 485909730 / 35 | 110 pA | 17 | 38.685 ms | 36.483 ms | 71.008 ms | 1.9463 |

두 기록은 발화 적응의 정도가 다릅니다. 이 차이는 해당 자극·세포의 관찰값이며, 같은 Cre 계통의 모든 세포가 같은 정도로 적응한다는 의미는 아닙니다. 같은 전류여도 입력저항·안정막전위 등이 다르므로 단순한 유형 간 인과 비교로 해석하지 않습니다.

## 가공과 검증

1. 원본 전류(A)를 pA로, 막전위(V)를 mV로, 시간을 ms로 변환했습니다. 선택된 두 파일은 pipeline 1.0이고 `conversion=1.0`임을 실제 확인했습니다. 재현 스크립트는 단위와 conversion 값이 다르면 중단합니다.
2. 실제 전류 파형에서 자극 종료 지점을 확인하고 전후 100 ms를 보존했습니다. `stimulusPA`는 원본 주입전류 샘플이며 합성 직사각형 입력으로 교체하지 않았습니다.
3. 표시용으로 0.1 ms 간격의 원본 샘플을 남겼습니다. 여기에 각 Allen 발화 시점의 원본 샘플, 인접 활동전위의 **정확한 원본 최고점**, 직후 최저점, 자극 경계 양쪽 샘플을 추가했습니다. 보간·평활화를 하지 않았습니다.
4. 그러므로 `timeMS`는 **비균일 시간축**입니다. 그래프는 배열 인덱스나 0.1 ms 고정 간격을 가정하지 말고 반드시 `timeMS`를 사용해야 합니다. 한 sweep은 약 12,000개 표시 점입니다.
5. `spikeTimesMS`는 다운샘플 그래프에서 다시 검출한 값이 아니라 **원본 NWB `analysis/spike_times/Sweep_N`의 Allen 분석값**을 시간 이동한 것입니다. `peakTimesMS`는 그래프 피크 보존용 별도 값으로, 발화 시점의 정의와 혼동하지 않습니다.
6. 전압은 0.00001 mV, 전류는 0.0001 pA, 시간은 0.001 ms로 반올림했습니다. 원본의 모든 AP 최고점이 출력에 포함되는지 검사했고, 원본 API에서 발화 수를 제공한 조건은 모두 그 수와 일치함을 확인했습니다. 시간 단조 증가와 세 파형 배열 길이의 일치도 검사했습니다.
7. fit/test는 수업 설계자가 나눈 자극 조건이며 Allen의 공식 학습/평가 분할이 아닙니다. test를 보며 매개변수를 변경했다면 그 조건은 독립적인 예측 검증으로 사용할 수 없습니다.

모델과 비교할 때 LIF 출력에는 실제 활동전위 모양이 없으므로 파형 전체 유사도를 생물학적 정확도로 점수화하지 않습니다. 발화 수·첫 발화 지연·ISI 변화와 역치 아래 막전위 등을 구별하여 비교합니다. Allen의 생물학적 발화 시점 정의와 LIF의 수학적 역치 통과 정의 사이에도 차이가 있으므로 작은 시간 오차를 과대해석하지 않습니다.

## JSON 구조

```text
schemaVersion: 1
source: { name, institution, url, citation, license, licenseUrl,
          citationPolicyUrl, retrievedDate, processing, apiDocumentationUrl }
limitations: string[]
cells[]: { id, specimenId, label, species, region, regionKo, creLine,
           dendriteType, sourceUrl, rawDataUrl, rawDataSha256, recording,
           defaultSweepId, notes, sweeps[] }
sweeps[]: { id, sweepId, label, protocol, currentPA, durationMS,
            stimulusStartMS, stimulusEndMS, originalWindowStartMS,
            originalSampleRateHz, baselineMV, timeMS[], voltageMV[],
            stimulusPA[], spikeTimesMS[], peakTimesMS[], spikeTimeSource,
            role: 'fit'|'test', metrics }
```

발화가 없는 sweep의 지연·ISI 값은 `null`입니다. `id`는 문자열, `specimenId`와 `sweepId`는 원본 숫자 ID입니다.

## 출처와 이용 조건

**© Allen Institute for Brain Science. Allen Cell Types Database. Retrieved 2026-10-20.** 원본 다운로드:

- [464212183 원본 NWB](https://api.brain-map.org/api/v2/well_known_file_download/491202878)
- [485909730 원본 NWB](https://api.brain-map.org/api/v2/well_known_file_download/491316386)

[Allen Institute Terms of Use](https://alleninstitute.org/legal/terms-of-use)는 출처를 표기하는 연구·기타 비상업 목적의 복제, 배포, 공개 표시와 파생물 작성을 허용합니다. [Citation Policy](https://alleninstitute.org/citation-policy/)에 따라 데이터베이스와 해당 세포 원자료에 연결했습니다. **이 발췌 자료에 CC BY 라이선스를 임의 부여하지 않습니다.** 상업적 재배포에는 Allen의 별도 허락이 필요합니다. 사이트 코드에 붙는 라이선스가 이 제3자 자료의 이용 조건을 대체하지 않습니다. Allen 로고나 상표 이미지는 포함하지 않습니다.

## 재현

Python에 `numpy`, `h5py`가 필요합니다. 설치가 필요하면 저장소 밖의 `../.tmp/neuron-lab/pydeps`를 대상으로 설치할 수 있으며 스크립트가 이 경로를 자동 검색합니다. 저장소 루트에서 다음을 실행합니다.

```powershell
python scripts/prepare-neuron-data.py
```

원본과 API 응답이 없으면 공식 HTTPS API에서 내려받고, 이미 있으면 재사용합니다. 최종 자료만 저장소 내부에 작성합니다. 원본 각 파일의 SHA-256은 JSON의 `rawDataSha256`에 기록해 같은 파일을 사용했는지 확인할 수 있습니다.
