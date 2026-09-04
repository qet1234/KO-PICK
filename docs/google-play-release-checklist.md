# 오늘어디 Google Play 출시 체크리스트

기준일: 2026-09-04

현재 출시 대상은 Android / Google Play만 포함합니다. iOS / TestFlight / App Store 출시는 보류 상태이며 iOS 소스 코드는 향후 재개를 위해 유지합니다.

## Android 고정 값

- 앱 이름: 오늘어디
- Android Application ID: `com.koreapick.app`
- 배포 형식: Android App Bundle (`.aab`)
- EAS build profile: `production`
- EAS channel: `production`
- 배포 채널: Google Play 전용(외부 APK 배포 없음)
- compileSdkVersion: 36
- targetSdkVersion: 36
- 버전 관리는 EAS remote autoIncrement 사용
- Android backup: 비활성화
- Release minify: 활성화
- Release resource shrinking: 활성화

## Google Play 제출 전 자동 검사

GitHub Actions의 `Mobile Android release` 워크플로가 다음 항목을 검사합니다.

- Expo 토큰 존재 여부
- npm 의존성 설치
- Android 런처 아이콘의 실제 PNG 시그니처
- 손상된 아이콘 발견 시 마지막 정상 Android 아이콘으로 빌드 입력 자동 복구
- TypeScript typecheck
- Expo Doctor
- Expo public config 생성
- compileSdkVersion 36 / targetSdkVersion 36 확인
- EAS production profile로 Android AAB 생성
- EAS build cache 초기화 후 빌드

## Play 정책 대응 상태

- [x] Android App Bundle(AAB) 배포 설정
- [x] 외부 APK 다운로드 API·페이지·자동 빌드 중단
- [x] API 36 타겟 설정
- [x] 앱 내부 개인정보처리방침 링크
- [x] 공개 개인정보처리방침 URL
- [x] 앱 내부 회원탈퇴 기능
- [x] 외부 계정삭제 안내 URL
- [x] 이용약관 및 고객지원 링크
- [x] 불필요한 Android 저장소/오버레이 권한 차단
- [x] 사용자 데이터 분석 동의/철회 UI
- [ ] Production AAB 최종 빌드 성공 확인
- [ ] Play Console 앱 콘텐츠 / 데이터 보안 입력 최종 확인
- [ ] Play Console 개인정보처리방침 URL 입력
- [ ] Play Console 계정 삭제 URL 입력
- [ ] Play App Signing 확인
- [ ] Google Play 개발자 신원 확인 상태 확인
- [ ] Android 개발자 인증에서 `com.koreapick.app` 패키지 등록 완료 확인
- [ ] 실제 Android 기기에서 Google/카카오/네이버 로그인 확인
- [ ] 실제 Android 기기에서 네이버 지도/길찾기/예약 외부 연결 확인
- [ ] 실제 Android 기기에서 회원탈퇴 후 계정 및 로컬 데이터 삭제 확인
- [ ] 내부 테스트 또는 비공개 테스트 트랙 검증

## iOS 보류 정책

- iOS TestFlight GitHub Actions 워크플로 제거
- EAS `testflight` build/submit profile 제거
- Android 출시에는 iOS 빌드나 Apple Developer 멤버십을 요구하지 않음
- iOS 앱 소스와 Bundle ID 설정은 향후 재개를 위해 유지

## 출시 판정

Production AAB 생성 성공 + Play Console 필수 정책 항목 입력 + 실제 Android 기기 핵심 흐름 검증이 모두 끝나면 Google Play 제출 가능 상태로 판정합니다.
