import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/choice-chips';
import { MotionPressable } from '@/components/motion-pressable';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { fetchTourPlaces, type PlaceQuery, type TourPlace } from '@/lib/api';
import { libraryPlaceKey, loadPlaceLibrary, recordRecentPlace, toggleSavedPlace, toLibraryPlace } from '@/lib/place-library';
import { reportMobilePlace, trackMobileOperation } from '@/lib/operations';

const regions = ['전국','서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'] as const;
const categories = ['전체', '맛집', '카페', '관광지', '축제'] as const;
const fastPageSize = 24;
type TourPlacesResult = Awaited<ReturnType<typeof fetchTourPlaces>>;
type SortMode = 'recommended' | 'name';
type ViewMode = 'all' | 'map' | 'list';

const ExplorePlaceCard = memo(function ExplorePlaceCard({
  place,
  selected,
  saved,
  onSelect,
  onToggleSaved,
  onReport,
}: {
  place: TourPlace;
  selected: boolean;
  saved: boolean;
  onSelect: (place: TourPlace) => void;
  onToggleSaved: (place: TourPlace) => void;
  onReport: (place: TourPlace) => void;
}) {
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <MotionPressable onPress={() => onSelect(place)} style={styles.cardMain}>
        <PlaceImage
          name={place.name}
          imageUrl={place.imageThumbnailUrl || place.imageUrl}
          attribution={place.imageAttribution}
          copyrightCode={place.imageCopyrightCode}
          modificationAllowed={place.imageModificationAllowed}
        />
        <Text style={styles.cardTitle}>{place.name}</Text>
        <Text style={styles.cardMeta}>{place.category} · {place.address}</Text>
        {place.openingState === 'open' ? <Text style={styles.openBadge}>● 현재 영업 중</Text> : null}
        {place.openingHoursText ? <Text numberOfLines={2} style={styles.hoursText}>{place.openingHoursText}</Text> : null}
      </MotionPressable>
      <MotionPressable accessibilityLabel={`${place.name} ${saved ? '찜 해제' : '찜하기'}`} accessibilityRole="button" onPress={() => onToggleSaved(place)} style={[styles.saveButton, saved && styles.saveButtonActive]}>
        <Text style={[styles.saveIcon, saved && styles.saveIconActive]}>{saved ? '♥' : '♡'}</Text>
      </MotionPressable>
      <RouteMapChooser place={place} />
      <MotionPressable accessibilityRole="button" onPress={() => onReport(place)} style={styles.reportButton}>
        <Text style={styles.reportButtonText}>잘못된 장소 정보 신고</Text>
      </MotionPressable>
    </View>
  );
});

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ region?: string; category?: string; query?: string }>();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const resultCacheRef = useRef(new Map<string, TourPlacesResult>());
  const [region, setRegion] = useState<PlaceQuery['region']>('서울');
  const [category, setCategory] = useState<PlaceQuery['category']>('전체');
  const [places, setPlaces] = useState<TourPlace[]>([]);
  const [selected, setSelected] = useState<TourPlace | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadPlaceLibrary().then((library) => {
      if (active) setSavedKeys(new Set(library.saved.map(libraryPlaceKey)));
    });
    return () => { active = false; };
  }, []));

  const applyResult = (result: TourPlacesResult, nextPage: number) => {
    setPlaces(result.places);
    setSelected(result.places[0] ?? null);
    setPage(result.pagination.pageNo);
    setTotalCount(result.pagination.totalCount);
    setTotalPages(result.pagination.totalPages);
    if (nextPage > 1) scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const load = async (
    nextRegion = region,
    nextCategory = category,
    nextPage = 1,
    force = false,
    nextOpenNow = openNow,
    nextQuery = searchQuery,
  ) => {
    requestControllerRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const normalizedQuery = nextQuery.trim();
    const cacheKey = `${nextRegion}:${nextCategory}:${nextPage}:${nextOpenNow ? 'open' : 'all'}:${normalizedQuery}`;
    const cached = force ? undefined : resultCacheRef.current.get(cacheKey);

    if (cached) {
      setError('');
      setLoading(false);
      applyResult(cached, nextPage);
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await fetchTourPlaces(
        { region: nextRegion, category: nextCategory, page: nextPage, pageSize: nextOpenNow ? 12 : fastPageSize, openNow: nextOpenNow, query: normalizedQuery },
        controller.signal,
      );
      if (requestIdRef.current !== requestId) return;
      resultCacheRef.current.set(cacheKey, result);
      applyResult(result, nextPage);
    } catch (nextError) {
      if (nextError instanceof Error && nextError.name === 'AbortError') return;
      if (requestIdRef.current !== requestId) return;
      setPlaces([]);
      setSelected(null);
      setPage(1);
      setTotalCount(0);
      setTotalPages(1);
      setError(nextError instanceof Error ? nextError.message : '장소를 불러오지 못했습니다.');
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  const sortedPlaces = useMemo(() => {
    if (sortMode === 'recommended') return places;
    return [...places].sort((first, second) => first.name.localeCompare(second.name, 'ko-KR'));
  }, [places, sortMode]);

  const submitSearch = () => {
    const nextQuery = searchInput.trim();
    setSearchInput(nextQuery);
    setSearchQuery(nextQuery);
    void load(region, category, 1, false, openNow, nextQuery);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    void load(region, category, 1, false, openNow, '');
  };

  const movePage = (nextPage: number) => {
    if (loading || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    void load(region, category, nextPage);
  };

  const selectPlace = (place: TourPlace) => {
    setSelected(place);
    void recordRecentPlace(place);
    void trackMobileOperation({ category: place.category, eventType: 'place_card_click', feature: 'place_search', placeId: place.id, placeName: place.name, route: '/explore' });
  };

  const reportPlace = (place: TourPlace) => {
    const submit = (reason: 'incorrect_info' | 'closed' | 'wrong_location') => {
      void reportMobilePlace(place, reason)
        .then(() => Alert.alert('접수 완료', '확인 후 장소 정보에 반영하겠습니다.'))
        .catch((reportError) => Alert.alert('접수 실패', reportError instanceof Error ? reportError.message : '잠시 후 다시 시도해 주세요.'));
    };
    Alert.alert('잘못된 장소 정보 신고', place.name, [
      { text: '취소', style: 'cancel' },
      { text: '폐업·없어진 장소', onPress: () => submit('closed') },
      { text: '위치·정보 오류', onPress: () => submit('incorrect_info') },
    ]);
  };

  const toggleSaved = async (place: TourPlace) => {
    const normalized = toLibraryPlace(place);
    const key = libraryPlaceKey(normalized);
    const saved = await toggleSavedPlace(place);
    setSavedKeys((current) => {
      const next = new Set(current);
      if (saved) next.add(key); else next.delete(key);
      return next;
    });
  };

  useEffect(() => {
    const nextRegion = regions.includes(params.region as typeof regions[number]) ? params.region as string : '서울';
    const rawCategory = params.category === '음식' ? '맛집' : params.category;
    const nextCategory = categories.includes(rawCategory as typeof categories[number]) ? rawCategory as PlaceQuery['category'] : '전체';
    const nextQuery = String(params.query ?? '').trim().slice(0, 80);
    queueMicrotask(() => {
      setRegion(nextRegion);
      setCategory(nextCategory);
      setSearchInput(nextQuery);
      setSearchQuery(nextQuery);
      void load(nextRegion, nextCategory, 1, false, false, nextQuery);
    });
    // Load URL parameters once when this tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, params.query, params.region]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
    <ScrollView ref={scrollRef} contentContainerStyle={[styles.container, width < 370 && styles.containerCompact]}>
      <Text style={styles.eyebrow}>PLACE EXPLORER</Text><Text style={styles.title}>전국 장소 찾기</Text>
      <Text style={styles.subtitle}>장소를 검색하고 조건을 좁힌 뒤 지도·목록에서 바로 비교해 보세요.</Text>
      <View style={styles.filters}>
        <Text style={styles.searchLabel}>장소명 또는 키워드</Text>
        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel="장소 검색"
            onChangeText={setSearchInput}
            onSubmitEditing={submitSearch}
            placeholder="예: 성수 카페, 해운대 맛집"
            placeholderTextColor="#989892"
            returnKeyType="search"
            style={styles.searchInput}
            value={searchInput}
          />
          {searchInput ? <MotionPressable accessibilityLabel="검색어 지우기" accessibilityRole="button" onPress={clearSearch} style={styles.clearButton}><Text style={styles.clearButtonText}>×</Text></MotionPressable> : null}
          <MotionPressable accessibilityRole="button" disabled={loading} onPress={submitSearch} style={[styles.submitButton, loading && styles.disabled]}><Text style={styles.submitButtonText}>검색</Text></MotionPressable>
        </View>
        <ChoiceChips label="지역" values={regions} selected={region} onSelect={(value) => {
          setRegion(value);
          void load(value, category, 1);
        }} />
        <ChoiceChips label="카테고리" values={categories} selected={category} onSelect={(value) => {
          const nextCategory = value as PlaceQuery['category'];
          setCategory(nextCategory);
          void load(region, nextCategory, 1);
        }} />
        <Text style={styles.instantNote}>{searchQuery ? `“${searchQuery}” 검색 결과에 지역·카테고리를 함께 적용합니다.` : '지역이나 카테고리를 누르면 바로 결과가 바뀝니다.'}</Text>
        <MotionPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: openNow }}
          onPress={() => {
            const next = !openNow;
            setOpenNow(next);
            void load(region, category, 1, false, next);
          }}
          style={[styles.openFilter, openNow && styles.openFilterActive]}
        >
          <View style={[styles.openCheck, openNow && styles.openCheckActive]}><Text style={styles.openCheckText}>{openNow ? '✓' : ''}</Text></View>
          <View style={styles.openFilterCopy}><Text style={styles.openFilterTitle}>현재 영업 중</Text><Text style={styles.openFilterNote}>공식 운영시간이 확인된 장소만 표시</Text></View>
        </MotionPressable>
        <MotionPressable accessibilityRole="button" disabled={loading} onPress={() => void load(region, category, 1, true)} style={[styles.searchButton, loading && styles.disabled]}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchText}>현재 조건 새로고침</Text>}
        </MotionPressable>{error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.resultToolbar}>
        <View style={styles.segmentedControl}>
          {([['all', '지도+목록'], ['map', '지도'], ['list', '목록']] as const).map(([value, label]) => <MotionPressable key={value} accessibilityRole="button" onPress={() => setViewMode(value)} style={[styles.segmentButton, viewMode === value && styles.segmentButtonActive]}><Text style={[styles.segmentButtonText, viewMode === value && styles.segmentButtonTextActive]}>{label}</Text></MotionPressable>)}
        </View>
        <View style={styles.segmentedControl}>
          {([['recommended', '추천순'], ['name', '이름순']] as const).map(([value, label]) => <MotionPressable key={value} accessibilityRole="button" onPress={() => setSortMode(value)} style={[styles.segmentButton, sortMode === value && styles.segmentButtonActive]}><Text style={[styles.segmentButtonText, sortMode === value && styles.segmentButtonTextActive]}>{label}</Text></MotionPressable>)}
        </View>
      </View>
      {viewMode !== 'list' ? <View style={styles.mapShell}><NaverPlacesMap places={places} selectedId={selected?.id ?? null} onSelect={selectPlace} /></View> : null}
      {viewMode !== 'list' && selected ? <View style={styles.selectedCard}><Text style={styles.selectedLabel}>지도에서 선택한 장소</Text><Text style={styles.selectedTitle}>{selected.name}</Text>
        <Text style={styles.selectedMeta}>{selected.category} · {selected.address}</Text><RouteMapChooser place={selected} /></View> : null}
      {viewMode !== 'map' && places.length > 0 ? <View style={styles.list}>
        <View style={styles.listHeading}><Text style={styles.listTitle}>장소 {places.length.toLocaleString('ko-KR')}곳</Text><Text style={styles.totalCount}>전체 {totalCount.toLocaleString('ko-KR')}곳</Text></View>
        <Text style={styles.source}>출처: 한국관광공사 TourAPI · 지도: 네이버 지도</Text>
        {totalPages > 1 ? <View style={styles.pagination}>
          <MotionPressable accessibilityRole="button" disabled={loading || page <= 1} onPress={() => movePage(page - 1)} style={[styles.pageButton, (loading || page <= 1) && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>‹ 이전</Text></MotionPressable>
          <View style={styles.pageStatus}><Text style={styles.pageCurrent}>{page.toLocaleString('ko-KR')}</Text><Text style={styles.pageDivider}> / </Text><Text style={styles.pageTotal}>{totalPages.toLocaleString('ko-KR')}</Text></View>
          <MotionPressable accessibilityRole="button" disabled={loading || page >= totalPages} onPress={() => movePage(page + 1)} style={[styles.pageButton, (loading || page >= totalPages) && styles.pageButtonDisabled]}><Text style={styles.pageButtonText}>다음 ›</Text></MotionPressable>
        </View> : null}
        {sortedPlaces.map((place) => (
          <ExplorePlaceCard key={place.id} place={place} selected={selected?.id === place.id} saved={savedKeys.has(libraryPlaceKey(toLibraryPlace(place)))} onSelect={selectPlace} onToggleSaved={toggleSaved} onReport={reportPlace} />
        ))}
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
  filters: { marginTop: 20, borderRadius: 22, backgroundColor: '#ffffff', padding: 17 }, searchButton: { minHeight: 50, marginTop: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ff3b36' }, disabled: { opacity: 0.65 },
  searchLabel: { marginBottom: 8, color: '#101010', fontSize: 12, fontWeight: '900' }, searchRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }, searchInput: { flex: 1, minHeight: 50, borderWidth: 1, borderColor: '#dadad4', borderRadius: 14, backgroundColor: '#fafaf8', color: '#101010', paddingHorizontal: 14, fontSize: 13, fontWeight: '700' }, clearButton: { width: 36, height: 36, marginLeft: -47, alignItems: 'center', justifyContent: 'center', borderRadius: 18 }, clearButtonText: { color: '#71716d', fontSize: 22, fontWeight: '700' }, submitButton: { minWidth: 64, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#101010', paddingHorizontal: 12 }, submitButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  instantNote: { marginTop: 12, color: '#71716d', fontSize: 11, lineHeight: 17 },
  openFilter: { minHeight: 54, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#dadad4', borderRadius: 14, backgroundColor: '#ffffff', paddingHorizontal: 12 }, openFilterActive: { borderColor: '#18a65a', backgroundColor: '#effcf5' }, openCheck: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cfcfc8', borderRadius: 8 }, openCheckActive: { borderColor: '#18a65a', backgroundColor: '#18a65a' }, openCheckText: { color: '#ffffff', fontSize: 13, fontWeight: '900' }, openFilterCopy: { flex: 1 }, openFilterTitle: { color: '#101010', fontSize: 12, fontWeight: '900' }, openFilterNote: { marginTop: 2, color: '#71716d', fontSize: 10 },
  searchText: { color: '#ffffff', fontSize: 14, fontWeight: '900' }, error: { marginTop: 12, borderRadius: 12, backgroundColor: '#fff0f0', color: '#aa2f2f', padding: 12, fontSize: 12, lineHeight: 18 },
  resultToolbar: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, segmentedControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 999, backgroundColor: '#ffffff', padding: 3 }, segmentButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingHorizontal: 10 }, segmentButtonActive: { backgroundColor: '#101010' }, segmentButtonText: { color: '#71716d', fontSize: 10, fontWeight: '900' }, segmentButtonTextActive: { color: '#ffffff' },
  mapShell: { marginTop: 18, overflow: 'hidden', borderRadius: 20 }, selectedCard: { marginTop: 12, borderRadius: 18, backgroundColor: '#fff0ee', padding: 16 }, selectedLabel: { color: '#ff3b36', fontSize: 10, fontWeight: '900' },
  selectedTitle: { marginTop: 4, color: '#101010', fontSize: 18, fontWeight: '900' }, selectedMeta: { marginTop: 5, marginBottom: 14, color: '#71716d', fontSize: 11, lineHeight: 17 },
  list: { marginTop: 26 }, listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, listTitle: { color: '#101010', fontSize: 21, fontWeight: '900' }, totalCount: { color: '#ff3b36', fontSize: 12, fontWeight: '900' }, source: { marginTop: 4, marginBottom: 8, color: '#71716d', fontSize: 11 },
  card: { marginTop: 12, position: 'relative', borderWidth: 1, borderColor: 'transparent', borderRadius: 19, backgroundColor: '#ffffff', padding: 12 }, cardSelected: { borderColor: '#ff3b36' }, cardMain: { borderRadius: 14 }, cardTitle: { marginTop: 13, color: '#101010', fontSize: 17, fontWeight: '900' }, cardMeta: { marginTop: 5, marginBottom: 10, color: '#71716d', fontSize: 11, lineHeight: 17 }, openBadge: { marginBottom: 3, color: '#14894d', fontSize: 10, fontWeight: '900' }, hoursText: { marginBottom: 10, color: '#71716d', fontSize: 10, lineHeight: 15 }, saveButton: { width: 42, height: 42, position: 'absolute', top: 20, right: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#deded8', borderRadius: 21, backgroundColor: '#ffffff' }, saveButtonActive: { borderColor: '#ff3b36', backgroundColor: '#ff3b36' }, saveIcon: { color: '#343434', fontSize: 23, fontWeight: '900' }, saveIconActive: { color: '#ffffff' },
  reportButton: { minHeight: 42, marginTop: 8, alignItems: 'center', justifyContent: 'center' }, reportButtonText: { color: '#71716d', fontSize: 11, fontWeight: '800', textDecorationLine: 'underline' },
  pagination: { marginTop: 14, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, paginationBottom: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  pageButton: { minWidth: 82, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 14 }, pageButtonDisabled: { opacity: 0.38 }, pageButtonText: { color: '#101010', fontSize: 12, fontWeight: '900' },
  pageStatus: { minWidth: 86, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: '#101010', paddingHorizontal: 12 }, pageCurrent: { color: '#caff2c', fontSize: 13, fontWeight: '900' }, pageDivider: { color: '#8b8b85', fontSize: 11, fontWeight: '800' }, pageTotal: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  listEnd: { minHeight: 58, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#efefeb', paddingHorizontal: 18 }, listEndText: { color: '#71716d', fontSize: 12, fontWeight: '800' },
});
