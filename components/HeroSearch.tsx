"use client";

import { FormEvent, useState } from "react";
import { trackKeywordSearch } from "@/utils/trackKeywordSearch";

function categoryFromKeyword(keyword: string) {
  if (keyword.includes("카페")) return "카페";
  if (keyword.includes("음식") || keyword.includes("맛집")) return "음식";
  if (keyword.includes("축제")) return "축제";
  if (keyword.includes("관광") || keyword.includes("여행")) return "관광지";
  return "전체";
}

export default function HeroSearch() {
  const [query, setQuery] = useState("");

  const moveToExplore = (keyword: string) => {
    const normalized = keyword.replace(/\s+/g, " ").trim();
    if (normalized.length < 2) return;

    void trackKeywordSearch(normalized, "search");
    const params = new URLSearchParams({
      category: categoryFromKeyword(normalized),
      keyword: normalized,
    });
    window.location.assign(`/explore?${params.toString()}`);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    moveToExplore(query);
  };

  return (
    <form className="kp-search" onSubmit={submitSearch}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="장소, 지역 또는 카테고리를 검색하세요"
        aria-label="장소 검색어"
      />
      <button type="submit">검색</button>
    </form>
  );
}
