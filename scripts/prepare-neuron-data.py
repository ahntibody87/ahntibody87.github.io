"""Prepare small, attributed Allen Cell Types excerpts for the static teaching lab.

Run from repository root with Python + numpy + h5py. No AllenSDK is needed.
Raw files and temporary dependencies live outside the repository in
../.tmp/neuron-lab. No synthetic membrane voltages or spikes are generated.
"""

import argparse
import hashlib
import json
import pathlib
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
TEMP = ROOT.parent / '.tmp' / 'neuron-lab'
if (TEMP / 'pydeps').exists():
    sys.path.insert(0, str(TEMP / 'pydeps'))
import h5py
import numpy as np

SELECTION = {464212183: [27, 29, 30, 31, 32], 485909730: [31, 32, 33, 34, 35]}


def query(criteria):
    url = 'https://api.brain-map.org/api/v2/data/query.json?criteria=' + urllib.parse.quote(criteria, safe=',:()[]')
    with urllib.request.urlopen(url) as response:
        result = json.load(response)
    assert result['success'], result.get('msg')
    return result


def fetch(cid):
    meta_path, sweeps_path = TEMP / f'{cid}-metadata.json', TEMP / f'{cid}-sweeps.json'
    if not meta_path.exists():
        meta_path.write_text(json.dumps(query(f'model::Specimen,rma::criteria,[id$eq{cid}],rma::include,ephys_result(well_known_files(well_known_file_type[name$eqNWBDownload])),structure,donor')), encoding='utf-8')
    if not sweeps_path.exists():
        sweeps_path.write_text(json.dumps(query(f'model::EphysSweep,rma::criteria,[specimen_id$eq{cid}],rma::options[num_rows$eqall]')), encoding='utf-8')
    meta = json.loads(meta_path.read_text(encoding='utf-8'))['msg'][0]
    sweeps = json.loads(sweeps_path.read_text(encoding='utf-8'))['msg']
    url = 'https://api.brain-map.org' + meta['ephys_result']['well_known_files'][0]['download_link']
    nwb_path = TEMP / f'{cid}.nwb'
    if not nwb_path.exists():
        urllib.request.urlretrieve(url, nwb_path)
    return meta, {s['sweep_number']: s for s in sweeps}, nwb_path, url


def text(dataset):
    value = dataset[()]
    return value.decode('utf-8') if isinstance(value, bytes) else str(value)


def extract_sweep(nwb, number, metadata, role):
    epoch = nwb[f'epochs/Sweep_{number}']
    response, stimulus = epoch['response/timeseries'], epoch['stimulus/timeseries']
    fs = float(response['starting_time'].attrs['rate'])
    assert fs == float(stimulus['starting_time'].attrs['rate'])
    # Both selected NWBs have pipeline 1.0 and SI values with conversion=1.
    # Explicit checks avoid silently misreading a later file with other units.
    assert float(response['data'].attrs['conversion']) == 1.0
    assert float(stimulus['data'].attrs['conversion']) == 1.0
    assert response['data'].attrs['unit'].decode().startswith('Volt')
    assert stimulus['data'].attrs['unit'].decode().startswith('Amp')
    voltage = response['data'][:].astype(float) * 1000
    current = stimulus['data'][:].astype(float) * 1e12
    onset = int(round(metadata['stimulus_start_time'] * fs))
    # End is exclusive, determined from actual sampled waveform, not rounded API duration.
    changed = np.flatnonzero(abs(current[onset:] - current[onset]) > 0.1)
    offset = onset + int(changed[0])
    left, right = onset - int(round(.100 * fs)), offset + int(round(.100 * fs))
    indices = set(range(left, right + 1, int(round(fs / 10000))))
    indices.update([left, right, onset - 1, onset, offset - 1, offset])
    # Keep Allen's original spike timestamps (not estimated from display samples).
    raw_spikes = nwb[f'analysis/spike_times/Sweep_{number}'][:].astype(float)
    raw_spikes = raw_spikes[(raw_spikes >= onset / fs) & (raw_spikes < offset / fs)]
    peaks = []
    for spike in raw_spikes:
        center = int(round(spike * fs))
        # Allen timestamps precede the local AP peak; preserve the exact maximum.
        a, b = max(left, center - int(.001 * fs)), min(right, center + int(.003 * fs))
        peak = a + int(np.argmax(voltage[a:b + 1]))
        trough_end = min(right, peak + int(.005 * fs))
        trough = peak + int(np.argmin(voltage[peak:trough_end + 1]))
        peaks.append(peak)
        indices.update([peak, trough, center])
    indices = np.array(sorted(indices), dtype=int)
    spikes_ms = np.round((raw_spikes - left / fs) * 1000, 3).tolist()
    peak_ms = np.round((np.array(peaks) - left) / fs * 1000, 3).tolist()
    # Verify exact extrema for every identified spike survived plotting reduction.
    assert all(p in indices for p in peaks)
    assert metadata.get('num_spikes') in (None, len(spikes_ms))
    isi = np.diff(spikes_ms)
    early = float(np.mean(isi[:3])) if len(isi) else None
    late = float(np.mean(isi[-3:])) if len(isi) else None
    plateau = float(np.median(current[onset:offset]))
    baseline = float(np.median(voltage[left:onset]))
    return {
        'id': str(number), 'sweepId': number,
        'label': f'{round(plateau)} pA · 1초', 'protocol': 'Long Square',
        'currentPA': round(plateau, 4), 'durationMS': round((right - left) / fs * 1000, 3),
        'stimulusStartMS': round((onset - left) / fs * 1000, 3),
        'stimulusEndMS': round((offset - left) / fs * 1000, 3),
        'originalWindowStartMS': round(left / fs * 1000, 3),
        'originalSampleRateHz': fs, 'baselineMV': round(baseline, 4),
        'timeMS': np.round((indices - left) / fs * 1000, 3).tolist(),
        'voltageMV': np.round(voltage[indices], 5).tolist(),
        'stimulusPA': np.round(current[indices], 4).tolist(),
        'spikeTimesMS': spikes_ms, 'peakTimesMS': peak_ms,
        'spikeTimeSource': f'Allen NWB analysis/spike_times/Sweep_{number}',
        'role': role,
        'metrics': {'spikeCount': len(spikes_ms),
                    'firstSpikeLatencyMS': round(spikes_ms[0] - 100, 3) if spikes_ms else None,
                    'earlyISIMS': round(early, 3) if early else None,
                    'lateISIMS': round(late, 3) if late else None,
                    'lateEarlyISIRatio': round(late / early, 4) if early else None},
    }


