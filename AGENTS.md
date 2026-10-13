# 프로젝트 지침

- 이 프로젝트는 GitHub Pages 공개 수업 홈페이지입니다.
- 저장소: https://github.com/ahntibody87/ahntibody87.github.io (PUBLIC)
- 홈페이지: https://ahntibody87.github.io/
- 배포: main / (root), GitHub Pages
- 이 홈페이지에는 Supabase project ref, Vercel projectId/orgId가 없습니다. 별도 앱의 설정을 사용하지 않습니다.
- 사용자가 선택하지 않은 기존 작업물은 추가하지 않습니다.
- 비밀값·개인정보·교사용 비공개 자료를 커밋하지 않습니다.
- 정적 홈페이지 수정에는 Vercel 배포나 도름스체크를 실행하지 않습니다. 보안상 중요한 변경이 있을 때 필요한 검사만 수행합니다.

## 포털 유지보수

- 과목·단원·활동은 `data/site.json`에서 관리합니다. 없는 활동을 임의로 게시하지 않습니다.
- 공통 HTML은 `scripts/build.mjs`, 스타일과 메뉴는 `assets/`를 수정합니다. 생성된 HTML을 직접 편집하지 않습니다.
- 변경 후 `node scripts/build.mjs`와 `node scripts/check.mjs`를 실행하고 생성된 HTML도 함께 커밋합니다.
- 실제 페이지 디렉터리와 `index.html`을 유지합니다. SPA 라우팅이나 별도 배포 서비스로 전환하지 않습니다.
- 내부 활동은 `content` HTML 조각으로 공통 페이지를 생성하거나 `url`로 기존 실습을 연결합니다. 추가 방법은 README를 따릅니다.
- 생성기는 기존 파일을 삭제하지 않습니다. 이미 공개된 id/URL을 바꾸기 전 기존 링크 보존 방안을 확인합니다.
