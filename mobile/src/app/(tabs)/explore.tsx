import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import { fetchTourPlaces, type PlaceQuery, type TourPlace } from '@/lib/api';

const regions = [
  '전국', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const;
const categories = ['전체', '맛집', '카페', '관광지', '축제'] as const;

export default function ExploreScreen() {
  const [region, setRegion] = useState<PlaceQuery['region']>('서울');
  const [category, setCategory] = useState<PlaceQuery['category']>('전체');
  const [places, setPlaces] = useState<TourPlace[]>([]);
  const [selected, setSelected] = useState<TourPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchTourPlaces({ region, category, pageSize: 30 });
      setPlaces(result.places);
      setSelected(result.places[0] ?? null);
    } catch (nextError) {
      setPlaces([]);
      setSelected(null);
      setError(nextError instanceof Error ? nextError.message : '장소를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
    // Initial production API connection check only; later filter changes are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>PLACE EXPLORER</Text>
        <Text style={styles.title}>전국 장소 찾기</Text>
        <Text style={styles.subtitle}>TourAPI 장소를 불러와 앱 안의 네이버 지도에 표시합니다.</Text>

        <View style={styles.filters}>
          <ChoiceChips label="지역" values={regions} selected={region} onSelect={setRegion} />
          <ChoiceChips
            label="카테고리"
            values={categories}
            selected={category}
            onSelect={(value) => setCategory(value as PlaceQuery['category'])}
          />
          <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.searchButton}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchText}>선택 조건으로 찾기</Text>}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.mapShell}>
          <NaverPlacesMap
            places={places}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </View>

        {selected ? (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedLabel}>지도에서 선택한 장소</Text>
            <Text style={styles.selectedTitle}>{selected.name}</Text>
            <Text style={styles.selectedMeta}>{selected.category} · {selected.address}</Text>
            <RouteMapChooser place={selected} />
          </View>
        ) : null}

        {places.length > 0 ? (
          <View style={styles.list}>
            <Text style={styles.listTitle}>장소 {places.length}곳</Text>
            <Text style={styles.source}>출처: 한국관광공사 TourAPI · 지도: 네이버 지도</Text>
            {places.map((place) => (
              <Pressable key={place.id} onPress={() => setSelected(place)} style={styles.card}>
                <PlaceImage
                  name={place.name}
                  imageUrl={place.imageUrl}
                  attribution={place.imageAttribution}
                  copyrightCode={place.imageCopyrightCode}
                  modificationAllowed={place.imageModificationAllowed}
                />
                <Text style={styles.cardTitle}>{place.name}</Text>
                <Text style={styles.cardMeta}>{place.category} · {place.address}</Text>
                <RouteMapChooser place={place} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f8f6' },
  container: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 34 },
  eyebrow: { color: '#146b45', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 5, color: '#17211c', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 8, color: '#66716b', fontSize: 14, lineHeight: 21 },
  filters: { marginTop: 22, borderRadius: 22, backgroundColor: '#ffffff', padding: 18 },
  searchButton: { marginTop: 22, alignItems: 'center', borderRadius: 14, backgroundColor: '#146b45', paddingVertical: 15 },
  searchText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  error: { marginTop: 12, color: '#aa2f2f', fontSize: 13, lineHeight: 19 },
  mapShell: { marginTop: 18, overflow: 'hidden', borderRadius: 20 },
  selectedCard: { marginTop: 12, borderRadius: 18, backgroundColor: '#e7f6ee', padding: 16 },
  selectedLabel: { color: '#146b45', fontSize: 11, fontWeight: '900' },
  selectedTitle: { marginTop: 4, color: '#1c2922', fontSize: 18, fontWeight: '900' },
  selectedMeta: { marginTop: 5, marginBottom: 14, color: '#59675f', fontSize: 12, lineHeight: 18 },
  list: { marginTop: 26 },
  listTitle: { color: '#17211c', fontSize: 22, fontWeight: '900' },
  source: { marginTop: 4, marginBottom: 10, color: '#77817b', fontSize: 12 },
  card: { marginTop: 12, borderRadius: 19, backgroundColor: '#ffffff', padding: 12 },
  cardTitle: { marginTop: 13, color: '#1d2922', fontSize: 18, fontWeight: '900' },
  cardMeta: { marginTop: 5, marginBottom: 13, color: '#6a756e', fontSize: 12, lineHeight: 18 },
});