def main():
    TEMP.mkdir(parents=True, exist_ok=True)
    cells = []
    for cid, selected in SELECTION.items():
        metadata, sweep_metadata, path, url = fetch(cid)
        with h5py.File(path, 'r') as nwb:
            line = text(nwb['general/aibs_cre_line'])
            cell = {
                'id': str(cid), 'specimenId': cid,
                'label': f'{line} · {cid}', 'species': text(nwb['general/subject/species']),
                'region': metadata['structure']['name'], 'regionKo': '일차 시각피질 5층',
                'creLine': line, 'dendriteType': text(nwb['general/aibs_dendrite_type']),
                'sourceUrl': f'https://celltypes.brain-map.org/mouse/experiment/electrophysiology/{cid}',
                'rawDataUrl': url, 'rawDataSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'recording': '생쥐 뇌 절편의 단일 세포 전류고정(current clamp) 기록 · in vitro',
                'defaultSweepId': '30' if cid == 464212183 else '35',
                'notes': 'Cre 계통은 표지 정보이며 이 기록 하나를 계통 전체의 대표값으로 해석하지 않습니다.',
                'sweeps': [extract_sweep(nwb, n, sweep_metadata[n], 'fit' if i in (0, 2) else 'test') for i, n in enumerate(selected)],
            }
            cells.append(cell)
    result = {
        'schemaVersion': 1,
        'source': {
            'name': 'Allen Cell Types Database', 'institution': 'Allen Institute for Brain Science',
            'url': 'https://celltypes.brain-map.org/',
            'apiDocumentationUrl': 'https://brain-map.org/support/documentation/cell-types-database-api',
            'citation': 'Allen Institute for Brain Science (2015). Allen Cell Types Database. Retrieved 2026-10-20. © Allen Institute for Brain Science.',
            'license': 'Allen Institute Terms of Use: research or other noncommercial use; attribution required. Not asserted to be CC BY.',
            'licenseUrl': 'https://alleninstitute.org/legal/terms-of-use',
            'citationPolicyUrl': 'https://alleninstitute.org/citation-policy/',
            'retrievedDate': '2026-10-20',
            'processing': 'Original NWB SI units converted to pA/mV/ms; 100 ms before and after each 1 s step retained. Display uses 0.1 ms grid plus original Allen spike-time samples and original local AP peak/trough samples. Voltage rounded to 0.00001 mV; time to 0.001 ms. No interpolation, smoothing or synthetic values. Arrays have a NONUNIFORM time axis: use timeMS for plotting. Allen spike timestamps are retained independently of display reduction.',
        },
        'limitations': [
            '실제 생쥐 뇌 절편의 한 세포에 전류를 주입한 기록이며, 살아 있는 사람의 뇌 전체 활동이나 청각 회로 기록이 아닙니다.',
            '주입전류(pA)는 시냅스 가중치와 같은 값이 아닙니다. 이 자료만으로 소리 방향 회로의 생물학적 타당성을 검증할 수 없습니다.',
            'fit/test는 수업용으로 나눈 자극 조건입니다. test를 보며 매개변수를 바꾸면 독립 예측 검증이 아닙니다.',
            '발화 시점은 원본 Allen 분석값입니다. LIF의 수학적 역치 통과와 생물학적 발화 시점의 정의가 완전히 같지 않으므로 작은 시간 차이를 과대해석하지 않습니다.',
        ],
        'cells': cells,
    }
    target = ROOT / 'assets/activities/neuron-lab/data/allen-recordings.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False), encoding='utf-8')
    for cell in cells:
        for sweep in cell['sweeps']:
            n = len(sweep['timeMS'])
            assert n == len(sweep['voltageMV']) == len(sweep['stimulusPA'])
            assert all(a < b for a, b in zip(sweep['timeMS'], sweep['timeMS'][1:]))
            print(cell['id'], sweep['id'], sweep['currentPA'], sweep['metrics'], 'points', n)
    print('Output:', target, 'bytes:', target.stat().st_size)


if __name__ == '__main__':
    main()
