/* RibossFold 0.0.5 is MIT licensed; see vendor/LICENSE-ribossfold.txt. */
importScripts('./vendor/ribossfold.js');
let engine;
const ready = ribossfold().then(module => {
  engine = module;
  self.postMessage({type: 'ready'});
}).catch(() => self.postMessage({type: 'init-error', error: '접힘 계산기를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'}));
self.onmessage = async ({data}) => {
  if (data.type !== 'fold') return;
  try {
    await ready;
    if (!engine) throw new Error('계산기를 사용할 수 없습니다.');
    if (!/^[ACGU]{8,120}$/.test(data.sequence)) throw new Error('A·U·G·C로 8~120개 염기를 입력하세요.');
    const raw = engine.foldSeq(data.sequence).trim().split(/\s+/);
    const structure = raw[0];
    const energy = Number(raw[1]) / 100;
    if (!/^[().]+$/.test(structure) || structure.length !== data.sequence.length || !Number.isFinite(energy)) throw new Error('예측 결과를 읽지 못했습니다.');
    self.postMessage({type:'result', id:data.id, sequence:data.sequence, structure, energy});
  } catch (error) {
    self.postMessage({type:'error', id:data.id, error:error.message || '계산 중 문제가 생겼습니다.'});
  }
};
