import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const places = [
  {
    id: 1,
    category: "\uB9DB\uC9D1",
    location: "\uC11C\uC6B8 \uC131\uB3D9\uAD6C",
    title: "\uC131\uC218\uB3D9 \uBD84\uC704\uAE30 \uC88B\uC740 \uD30C\uC2A4\uD0C0 \uB9DB\uC9D1",
    description: "\uB370\uC774\uD2B8\uC640 \uBAA8\uC784\uC5D0 \uC798 \uC5B4\uC6B8\uB9AC\uB294 \uC774\uD0C8\uB9AC\uC548 \uB808\uC2A4\uD1A0\uB791",
    icon: "\uD83C\uDF5D",
    baseRating: 4.9,
    baseReviews: 1284,
  },
  {
    id: 2,
    category: "\uCE74\uD398",
    location: "\uBD80\uC0B0 \uD574\uC6B4\uB300\uAD6C",
    title: "\uD574\uC6B4\uB300 \uC624\uC158\uBDF0 \uB8E8\uD504\uD0D1 \uCE74\uD398",
    description: "\uBC14\uB2E4\uC640 \uB178\uC744\uC744 \uBC14\uB77C\uBCF4\uBA70 \uC5EC\uC720\uB97C \uC990\uAE38 \uC218 \uC788\uB294 \uCE74\uD398",
    icon: "\u2615",
    baseRating: 4.8,
    baseReviews: 932,
  },
  {
    id: 3,
    category: "\uC5EC\uD589\uC9C0",
    location: "\uC81C\uC8FC \uC81C\uC8FC\uC2DC",
    title: "\uC560\uC6D4 \uD574\uC548\uB3C4\uB85C \uB4DC\uB77C\uC774\uBE0C",
    description: "\uC81C\uC8FC \uBC14\uB2E4\uC640 \uAC10\uC131 \uCE74\uD398\uB97C \uD568\uAED8 \uC990\uAE30\uB294 \uB4DC\uB77C\uC774\uBE0C \uCF54\uC2A4",
    icon: "\uD83D\uDE97",
    baseRating: 4.9,
    baseReviews: 2108,
  },
  {
    id: 4,
    category: "\uCD95\uC81C",
    location: "\uACBD\uAE30 \uC218\uC6D0\uC2DC",
    title: "\uC218\uC6D0\uD654\uC131 \uC57C\uAC04 \uBB38\uD654\uCD95\uC81C",
    description: "\uC57C\uACBD\uACFC \uC804\uD1B5\uBB38\uD654\uB97C \uD568\uAED8 \uACBD\uD5D8\uD560 \uC218 \uC788\uB294 \uC9C0\uC5ED \uCD95\uC81C",
    icon: "\uD83C\uDF86",
    baseRating: 4.7,
    baseReviews: 764,
  },
  {
    id: 5,
    category: "\uB370\uC774\uD2B8",
    location: "\uC11C\uC6B8 \uC601\uB4F1\uD3EC\uAD6C",
    title: "\uD55C\uAC15 \uB178\uC744 \uB370\uC774\uD2B8 \uCF54\uC2A4",
    description: "\uC0B0\uCC45\uBD80\uD130 \uC57C\uACBD\uAE4C\uC9C0 \uC774\uC5B4\uC9C0\uB294 \uB370\uC774\uD2B8 \uCF54\uC2A4",
    icon: "\uD83C\uDF09",
    baseRating: 4.8,
    baseReviews: 1542,
  },
];

function stableRandom(block: number, id: number) {
  const value = Math.sin(block * 83 + id * 47) * 10000;
  return value - Math.floor(value);
}

export async function GET() {
  const block = Math.floor(Date.now() / 30000);

  const rankedPlaces = places
    .map((place) => {
      const newReviews = Math.floor(stableRandom(block, place.id) * 35);
      const ratingChange = (stableRandom(block + 2, place.id) - 0.5) * 0.08;

      const rating = Math.min(
        5,
        Math.max(1, place.baseRating + ratingChange),
      );

      const reviewCount = place.baseReviews + newReviews;

      const reviewGrowthScore = newReviews * 2.5;
      const ratingScore = rating * 30;
      const volumeScore = Math.log10(reviewCount + 1) * 25;

      return {
        ...place,
        rating: Number(rating.toFixed(1)),
        reviewCount,
        newReviews,
        popularityScore:
          reviewGrowthScore + ratingScore + volumeScore,
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 4)
    .map((place, index) => ({
      ...place,
      rank: index + 1,
    }));

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      places: rankedPlaces,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
