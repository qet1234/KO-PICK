import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { PlaceImage } from '@/components/place-image';
import { fetchTourPlaces, type TourPlace } from '@/lib/api';
import { openNaverSearch, openRouteMap } from '@/lib/map-links';

type DiningMode = '회식' | '점심';

const regions = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const;
const headcounts = ['2~4명', '5~8명', '9~12명', '13~20명', '21명 이상'] as const;
const foodTypes = ['전체', '한식', '고기·구이', '일식', '중식', '양식', '해산물', '주점'] as const;
const parkingOptions = ['상관없음', '주차 가능', '발렛파킹'] as const;
const dinnerBudgets = ['1인 2만원 이하', '1인 3만원 이하', '1인 5만원 이하', '1인 7만원 이하', '1인 10만원 이상'] as const;
const lunchBudgets = ['1인 1만원 이하', '1인 1.5만원 이하', '1인 2만원 이하', '1인 3만원 이하'] as const;
const tourDetailByFood: Record<string, string> = {
  한식: '한식',
  '고기·구이': '한식',
  일식: '일식',
  중식: '중식',
  양식: '양식',
  해산물: '해산물',
  주점: '주점',
};

export default function OfficeDiningScreen() {
  const [mode, setMode] = useState<DiningMode>('회식');
  const [region, setRegion] = useState('서울');
  const [officeArea, setOfficeArea] = useState('');
  const [headcount, setHeadcount] = useState('5~8명');
  const [foodType, setFoodType] = useState('전체');
  const [parking, setParking] = useState('상관없음');
  const [budget, setBudget] = useState('1인 3만원 이하');
  const [places, setPlaces] = useState<TourPlace[]>([]);
  const [selected, setSelected] = useState<TourPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const budgets = mode === '회식' ? dinnerBudgets : lunchBudgets;

  const conditionQuery = [
    region,
    officeArea.trim(),
    foodType === '전체' ? '맛집' : foodType,
    mode === '회식' ? `${headcount} 회식` : '직장인 점심',
    mode === '회식' && parking !== '상관없음' ? parking : '',
    budget,
  ].filter(Boolean).join(' ');

  const changeMode = (nextMode: DiningMode) => {
    setMode(nextMode);
    setBudget(nextMode === '회식' ? '1인 3만원 이하' : '1인 1만원 이하');
    if (nextMode === '점심') setParking('상관없음');
  };

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchTourPlaces({
        region,
        category: '맛집',
        detailType: tourDetailByFood[foodType],
        pageSize: 30,
      });
      setPlaces(result.places);
      setSelected(result.places[0] ?? null);
    } catch (nextError) {
      setPlaces([]);
      setSelected(null);
      setError(nextError instanceof Error ? nextError.message : '식당을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>OFFICE DINING</Text>
        <Text style={styles.title}>점심부터 팀 회식까지</Text>
        <Text style={styles.subtitle}>조건을 고르고 네이버 지도에서 비교한 뒤 바로 길을 찾아보세요.</Text>

        <View style={styles.modeRow}>
          {(['회식', '점심'] as DiningMode[]).map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === item }}
              key={item}
              onPress={() => changeMode(item)}
              style={[styles.modeButton, mode === item && styles.modeButtonActive]}>
              <Text style={[styles.modeTitle, mode === item && styles.modeTitleActive]}>{item === '회식' ? '팀 회식' : '빠른 점심'}</Text>
              <Text style={styles.modeDescription}>{item === '회식' ? '인원·주차·예산' : '근처에서 한 끼'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.builder}>
          <ChoiceChips label="지역" values={regions} selected={region} onSelect={setRegion} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>회사·역·동네 (선택)</Text>
            <TextInput
              accessibilityLabel="회사, 역 또는 동네"
              value={officeArea}
              onChangeText={setOfficeArea}
              placeholder="예: 강남역, 판교 테크노밸리"
              placeholderTextColor="#8b958f"
              style={styles.input}
            />
          </View>
          {mode === '회식' ? <ChoiceChips label="인원" values={headcounts} selected={headcount} onSelect={setHeadcount} wrap /> : null}
          <ChoiceChips label="음식 종류" values={foodTypes} selected={foodType} onSelect={setFoodType} wrap />
          {mode === '회식' ? <ChoiceChips label="주차" values={parkingOptions} selected={parking} onSelect={setParking} wrap /> : null}
          <ChoiceChips label="금액대" values={budgets} selected={budget} onSelect={setBudget} wrap />

          <Pressable disabled={loading} onPress={() => void search()} style={[styles.searchButton, loading && styles.disabled]}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchText}>{mode} 장소 찾아보기</Text>}
          </Pressable>
          <Pressable onPress={() => void openNaverSearch(conditionQuery)} style={styles.naverSearchButton}>
            <Text style={styles.naverSearchText}>N  선택 조건으로 네이버 지도 검색</Text>
          </Pressable>
          <Text style={styles.note}>인원 수용, 실제 가격, 주차·발렛 여부는 매장마다 달라 네이버 지도에서 최종 확인해 주세요.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {places.length > 0 ? (
          <>
            <View style={styles.mapShell}>
              <NaverPlacesMap places={places} selectedId={selected?.id ?? null} onSelect={setSelected} />
            </View>

            {selected ? (
              <View style={styles.selectedCard}>
                <Text style={styles.selectedLabel}>지도에서 선택한 식당</Text>
                <Text style={styles.selectedTitle}>{selected.name}</Text>
                <Text style={styles.selectedMeta}>{selected.address}</Text>
                <Pressable onPress={() => void openRouteMap('naver', selected)} style={styles.routeButton}>
                  <Text style={styles.routeText}>N  네이버 지도로 길찾기</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.results}>
              <Text style={styles.resultTitle}>{region} 추천 식당 {places.length}곳</Text>
              <Text style={styles.source}>장소 출처: 한국관광공사 TourAPI · 지도: 네이버 지도</Text>
              {places.map((place) => (
                <Pressable key={place.id} onPress={() => setSelected(place)} style={[styles.card, selected?.id === place.id && styles.cardSelected]}>
                  <PlaceImage
                    name={place.name}
                    imageUrl={place.imageUrl}
                    attribution={place.imageAttribution}
                    copyrightCode={place.imageCopyrightCode}
                    modificationAllowed={place.imageModificationAllowed}
                  />
                  <Text style={styles.cardTitle}>{place.name}</Text>
                  <Text style={styles.cardMeta}>{place.category} · {place.address}</Text>
                  <Pressable onPress={() => void openRouteMap('naver', place)} style={styles.cardRouteButton}>
                    <Text style={styles.cardRouteText}>네이버 길찾기</Text>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f2f6f3' },
  container: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 36 },
  eyebrow: { color: '#146b45', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 6, color: '#17231c', fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 8, color: '#657269', fontSize: 14, lineHeight: 21 },
  modeRow: { marginTop: 22, flexDirection: 'row', gap: 10 },
  modeButton: { flex: 1, borderWidth: 1, borderColor: '#d9e2dc', borderRadius: 18, backgroundColor: '#ffffff', padding: 15 },
  modeButtonActive: { borderColor: '#146b45', backgroundColor: '#e9f7ef' },
  modeTitle: { color: '#26362c', fontSize: 16, fontWeight: '900' },
  modeTitleActive: { color: '#146b45' },
  modeDescription: { marginTop: 4, color: '#748078', fontSize: 11 },
  builder: { marginTop: 12, borderRadius: 23, backgroundColor: '#ffffff', padding: 18 },
  inputGroup: { marginTop: 20 },
  label: { marginBottom: 10, color: '#34423a', fontSize: 14, fontWeight: '900' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#dce5e0', borderRadius: 13, color: '#17231c', paddingHorizontal: 14, fontSize: 14 },
  searchButton: { marginTop: 24, alignItems: 'center', borderRadius: 14, backgroundColor: '#146b45', paddingVertical: 15 },
  disabled: { opacity: 0.65 },
  searchText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  naverSearchButton: { marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#03c75a', borderRadius: 14, backgroundColor: '#eafff1', paddingVertical: 14 },
  naverSearchText: { color: '#075b2d', fontSize: 13, fontWeight: '900' },
  note: { marginTop: 12, color: '#77827b', fontSize: 11, lineHeight: 17 },
  error: { marginTop: 12, borderRadius: 12, backgroundColor: '#fff0f0', color: '#a23232', padding: 12, fontSize: 12, lineHeight: 18 },
  mapShell: { marginTop: 18, overflow: 'hidden', borderRadius: 20 },
  selectedCard: { marginTop: 12, borderRadius: 18, backgroundColor: '#e7f6ee', padding: 16 },
  selectedLabel: { color: '#146b45', fontSize: 11, fontWeight: '900' },
  selectedTitle: { marginTop: 4, color: '#1c2922', fontSize: 18, fontWeight: '900' },
  selectedMeta: { marginTop: 5, marginBottom: 14, color: '#59675f', fontSize: 12, lineHeight: 18 },
  routeButton: { alignItems: 'center', borderRadius: 12, backgroundColor: '#03c75a', paddingVertical: 13 },
  routeText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  results: { marginTop: 26 },
  resultTitle: { color: '#17231c', fontSize: 22, fontWeight: '900' },
  source: { marginTop: 5, marginBottom: 8, color: '#77827b', fontSize: 11 },
  card: { marginTop: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 19, backgroundColor: '#ffffff', padding: 12 },
  cardSelected: { borderColor: '#146b45' },
  cardTitle: { marginTop: 12, color: '#1d2922', fontSize: 18, fontWeight: '900' },
  cardMeta: { marginTop: 5, color: '#6a756e', fontSize: 12, lineHeight: 18 },
  cardRouteButton: { marginTop: 13, alignItems: 'center', borderRadius: 11, backgroundColor: '#03c75a', paddingVertical: 12 },
  cardRouteText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
});
