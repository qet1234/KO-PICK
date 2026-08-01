import FastCategoryExplorePage from "@/components/FastCategoryExplorePage";
import CoupleSafeExplorePage from "@/components/CoupleSafeExplorePage";
import "./explore.css";
import "./journey-explore.css";
import "./couple-safe.css";

const allowedCategories = [
  "전체",
  "음식",
  "카페",
  "축제",
  "관광지",
] as const;

type AllowedCategory = (typeof allowedCategories)[number];

const categoryAliases: Record<string, AllowedCategory> = {
  맛집: "음식",
  여행지: "관광지",
  문화: "관광지",
};

interface ExplorePageProps {
  searchParams: Promise<{
    category?: string | string[];
    detail?: string | string[];
    journey?: string | string[];
  }>;
}

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ExplorePage({
  searchParams,
}: ExplorePageProps) {
  const params = await searchParams;
  const rawCategory = firstValue(params.category);
  const normalizedCategory = rawCategory
    ? categoryAliases[rawCategory] ?? rawCategory
    : "전체";

  const initialCategory: AllowedCategory = allowedCategories.includes(
    normalizedCategory as AllowedCategory
  )
    ? (normalizedCategory as AllowedCategory)
    : "전체";
  const initialDetail = firstValue(params.detail) ?? "전체";
  const journey = firstValue(params.journey) ?? "";

  if (journey === "커플") {
    return (
      <CoupleSafeExplorePage
        initialCategory={initialCategory}
        initialDetail={initialDetail}
      />
    );
  }

  return (
    <FastCategoryExplorePage
      initialCategory={initialCategory}
      initialDetail={initialDetail}
      journey={journey}
    />
  );
}
