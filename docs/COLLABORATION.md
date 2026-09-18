# 두 명이 함께 개발하기

## 실행

Node.js 22 LTS, Git을 설치합니다. 저장소를 clone한 다음 `npm ci`를 실행합니다.
`.env.example`을 `.env.local`로 복사합니다. API 키 없이도 지도·보행 길찾기·모형 화면은 실행됩니다.

- 첫 터미널: `npm run dev:api` (서버, 8787)
- 둘째 터미널: `npm run dev` (브라우저 주소는 실행 출력 참고)
- 검증: `npm run test:transit`, `npm run build`

## 키 설정

ODsay LAB에서 대중교통 길찾기 및 노선 그래픽 API의 이용 권한과 호출 한도를 확인하고 서버용 키를 발급합니다.
`.env.local`의 `ODSAY_API_KEY`에 설정합니다. 키를 채팅, 이슈, PR, README에 붙이지 않습니다.
`VITE_ODSAY_API_KEY`처럼 프론트 공개 변수로 만들지 않습니다. `.env.local`은 Git에서 제외됩니다.

개발환경은 Vite가 `/api/transit`을 로컬 서버로 프록시합니다.
배포본은 정적 지도 파일과 `server/worker.mjs`의 Cloudflare Worker 호환 API를 함께 제공합니다.
서버의 비밀 변수에 `ODSAY_API_KEY`, 일반 변수 `ODSAY_SERVICE_URI`에 ODsay에 등록한 서비스 도메인을 설정합니다.
같은 도메인 배포에서는 `VITE_TRANSIT_API_URL`을 비워 둡니다. 별도 API 서버를 쓸 때만 서버 origin을 설정하고 다시 빌드합니다.
운영 전 서버 호출 제한 및 API 제공처 쿼터·이용 조건을 점검합니다.
Sites 운영 환경에는 키가 비밀값으로 등록되어 있으며, 로컬 개발자는 각자 `.env.local`에 자신의 키를 설정합니다.

## 작업 방식

`main`은 확인된 코드만 유지하고 작업마다 `feat/transit-routes`, `fix/mobile-player`처럼 브랜치를 만듭니다.
작업 전 서로 수정할 파일을 공유하고 같은 파일을 동시에 고치면 미리 알립니다.
PR에는 변경 이유, 화면, 확인한 동작, 남은 제약을 적고 상대가 확인한 다음 합칩니다.
고정 역할 없이 작업 단위로 나눕니다. 예: 한 명은 교통 데이터 연결, 다른 한 명은 지도·모형 표시.

## 같이 지킬 규격

- API 좌표: `[경도, 위도]` (WGS84).
- GLB: 미터 단위, Y-up, 원점은 바닥 중심. 실제 위치·방향·치수는 배치 데이터와 분리.
- 새 모형은 `public/models/`와 manifest에 기록하고 선택할 때 불러옵니다.
- 버스 정류장 전체에 모형을 복제하지 않습니다. 선택한 승하차 지점 중심으로 배치합니다.
- 실제 운행 정보 없는 애니메이션을 실시간 위치로 표시하지 않습니다.
- 미확인 경사·승강기·저상버스를 이용 가능으로 추정하지 않습니다.
- `research/` 원자료, `public/data/` 서비스 데이터, `scripts/` 가공 스크립트를 구분합니다.

## 현재 구현과 남은 연결

앱 내부 대중교통 검색·구간 카드·노선 선형 표시와 보행·버스·지하철·환승 3D 시뮬레이션, 서버 ODsay 어댑터가 구현되어 있습니다.
외부 지도 앱으로 보내지 않습니다. 운영 도메인에 등록된 ODsay 웹 키를 서버를 통해 사용합니다.
대중교통 보행 연결선은 승하차 지점 사이의 단순 시각화입니다. 무장애 조건 검증, 실시간 도착정보와 실제 차량 위치는 별도 작업입니다.
지하철 모형 3종은 목록에 있으며 지도에 실제 출입구를 임의 배치하지 않았습니다.

## GitHub 첫 업로드

GitHub에 비공개 저장소 `galsuissyu`를 생성합니다. 기존 프로젝트 폴더에서:

    git remote add github https://github.com/본인계정/galsuissyu.git
    git push github main

이미 github remote가 있으면 먼저 `git remote -v`로 확인합니다. 강제 push는 하지 않습니다.
기존 Sites remote는 유지합니다. GitHub push만으로 Sites가 자동 배포되는 구성은 아닙니다.
저장소 Settings → Collaborators에서 동료의 정확한 GitHub ID를 확인한 뒤 초대합니다.
파일별 라이선스는 유지하며 저장소 전체에 임의의 오픈소스 라이선스를 붙이지 않습니다.
