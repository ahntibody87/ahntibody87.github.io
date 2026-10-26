# 발생 아틀라스

- 공개 활동: https://ahntibody87.github.io/advanced-life-science/gene-expression/embryo-atlas/
- 소속: 고급 생명과학 → 03 유전자의 구조와 발현
- 소스: `content/advanced-life-science/gene-expression/embryo-atlas.html`
- 동작·스타일·카드 그림: `assets/activities/embryo-atlas/`
- 배포: 이 저장소의 GitHub Pages (main / root). 외부 호스팅에 의존하지 않음.

공통 ATLL 헤더, 경로 탐색, 단원 메뉴, 활동 제목, 과목 입장 화면, 돌아가기 링크를 생성기로 유지한다. 기존 작업 공간의 Pretendard 글꼴·파란색 조작 버튼·검은색 선택 탭·회색 테두리를 사용하며, 배엽과 세포의 과학적 색상은 보존한다. 활동 CSS와 DOM 조회는 `.embryo-lab` 안으로 한정한다.

수정란부터 사람의 낭배 형성, 배엽별 대표 조직, 차등 유전자 발현, MyoD의 골격근 분화 조절을 다룬다. 미오제닌 등의 세부 이름은 생략한다. 시간·모양·이동·발현량은 교육용 개념 모형이며 실제 측정 데이터가 아니다.

수정 시 이 저장소의 활동 소스를 편집하고, CSS/JS 참조의 캐시 버전을 갱신한 후 `node scripts/build.mjs`와 `node scripts/check.mjs`를 실행한다.
