# KO-PICK Mobile

KO-PICK의 Android·iOS 공용 앱 프로젝트입니다. 기존 웹과 별도로 배포되지만 동일한 Supabase Auth, PostgreSQL, RLS, RPC, Edge Functions를 사용합니다.

## 현재 구현된 항목

- Expo SDK 57 + React Native + TypeScript
- Expo Router 기반 화면 구조
- Android·iOS 공용 딥링크 스킴 `kopick://`
- 모바일 세션의 Expo SecureStore 저장
- 앱 활성·백그라운드 상태에 따른 Supabase 토큰 자동 갱신
- Google Play·Apple App Store 공용 식별자 `com.koreapick.app`
- EAS 내부 테스트·프로덕션 빌드 프로필과 자동 빌드 번호 증가
- 카카오·Google 모바일 OAuth와 iOS 네이티브 Apple 로그인
- 기존 네이버 로그인 콜백을 재사용하는 모바일 네이버 로그인
- 로그인 전 이용약관·개인정보 수집 동의와 DB 동의 이력 기록
- TourAPI 추천·장소 API 연결
- Android·iOS 네이티브 네이버 지도와 장소 마커
- 장소별 길찾기 지도 선택, 네이버지도·카카오맵 선택값 기기 저장
- 추천·장소 찾기·내 계정 하단 탭
- 앱 내부 영구 회원탈퇴와 Apple 로그인 토큰 연동 해제
- 코리아픽 전용 아이콘·Android 어댑티브/단색 아이콘·스플래시
- 정식 빌드 환경변수 누락 차단과 불필요한 Android 권한 제거

## 로컬 실행

Expo SDK 57은 Node.js 22.13 이상이 필요합니다.

```bash
cd mobile
npm ci
cp .env.example .env
npm run start
```

Windows에서도 Android 앱을 개발할 수 있습니다. iOS 시뮬레이터와 로컬 iOS 빌드는 macOS가 필요하며, EAS Build를 사용하면 클라우드에서 iOS 빌드를 만들 수 있습니다.

## 환경변수

`.env.example`을 `.env`로 복사하고 현재 웹의 공개 Supabase 값만 입력합니다.

```dotenv
EXPO_PUBLIC_WEB_URL=https://koreapick.duckdns.org
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=<NAVER_MAP_CLIENT_ID>
```

`SUPABASE_SERVICE_ROLE_KEY`, OAuth Client Secret, TourAPI 키는 앱에 넣으면 안 됩니다. 이 값들은 계속 Supabase Edge Functions와 인증 공급자 설정에서만 관리합니다.

네이버 지도는 네이티브 모듈이므로 Expo Go에서는 표시되지 않습니다. `development` EAS 프로필로 개발 빌드를 만든 뒤 테스트합니다. 현재 위치 권한은 요청하지 않으며, 지역·장소 좌표만 지도에 표시합니다.

Supabase Auth의 Redirect URLs에는 `kopick://**`를 추가합니다. Google·Kakao는 기존 Supabase OAuth callback을 유지하고, 네이버 로그인은 기존 운영 callback `/auth/naver/callback`을 모바일에서도 재사용합니다. 상세 설정은 [`../docs/mobile-step-3-setup.md`](../docs/mobile-step-3-setup.md)를 확인하세요.

## 앱 식별자와 버전

- Android Application ID: `com.koreapick.app`
- iOS Bundle ID: `com.koreapick.app`
- 사용자 버전: `1.0.0`
- 최초 Android versionCode: `1`
- 최초 iOS buildNumber: `1`
- 프로덕션 빌드는 `eas.json`의 원격 버전 관리로 빌드 번호를 자동 증가

스토어에 최초 앱을 생성한 뒤에는 Application ID와 Bundle ID를 변경하지 않습니다.

## EAS 빌드

Expo 계정과 EAS 프로젝트를 연결한 뒤 실행합니다. 현재 EAS 프로젝트는
`@use1234/ko-pick` (`8914e5dd-3545-482a-ad4d-4290b399e4b1`)에 연결되어 있습니다.

```bash
cd mobile
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
npx eas-cli build --platform ios --profile testflight
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

`production` 빌드는 EAS의 `production` 환경을 사용합니다. 공개 환경변수 4개 중 하나라도
빠지면 손상된 앱을 만들지 않고 설정 오류로 빌드를 중단합니다.

Apple 계정 탈퇴의 자동 연동 해제에는 앱 공개 환경변수가 아니라 Supabase Edge Function
secret인 `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`가 필요합니다.

Android 내부 테스트 업로드는 `internal` 제출 프로필을 사용합니다. 이 프로필은 자동 공개를 막기 위해 초안으로 업로드합니다.
출시 전 iPhone 배포는 `testflight` 빌드·제출 프로필을 사용합니다. 이 빌드는 App Store에
자동 출시되지 않고 App Store Connect의 TestFlight에만 올라갑니다.

```bash
npx eas-cli submit --platform android --profile internal
npx eas-cli submit --platform ios --profile testflight
npx eas-cli submit --platform ios --profile production
```

최초 Apple 인증과 App Store Connect 앱 생성이 끝난 뒤에는 빌드와 제출을 한 번에 실행할
수 있습니다.

```bash
npx eas-cli build --platform ios --profile testflight --auto-submit-with-profile testflight
```

외부 테스터 그룹의 공개 링크를 만든 뒤 Vercel 운영 환경변수 `IOS_TESTFLIGHT_URL`에
`https://testflight.apple.com/join/...` 링크를 설정하면
`https://koreapick.duckdns.org/download`의 iPhone 버튼이 활성화됩니다.

## 다음 구현 순서

1. 실기기 OAuth·네이버 지도 운영키 검증
2. 개인·커플·친구·가족 공간 및 공동 일정
3. 즐겨찾기·코스 저장·공유
4. 알림, App Links·Universal Links, 스토어 테스트 빌드

전체 설계는 [`../docs/mobile-app-architecture.md`](../docs/mobile-app-architecture.md), 실제 등록 순서는 [`../docs/store-release-checklist.md`](../docs/store-release-checklist.md)를 확인하세요.
