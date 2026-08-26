import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { PlaceImage } from '@/components/place-image';
import { useSession } from '@/context/session-context';
import { fetchTourPlaces, fetchTourSubregions, type PlaceQuery, type TourPlace, type TourSubregion } from '@/lib/api';
import { openRouteMap } from '@/lib/map-links';
import { libraryPlaceKey, loadPlaceLibrary, recordRecentPlace, toggleSavedPlace, toLibraryPlace } from '@/lib/place-library';
import { reportMobilePlace, trackMobileOperation } from '@/lib/operations';

const regions = ['전국','서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'] as const;
const categories = ['전체', '맛집', '카페', '관광지', '축제'] as const;
const defaultPageSize = 50;
type TourPlacesResult = Awaited<ReturnType<typeof fetchTourPlaces>>;
type ViewMode = 'all' | 'map' | 'list';
type PickerMode = 'region' | 'district' | null;

const ExplorePlaceCard = memo(function ExplorePlaceCard({
  place,
  index,
  saved,
  selected,
  onSelect,
  onOpenDetails,
  onToggleSaved,
  onReport,
}: {
  place: TourPlace;
  index: number;
  saved: boolean;
  selected: boolean;
  onSelect: (place: TourPlace) => void;
  onOpenDetails: (place: TourPlace) => void;
  onToggleSaved: (place: TourPlace) => void;
  onReport: (place: TourPlace) => void;
}) {
  const open = place.openingState === 'open';
  return (
    <MotionPressable
      accessibilityRole="button"
      onLongPress={() => onReport(place)}
      onPress={() => { onSelect(place); onOpenDetails(place); }}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.cardIndex}><Text style={styles.cardIndexText}>{index + 1}</Text></View>
      <View style={styles.cardImage}>
        <PlaceImage
          name={place.name}
          imageUrl={place.imageThumbnailUrl || place.imageUrl}
          attribution={place.imageAttribution}
          copyrightCode={place.imageCopyrightCode}
          modificationAllowed={place.imageModificationAllowed}
        />
      </View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardTitle}>{place.name}</Text>
        <Text numberOfLines={1} style={styles.cardMeta}>{place.category} · {open ? '영업 중' : '운영정보 확인'}</Text>
        <Text numberOfLines={1} style={styles.hoursText}>{place.openingHoursText ?? place.address ?? '상세 정보 확인'}</Text>
      </View>
      <View style={styles.cardActions}>
        <MotionPressable
          accessibilityRole="button"
          onPress={(event) => { event.stopPropagation(); void openRouteMap('naver', place); }}
          style={styles.routeButton}
        >
          <Text style={styles.routeIcon}>➤</Text><Text style={styles.routeText}>길찾기</Text>
        </MotionPressable>
        <MotionPressable
          accessibilityLabel={`${place.name} ${saved ? '저장 해제' : '저장'}`}
          accessibilityRole="button"
          onPress={(event) => { event.stopPropagation(); onToggleSaved(place); }}
          style={styles.saveButton}
        >
          <Text style={[styles.saveText, saved && styles.saveTextActive]}>{saved ? '♥' : '♡'} 저장</Text>
        </MotionPressable>
      </View>
    </MotionPressable>
  );
});

