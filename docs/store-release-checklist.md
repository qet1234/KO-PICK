# 오늘어디 스토어 출시 체크리스트

## 고정 값

| 항목 | 값 |
|---|---|
| 앱 이름 | 오늘어디 |
| Android Application ID | `com.koreapick.app` |
| iOS Bundle ID | `com.koreapick.app` |
| 앱 딥링크 | `kopick://` |
| 최초 사용자 버전 | `1.0.0` |
| Android 배포 형식 | AAB |
| iOS 배포 형식 | IPA |

Application ID와 Bundle ID는 스토어에 최초 등록한 뒤 변경하지 않습니다.

## 1. 개발자 계정

- Google Play Console 개인 개발자 계정 준비
- Apple Developer Program 및 App Store Connect 계정 준비
- Expo 계정 로그인 후 `mobile/`에서 `npx eas-cli init` 실행
- 생성된 EAS project ID는 Expo가 `app.json`에 기록하도록 하고 임의 값은 입력하지 않음

## 2. 로그인과 딥링크

- Supabase Redirect URLs에 `kopick://**` 등록
- Google·Kakao·Naver 콘솔에 Android/iOS 앱 `com.koreapick.app` 등록
- Android 서명 인증서의 SHA 지문을 필요한 로그인 콘솔에 등록
- Apple Team ID가 발급되면 Associated Domains와 Universal Links 설정
- iOS 심사 전에 Apple 로그인 버튼·계정 연결·회원탈퇴 흐름 구현

Apple App Review Guideline 4.8에 따라 제3자 소셜 로그인을 기본 계정 로그인으로 제공하는 iOS 앱은 동등한 개인정보 보호 기능을 가진 로그인 옵션이 필요합니다.

## 3. 개인정보와 심사

- 앱 안에서 이용약관·개인정보처리방침을 회원가입 전에 표시하고 동의 기록 저장
- 계정 화면에서 로그아웃과 회원탈퇴 제공
- 회원탈퇴 시 개인정보·공간 데이터의 삭제 또는 법정 보관 항목을 명확히 안내
- Google Play 데이터 보안 양식과 App Store 개인정보 라벨을 실제 수집 항목과 일치시킴
- 카메라·마이크·위치·사진 권한은 기능이 구현되기 전에는 요청하지 않음
- 외부 네이버 지도·예약 링크임을 사용자가 알 수 있게 표시
- TourAPI 이미지·정보는 공공데이터 출처와 이용조건을 운영 화면 및 정책에 반영

## 4. 테스트와 빌드

```bash
cd mobile
npm ci
npm run typecheck
npm run doctor
npx expo export --platform all
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

- Google Play 신규 개인 계정은 비공개 테스트에 최소 12명이 14일 연속 참여한 뒤 프로덕션 접근을 신청
- Android 최초 업로드는 내부 테스트 트랙의 초안으로 시작
- iOS 빌드는 App Store Connect 처리 후 TestFlight에서 내부 테스트
- 외부 사용자가 링크로 설치해야 하면 TestFlight 외부 테스트 그룹과 공개 링크 생성
- Vercel 운영 환경변수 `IOS_TESTFLIGHT_URL`에 TestFlight 공개 링크 등록
- 실제 기기에서 로그인, 딥링크, 네트워크 단절, 토큰 만료, 회원탈퇴를 검증
- 앱 충돌·개인정보가 포함된 로그·깨진 외부 링크가 없는지 확인

## 5. 아직 저장소에 넣지 않는 값

- EAS project ID
- Apple Team ID
- App Store Connect Apple ID(`ascAppId`)
- Android 업로드 키·Google 서비스 계정 JSON
- Apple 인증서·프로비저닝 프로파일·App Store Connect API 키
- OAuth Client Secret, Supabase service role key, TourAPI 키
- FCM/APNs 키

인증서와 키 파일은 Git에 커밋하지 않고 EAS Credentials 또는 각 개발자 콘솔에서 관리합니다.

## 공식 참고

- Expo App Config: https://docs.expo.dev/versions/latest/config/app/
- Expo EAS 버전 관리: https://docs.expo.dev/build-reference/app-versions/
- Expo 스토어 제출: https://docs.expo.dev/deploy/submit-to-app-stores/
- Google Play 신규 개인 계정 테스트: https://support.google.com/googleplay/android-developer/answer/14151465
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
