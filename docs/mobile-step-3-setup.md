# 오늘어디 Android 설정

## 1. Supabase 딥링크

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs에
`kopick://**`를 등록합니다.

## 2. 네이버 로그인

네이버 Developers callback은 다음 운영 주소를 사용합니다.

```text
https://koreapick.duckdns.org/auth/naver/callback
```

앱은 `https://koreapick.duckdns.org/auth/mobile/naver`에서 로그인을 시작합니다.

## 3. 네이버 지도

네이버 클라우드 Maps 애플리케이션에서 Mobile Dynamic Map을 활성화하고 Android
패키지 `com.koreapick.app`을 등록합니다.

```dotenv
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=<발급된 Client ID>
```

```bash
cd mobile
npx eas-cli build --platform android --profile development
```

## 4. 공개 환경변수

```dotenv
EXPO_PUBLIC_WEB_URL=https://koreapick.duckdns.org
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=<NAVER_MAP_CLIENT_ID>
```

관리자 키, OAuth Client Secret과 TourAPI 서비스키는 앱에 넣지 않습니다.

## 5. 실기기 확인

1. 카카오·Google·네이버 로그인
2. 앱 재시작 후 세션 유지와 로그아웃
3. TourAPI 장소 목록과 네이버 지도 마커
4. 외부 지도 길찾기와 예약 연결
5. 회원탈퇴와 로컬 데이터 삭제
