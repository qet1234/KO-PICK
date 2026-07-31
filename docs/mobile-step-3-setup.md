# KO-PICK 모바일 3단계 설정

코드는 로그인·지도·API 연결까지 구현되어 있습니다. 아래 값은 개발자 계정에서 발급되므로 저장소에 넣지 않고 EAS와 로컬 `.env`에 설정합니다.

## 1. Supabase 모바일 딥링크

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs에 다음 값을 추가합니다.

```text
kopick://**
```

Google·Kakao 공급자의 OAuth callback은 Supabase Dashboard에 표시되는 기존 HTTPS callback을 유지합니다. 앱은 인증이 끝난 뒤 `kopick://auth/callback`으로 돌아와 PKCE 코드를 교환합니다.

## 2. 네이버 로그인

네이버 Developers의 기존 KO-PICK 애플리케이션 callback은 다음 운영 주소를 그대로 유지합니다.

```text
https://koreapick.duckdns.org/auth/naver/callback
```

앱은 `https://koreapick.duckdns.org/auth/mobile/naver`에서 로그인을 시작합니다. 서버가 OAuth state를 확인한 뒤 1회용 Supabase token hash만 앱 딥링크로 전달하며, 네이버 Client Secret이나 Supabase 관리자 키는 앱에 포함하지 않습니다.

## 3. 네이버 지도

네이버 클라우드 Maps 애플리케이션에서 Mobile Dynamic Map을 활성화하고 다음 식별자를 등록합니다.

| 플랫폼 | 등록값 |
|---|---|
| Android package | `com.koreapick.app` |
| iOS Bundle ID | `com.koreapick.app` |

발급된 Client ID를 EAS 환경변수와 로컬 `mobile/.env`에 설정합니다.

```dotenv
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=<발급된 Client ID>
```

지도는 네이티브 모듈이므로 Expo Go가 아닌 development build에서 확인합니다.

```bash
cd mobile
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
```

## 4. 앱 공개 환경변수

```dotenv
EXPO_PUBLIC_WEB_URL=https://koreapick.duckdns.org
EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=<NAVER_MAP_CLIENT_ID>
```

`SUPABASE_SERVICE_ROLE_KEY`, Google·Kakao·네이버·Apple Client Secret, TourAPI 서비스키는 EAS 공개 환경변수나 앱 `.env`에 넣지 않습니다.

## 5. 실기기 확인 순서

1. Android development build에서 카카오·Google·네이버 로그인
2. iOS development build에서 Apple·카카오·Google·네이버 로그인
3. 로그인 후 앱 재시작 시 세션 유지와 로그아웃 확인
4. 장소 찾기에서 TourAPI 목록과 네이버 지도 마커 확인
5. 첫 `길찾기`에서 네이버지도·카카오맵 선택창 확인
6. `다음부터 선택한 지도로 바로 열기`와 선택 변경 확인
7. 지도 앱 미설치 시 웹 지도로 이동하는지 확인
