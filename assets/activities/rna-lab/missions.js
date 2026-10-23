export const PRESETS = {
  tertiary: 'GGGCGAAAGCCCUUUU',
  hairpin: 'GGGGAAAACCCC',
  double: 'GCGCGAAAAACGCGCAAAAGGCCGAAAACGGCC',
  competition: 'GCCGGAAAACGCCCAAAAGGGCGAAAACCGGC'
};

export const MISSIONS = [
  {
    id: 'hairpin',
    title: '01. 염기쌍 6개로 헤어핀 만들기',
    description: '연속된 염기쌍 6개와, 짝을 이루지 않는 염기 4개로 된 고리 부분을 가진 헤어핀을 만드세요. 지정된 AAAA는 바꾸지 마세요. 헤어핀의 위치와 고리 부분의 서열은 달라도 됩니다.',
    hint: '염기쌍을 이루는 두 구간은 서로 반대 방향입니다. 맞은편 염기를 확인하고, 다른 위치에도 염기쌍이 생기는지 살펴보세요.',
    start: 'AAAAAAAGAGAGCAAAAGCGAGCAAAAAAA',
    target: '.......((((((....)))))).......',
    locked: [13, 14, 15, 16],
    maxChanges: null
  },
  {
    id: 'double',
    title: '02. 헤어핀 두 개를 동시에',
    description: '연속된 염기쌍이 각각 5개인 헤어핀 두 개를 만드세요. 고리 부분의 염기는 각각 5개와 4개입니다. 지정된 염기는 바꾸지 마세요. 헤어핀의 위치는 달라도 됩니다.',
    hint: '각 헤어핀의 염기쌍을 확인한 뒤 전체 예측 구조를 보세요. 멀리 떨어진 구간끼리도 예상하지 못한 짝을 만들 수 있습니다.',
    start: 'AAAAGUUCGAAAAACUCGCAAAAUGCCGAAAACAGCCAAAA',
    target: '....(((((.....)))))....(((((....)))))....',
    locked: [9, 10, 11, 12, 13, 28, 29, 30, 31],
    maxChanges: null
  },
  {
    id: 'motif',
    title: '03. 지정된 염기를 유지하며 구조 바꾸기',
    description: 'UUCG는 바꾸지 않고, 처음 서열에서 네 곳 이하를 바꿔 목표와 같은 헤어핀 두 개를 만드세요. 위치가 달라도 염기쌍 수와 고리 부분의 염기 수, 연결된 모양이 같으면 성공입니다.',
    hint: 'UUCG 자체는 바꿀 수 없습니다. 염기쌍을 이룰 두 구간을 함께 살펴보세요. 완성 뒤 UUCG가 고리 부분에 있는지, 염기쌍을 이루는 부분에 있는지도 관찰하세요.',
    start: 'UGGCGAAAAACGCCCAAGAGUGGGUUCGUCCGC',
    target: '(((((.....)))))....(((((....)))))',
    locked: [24, 25, 26, 27],
    maxChanges: 4
  },
  {
    id: 'competition',
    title: '04. 다른 곳에 생긴 염기쌍 바꾸기',
    description: '지금은 멀리 떨어진 구간끼리 염기쌍을 이루어 하나의 큰 구조가 만들어집니다. 처음 서열에서 여섯 곳 이하를 바꾸어, 분리된 헤어핀 두 개를 만드세요.',
    hint: '목표 헤어핀의 염기쌍을 만드는 것과, 다른 위치에 생긴 염기쌍을 없애는 것을 함께 생각하세요. 예측 구조에서 멀리 떨어진 구간 사이의 짝을 찾아보세요.',
    start: 'GCCGGAAAACGCCCAAAAGGGCGAAAACCGGC',
    target: '(((((....)))))....(((((....)))))',
    locked: [5, 6, 7, 8],
    maxChanges: 6
  },
  {
    id: 'scissors',
    kind: 'scissors',
    title: '05. 두 내부 고리가 만나는 RNA 가위',
    description: '주어진 가상 표적 주변에 염기쌍 구간 네 개와 내부 고리 두 개를 만드세요. 전체 서열의 접힘을 관찰하며 설계하고, 성공하면 두 고리가 만나 표적이 잘리는 장면을 확인합니다.'
  }
];
