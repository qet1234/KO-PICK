"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { id:string; name:string; category:string; address:string; telephone?:string; mapUrl:string };
type Payload = { items?:Item[]; updatedAt?:string; error?:string };

const regions = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"] as const;
const categories = ["전체","맛집","카페","축제","관광지"] as const;

async function parseResponse(response: Response): Promise<Payload> {
  const type = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!type.includes("application/json")) throw new Error("추천 서버 연결을 확인하고 있습니다. 잠시 후 다시 시도해 주세요.");
  try { return JSON.parse(text) as Payload; }
  catch { throw new Error("추천 데이터를 읽지 못했습니다. 잠시 후 다시 시도해 주세요."); }
}

export default function NaverRegionRecommendations({ apiOrigin = "" }: { apiOrigin?: string }) {
  const [region,setRegion] = useState<(typeof regions)[number]>("서울");
  const [category,setCategory] = useState<(typeof categories)[number]>("전체");
  const [items,setItems] = useState<Item[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [updatedAt,setUpdatedAt] = useState<Date|null>(null);
  const [retry,setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const qs = new URLSearchParams({region,category,t:String(Date.now())});
        const base = apiOrigin.replace(/\/$/, "");
        const endpoint = `${base}/local-data/region-recommendations?${qs}`;
        const response = await fetch(endpoint, {cache:"no-store",headers:{Accept:"application/json"},signal:controller.signal,mode:"cors"});
        const payload = await parseResponse(response);
        if (!response.ok) throw new Error(payload.error || "추천 장소를 불러오지 못했습니다.");
        if (!payload.items?.length) throw new Error("선택한 조건의 장소를 찾지 못했습니다.");
        setItems(payload.items);
        setUpdatedAt(payload.updatedAt ? new Date(payload.updatedAt) : new Date());
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setItems([]); setUpdatedAt(null);
        setError(cause instanceof Error ? cause.message : "추천 장소를 불러오지 못했습니다.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  },[region,category,retry,apiOrigin]);

  const mapAllUrl = useMemo(() => {
    const keyword = category === "전체" ? "가볼만한 곳" : category;
    return `https://map.naver.com/p/search/${encodeURIComponent(`${region} ${keyword}`)}`;
  },[region,category]);

  return <section className="kp-naver-recommendations" aria-labelledby="naver-recommend-title">
    <div className="kp-naver-heading"><div><p className="kp-overline">NAVER LOCAL LIVE</p><h2 id="naver-recommend-title">지역별 실시간 추천 리스트</h2><p>네이버 지역 검색 결과를 바탕으로 선택한 지역의 장소를 바로 보여드립니다.</p></div><a href={mapAllUrl} target="_blank" rel="noreferrer">네이버 지도 전체보기 ↗</a></div>
    <div className="kp-naver-controls"><label><span>지역</span><select value={region} onChange={e=>setRegion(e.target.value as typeof region)}>{regions.map(v=><option key={v}>{v}</option>)}</select></label><div className="kp-naver-category-filter">{categories.map(v=><button type="button" key={v} className={category===v?"is-active":""} onClick={()=>setCategory(v)}>{v}</button>)}</div></div>
    <div className="kp-naver-status"><strong>{region} · {category}</strong><span>{updatedAt?`${updatedAt.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})} 갱신`:"실시간 연결 중"}</span></div>
    {loading && <div className="kp-naver-state">추천 장소를 불러오는 중입니다.</div>}
    {!loading && error && <div className="kp-naver-state is-error"><div className="kp-naver-error-actions"><p>{error}</p><div><button type="button" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</button><a href={mapAllUrl} target="_blank" rel="noreferrer">네이버 지도에서 직접 보기 ↗</a></div></div></div>}
    {!loading && !error && <div className="kp-naver-list">{items.map((item,index)=><article className="kp-naver-place" key={item.id}><span className="kp-naver-rank">{String(index+1).padStart(2,"0")}</span><div className="kp-naver-place-body"><small>{item.category}</small><h3>{item.name}</h3><p>{item.address}</p>{item.telephone&&<span>{item.telephone}</span>}</div><a href={item.mapUrl} target="_blank" rel="noreferrer">지도에서 보기 ↗</a></article>)}</div>}
  </section>;
}
