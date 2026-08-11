# 오늘어디 스토어 정식 출시 준수 체크리스트

기준일: 2026-08-11

이 문서는 저장소의 실제 데이터 흐름과 현재 Apple·Google 공개 심사 기준을 대조한 출시 점검표입니다. 법률 자문이나 심사 승인을 보장하지 않으며, 콘솔·계약·사업자 정보는 출시 책임자가 실제 값으로 최종 확인해야 합니다.

## 1. 앱 고정 값

| 항목 | 값 |
|---|---|
| 앱 이름 | 오늘어디 |
| Android Application ID | `com.koreapick.app` |
| iOS Bundle ID | `com.koreapick.app` |
| 앱 딥링크 | `kopick://` |
| 최초 사용자 버전 | `1.0.0` |
| Android 배포 형식 | AAB |
| iOS 배포 형식 | IPA |

Application ID와 Bundle ID는 최초 스토어 등록 뒤 변경하지 않습니다.

## 2. 코드·정책 반영 상태

| 항목 | 상태 | 검증 내용 |
|---|---|---|
| 비회원 핵심 기능 | 반영 | 장소 탐색·추천은 로그인 없이 사용, 저장·최근 동기화만 로그인 필요 |
| 필수 동의 | 반영 | 약관·개인정보 동의와 만 14세 이상 확인 후 로그인 |
| iOS 동등 로그인 | 반영 | Google·카카오·네이버와 함께 Apple 로그인 제공 |
| 앱 내 계정 삭제 | 반영 | 계정·서버 연결 데이터·기기 로컬 데이터 삭제, Apple 토큰 해제 시도 |
| 선택 분석 동의 | 반영 | 모바일 기본 미동의, 첫 실행 선택, 계정 화면 철회, 철회 시 UUID 삭제 요청 |
| 민감 권한 최소화 | 반영 | 위치·사진·카메라·마이크·연락처 권한 미요청 |
| 날씨 출처 | 반영 | 웹·앱 날씨 화면에 Open-Meteo와 CC BY 4.0 표시 |
| 법적 문서 | 반영 | `/privacy`, `/terms`, `/sources`, `/account-deletion`, `/support` |

## 3. 출시 전 반드시 완료할 외부 작업

- [ ] Apple Developer Program 유료 멤버십 활성화
- [ ] Apple App ID의 Sign in with Apple capability, Services ID·키·Team ID와 Supabase Apple Provider 설정
- [ ] App Store Connect의 개인정보처리방침 URL에 `https://koreapick.duckdns.org/privacy` 입력
- [ ] Google Play의 개인정보처리방침 URL과 계정 삭제 URL `https://koreapick.duckdns.org/account-deletion` 입력
- [ ] Supabase Dashboard에서 운영 프로젝트의 실제 데이터 저장 리전 국가를 확인하고 개인정보처리방침 제6조에 국가명 명시
- [ ] Vercel·Supabase의 DPA/위탁 조건과 하위처리자 목록을 운영자 계정에서 검토·보관
- [ ] TourAPI 활용 신청을 운영계정으로 승인받고 서비스키 호출 한도 확인
- [ ] Google·Kakao·Naver의 Android/iOS 앱 등록, OAuth redirect URI 및 Android 서명 SHA 지문 확인
- [ ] App Store Connect와 Google Play Console의 개발자 법적 명칭·연락처·필요 시 주소를 실제 사업자 정보로 입력
- [ ] 실제 기기에서 네 가지 로그인, 계정 삭제, 분석 동의 거부·철회, 외부 지도·예약, 오프라인·토큰 만료를 검증

Apple 유료 멤버십이 아직 활성화되지 않았으므로 iOS App Store/TestFlight 정식 배포는 현재 차단 상태입니다. Android preview APK 직접 배포는 가능하지만, Play Console 출시에는 별도 개발자 계정과 심사 절차가 필요합니다.

## 4. App Store 개인정보 라벨 권장 입력

실제 제출 빌드와 연결된 SDK를 다시 검사한 뒤 아래보다 적게 신고하지 않습니다.

