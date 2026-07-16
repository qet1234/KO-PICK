import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const keywords = [
  { id: 1, keyword: "\uC11C\uC6B8 \uB370\uC774\uD2B8", base: 1620 },
  { id: 2, keyword: "\uBD80\uC0B0 \uC5EC\uD589", base: 1510 },
  { id: 3, keyword: "\uC81C\uC8FC \uCE74\uD398", base: 1430 },
  { id: 4, keyword: "\uBE44 \uC624\uB294 \uB0A0", base: 1360 },
  { id: 5, keyword: "\uC218\uC6D0 \uB370\uC774\uD2B8", base: 1280 },
  { id: 6, keyword: "\uAC15\uB989 \uC624\uC158\uBDF0", base: 1190 },
  { id: 7, keyword: "\uC778\uCC9C \uB4DC\uB77C\uC774\uBE0C", base: 1100 },
  { id: 8, keyword: "\uC804\uC8FC \uB9DB\uC9D1", base: 1010 },
];

function randomForBlock(block: number, id: number) {
  const value = Math.sin(block * 97 + id * 31) * 10000;
  return value - Math.floor(value);
}

function createRanking(block: number) {
  return keywords
    .map((item) => {
      const variation = Math.floor(randomForBlock(block, item.id) * 500) - 180;

      return {
        ...item,
        searchCount: Math.max(1, item.base + variation),
      };
    })
    .sort((a, b) => b.searchCount - a.searchCount);
}

export async function GET() {
  const currentBlock = Math.floor(Date.now() / 30000);
  const current = createRanking(currentBlock);
  const previous = createRanking(currentBlock - 1);

  const previousRanks = new Map(
    previous.map((item, index) => [item.id, index + 1]),
  );

  const data = current.slice(0, 5).map((item, index) => {
    const rank = index + 1;
    const oldRank = previousRanks.get(item.id) ?? null;
    const previousRank = oldRank !== null && oldRank <= 5 ? oldRank : null;

    let trend: "up" | "down" | "same" | "new" = "same";
    let change = 0;

    if (previousRank === null) {
      trend = "new";
    } else if (previousRank > rank) {
      trend = "up";
      change = previousRank - rank;
    } else if (previousRank < rank) {
      trend = "down";
      change = rank - previousRank;
    }

    return {
      id: item.id,
      keyword: item.keyword,
      rank,
      previousRank,
      trend,
      change,
      searchCount: item.searchCount,
    };
  });

  return NextResponse.json(
    {
      updatedAt: new Date().toISOString(),
      keywords: data,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
