# KO-PICK Mobile

KO-PICK의 Android·iOS 공용 앱 프로젝트입니다. 기존 웹과 별도로 배포되지만 동일한 Supabase Auth, PostgreSQL, RLS, RPC, Edge Functions를 사용합니다.

## 현재 준비된 항목

- Expo SDK 57 + React Native + TypeScript
- Expo Router 기반 화면 구조
- Android·iOS 공용 딥링크 스킴 `kopick://`
- 모바일 세션의 Expo SecureStore 저장
- 앱 활성·백그라운드 상태에 따른 Supabase 토큰 자동 갱신
- 기존 운영 웹으로 이동하는 기본 화면

## 로컬 실행

Expo SDK 57은 Node.js 22.13 이상이 필요합니다.

```bash
cd mobile
npm ci
cp .env.example .env
npm run start
```

Windows에서도 Android 앱을 개발할 수 있습니다. iOS 시뮬레이터와 로컬 iOS 빌드는 macOS가 필요하며, 이후 EAS Build를 사용하면 클라우드에서 iOS 빌드를 만들 수 있습니다.

## 환경변수

`.env.example`을 `.env`로 복사하고 현재 웹의 공개 Supabase 값만 입력합니다.

```dotenv
EXPO_PUBLIC_WEB_URL=https://koreapick.duckdns.org
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
```

`SUPABASE_SERVICE_ROLE_KEY`, OAuth Client Secret, TourAPI 키는 앱에 넣으면 안 됩니다. 이 값들은 계속 Supabase Edge Functions와 인증 공급자 설정에서만 관리합니다.

## 앱 식별자

Android package name과 iOS Bundle ID는 스토어 계정과 앱 이름을 확정한 뒤 `app.json`에 추가합니다. 현재는 기존 네이버 지도 웹 설정과 충돌하지 않도록 비워 두었습니다.

## 다음 구현 순서

1. KO-PICK 디자인 시스템과 하단 탭
2. Google·Kakao·Naver 모바일 OAuth 및 필수 약관 동의
3. 홈 추천과 `/explore` 장소 탐색
4. 개인·커플·친구·가족 공간 및 공동 일정
5. 알림, 앱 링크, 스토어 테스트 빌드

전체 설계와 출시 전 등록 항목은 [`../docs/mobile-app-architecture.md`](../docs/mobile-app-architecture.md)를 확인하세요.
