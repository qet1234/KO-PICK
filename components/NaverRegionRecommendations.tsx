import NaverMapPanel from "@/components/NaverMapPanel";

type NaverLocalItem = {
  title?: string;
  category?: string;
  description?: string;
  telephone?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
};

type Recommendation = {
  id: string;
  name: string;
  category: string;
  address: string;
  telephone: string;
  mapUrl: string;
  mapx: string;
  mapy: string;
};

const regions = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"] as const;
const categories = ["전체","맛집","카페","축제","관광지"] as const;
const categoryKeywords: Record<string,string> = { 전체:"가볼만한 곳", 맛집:"맛집", 카페:"카페", 축제:"축제 행사", 관광지:"관광지 명소" };

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

async function searchNaver(query:string): Promise<NaverLocalItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const url = new URL("https://openapi.naver.com/v1/search/local.json");
    url.searchParams.set("query", query);
    url.searchParams.set("display", "5");
    url.searchParams.set("sort", "comment");
    const response = await fetch(url, {
      headers: { "X-Naver-Client-Id":clientId, "X-Naver-Client-Secret":clientSecret },
      cache:"no-store",
      signal:controller.signal,
    });
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return [];
    const payload = await response.json() as {items?:NaverLocalItem[]};
    return payload.items || [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function recommendations(region:string, category:string): Promise<Recommendation[]> {
  const keyword = categoryKeywords[category] || categoryKeywords.전체;
  const responses = await Promise.all([searchNaver(`${region} ${keyword}`), searchNaver(`${region} 인기 ${keyword}`)]);
  const seen = new Set<string>();
  return responses.flat().flatMap(item => {
    const name = stripHtml(item.title);
    const address = stripHtml(item.roadAddress) || stripHtml(item.address);
    const id = `${name}|${address}`;
    if (!name || !address || seen.has(id)) return [];
    seen.add(id);
    return [{
      id,
      name,
      category:stripHtml(item.category) || category,
      address,
      telephone:stripHtml(item.telephone),
      mapUrl:`https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`,
      mapx:item.mapx || "",
      mapy:item.mapy || "",
    }];
  }).slice(0,8);
}

export default async function NaverRegionRecommendations({region="서울",category="전체"}:{region?:string;category?:string}) {
  const safeRegion = regions.includes(region as typeof regions[number]) ? region : "서울";
  const safeCategory = categories.includes(category as typeof categories[number]) ? category : "전체";
  const items = await recommendations(safeRegion,safeCategory);
  const keyword = safeCategory === "전체" ? "가볼만한 곳" : safeCategory;
  const mapAllUrl = `https://map.naver.com/p/search/${encodeURIComponent(`${safeRegion} ${keyword}`)}`;
  const mapClientId = process.env.NAVER_MAP_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || "";

  return <section className="kp-naver-recommendations" aria-labelledby="naver-recommend-title">
    <div className="kp-naver-heading"><div><p className="kp-overline">NAVER LOCAL LIVE</p><h2 id="naver-recommend-title">지역별 실시간 추천 지도</h2><p>선택한 지역의 네이버 검색 결과를 지도와 추천 리스트로 함께 확인하세요.</p></div><a href={mapAllUrl} target="_blank" rel="noreferrer">네이버 지도 전체보기 ↗</a></div>
    <form className="kp-naver-controls" action="/" method="get">
      <label><span>지역</span><select name="region" defaultValue={safeRegion}>{regions.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
      <input type="hidden" name="category" value={safeCategory}/>
      <button className="kp-naver-region-submit" type="submit">지역 적용</button>
      <div className="kp-naver-category-filter">{categories.map(value=><a key={value} className={safeCategory===value?"is-active":""} href={`/?region=${encodeURIComponent(safeRegion)}&category=${encodeURIComponent(value)}#regions`}>{value}</a>)}</div>
    </form>
    <div className="kp-naver-status"><strong>{safeRegion} · {safeCategory}</strong><span>{items.length > 0 ? `${items.length}개 장소 표시` : "지역 중심 지도 표시"}</span></div>
    <NaverMapPanel clientId={mapClientId} region={safeRegion} items={items} mapAllUrl={mapAllUrl} />
    {items.length > 0 && <div className="kp-naver-list">{items.map((item,index)=><article className="kp-naver-place" key={item.id}><span className="kp-naver-rank">{String(index+1).padStart(2,"0")}</span><div className="kp-naver-place-body"><small>{item.category}</small><h3>{item.name}</h3><p>{item.address}</p>{item.telephone&&<span>{item.telephone}</span>}</div><a href={item.mapUrl} target="_blank" rel="noreferrer">지도에서 보기 ↗</a></article>)}</div>}
  </section>;
}