| Apple 범주 | 오늘어디 처리 | 연결 여부·목적 |
|---|---|---|
| Contact Info | 이메일, 이름·닉네임(제공된 경우), 고객지원 발신 이메일 | 회원 계정·지원, 사용자 연결 |
| Identifiers | 소셜 제공자 사용자 ID, 회원 ID, 무작위 방문자 UUID | 앱 기능·분석, 사용자 또는 기기 연결 |
| Search History | 검색어·검색 조건(선택 동의 시) | 분석·앱 기능 |
| Usage Data | 장소 조회·지도·길찾기·예약·저장 이벤트(선택 동의 시) | 분석 |
| Diagnostics | API 성능, 상태코드, 앱 오류·충돌 메시지(선택 동의 시) | 분석·앱 기능 |
| User Content | 문의 내용과 사용자가 직접 첨부한 파일 | 고객지원 |
| Location | 사용자 현재 위치는 수집하지 않음 | 장소의 공개 좌표는 사용자 위치가 아님 |
| Tracking | 해당 없음 | 광고·데이터 브로커·교차 앱 추적 없음 |

선택 동의라고 해서 개인정보 라벨 신고 대상에서 제외되지 않습니다. 앱 또는 포함 SDK가 수집할 수 있으면 신고합니다.

## 5. Google Play 데이터 보안 권장 입력

| 데이터 유형 | 수집 여부 | 목적·선택성 |
|---|---|---|
| Personal info | 이메일, 이름·닉네임, 사용자 ID | 계정 관리·앱 기능, 회원 기능 선택 시 |
| App activity | 검색 기록, 앱 상호작용 | 분석, 모바일 별도 선택 동의 |
| App info and performance | 충돌 로그, 진단·성능 | 분석·서비스 안정성, 모바일 별도 선택 동의 |
| Device or other IDs | 자체 생성 무작위 UUID | 분석·신고 중복 방지; 광고 ID 아님 |
| User content | 지원 문의와 첨부파일 | 이용자가 문의를 보낼 때 |
| Location | 수집하지 않음 | 현재 위치 권한·좌표 미수집 |

- 전송 구간 암호화: 예(HTTPS/TLS)
- 데이터 판매: 아니요
- 광고 목적 공유: 아니요
- 계정 삭제: 앱 내부 및 공개 웹 안내 제공
- 사용자가 삭제를 요청할 수 있음: 예

## 6. 심사 메모 권장 내용

- 장소 탐색과 추천은 계정 없이 사용할 수 있습니다.
- 저장·최근 기록 동기화를 원하는 사용자만 소셜 로그인합니다.
- iOS에는 Sign in with Apple이 제공됩니다.
- 계정 삭제 경로는 `내 계정 → 회원탈퇴`이며 앱을 떠나지 않고 시작·완료할 수 있습니다.
- 서비스 개선 데이터는 선택 사항이고 거부해도 기능 차이가 없습니다.
- 현재 위치·사진·연락처·카메라·마이크 권한을 요청하지 않습니다.
- 네이버 예약·지도와 카카오맵은 외부 서비스로 표시됩니다.

## 7. 빌드·품질 확인

```bash
cd mobile
npm ci
npm run typecheck
npm run lint
npm run doctor
npx expo export --platform all
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

- Android 최초 업로드는 내부 테스트의 초안으로 시작합니다.
- 신규 Google Play 개인 계정이면 콘솔에 표시되는 비공개 테스트 인원·기간 요건을 충족한 뒤 프로덕션 접근을 신청합니다.
- iOS는 Apple 멤버십 활성화 후 TestFlight 내부 테스트, 필요 시 외부 테스트 심사를 거칩니다.
- 출시 후보 빌드는 계정 삭제 직후 재로그인 불가, 로컬 데이터 삭제, Apple 연결 해제 결과를 확인합니다.
- 개인정보가 오류 메시지·스크린샷·지원 첨부파일에 불필요하게 남지 않는지 확인합니다.

## 8. Git에 저장하지 않는 비밀 값

- Apple Team ID, 인증서, 프로비저닝 프로파일, App Store Connect API 키
- Android 업로드 키와 Google 서비스 계정 JSON
- OAuth Client Secret, Supabase service role key, TourAPI 서비스키
- APNs·FCM 키

키와 인증서는 EAS Credentials 또는 각 제공자 콘솔의 보안 저장소에서 관리합니다.

## 공식 기준

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [개인정보보호위원회 개인정보 처리방침 작성지침(2026.4)](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030000&nttId=12018)
- [TourAPI 4.0 공공데이터 상세](https://www.data.go.kr/data/15101578/openapi.do)
- [Open-Meteo licence](https://open-meteo.com/en/licence)
