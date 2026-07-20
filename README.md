# KO-PICK

지역별 음식·카페·축제·관광지를 탐색하고 커플 전용 공간을 제공하는 전국 추천 플랫폼입니다.

## 전환된 구조

```text
React 19 + TypeScript + Vite
             ↓ REST API
Spring Boot + Spring Security
             ↓
PostgreSQL
```

- 웹 로그인은 Spring Security 세션(`KOPICK_SESSION`)으로 유지합니다.
- 로그인 완료 후 `/api/auth/token`에서 API용 JWT Access/Refresh Token을 발급합니다.
- 세션과 Refresh Token은 PostgreSQL에 저장하며 Redis는 사용하지 않습니다.
- Google·Kakao·Naver OAuth2 로그인과 계정·커플 공간 API를 Spring Boot가 담당합니다.
- TourAPI 장소 조회와 실시간 인기 장소·검색어 API도 Spring Boot로 이전했습니다.
- 기존 Next.js 코드는 전환 검증과 복구를 위해 당분간 루트에 남겨두며, 실제 신규 프론트 빌드는 `frontend`가 담당합니다.

## 로컬 실행

프론트엔드:

```bash
cd frontend
npm ci
npm run dev
```

백엔드:

```bash
cd backend
./mvnw spring-boot:run
```

Windows PowerShell에서는 `./mvnw.cmd spring-boot:run`을 사용합니다. 환경변수는 각 폴더의 `.env.example`을 참고해 등록합니다. PostgreSQL을 로컬에서 실행하려면 `backend/compose.yaml`을 사용할 수 있습니다.

## OAuth 콜백 주소

운영 백엔드가 `https://api.koreapick.duckdns.org`라면 다음 주소를 각 개발자 콘솔에 등록합니다.

```text
https://api.koreapick.duckdns.org/login/oauth2/code/google
https://api.koreapick.duckdns.org/login/oauth2/code/kakao
https://api.koreapick.duckdns.org/login/oauth2/code/naver
```

## 기존 Next.js 실행

전환 검증 중 기존 화면을 비교해야 할 때만 아래 명령을 사용합니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 실시간 인기 추천 설정

홈의 인기 카드는 TourAPI 실제 장소를 기본 데이터로 사용하고, 사용자의 장소 상세보기,
카카오맵 이동, 찜 활동을 Supabase 점수에 반영합니다. 점수는 오래된 활동이 자연스럽게
낮아지도록 72시간 반감기를 적용합니다.

1. Supabase SQL Editor에서
   `supabase/migrations/20260718_realtime_trending_places.sql`을 실행합니다.
2. Vercel 환경변수에 기존 Supabase 및 TourAPI 키가 등록되어 있는지 확인합니다.
3. Supabase Realtime의 `trending_place_scores` 테이블이 활성화됐는지 확인합니다.

점수 가중치는 조회 1점, 상세보기 2점, 지도 이동 3점, 찜 5점입니다. 데이터베이스가
아직 준비되지 않았을 때도 TourAPI와 안전한 기본 카드로 화면이 유지됩니다. 동일한
브라우저의 같은 장소·행동은 15분에 한 번만 반영해 단순 중복 클릭을 줄입니다.

## 커플 전용 공간 설정

`/couple`은 로그인한 두 사용자만 공유하는 비공개 기념일·달력 공간입니다.

1. Supabase SQL Editor에서
   `supabase/migrations/20260719090000_private_couple_space.sql`을 실행합니다.
2. 한 사용자가 커플 공간을 만들고 24시간 유효한 1회용 초대 코드를 전달합니다.
3. 상대방이 자신의 계정으로 로그인한 후 초대 코드를 입력합니다.

커플, 멤버, 기념일, 일정 테이블에는 RLS가 적용됩니다. 연결된 두 계정만 데이터를
읽고 수정할 수 있으며, 초대 코드는 해시로 저장되고 한 번 사용하면 폐기됩니다.

## 네이버 로그인 설정

네이버는 Supabase 기본 OAuth 제공자가 아니므로 KO-PICK 서버가 네이버 인증 결과를
검증한 뒤 Supabase 세션으로 안전하게 변환합니다.

1. 네이버 개발자 센터에서 애플리케이션을 만들고 `네이버 로그인` API를 추가합니다.
2. 서비스 URL은 `https://koreapick.duckdns.org`, Callback URL은
   `https://koreapick.duckdns.org/auth/naver/callback`으로 등록합니다.
3. 제공 정보에서 회원이름 또는 별명과 프로필 이미지를 선택합니다. 이메일은 선택
   동의를 사용할 수 있으며, 없어도 로그인은 가능합니다.
4. Vercel Production 환경변수에 아래 값을 추가한 뒤 다시 배포합니다.

```dotenv
NAVER_CLIENT_ID=네이버_애플리케이션_Client_ID
NAVER_CLIENT_SECRET=네이버_애플리케이션_Client_Secret
```

기존 `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`도 필요합니다.
`SUPABASE_SERVICE_ROLE_KEY`와 `NAVER_CLIENT_SECRET`은 서버 전용이며
`NEXT_PUBLIC_` 접두사를 붙이면 안 됩니다.
