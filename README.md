This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
