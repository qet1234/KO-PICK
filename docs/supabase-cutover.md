# KO-PICK Supabase 전환 실행서

이 문서는 기존 Vercel + Render Spring Boot + Render PostgreSQL 구성을
Vercel + Supabase Auth/Postgres/RLS/Edge Functions 구성으로 전환하는 절차입니다.

## 1. 전환 원칙

- `main`에는 Supabase 원격 프로젝트에서 기능 검증을 마친 뒤 병합합니다.
- 기존 Render DB는 최종 검증이 끝날 때까지 삭제하지 않습니다.
- 전환 당일에는 기존 서비스의 쓰기를 잠시 멈춰 데이터가 두 곳으로 갈라지지 않게 합니다.
- OAuth Client Secret, Supabase Service Role Key, TourAPI 키는 GitHub나 Vercel의 공개 환경변수에 넣지 않습니다.

## 2. Supabase 프로젝트 연결

```powershell
npx --yes supabase@2.75.0 login
npx --yes supabase@2.75.0 link --project-ref <SUPABASE_PROJECT_REF>
```

기존 Supabase 프로젝트에 Dashboard에서 만든 테이블이 있다면 먼저 원격 스키마를 가져옵니다.

```powershell
npx --yes supabase@2.75.0 db pull
npx --yes supabase@2.75.0 db reset
```

새 프로젝트라면 바로 마이그레이션을 적용합니다.

```powershell
npx --yes supabase@2.75.0 db push
```

적용 대상의 핵심 파일은 다음과 같습니다.

- `supabase/migrations/20260724130000_complete_supabase_platform.sql`
- `supabase/functions/kopick-api/index.ts`
- `supabase/functions/naver-userinfo/index.ts`

## 3. Edge Function 비밀값 등록

루트에 커밋하지 않는 `supabase/.env.production` 파일을 만듭니다.

```dotenv
TOUR_API_SERVICE_KEY=한국관광공사_인증키
TOUR_API_MOBILE_APP=KoreaPick
KAKAO_REST_API_KEY=카카오_REST_API_키
```

등록하고 확인합니다.

```powershell
npx --yes supabase@2.75.0 secrets set --env-file supabase/.env.production
npx --yes supabase@2.75.0 secrets list
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 배포된 Edge Function에 Supabase가 제공합니다.

## 4. Edge Function 배포

```powershell
npx --yes supabase@2.75.0 functions deploy kopick-api --no-verify-jwt
npx --yes supabase@2.75.0 functions deploy naver-userinfo --no-verify-jwt
```

상태 확인 주소:

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/kopick-api/actuator/health
```

예상 응답:

```json
{"status":"UP","runtime":"supabase-edge"}
```

## 5. Supabase Auth 설정

### URL Configuration

Supabase Dashboard → Authentication → URL Configuration에서 다음을 등록합니다.

```text
Site URL
https://koreapick.duckdns.org

Redirect URLs
https://koreapick.duckdns.org/auth/callback
http://localhost:3000/auth/callback
```

Vercel Preview를 로그인 테스트에 사용할 때는 필요한 Preview Callback URL만 별도로 추가합니다.

### Google

Supabase Dashboard → Authentication → Providers → Google에서 Client ID와 Client Secret을 등록합니다.
Google 개발자 콘솔의 승인된 리디렉션 URI에는 Supabase 화면에 표시되는 Callback URL을 넣습니다.

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

### Kakao

Supabase Dashboard → Authentication → Providers → Kakao에서 REST API Key와 Client Secret을 등록합니다.
카카오 개발자 콘솔의 Redirect URI에는 Supabase Callback URL을 넣습니다.