export default function ExploreScreen() {
  const router = useRouter();
  const { session } = useSession();
  const params = useLocalSearchParams<{ region?: string; district?: string; locality?: string; category?: string; query?: string }>();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const resultCacheRef = useRef(new Map<string, TourPlacesResult>());
  const [region, setRegion] = useState<PlaceQuery['region']>('서울');
  const [district, setDistrict] = useState('전체');
  const [subregions, setSubregions] = useState<TourSubregion[]>([]);
  const [locality, setLocality] = useState('');
  const [category, setCategory] = useState<PlaceQuery['category']>('전체');
  const [places, setPlaces] = useState<TourPlace[]>([]);
  const [selected, setSelected] = useState<TourPlace | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sources, setSources] = useState<('TOUR_API' | 'NAVER_LOCAL')[]>(['TOUR_API']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
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
    setSources(result.sources?.length ? result.sources : ['TOUR_API']);
    if (nextPage > 1) scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const load = async (
    nextRegion = region,
    nextCategory = category,
    nextPage = 1,
    force = false,
    nextOpenNow = openNow,
    nextQuery = searchQuery,
    nextSigunguCode = district === '전체' ? '' : subregions.find((item) => item.name === district)?.code ?? '',
    nextLocality = locality,
    nextDistrict = district,
  ) => {
    requestControllerRef.current?.abort();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const normalizedQuery = nextQuery.trim();
    const normalizedLocality = nextLocality.trim();
    const cacheKey = `${nextRegion}:${nextSigunguCode}:${nextDistrict}:${normalizedLocality}:${nextCategory}:${nextPage}:${nextOpenNow ? 'open' : 'all'}:${normalizedQuery}`;
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
        {
          region: nextRegion,
          category: nextCategory,
          page: nextPage,
          pageSize: nextOpenNow ? 12 : defaultPageSize,
          openNow: nextOpenNow,
          query: normalizedQuery,
          sigunguCode: nextSigunguCode,
          district: nextDistrict,
          locality: normalizedLocality,
        },
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
      setSources(['TOUR_API']);
      setError(nextError instanceof Error ? nextError.message : '장소를 불러오지 못했습니다.');
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  const selectPlace = (place: TourPlace) => {
    setSelected(place);
    void recordRecentPlace(place);
    void trackMobileOperation({ category: place.category, eventType: 'place_card_click', feature: 'place_search', placeId: place.id, placeName: place.name, route: '/explore' });
  };

  const reportPlace = (place: TourPlace) => {
    const submit = (reason: 'incorrect_info' | 'closed') => {
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

  const openDetails = (place: TourPlace) => {
    router.push({
      pathname: '/place-detail',
      params: {
        id: place.id,
        name: place.name,
        category: place.category,
        address: place.address ?? '',
        phone: place.phone ?? '',
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        imageUrl: place.imageUrl ?? place.imageThumbnailUrl ?? '',
        imageAttribution: place.imageAttribution ?? '',
        imageCopyrightCode: place.imageCopyrightCode ?? '',
        imageModificationAllowed: place.imageModificationAllowed ? '1' : '0',
        openingHoursText: place.openingHoursText ?? '',
        openingState: place.openingState,
      },
    });
  };

  const toggleSaved = async (place: TourPlace) => {
    if (!session) {
      Alert.alert('로그인이 필요합니다', '장소를 저장하려면 로그인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return;
    }
    const normalized = toLibraryPlace(place);
    const key = libraryPlaceKey(normalized);
    const saved = await toggleSavedPlace(place);
    setSavedKeys((current) => {
      const next = new Set(current);
      if (saved) next.add(key); else next.delete(key);
      return next;
    });
  };

  const chooseRegion = (value: typeof regions[number]) => {
    setRegion(value);
    setDistrict('전체');
    setSubregions([]);
    setLocality('');
    setPickerMode(null);
    if (value === '전국') {
      void load(value, category, 1, false, openNow, searchQuery, '', '', '전체');
      return;
    }
    void fetchTourSubregions(value).then((result) => {
      setSubregions(result.subregions);
      void load(value, category, 1, false, openNow, searchQuery, '', '', '전체');
    }).catch(() => void load(value, category, 1, false, openNow, searchQuery, '', '', '전체'));
  };

  const chooseDistrict = (value: string) => {
    setDistrict(value);
    setLocality('');
    setPickerMode(null);
    const code = value === '전체' ? '' : subregions.find((item) => item.name === value)?.code ?? '';
    void load(region, category, 1, false, openNow, searchQuery, code, '', value);
  };

  const movePage = (nextPage: number) => {
    if (loading || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    void load(region, category, nextPage);
  };

  useEffect(() => {
    const nextRegion = regions.includes(params.region as typeof regions[number]) ? params.region as typeof regions[number] : '서울';
    const rawCategory = params.category === '음식' ? '맛집' : params.category;
    const nextCategory = categories.includes(rawCategory as typeof categories[number]) ? rawCategory as PlaceQuery['category'] : '전체';
    const nextQuery = String(params.query ?? '').trim().slice(0, 80);
    const requestedDistrict = String(params.district ?? '전체').trim();
    const requestedLocality = String(params.locality ?? '').trim().slice(0, 40);
    queueMicrotask(() => {
      setRegion(nextRegion);
      setCategory(nextCategory);
      setSearchQuery(nextQuery);
      void fetchTourSubregions(nextRegion).then((result) => {
        const nextSubregions = nextRegion === '전국' ? [] : result.subregions;
        const matched = nextSubregions.find((item) => item.name === requestedDistrict);
        setSubregions(nextSubregions);
        setDistrict(matched?.name ?? '전체');
        setLocality(matched ? requestedLocality : '');
        void load(nextRegion, nextCategory, 1, false, false, nextQuery, matched?.code ?? '', matched ? requestedLocality : '', matched?.name ?? '전체');
      }).catch(() => {
        setSubregions([]);
        setDistrict('전체');
        setLocality('');
        void load(nextRegion, nextCategory, 1, false, false, nextQuery, '', '', '전체');
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, params.district, params.locality, params.query, params.region]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  const districtValues = ['전체', ...subregions.map((item) => item.name)];
  const pickerValues = pickerMode === 'region' ? regions : districtValues;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.container, width < 370 && styles.containerCompact]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.back}>‹</Text><Text style={styles.title}>장소 찾기</Text><View style={styles.headerSpacer} /></View>

        <View style={styles.selectRow}>
          <MotionPressable onPress={() => setPickerMode(pickerMode === 'region' ? null : 'region')} style={styles.selectBox}>
            <Text style={styles.selectPlaceholder}>시·도</Text><Text numberOfLines={1} style={styles.selectValue}>{region}</Text><Text style={styles.selectArrow}>⌄</Text>
          </MotionPressable>
          <MotionPressable disabled={region === '전국'} onPress={() => setPickerMode(pickerMode === 'district' ? null : 'district')} style={[styles.selectBox, region === '전국' && styles.selectBoxDisabled]}>
            <Text style={styles.selectPlaceholder}>시·군·구</Text><Text numberOfLines={1} style={styles.selectValue}>{district}</Text><Text style={styles.selectArrow}>⌄</Text>
          </MotionPressable>
        </View>

        {pickerMode ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
            {pickerValues.map((value) => (
              <MotionPressable key={value} onPress={() => pickerMode === 'region' ? chooseRegion(value as typeof regions[number]) : chooseDistrict(value)} style={[styles.pickerChip, (pickerMode === 'region' ? region === value : district === value) && styles.pickerChipActive]}>
                <Text style={[styles.pickerChipText, (pickerMode === 'region' ? region === value : district === value) && styles.pickerChipTextActive]}>{value}</Text>
              </MotionPressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.categoryRow}>
          {categories.map((value) => {
            const active = category === value;
            return <MotionPressable key={value} onPress={() => { const next = value as PlaceQuery['category']; setCategory(next); void load(region, next, 1); }} style={[styles.categoryChip, active && styles.categoryChipActive]}><Text style={[styles.categoryText, active && styles.categoryTextActive]}>{value}</Text></MotionPressable>;
          })}
        </View>

        <MotionPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: openNow }}
          onPress={() => { const next = !openNow; setOpenNow(next); void load(region, category, 1, false, next); }}
          style={styles.openRow}
        >
          <Text style={styles.openTitle}>현재 영업 중</Text>
          <View style={[styles.toggle, openNow && styles.toggleActive]}><View style={[styles.toggleKnob, openNow && styles.toggleKnobActive]} /></View>
        </MotionPressable>

        <View style={styles.segmentedControl}>
          {([['all', '지도+목록'], ['map', '지도'], ['list', '목록']] as const).map(([value, label]) => (
            <MotionPressable key={value} onPress={() => setViewMode(value)} style={[styles.segmentButton, viewMode === value && styles.segmentButtonActive]}><Text style={[styles.segmentText, viewMode === value && styles.segmentTextActive]}>{label}</Text></MotionPressable>
          ))}
        </View>

        {loading && places.length === 0 ? <View style={styles.loading}><ActivityIndicator color="#ff2f2f" /><Text style={styles.loadingText}>장소를 불러오는 중입니다.</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {viewMode !== 'list' ? <View style={styles.mapShell}><NaverPlacesMap places={places} selectedId={selected?.id ?? null} onSelect={selectPlace} /></View> : null}

        {viewMode !== 'map' ? (
          <View style={styles.list}>
            <Text style={styles.listTitle}>총 {totalCount.toLocaleString('ko-KR')}곳</Text>
            {places.map((place, index) => (
              <ExplorePlaceCard
                key={place.id}
                place={place}
                index={index}
                selected={selected?.id === place.id}
                saved={savedKeys.has(libraryPlaceKey(toLibraryPlace(place)))}
                onSelect={selectPlace}
                onOpenDetails={openDetails}
                onToggleSaved={toggleSaved}
                onReport={reportPlace}
              />
            ))}
            {totalPages > 1 ? (
              <View style={styles.pagination}>
                <MotionPressable disabled={page <= 1 || loading} onPress={() => movePage(page - 1)} style={styles.pageButton}><Text style={styles.pageText}>‹ 이전</Text></MotionPressable>
                <Text style={styles.pageStatus}>{page} / {totalPages}</Text>
                <MotionPressable disabled={page >= totalPages || loading} onPress={() => movePage(page + 1)} style={styles.pageButton}><Text style={styles.pageText}>다음 ›</Text></MotionPressable>
              </View>
            ) : null}
            <Text style={styles.source}>출처: {sources.includes('NAVER_LOCAL') ? '네이버 지역검색 · 한국관광공사 TourAPI' : '한국관광공사 TourAPI'} · 지도: 네이버 지도</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 5, paddingBottom: 22 },
  containerCompact: { paddingHorizontal: 10 },
  header: { height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 36, color: '#1b1b1b', fontSize: 31, lineHeight: 36 },
  title: { color: '#171717', fontSize: 18, fontWeight: '900' },
  headerSpacer: { width: 36 },
  selectRow: { flexDirection: 'row', gap: 8, marginTop: 3 },
  selectBox: { flex: 1, minHeight: 43, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dedede', borderRadius: 9, backgroundColor: '#ffffff', paddingHorizontal: 11 },
  selectBoxDisabled: { opacity: 0.5 },
  selectPlaceholder: { display: 'none' },
  selectValue: { flex: 1, color: '#4d4d4d', fontSize: 12, fontWeight: '700' },
  selectArrow: { color: '#222222', fontSize: 16 },
  pickerRow: { gap: 6, paddingTop: 8, paddingRight: 14 },
  pickerChip: { minHeight: 31, justifyContent: 'center', borderWidth: 1, borderColor: '#e4e4e4', borderRadius: 16, backgroundColor: '#ffffff', paddingHorizontal: 11 },
  pickerChipActive: { borderColor: '#b6ef19', backgroundColor: '#caff2c' },
  pickerChipText: { color: '#555555', fontSize: 10, fontWeight: '800' },
  pickerChipTextActive: { color: '#1f2800' },
  categoryRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  categoryChip: { flex: 1, minHeight: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 16, backgroundColor: '#f7f7f7' },
  categoryChipActive: { borderColor: '#caff2c', backgroundColor: '#caff2c' },
  categoryText: { color: '#4b4b4b', fontSize: 10, fontWeight: '800' },
  categoryTextActive: { color: '#172000', fontWeight: '900' },
  openRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  openTitle: { color: '#292929', fontSize: 11, fontWeight: '900' },
  toggle: { width: 38, height: 22, justifyContent: 'center', borderRadius: 11, backgroundColor: '#d8d8d8', padding: 2 },
  toggleActive: { backgroundColor: '#caff2c' },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff' },
  toggleKnobActive: { alignSelf: 'flex-end' },
  segmentedControl: { minHeight: 36, flexDirection: 'row', borderWidth: 1, borderColor: '#dedede', borderRadius: 9, backgroundColor: '#ffffff', padding: 2 },
  segmentButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  segmentButtonActive: { backgroundColor: '#caff2c' },
  segmentText: { color: '#444444', fontSize: 10, fontWeight: '800' },
  segmentTextActive: { color: '#172000', fontWeight: '900' },
  loading: { minHeight: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: '#777777', fontSize: 11, fontWeight: '700' },
  error: { marginTop: 8, borderRadius: 9, backgroundColor: '#fff1f1', color: '#a33232', padding: 10, fontSize: 11 },
  mapShell: { height: 205, marginTop: 8, overflow: 'hidden', borderRadius: 0, backgroundColor: '#eef2e8' },
  list: { marginTop: 9 },
  listTitle: { marginBottom: 4, color: '#2a2a2a', fontSize: 11, fontWeight: '900' },
  card: { minHeight: 102, marginTop: 7, position: 'relative', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e4', borderRadius: 10, backgroundColor: '#ffffff', padding: 7 },
  cardSelected: { borderColor: '#d8d8d8' },
  cardIndex: { position: 'absolute', zIndex: 4, top: 5, left: 5, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#ff2f2f' },
  cardIndexText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  cardImage: { width: 88, height: 82, overflow: 'hidden', borderRadius: 8, backgroundColor: '#eeeeee' },
  cardCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  cardTitle: { color: '#202020', fontSize: 14, fontWeight: '900' },
  cardMeta: { marginTop: 5, color: '#28a64e', fontSize: 10, fontWeight: '800' },
  hoursText: { marginTop: 4, color: '#535353', fontSize: 9, lineHeight: 13 },
  cardActions: { width: 67, gap: 5 },
  routeButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3, borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, backgroundColor: '#ffffff' },
  routeIcon: { color: '#ff2f2f', fontSize: 11, fontWeight: '900' },
  routeText: { color: '#222222', fontSize: 9, fontWeight: '900' },
  saveButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, backgroundColor: '#ffffff' },
  saveText: { color: '#333333', fontSize: 9, fontWeight: '800' },
  saveTextActive: { color: '#ff2f2f' },
  pagination: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  pageButton: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12 },
  pageText: { color: '#333333', fontSize: 10, fontWeight: '800' },
  pageStatus: { color: '#444444', fontSize: 10, fontWeight: '900' },
  source: { marginTop: 12, color: '#9a9a9a', fontSize: 8, textAlign: 'center' },
});
