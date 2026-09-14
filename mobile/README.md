# 오늘어디 Android

오늘어디의 Expo React Native Android 앱입니다. 웹과 동일한 Supabase Auth, PostgreSQL,
RLS, RPC, Edge Functions를 사용하며 앱 빌드는 웹 배포와 분리됩니다.

## 주요 구성

- Expo SDK 57, React Native, TypeScript, Expo Router
- Android Application ID: `com.koreapick.app`
- 딥링크 스킴: `kopick://`
- Google·카카오·네이버 로그인
- Expo SecureStore 기반 세션 저장
- TourAPI 장소·추천 API와 네이버 지도
- 앱 내부 회원탈퇴와 로컬 데이터 삭제
- Google Play AAB 전용 배포

## 로컬 실행

```bash
cd mobile
npm ci
cp .env.example .env
npm run start
npm run android
```

Expo SDK 57은 Node.js 22.13 이상이 필요합니다. 네이버 지도는 네이티브 모듈이므로
Expo Go 대신 Android development build에서 테스트합니다.

## 환경변수

```dotenv
EXPO_PUBLIC_WEB_URL=https://koreapick.duckdns.org
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=<NAVER_MAP_CLIENT_ID>
```

비밀키와 관리자 키는 앱 환경변수에 넣지 않습니다.

## EAS 빌드와 제출

```bash
cd mobile
npx eas-cli build --platform android --profile development
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile internal
```

`production`은 Google Play용 AAB를 만들며 EAS 원격 버전 번호를 자동 증가시킵니다.
외부 APK 직접 배포는 사용하지 않습니다.

상세 설정은 [모바일 설정](../docs/mobile-step-3-setup.md)과
[Google Play 출시 체크리스트](../docs/google-play-release-checklist.md)를 확인하세요.

## 폴드 내부 화면 대응

Android 화면은 창 전체 너비를 사용합니다. 600dp 이상의 창에서는 홈 지도·카드와
장소 지도를 확대하며, 화면 전환 때 `useWindowDimensions`와 safe-area 값을 다시
반영합니다. 모델명이나 패널 해상도로 화면 크기를 고정하지 않아 회전·화면 확대
설정·분할 화면에도 대응합니다. 버튼과 글자는 시스템 UI 안전 영역을 지킵니다.

검증 대상 패널 규격(삼성 공식 표기 순서):

| 모델 | 내부 패널 해상도 | 공식 자료 |
| --- | --- | --- |
| Galaxy Z Fold8 | 1848 × 2448 px | https://www.samsung.com/sec/smartphones/galaxy-z-fold8/specs/ |
| Galaxy Z Fold8 Ultra | 2504 × 2256 px | https://www.samsung.com/sec/smartphones/galaxy-z-fold8-ultra/specs/ |

실제 앱의 레이아웃 단위는 dp이며 패널 픽셀 수와 다릅니다. 위 규격은 실기기 확인
대상이며, 코드 검사나 Android 번들 생성 성공이 실기기 검증을 대신하지 않습니다.

실기기에서는 새 Android 빌드로 다음을 확인합니다.

1. 커버 화면에서 홈 검색어와 지역을 선택한 뒤 펼쳐도 값이 유지되는지 확인합니다.
2. 내부 화면의 홈·장소 찾기·직장인 식사·저장·계정·로그인·상세 화면에 좁은 중앙
   칼럼이 남지 않는지 확인합니다.
3. 내부 화면을 회전하고 분할 화면으로 바꿔도 가로 넘침이 없는지 확인합니다.
4. 지도 확대·이동 후 접기/펼치기 시 지도와 마커가 표시되고 로고·줌 버튼이 잘리지
   않는지 확인합니다. 커버 화면으로 이어 보기는 기기 설정에 따라 달라집니다.
5. 키보드 표시, 큰 글자 설정, 하단 탭 및 시스템 탐색 영역의 겹침을 확인합니다.

방향 제한 해제와 `with-android-resizable` 플러그인은 네이티브 설정 변경입니다.
기존 설치 앱에 전부 적용하려면 새 production AAB와 Play 업데이트가 필요합니다.
기존 앱의 OTA 업데이트만으로는 이 네이티브 설정을 바꿀 수 없습니다.
이 변경에는 힌지 각도 센서나 각도 연동 애니메이션은 포함되지 않습니다.
