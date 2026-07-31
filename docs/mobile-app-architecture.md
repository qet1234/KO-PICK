# KO-PICK Android·iOS 확장 설계

## 확정 구조

```text
Next.js 웹 ─────────────┐
                       ├─ Supabase Auth · PostgreSQL · RLS · RPC
Expo Android·iOS 앱 ───┤
                       ├─ KO-PICK Next.js API ─ TourAPI
                       └─ 네이버 지도 네이티브 SDK · 외부 길찾기
```

웹은 현재 Vercel 배포를 그대로 유지합니다. 모바일은 `mobile/`의 Expo React Native 앱으로 별도 빌드하며, 데이터와 권한 정책은 운영 중인 Supabase 프로젝트를 공유합니다. 기존 `backend/` Spring 코드는 복구 참고용이므로 새 앱에서 사용하지 않습니다.

## 저장소 경계

- 루트 `app/`, `components/`, `utils/`: Next.js 웹 전용
- `mobile/src/app/`: Android·iOS 화면과 Expo Router 경로
- `mobile/src/lib/`: 모바일용 Supabase, API, 딥링크 어댑터
- `supabase/`: 웹·모바일 공용 DB 마이그레이션, RLS, RPC, Edge Functions
- 공용 API 응답 형식은 플랫폼에 의존하지 않는 JSON으로 유지

웹의 React 컴포넌트는 DOM과 CSS를 사용하므로 모바일로 직접 복사하지 않습니다. 장소·공간·일정의 데이터 타입과 검증 규칙만 추후 공용 패키지로 분리합니다.

## 스토어 식별자와 버전

- 앱 이름: `KO-PICK`
- Android Application ID: `com.koreapick.app`
- iOS Bundle ID: `com.koreapick.app`
- 앱 딥링크 스킴: `kopick://`
- 사용자 버전은 `expo.version`, Android versionCode와 iOS buildNumber는 EAS 원격 버전으로 관리
- 프로덕션 빌드마다 개발자용 빌드 번호를 자동 증가
- 스토어에 최초 등록한 뒤 Application ID와 Bundle ID는 변경하지 않음

## 인증과 보안

- 웹: 현재 Supabase SSR 쿠키와 `/auth/callback` 유지
- 모바일: Supabase JWT 세션을 Expo SecureStore에 저장
- 앱이 백그라운드로 이동하면 자동 토큰 갱신을 중지하고, 활성화되면 재개
- `SUPABASE_SERVICE_ROLE_KEY`, OAuth Client Secret, TourAPI 키는 앱 번들에 포함 금지
- 모든 사용자 데이터 접근은 현재 RLS와 `security definer` RPC 권한 검사를 그대로 적용
- 회원가입 전 이용약관·개인정보처리방침 필수 동의를 받고 `record_user_legal_consents` RPC로 기록
- 현재 앱 골격은 카메라·마이크·위치·사진 접근 권한을 요청하지 않음
- 이후 권한을 추가할 때는 실제 기능에서 요청하는 시점과 사용 목적 문구를 함께 구현

Supabase Authentication의 Redirect URLs에는 앱 로그인 구현 시 아래 패턴을 추가합니다.

```text
kopick://**
```

Google·Kakao 공급자 콘솔에는 Supabase가 안내하는 OAuth callback을 유지하고, 각 콘솔의 모바일 플랫폼 항목에는 `com.koreapick.app`을 등록합니다. 네이버는 기존 `/auth/naver/callback`을 웹·모바일에서 함께 사용하며 OAuth state 쿠키로 흐름을 분리합니다. iOS는 Expo Apple Authentication으로 네이티브 Apple 로그인을 제공합니다.

## 딥링크

초기 경로 계약은 다음처럼 유지합니다.

| 기능 | 웹 URL | 앱 딥링크 |
|---|---|---|
| 홈 | `/` | `kopick://` |
| 장소 탐색 | `/explore` | `kopick://explore` |
| 공유 코스 | `/course/{token}` | `kopick://course/{token}` |
| OAuth callback | `/auth/callback` | `kopick://auth/callback` |

정식 Android App Links와 iOS Universal Links는 Apple Team ID와 앱 서명이 확정된 뒤 `koreapick.duckdns.org/.well-known/` 검증 파일과 함께 설정합니다.

## API 원칙

- 장소 조회는 운영 웹의 `/api/tour/places`, 추천 조회는 `/api/recommend`를 공용으로 사용
- 로그인 사용자의 요청은 `Authorization: Bearer <Supabase access token>` 전달
- 앱에서 외부 API를 직접 호출하거나 비밀키를 보관하지 않음
- 새 응답 필드는 선택 항목으로 추가하고 기존 필드 의미를 변경하지 않음
- 앱 출시 전 Edge Function CORS의 `*` 허용 범위를 웹 운영 도메인과 필요한 앱 요청 방식에 맞춰 재검토

## 단계별 개발 순서

### 완료 · 로그인·지도·API 연동

- 카카오·Google OAuth, 네이버 전용 모바일 브리지, iOS Apple 로그인
- SecureStore 기반 PKCE 세션과 자동 갱신
- 필수 약관 동의 기록
- TourAPI 장소·추천 API 클라이언트
- Android·iOS 네이티브 네이버 지도와 마커
- 네이버지도·카카오맵 길찾기 선택 및 기기별 기본값 저장

### 다음 · 공용 기반 보완

- 앱 아이콘·스플래시·브랜드 색상
- 하단 탭과 공통 로딩·오류 화면
- 실기기 OAuth·지도 인증 검증, 로그아웃, 앱 내부 회원탈퇴
- 오류 수집과 개인정보 마스킹

### 2단계 · 핵심 기능

- 지금 갈 곳 추천, 예산 1만원~10만원
- 지역·카테고리 기반 장소 탐색
- 네이버 지도·예약 외부 링크
- 즐겨찾기와 활동 기록

### 3단계 · 함께 공간

- 개인·커플·친구·가족 공간
- 초대 코드, 공동 달력, 기념일
- 후보·투표·최종 일정 확정
- 딥링크 공유

### 4단계 · 출시

- Play Console과 App Store Connect에 `com.koreapick.app` 등록
- 네이버·카카오·Google·Apple 콘솔에 모바일 플랫폼 등록
- 개인정보처리방침에 기기 권한·푸시 토큰·진단정보 반영
- Google Play 비공개 테스트와 TestFlight 내부 테스트
- 접근성, 저사양 Android, 네트워크 단절, 토큰 만료 검증

## 계정에서 확정해야 하는 값

다음 값은 개발자 계정에서 발급되는 값이므로 저장소에 임의로 넣지 않습니다.

- Apple Team ID와 Associated Domains
- EAS project ID
- App Store Connect Apple ID(`ascAppId`)
- Google Play 서비스 계정 키와 스토어 제출 자격증명
- FCM/APNs 푸시 자격증명
