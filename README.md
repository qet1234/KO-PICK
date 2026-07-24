# KO-PICK

지역별 음식·카페·축제·관광지를 탐색하고 개인·커플·친구·가족이 함께 장소와 일정을 계획하는 전국 추천 플랫폼입니다.

## 운영 구조

```text
사용자
  ↓
Vercel · Next.js 16 / React 19 / TypeScript
  ↓
Supabase Auth · PostgreSQL · RLS · RPC · Edge Functions
  ↓
한국관광공사 TourAPI · Kakao Local
```

Render와 Spring Boot는 운영 요청 경로에서 제거했습니다.
기존 `backend/`와 `frontend/` 폴더는 최종 전환이 검증될 때까지 복구 참고용으로만 남아 있으며 Vercel이나 Supabase에서 실행되지 않습니다.

## Supabase가 담당하는 기능

- Google·Kakao·Naver 소셜 로그인과 세션 갱신
- 회원탈퇴와 사용자 데이터 연쇄 삭제
- 개인·커플·친구·가족 공간
- 24시간 유효한 1회용 초대 코드
- 구성원 전용 공동 달력과 기념일
- 함께 예약 계획, 후보 등록, 투표, 최종 확정
- 사용자별 접근 제한을 위한 PostgreSQL RLS
- TourAPI와 Kakao Local을 호출하는 Edge Function
- 인기 장소·검색어 활동 기록과 집계

## 주요 경로

```text
app/                                  Next.js 화면과 OAuth callback
components/                           홈·탐색·공간·예약 UI
utils/supabase/                       브라우저·서버 Supabase 클라이언트
utils/spring-api.ts                   기존 UI 호환용 Supabase 호출 계층
supabase/migrations/                  DB 스키마, RLS, RPC
supabase/functions/kopick-api/        TourAPI·Kakao·인기·회원탈퇴 API
supabase/functions/naver-userinfo/    네이버 UserInfo 표준화 어댑터
proxy.ts                              Supabase SSR 세션 갱신
```

`utils/spring-api.ts`는 파일 이름만 호환을 위해 유지합니다. 내부에서 Spring 또는 Render를 호출하지 않습니다.

## 로컬 실행

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

필수 공개 환경변수:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
NEXT_PUBLIC_KAKAO_MAP_KEY=<KAKAO_JAVASCRIPT_KEY>
```

## Supabase 배포

```powershell
npx --yes supabase@2.75.0 login
npx --yes supabase@2.75.0 link --project-ref <PROJECT_REF>
npm run supabase:db:push
npx --yes supabase@2.75.0 secrets set --env-file supabase/.env.production
npx --yes supabase@2.75.0 functions deploy kopick-api --no-verify-jwt
npx --yes supabase@2.75.0 functions deploy naver-userinfo --no-verify-jwt
```

전체 운영 전환, OAuth 공급자 설정, Render 데이터 백업과 사용자 UUID 매핑 절차는 [`docs/supabase-cutover.md`](docs/supabase-cutover.md)를 따릅니다.

## 인증

- Google: Supabase 기본 OAuth Provider
- Kakao: Supabase 기본 OAuth Provider
- Naver: `custom:naver` OAuth Provider + `naver-userinfo` Edge Function
- Callback 화면: `/auth/callback`
- 세션: Supabase SSR 쿠키와 `proxy.ts`에서 자동 갱신

## 데이터 보안

공간, 구성원, 달력, 기념일, 예약 계획, 후보, 투표 테이블은 RLS를 사용합니다.
브라우저는 초대 코드 해시나 초대 시도 로그를 직접 조회할 수 없으며, 초대·탈퇴·예약 상태 변경은 `security definer` RPC에서 로그인 사용자와 공간 권한을 다시 검사합니다.

## 함께 공간

- 개인 공간은 로그인 후 첫 조회 때 자동 생성됩니다.
- 커플 공간은 최대 2명입니다.
- 친구·가족 공간은 최대 20명입니다.
- 초대 코드는 128비트 임의값을 32자리 16진수로 전달하고 DB에는 SHA-256 해시만 저장합니다.
- 초대 코드는 24시간 동안 한 번만 사용할 수 있습니다.
- 계정당 15분 동안 10회 실패하면 잠시 제한합니다.

기존 `/couple` 주소는 통합된 `/spaces`로 이동합니다.

## 함께 예약

- 공간 구성원이 최대 20개의 장소 후보를 추가할 수 있습니다.
- 구성원은 후보별로 투표할 수 있습니다.
- 계획 생성자만 최종 장소와 예약 상태를 변경합니다.
- 최종 장소는 공동 달력에 자동 저장됩니다.
- 외부 예약 링크를 열었다는 이유만으로 예약 확정 처리하지 않습니다.

## 장소 조회

`kopick-api` Edge Function이 TourAPI를 서버에서 호출해 인증키를 브라우저에 노출하지 않습니다.
음식·카페·축제·관광지, 시·도와 시·군·구, 세부 유형을 처리하며 카페 프랜차이즈 결과가 부족할 때 Kakao Local을 보완 데이터로 사용합니다.

## 검증

```powershell
npm run typecheck
npm run build
```

GitHub Actions는 Next.js 타입 검사·빌드와 두 Supabase Edge Function의 Deno 검사를 수행합니다.
