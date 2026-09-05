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