```text
https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

### Naver

Supabase Dashboard → Authentication → Providers → Custom Providers → New Provider에서 OAuth2 방식으로 만듭니다.

```text
Identifier: custom:naver
Authorization URL: https://nid.naver.com/oauth2.0/authorize
Token URL: https://nid.naver.com/oauth2.0/token
UserInfo URL: https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/naver-userinfo
Client ID: 네이버 Client ID
Client Secret: 네이버 Client Secret
Email optional: enabled
PKCE enabled: disabled
```

네이버 개발자 센터 Callback URL에는 Custom Provider 생성 화면에 표시되는 Supabase Callback URL을 정확히 등록합니다.
네이버의 중첩된 회원 정보 응답은 `naver-userinfo` Edge Function이 `sub`, `email`, `name`, `picture` 형태로 변환합니다.

## 6. Vercel 환경변수

Vercel 프로젝트의 Production, Preview, Development 범위에 필요한 값만 등록합니다.

```dotenv
NEXT_PUBLIC_APP_URL=https://koreapick.duckdns.org
NEXT_PUBLIC_SUPABASE_URL=https://<SUPABASE_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
NEXT_PUBLIC_KAKAO_MAP_KEY=<KAKAO_JAVASCRIPT_KEY>
```

다음 Render/Spring 환경변수는 Supabase 전환 후 Vercel에서 제거합니다.

```text
NEXT_PUBLIC_SPRING_API_URL
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
JWT_ISSUER
JWT_ACCESS_TTL
JWT_REFRESH_TTL
```

## 7. 기존 Render PostgreSQL 데이터

### 중요한 제한

기존 `app_users.id`와 Supabase `auth.users.id`는 서로 다른 UUID입니다.
기존 테이블을 그대로 복원하면 공간·예약의 사용자 외래키가 잘못 연결됩니다.
따라서 사용자 ID 매핑 없이 전체 dump를 새 스키마 위에 바로 복원하면 안 됩니다.

### 권장 절차

1. Supabase Auth 설정을 먼저 완료합니다.
2. 기존 사용자가 Google·Kakao·Naver로 한 번 로그인하도록 전환 안내 기간을 둡니다.
3. Render의 `app_users`와 Supabase의 `auth.users`를 공급자 ID 또는 이메일로 대응시켜 `legacy_user_map`을 작성합니다.
4. 사용자 매핑이 완료된 뒤 공간·구성원·달력·기념일·예약·투표 데이터를 새 UUID로 변환해 가져옵니다.
5. 행 수와 대표 사용자 데이터를 비교합니다.

Render DB 백업 예시:

```powershell
$env:OLD_DB_URL="postgresql://..."
pg_dump $env:OLD_DB_URL `
  --format=custom `
  --no-owner `
  --no-privileges `
  --file migration-data/kopick-render.backup
```

사용자 매핑 확인용 내보내기 예시:

```powershell
psql $env:OLD_DB_URL -c "\copy (select id, provider, provider_user_id, email, display_name from public.app_users order by created_at) to 'migration-data/app_users.csv' csv header"
```

새 Supabase DB의 사용자 확인:

```sql
select
  u.id,
  u.email,
  u.raw_app_meta_data ->> 'provider' as provider,
  i.provider_id
from auth.users u
left join auth.identities i on i.user_id = u.id
order by u.created_at;
```

매핑 테이블 예시:

```sql
create temporary table legacy_user_map (
  old_user_id uuid primary key,
  new_user_id uuid not null references auth.users(id)
);
```

실제 데이터 변환은 원본 백업의 테이블·행 수와 매핑 결과를 확인한 뒤 실행합니다. 매핑되지 않은 사용자가 한 명이라도 있으면 해당 사용자의 공간 데이터를 삭제하지 말고 보류합니다.

## 8. 검증 체크리스트

- 비로그인 상태에서 홈과 장소 탐색이 열림
- Google 로그인 및 로그아웃
- Kakao 로그인 및 로그아웃
- Naver 로그인 및 로그아웃
- 로그인 버튼 클릭 시 Render 로딩 화면이 나타나지 않음
- 개인 공간 자동 생성
- 커플 공간 2명 제한
- 친구·가족 공간 초대와 탈퇴
- 초대 코드 24시간 만료 및 1회 사용
- 예약 계획 생성, 후보 추가, 투표, 최종 장소 확정
- 최종 장소가 공동 달력에 저장됨
- TourAPI 지역·카테고리·세부 필터
- 카페 프랜차이즈 Kakao Local 보완
- 예약 가능 장소 필터
- 실시간 인기 장소·검색어 기록
- 회원탈퇴 후 Supabase Auth 사용자와 연결 데이터 삭제
- 모바일 Safari OAuth 왕복

## 9. 최종 전환

모든 검증을 통과한 뒤에만 다음 순서로 마무리합니다.

1. migration PR을 `main`에 병합합니다.
2. Vercel Production 배포를 확인합니다.
3. 24시간 동안 Supabase 로그와 오류율을 확인합니다.
4. Render `kopick-api`의 자동 배포를 중지합니다.
5. Render DB를 백업한 뒤 읽기 전용 또는 보관 상태로 둡니다.
6. 충분한 복구 기간 후 Render 서비스와 DB를 삭제합니다.

Render를 먼저 삭제하면 누락된 사용자 데이터와 기능을 복구하기 어려우므로 마지막 단계에서만 제거합니다.
