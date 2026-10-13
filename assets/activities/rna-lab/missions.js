export const PRESETS = {
  hairpin: 'GGGGAAAACCCC',
  double: 'GCGCGAAAAACGCGCAAAAGGCCGAAAACGGCC',
  competition: 'GCCGGAAAACGCCCAAAAGGGCGAAAACCGGC'
};

export const MISSIONS = [
  {
    id: 'hairpin',
    title: '01. 줄기를 세워라',
    description: '가운데 AAAA 루프는 고정되어 있습니다. 주변 염기를 바꿔 여섯 쌍의 줄기가 있는 목표 헤어핀을 만드세요.',
    hint: '줄기의 양쪽은 서로 반대 방향입니다. 맞은편 염기를 확인하고, 한 곳을 바꿀 때 다른 결합도 생기는지 살펴보세요.',
    start: 'AAAAAAAGAGAGCAAAAGCGAGCAAAAAAA',
    target: '.......((((((....)))))).......',
    locked: [13, 14, 15, 16],
    maxChanges: null
  },
  {
    id: 'double',
    title: '02. 헤어핀 두 개를 동시에',
    description: '두 루프의 서열을 유지하면서 목표 구조의 줄기 두 개를 모두 완성하세요. 한쪽을 고칠 때 다른 쪽도 확인하세요.',
    hint: '각 줄기를 따로 점검한 뒤 전체 예측 구조를 보세요. 멀리 떨어진 구간끼리도 예상하지 못한 짝을 만들 수 있습니다.',
    start: 'AAAAGUUCGAAAAACUCGCAAAAUGCCGAAAACAGCCAAAA',
    target: '....(((((.....)))))....(((((....)))))....',
    locked: [9, 10, 11, 12, 13, 28, 29, 30, 31],
    maxChanges: null
  },
  {
    id: 'motif',
    title: '03. UUCG를 루프로 꺼내라',
    description: '고정된 UUCG 서열이 현재 다른 구간과 결합하고 있습니다. 처음 서열에서 네 곳 이하를 바꿔, UUCG가 루프에 놓이는 목표 구조를 만드세요.',
    hint: 'UUCG 자체는 바꿀 수 없습니다. 이 서열을 붙잡는 상대와, 새 줄기의 양쪽을 함께 살펴보세요.',
    start: 'UGGCGAAAAACGCCCAAGAGUGGGUUCGUCCGC',
    target: '(((((.....)))))....(((((....)))))',
    locked: [24, 25, 26, 27],
    maxChanges: 4
  },
  {
    id: 'competition',
    title: '04. 경쟁하는 접힘을 피하라',
    description: '현재는 멀리 떨어진 구간끼리 짝을 만들어 하나의 큰 구조로 접힙니다. 처음 서열에서 여섯 곳 이하를 바꿔 독립된 헤어핀 두 개를 만드세요.',
    hint: '목표 줄기에 맞는 짝을 배치하는 것과, 다른 위치의 짝을 없애는 것을 함께 생각하세요. 예측 구조에서 긴 결합부터 추적해 보세요.',
    start: 'GCCGGAAAACGCCCAAAAGGGCGAAAACCGGC',
    target: '(((((....)))))....(((((....)))))',
    locked: [5, 6, 7, 8],
    maxChanges: 6
  },
  {
    id: 'ribozyme',
    kind: 'ribozyme',
    title: '05. 처음부터 설계하는 RNA 가위',
    description: '54자리의 빈 설계판에서 해머헤드 자가절단 RNA를 설계하세요. 문헌의 보존 염기만 주어집니다. 나머지 38자리를 직접 채워 세 줄기가 핵심 부위를 배치하게 만드세요.',
    hint: '설계도를 보며 줄기 III의 바깥쪽부터 맞은편 짝을 배치해 보세요. 줄기 I·II도 각각 완성한 뒤 예측하세요. 루프끼리나 다른 줄기 사이에 새 결합이 생기면 경쟁하는 짝을 줄이세요. 보존 염기도 모두 짝이 없는 것은 아닙니다.',
    // PLMVd type III topology and 15 conserved sites + C8, from Dotu et al.
    // N is an unassigned design position, never sent to the folding engine.
    start: [...Array(54)].map((_, i) => ({5:'G',6:'U',7:'C',21:'C',22:'U',23:'G',24:'A',26:'G',27:'A',28:'G',43:'C',44:'G',45:'A',46:'A',47:'A',48:'C'}[i] || 'N')).join(''),
    target: '.((((((.(((((...))))).......((((........))))...)))))).',
    locked: [5,6,7,21,22,23,24,26,27,28,43,44,45,46,47,48],
    maxChanges: null,
    cleavageAfter: 7,
    stems: [
      {name:'줄기 III', pairs:[[1,52],[2,51],[3,50],[4,49],[5,48],[6,47]]},
      {name:'줄기 I', pairs:[[8,20],[9,19],[10,18],[11,17],[12,16]]},
      {name:'줄기 II', pairs:[[28,43],[29,42],[30,41],[31,40]]}
    ],
    source: 'https://doi.org/10.1093/nar/gku740'
  }
];
