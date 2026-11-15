# Hounds — Backend Portfolio

[포트폴리오 보기](https://hounds1.github.io/)

산업 현장 프로젝트 17개와 공통 백엔드 설계를 소개하는 정적 포트폴리오입니다.
대표작 상세에는 처리 개념도와 설명용 시뮬레이션이 포함되어 있습니다.

## 구성

- `index.html`: 경력 및 기술 스택
- `projects.html`: 프로젝트 목록과 상세 모달
- `projects-data.js`: 화면에 공개하는 편집된 프로젝트 데이터
- `project-simulations.js`: 대피·SOS와 직원 호출 시뮬레이션
- `assets/`, `vendor/`: 로컬 이미지, 아이콘 및 라이브러리

별도 빌드 없이 GitHub Pages의 `main` 브랜치 루트(`/`)에서 게시합니다.
로컬 확인은 이 폴더에서 `python -m http.server 8000`을 실행하면 됩니다.

경험 정리 원문, 이미지 생성 프롬프트, 작업용 데이터는 `.gitignore`로 제외합니다.
공개 데이터에는 화면에서 사용하지 않는 원문의 담당 목록·해결 기록 필드를 포함하지 않습니다.
사용한 폰트와 라이브러리의 출처·라이선스는 `THIRD-PARTY.txt`와 `OFL.txt`에서 확인할 수 있습니다.
