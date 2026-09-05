# 오늘어디 Android 앱 설계

## 구조

```text
Next.js 웹 ───────┐
                 ├─ Supabase Auth · PostgreSQL · RLS · RPC
Expo Android 앱 ─┤
                 ├─ 오늘어디 Next.js API · TourAPI
                 └─ 네이버 지도 SDK · 외부 길찾기
```

웹은 Vercel에 배포하고 Android 앱은 `mobile/`의 Expo React Native 프로젝트에서
Google Play용 AAB로 빌드합니다.

## 저장소 경계

- `app/`, `components/`, `utils/`: Next.js 웹
- `mobile/src/app/`: Android 화면과 Expo Router 경로
- `mobile/src/lib/`: 모바일 인증, API, 딥링크
- `supabase/`: 웹·앱 공용 데이터베이스와 Edge Functions

## 앱 고정 값

- 앱 이름: 오늘어디
- Android Application ID: `com.koreapick.app`
- 딥링크: `kopick://`
- 버전: EAS 원격 버전과 자동 증가

## 인증과 보안

- Google·카카오 OAuth와 네이버 전용 모바일 로그인
- Expo SecureStore 기반 세션 저장
- 비밀키와 관리자 키는 앱 번들에 포함하지 않음
- RLS와 서버 RPC에서 사용자 권한 재검증
- 카메라·마이크·위치·사진 권한은 요청하지 않음

## 출시

- Google Play App Signing이 적용된 AAB만 배포
- 외부 APK 직접 배포와 APK 서명 키 사용 금지
- 실제 Android 기기에서 로그인, 지도, 회원탈퇴와 네트워크 오류 검증
