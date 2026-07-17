import CategoryExplorePage from "@/components/CategoryExplorePage";
import "./explore.css";

const allowedCategories = [
  "전체",
  "맛집",
  "카페",
  "관광지",
  "축제",
  "문화",
] as const;

type AllowedCategory = (typeof allowedCategories)[number];

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

  const initialCategory: AllowedCategory =
    rawCategory &&
    allowedCategories.includes(rawCategory as AllowedCategory)
      ? (rawCategory as AllowedCategory)
      : "전체";

  return <CategoryExplorePage initialCategory={initialCategory} />;
}
