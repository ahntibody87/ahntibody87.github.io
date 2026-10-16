// Neutral structural formulas; the side-chain classes describe approximately pH 7.
export const AMINO_ACIDS=[
 ['G','Gly','글리신','Glycine','nonpolar','H','가장 작은 아미노산입니다. 곁사슬이 H여서 유연하며, 비대칭 탄소가 없습니다.','NCC(=O)O'],
 ['A','Ala','알라닌','Alanine','nonpolar','CH₃','작은 메틸기를 가지며, 알파 나선에서 자주 관찰됩니다.','N[C@@H](C)C(=O)O'],
 ['V','Val','발린','Valine','nonpolar','CH(CH₃)₂','가지 친 탄화수소 곁사슬을 가진 소수성 아미노산입니다.','N[C@@H](C(C)C)C(=O)O'],
 ['L','Leu','류신','Leucine','nonpolar','CH₂CH(CH₃)₂','소수성 곁사슬이 단백질 내부의 상호작용에 참여합니다.','N[C@@H](CC(C)C)C(=O)O'],
 ['I','Ile','아이소류신','Isoleucine','nonpolar','CH(CH₃)CH₂CH₃','가지 친 곁사슬을 가지며, 류신과 분자식이 같은 구조 이성질체입니다.','N[C@@H]([C@@H](C)CC)C(=O)O'],
 ['M','Met','메티오닌','Methionine','nonpolar','CH₂CH₂SCH₃','황을 포함하지만, 곁사슬은 전반적으로 비극성입니다.','N[C@@H](CCSC)C(=O)O'],
 ['P','Pro','프롤린','Proline','nonpolar','고리형 곁사슬','곁사슬이 주사슬의 질소와 고리를 이룹니다. 회전이 제한되고 펩타이드 결합의 질소에는 H가 없어, 알파 나선을 꺾거나 불안정하게 할 수 있습니다.','O=C(O)[C@@H]1CCCN1'],
 ['F','Phe','페닐알라닌','Phenylalanine','nonpolar','CH₂–페닐','방향족 고리를 가진 소수성 아미노산입니다.','N[C@@H](Cc1ccccc1)C(=O)O'],
 ['W','Trp','트립토판','Tryptophan','nonpolar','CH₂–인돌','큰 방향족 곁사슬을 가지며, 고리의 NH는 수소 결합에도 참여할 수 있습니다.','N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O'],
 ['S','Ser','세린','Serine','polar','CH₂OH','하이드록실기가 수소 결합에 참여하며 인산화되기도 합니다.','N[C@@H](CO)C(=O)O'],
 ['T','Thr','트레오닌','Threonine','polar','CH(OH)CH₃','하이드록실기가 있는 극성 곁사슬을 가지며 인산화되기도 합니다.','N[C@@H]([C@H](O)C)C(=O)O'],
 ['C','Cys','시스테인','Cysteine','polar','CH₂SH','티올기를 가지며, 두 시스테인이 산화되면 이황화 결합을 만들 수 있습니다.','N[C@@H](CS)C(=O)O'],
 ['Y','Tyr','타이로신','Tyrosine','polar','CH₂–페놀','방향족 고리와 하이드록실기를 함께 가지며, 인산화되기도 합니다.','N[C@@H](Cc1ccc(O)cc1)C(=O)O'],
 ['N','Asn','아스파라진','Asparagine','polar','CH₂CONH₂','곁사슬의 아마이드기가 수소 결합에 참여합니다.','N[C@@H](CC(=O)N)C(=O)O'],
 ['Q','Gln','글루타민','Glutamine','polar','CH₂CH₂CONH₂','아스파라진보다 탄소가 하나 더 긴 아마이드 곁사슬을 가집니다.','N[C@@H](CCC(=O)N)C(=O)O'],
 ['D','Asp','아스파트산','Aspartic acid','acidic','CH₂COO⁻','생리적 pH 부근에서 곁사슬의 카복실기가 주로 음전하를 띱니다.','N[C@@H](CC(=O)O)C(=O)O'],
 ['E','Glu','글루탐산','Glutamic acid','acidic','CH₂CH₂COO⁻','생리적 pH 부근에서 곁사슬은 주로 음전하를 띠며, 이온 결합 등에 참여합니다.','N[C@@H](CCC(=O)O)C(=O)O'],
 ['K','Lys','라이신','Lysine','basic','(CH₂)₄NH₃⁺','생리적 pH 부근에서 곁사슬의 아미노기가 주로 양전하를 띱니다.','N[C@@H](CCCCN)C(=O)O'],
 ['R','Arg','아르지닌','Arginine','basic','(CH₂)₃–구아니디늄','생리적 pH 부근에서 곁사슬은 주로 양전하를 띱니다.','N[C@@H](CCCNC(=N)N)C(=O)O'],
 ['H','His','히스티딘','Histidine','basic','CH₂–이미다졸','곁사슬의 전하가 pH에 민감합니다. pH 7 부근에서는 중성 형태가 더 많고 일부가 양전하를 띠며, 효소 촉매에 자주 참여합니다.','N[C@@H](Cc1cnc[nH]1)C(=O)O'],
].map(([code,three,name,english,group,side,detail,smiles])=>({code,three,name,english,group,side,detail,smiles}));
export const GROUPS={nonpolar:{label:'비극성',charge:'곁사슬 전하 0',color:'#c77739'},polar:{label:'극성 · 무전하',charge:'곁사슬 전하 0',color:'#278772'},acidic:{label:'산성 · 음전하',charge:'곁사슬 주로 −1',color:'#5684cc'},basic:{label:'염기성',charge:'곁사슬 주로 +1 · His는 pH에 따라 다름',color:'#a768a1'}};
export const PRESETS=[
 {id:'villin',name:'짧은 나선 단백질 · 빌린 HP35',sequence:'LSDEDFKAVFGMTRSAFANLPLWKQQNLKKEKGLF',note:'35 aa · 짧은 나선 단백질 도메인의 서열입니다. 프롤린 치환을 탐색하기 좋습니다.'},
 {id:'ubiquitin',name:'유비퀴틴',sequence:'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG',note:'76 aa · 알파 나선과 베타 병풍이 함께 있는 단백질입니다.'},
 {id:'b1',name:'단백질 G · B1 도메인',sequence:'MTYKLILNGKTLKGETTTEAVDAATAEKVFKQYANDNGVDGEWTYDDATKTFTVTE',note:'56 aa · 작은 단백질 도메인에서 서로 다른 2차 구조를 관찰합니다.'},
];
