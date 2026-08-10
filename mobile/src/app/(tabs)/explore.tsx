import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/choice-chips';
import { MotionPressable } from '@/components/motion-pressable';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { fetchTourPlaces, type PlaceQuery, type TourPlace } from '@/lib/api';

const regions = ['전국','서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'] as const;
const categories = ['전체', '맛집', '카페', '관광지', '축제'] as const;

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ region?: string; category?: string }>();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [region, setRegion] = useState<PlaceQuery['region']>('서울');
  const [category, setCategory] = useState<PlaceQuery['category']>('전체');
  const [places, setPlaces] = useState<TourPlace[]>([]);
  const [selected, setSelected] = useState<TourPlace | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (nextRegion = region, nextCategory = category, nextPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchTourPlaces({ region: nextRegion, category: nextCategory, page: nextPage, pageSize: 100 });
      setPlaces(result.places);
      setSelected(result.places[0] ?? null);
      setPage(result.pagination.pageNo);
      setTotalCount(result.pagination.totalCount);
      setTotalPages(result.pagination.totalPages);
      if (nextPage > 1) scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (nextError) {
      setPlaces([]);
      setSelected(null);
      setPage(1);
      setTotalCount(0);
      setTotalPages(1);
      setError(nextError instanceof Error ? nextError.message : '장소를 불러오지 못했습니다.');
    } finally { setLoading(false); }
  };

  const movePage = (nextPage: number) => {
    if (loading || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    void load(region, category, nextPage);
  };

  useEffect(() => {
    const nextRegion = regions.includes(params.region as typeof regions[number]) ? params.region as string : '서울';
    const rawCategory = params.category === '음식' ? '맛집' : params.category;
    const nextCategory = categories.includes(rawCategory as typeof categories[number]) ? rawCategory as PlaceQuery['category'] : '전체';
    queueMicrotask(() => {
      setRegion(nextRegion);
      setCategory(nextCategory);
      void load(nextRegion, nextCategory);
    });
    // Load URL parameters once when this tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, params.region]);

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
    <ScrollView ref={scrollRef} contentContainerStyle={[styles.container, width < 370 && styles.containerCompact]}>
      <Text style={styles.eyebrow}>PLACE EXPLORER</Text><Text style={styles.title}>전국 장소 찾기</Text>
      <Text style={styles.subtitle}>웹과 같은 TourAPI 장소를 앱의 네이버 지도와 목록에서 확인합니다.</Text>
      <View style={styles.filters}>
        <ChoiceChips label="지역" values={regions} selected={region} onSelect={setRegion} />
        <ChoiceChips label="카테고리" values={categories} selected={category} onSelect={(value) => setCategory(value as PlaceQuery['category'])} />
        <MotionPressable accessibilityRole="button" disabled={loading} onPress={() => void load(region, category, 1)} style={[styles.searchButton, loading && styles.disabled]}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchText}>선택 조건으로 찾기</Text>}
        </MotionPressable>{error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.mapShell}><NaverPlacesMap places={places} selectedId={selected?.id ?? null} onSelect={setSelected} /></View>
      {selected ? <View style={styles.selectedCard}><Text style={styles.selectedLabel}>지도에서 선택한 장소</Text><Text style={styles.selectedTitle}>{selected.name}</Text>
        <Text style={styles.selectedMeta}>{selected.category} · {selected.address}</Text><RouteMapChooser place={selected} /></View> : null}
      {places.length > 0 ? <View style={styles.list}>
        <View style={styles.listHeading}><Text style={styles.listTitle}>장소 {places.length.toLocaleString('ko-KR')}곳</Text><Text style={styles.totalCount}>전체 {totalCount.toLocaleString('ko-KR')}곳</Text></View>
        <Text style={styles.source}>출처: 한국관광공사 TourAPI · 지도: 네이버 지도</Text>
        {totalPages > 1 ? <View style={styles.pagination}>
          <MotionPressable accessibilityRole="button" disabled={loading || page <= 1} onPress={() => movePage(page - 1)} style={[styles.pageButton, (loading || page <= 1) && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>‹ 이전</Text></MotionPressable>
          <View style={styles.pageStatus}><Text style={styles.pageCurrent}>{page.toLocaleString('ko-KR')}</Text><Text style={styles.pageDivider}> / </Text><Text style={styles.pageTotal}>{totalPages.toLocaleString('ko-KR')}</Text></View>
          <MotionPressable accessibilityRole="button" disabled={loading || page >= totalPages} onPress={() => movePage(page + 1)} style={[styles.pageButton, (loading || page >= totalPages) && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>다음 ›</Text></MotionPressable>
        </View> : null}
        {places.map((place) => <MotionPressable key={place.id} onPress={() => setSelected(place)} style={[styles.card, selected?.id === place.id && styles.cardSelected]}>
          <PlaceImage name={place.name} imageUrl={place.imageUrl} attribution={place.imageAttribution} copyrightCode={place.imageCopyrightCode} modificationAllowed={place.imageModificationAllowed} />
          <Text style={styles.cardTitle}>{place.name}</Text><Text style={styles.cardMeta}>{place.category} · {place.address}</Text><RouteMapChooser place={place} />
        </MotionPressable>)}
        {totalPages > 1 ? <View style={styles.paginationBottom}>
          <MotionPressable accessibilityRole="button" disabled={loading || page <= 1} onPress={() => movePage(page - 1)} style={[styles.pageButton, (loading || page <= 1) && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>‹ 이전</Text></MotionPressable>
          <View style={styles.pageStatus}><Text style={styles.pageCurrent}>{page.toLocaleString('ko-KR')}</Text><Text style={styles.pageDivider}> / </Text><Text style={styles.pageTotal}>{totalPages.toLocaleString('ko-KR')}</Text></View>
          <MotionPressable accessibilityRole="button" disabled={loading || page >= totalPages} onPress={() => movePage(page + 1)} style={[styles.pageButton, (loading || page >= totalPages) && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>다음 ›</Text></MotionPressable>
        </View> : <View style={styles.listEnd}><Text style={styles.listEndText}>조건에 맞는 장소를 모두 확인했습니다.</Text></View>}
      </View> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f4' }, container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 34 }, containerCompact: { paddingHorizontal: 14 },
  eyebrow: { color: '#ff3b36', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { marginTop: 5, color: '#101010', fontSize: 28, fontWeight: '900' }, subtitle: { marginTop: 8, color: '#71716d', fontSize: 13, lineHeight: 20 },
  filters: { marginTop: 20, borderRadius: 22, backgroundColor: '#ffffff', padding: 17 }, searchButton: { minHeight: 50, marginTop: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ff3b36' }, disabled: { opacity: 0.65 },
  searchText: { color: '#ffffff', fontSize: 14, fontWeight: '900' }, error: { marginTop: 12, borderRadius: 12, backgroundColor: '#fff0f0', color: '#aa2f2f', padding: 12, fontSize: 12, lineHeight: 18 },
  mapShell: { marginTop: 18, overflow: 'hidden', borderRadius: 20 }, selectedCard: { marginTop: 12, borderRadius: 18, backgroundColor: '#fff0ee', padding: 16 }, selectedLabel: { color: '#ff3b36', fontSize: 10, fontWeight: '900' },
  selectedTitle: { marginTop: 4, color: '#101010', fontSize: 18, fontWeight: '900' }, selectedMeta: { marginTop: 5, marginBottom: 14, color: '#71716d', fontSize: 11, lineHeight: 17 },
  list: { marginTop: 26 }, listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, listTitle: { color: '#101010', fontSize: 21, fontWeight: '900' }, totalCount: { color: '#ff3b36', fontSize: 12, fontWeight: '900' }, source: { marginTop: 4, marginBottom: 8, color: '#71716d', fontSize: 11 },
  card: { marginTop: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 19, backgroundColor: '#ffffff', padding: 12 }, cardSelected: { borderColor: '#ff3b36' }, cardTitle: { marginTop: 13, color: '#101010', fontSize: 17, fontWeight: '900' }, cardMeta: { marginTop: 5, marginBottom: 13, color: '#71716d', fontSize: 11, lineHeight: 17 },
  pagination: { marginTop: 14, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, paginationBottom: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pageButton: { minWidth: 82, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 14 }, pageButtonDisabled: { opacity: 0.38 }, pageButtonText: { color: '#101010', fontSize: 12, fontWeight: '900' },
  pageStatus: { minWidth: 86, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: '#101010', paddingHorizontal: 12 }, pageCurrent: { color: '#caff2c', fontSize: 13, fontWeight: '900' }, pageDivider: { color: '#8b8b85', fontSize: 11, fontWeight: '800' }, pageTotal: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  listEnd: { minHeight: 58, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#efefeb', paddingHorizontal: 18 }, listEndText: { color: '#71716d', fontSize: 12, fontWeight: '800' },
});
