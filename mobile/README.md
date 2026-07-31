# KO-PICK Mobile

KO-PICK의 Android·iOS 공용 앱 프로젝트입니다. 기존 웹과 별도로 배포되지만 동일한 Supabase Auth, PostgreSQL, RLS, RPC, Edge Functions를 사용합니다.

## 현재 준비된 항목

- Expo SDK 57 + React Native + TypeScript
- Expo Router 기반 화면 구조
- Android·iOS 공용 딥링크 스킴 `kopick://`
- 모바일 세션의 Expo SecureStore 저장
- 앱 활성·백그라운드 상태에 따른 Supabase 토큰 자동 갱신
- Google Play·Apple App Store 공용 식별자 `com.koreapick.app`
- EAS 내부 테스트·프로덕션 빌드 프로필과 자동 빌드 번호 증가
- 기존 운영 웹으로 이동하는 기본 화면

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
```

`SUPABASE_SERVICE_ROLE_KEY`, OAuth Client Secret, TourAPI 키는 앱에 넣으면 안 됩니다. 이 값들은 계속 Supabase Edge Functions와 인증 공급자 설정에서만 관리합니다.

## 앱 식별자와 버전

- Android Application ID: `com.koreapick.app`
- iOS Bundle ID: `com.koreapick.app`
- 사용자 버전: `1.0.0`
- 최초 Android versionCode: `1`
- 최초 iOS buildNumber: `1`
- 프로덕션 빌드는 `eas.json`의 원격 버전 관리로 빌드 번호를 자동 증가

스토어에 최초 앱을 생성한 뒤에는 Application ID와 Bundle ID를 변경하지 않습니다.

## EAS 빌드

Expo 계정과 EAS 프로젝트를 연결한 뒤 실행합니다. EAS project ID는 계정에서 발급되는 값이므로 저장소에 임의로 넣지 않습니다.

```bash
cd mobile
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Android 내부 테스트 업로드는 `internal` 제출 프로필을 사용합니다. 이 프로필은 자동 공개를 막기 위해 초안으로 업로드합니다.

```bash
npx eas-cli submit --platform android --profile internal
npx eas-cli submit --platform ios --profile production
```

## 다음 구현 순서

1. KO-PICK 디자인 시스템과 하단 탭
2. Google·Kakao·Naver·Apple 모바일 OAuth 및 필수 약관 동의
3. 홈 추천과 `/explore` 장소 탐색
4. 개인·커플·친구·가족 공간 및 공동 일정
5. 알림, 앱 링크, 스토어 테스트 빌드

전체 설계는 [`../docs/mobile-app-architecture.md`](../docs/mobile-app-architecture.md), 실제 등록 순서는 [`../docs/store-release-checklist.md`](../docs/store-release-checklist.md)를 확인하세요.
