# 오늘어디 Google Play 출시 준수 체크리스트

기준일: 2026-09-05

## 앱 고정 값

| 항목 | 값 |
|---|---|
| 앱 이름 | 오늘어디 |
| Android Application ID | `com.koreapick.app` |
| 딥링크 | `kopick://` |
| 사용자 버전 | `1.0.0` |
| 배포 형식 | AAB |

## 코드·정책 상태

| 항목 | 상태 |
|---|---|
| 비회원 장소 탐색·추천 | 반영 |
| 필수 약관·개인정보·만 14세 동의 | 반영 |
| Google·카카오·네이버 로그인 | 반영 |
| 앱 내부 회원탈퇴와 로컬 데이터 삭제 | 반영 |
| 서비스 개선 데이터 선택 동의·철회 | 반영 |
| 위치·사진·카메라·마이크 권한 미요청 | 반영 |
| 개인정보·약관·출처·삭제·지원 페이지 | 반영 |
| Google Play AAB 전용 배포 | 반영 |

## 외부 확인

- [ ] Play Console 개발자 신원 확인
- [ ] Android 개발자 인증에서 `com.koreapick.app` 등록 상태 확인
- [ ] Play App Signing 확인
- [ ] 개인정보처리방침과 계정 삭제 URL 등록
- [ ] 앱 콘텐츠와 데이터 보안 입력
- [ ] 실제 기기 로그인·지도·회원탈퇴 검증
- [ ] 내부 또는 비공개 테스트 완료

## 빌드

```bash
cd mobile
npm ci
npm run typecheck
npm run lint
npm run doctor
npx expo export --platform android
npx eas-cli build --platform android --profile production
```

Android 업로드 키, Google 서비스 계정, OAuth Client Secret, Supabase service role key,
TourAPI 서비스키와 푸시 자격증명은 Git에 저장하지 않습니다.
