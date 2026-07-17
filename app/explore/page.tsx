import CategoryExplorePage from "@/components/CategoryExplorePage";
import "./explore.css";

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
  }>;
}

export default async function ExplorePage({
  searchParams,
}: ExplorePageProps) {
  const params = await searchParams;
  const rawCategory = Array.isArray(params.category)
    ? params.category[0]
    : params.category;
  const normalizedCategory = rawCategory
    ? categoryAliases[rawCategory] ?? rawCategory
    : "전체";

  const initialCategory: AllowedCategory = allowedCategories.includes(
    normalizedCategory as AllowedCategory
  )
    ? (normalizedCategory as AllowedCategory)
    : "전체";

  return <CategoryExplorePage initialCategory={initialCategory} />;
}
