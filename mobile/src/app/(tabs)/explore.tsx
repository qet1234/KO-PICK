import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/choice-chips';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { fetchTourPlaces, type PlaceQuery, type TourPlace } from '@/lib/api';

const regions = ['전국','서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'] as const;
const categories = ['전체', '맛집', '카페', '관광지', '축제'] as const;

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ region?: string; category?: string }>();
  const { width } = useWindowDimensions();
  const [region, setRegion] = useState<PlaceQuery['region']>('서울');
  const [category, setCategory] = useState<PlaceQuery['category']>('전체');
  const [places, setPlaces] = useState<TourPlace[]>([]);
  const [selected, setSelected] = useState<TourPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (nextRegion = region, nextCategory = category) => {
    setLoading(true); setError('');
    try {
      const result = await fetchTourPlaces({ region: nextRegion, category: nextCategory, pageSize: 30 });
      setPlaces(result.places); setSelected(result.places[0] ?? null);
    } catch (nextError) {
      setPlaces([]); setSelected(null); setError(nextError instanceof Error ? nextError.message : '장소를 불러오지 못했습니다.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const nextRegion = regions.includes(params.region as typeof regions[number]) ? params.region as string : '서울';
    const rawCategory = params.category === '음식' ? '맛집' : params.category;
    const nextCategory = categories.includes(rawCategory as typeof categories[number]) ? rawCategory as PlaceQuery['category'] : '전체';
    setRegion(nextRegion); setCategory(nextCategory);
    queueMicrotask(() => void load(nextRegion, nextCategory));
    // Load URL parameters once when this tab opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category, params.region]);

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
    <ScrollView contentContainerStyle={[styles.container, width < 370 && styles.containerCompact]}>
      <Text style={styles.eyebrow}>PLACE EXPLORER</Text><Text style={styles.title}>전국 장소 찾기</Text>
      <Text style={styles.subtitle}>웹과 같은 TourAPI 장소를 앱의 네이버 지도와 목록에서 확인합니다.</Text>
      <View style={styles.filters}>
        <ChoiceChips label="지역" values={regions} selected={region} onSelect={setRegion} />
        <ChoiceChips label="카테고리" values={categories} selected={category} onSelect={(value) => setCategory(value as PlaceQuery['category'])} />
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => void load()} style={[styles.searchButton, loading && styles.disabled]}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchText}>선택 조건으로 찾기</Text>}
        </Pressable>{error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.mapShell}><NaverPlacesMap places={places} selectedId={selected?.id ?? null} onSelect={setSelected} /></View>
      {selected ? <View style={styles.selectedCard}><Text style={styles.selectedLabel}>지도에서 선택한 장소</Text><Text style={styles.selectedTitle}>{selected.name}</Text>
        <Text style={styles.selectedMeta}>{selected.category} · {selected.address}</Text><RouteMapChooser place={selected} /></View> : null}
      {places.length > 0 ? <View style={styles.list}><Text style={styles.listTitle}>장소 {places.length}곳</Text><Text style={styles.source}>출처: 한국관광공사 TourAPI · 지도: 네이버 지도</Text>
        {places.map((place) => <Pressable key={place.id} onPress={() => setSelected(place)} style={[styles.card, selected?.id === place.id && styles.cardSelected]}>
          <PlaceImage name={place.name} imageUrl={place.imageUrl} attribution={place.imageAttribution} copyrightCode={place.imageCopyrightCode} modificationAllowed={place.imageModificationAllowed} />
          <Text style={styles.cardTitle}>{place.name}</Text><Text style={styles.cardMeta}>{place.category} · {place.address}</Text><RouteMapChooser place={place} />
        </Pressable>)}
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
  list: { marginTop: 26 }, listTitle: { color: '#101010', fontSize: 21, fontWeight: '900' }, source: { marginTop: 4, marginBottom: 8, color: '#71716d', fontSize: 11 },
  card: { marginTop: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 19, backgroundColor: '#ffffff', padding: 12 }, cardSelected: { borderColor: '#ff3b36' }, cardTitle: { marginTop: 13, color: '#101010', fontSize: 17, fontWeight: '900' }, cardMeta: { marginTop: 5, marginBottom: 13, color: '#71716d', fontSize: 11, lineHeight: 17 },
});
