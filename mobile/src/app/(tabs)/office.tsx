import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { fetchNaverDiningPlaces, type NaverDiningPlace } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { openNaverSearch, openRouteMap } from '@/lib/map-links';

type DiningMode = '회식' | '점심';

const regions = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const;
const headcounts = ['2~4명', '5~8명', '9~12명', '13~20명', '21명 이상'] as const;
const foodTypes = [
  '전체', '한식', '고기·구이', '일식', '중식', '양식', '아시아', '분식',
  '해산물', '뷔페', '카페·디저트', '주점',
] as const;
const foodDetails: Record<string, readonly string[]> = {
  전체: ['전체', '백반·가정식', '국밥·탕', '고기', '초밥', '중화요리', '파스타', '분식', '해산물'],
  한식: ['전체', '백반·가정식', '국밥·탕', '찌개·전골', '한정식', '냉면·국수', '족발·보쌈', '닭요리'],
  '고기·구이': ['전체', '삼겹살', '소고기', '갈비', '곱창·막창', '닭갈비', '오리구이', '양꼬치'],
  일식: ['전체', '초밥', '돈카츠', '라멘', '우동·소바', '덮밥', '이자카야', '오마카세'],
  중식: ['전체', '짜장·짬뽕', '마라탕', '중화요리', '딤섬', '훠궈', '양꼬치'],
  양식: ['전체', '파스타', '피자', '스테이크', '햄버거', '브런치', '멕시칸'],
  아시아: ['전체', '베트남', '태국', '인도', '동남아', '중동'],
  분식: ['전체', '김밥', '떡볶이', '라면', '만두', '샌드위치'],
  해산물: ['전체', '회·사시미', '조개구이', '해물탕', '생선구이', '장어', '대게·킹크랩'],
  뷔페: ['전체', '한식뷔페', '샐러드바', '호텔뷔페', '고기뷔페', '초밥뷔페'],
  '카페·디저트': ['전체', '카페', '베이커리', '디저트', '아이스크림', '브런치카페'],
  주점: ['전체', '호프·맥주', '이자카야', '포차', '와인바', '전통주', '요리주점'],
};
const dinnerBudgets = ['1인 2만원 이하', '1인 3만원 이하', '1인 5만원 이하', '1인 7만원 이하', '1인 10만원 이상'] as const;
const lunchBudgets = ['1인 1만원 이하', '1인 1.5만원 이하', '1인 2만원 이하', '1인 3만원 이하'] as const;

export default function OfficeDiningScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const shouldScrollToMapRef = useRef(false);
  const [mode, setMode] = useState<DiningMode>('회식');
  const [region, setRegion] = useState('서울');
  const [officeArea, setOfficeArea] = useState('');
  const [headcount, setHeadcount] = useState('5~8명');
  const [foodType, setFoodType] = useState('전체');
  const [foodDetail, setFoodDetail] = useState('전체');
  const [budget, setBudget] = useState('1인 3만원 이하');
  const [places, setPlaces] = useState<NaverDiningPlace[]>([]);
  const [selected, setSelected] = useState<NaverDiningPlace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const budgets = mode === '회식' ? dinnerBudgets : lunchBudgets;
  const availableFoodDetails = foodDetails[foodType] ?? foodDetails.전체;

  const changeMode = (nextMode: DiningMode) => {
    setMode(nextMode);
    setBudget(nextMode === '회식' ? '1인 3만원 이하' : '1인 1만원 이하');
  };

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchNaverDiningPlaces({
        mode,
        region,
        officeArea: officeArea.trim(),
        foodType,
        foodDetail,
        headcount,
        budget,
      });
      shouldScrollToMapRef.current = result.places.length > 0;
      setPlaces(result.places);
      setSelected(result.places[0] ?? null);
    } catch (nextError) {
      setPlaces([]);
      setSelected(null);
      shouldScrollToMapRef.current = false;
      setError(nextError instanceof Error ? nextError.message : '식당을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const shareDining = async () => {
    const url = new URL('/office-dining', appConfig.webUrl);
    url.search = new URLSearchParams({
      shared: '1',
      mode,
      region,
      district: '전체',
      officeArea: officeArea.trim(),
      foodType,
      foodDetail,
      headcount,
      budget,
    }).toString();
    const purpose = mode === '회식' ? '팀 회식' : '빠른 점심';
    const food = foodDetail === '전체' ? foodType : foodDetail;
    const description = `${region}${officeArea.trim() ? ` ${officeArea.trim()}` : ''} · ${food} · ${budget}${mode === '회식' ? ` · ${headcount}` : ''}`;

    try {
      await Share.share({
        title: `오늘어디 · ${purpose}`,
        message: `오늘어디 · ${purpose}\n${description}\n${url.toString()}`,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '공유 화면을 열지 못했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>OFFICE DINING</Text>
        <Text style={styles.title}>점심부터 팀 회식까지</Text>
        <Text style={styles.subtitle}>지역·음식 종류·금액대를 고르면 네이버 음식점명이 지도 마커로 표시됩니다.</Text>

        <View style={styles.modeRow}>
          {(['회식', '점심'] as DiningMode[]).map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === item }}
              key={item}
              onPress={() => changeMode(item)}
              style={[styles.modeButton, mode === item && styles.modeButtonActive]}>
              <Text style={[styles.modeTitle, mode === item && styles.modeTitleActive]}>{item === '회식' ? '팀 회식' : '빠른 점심'}</Text>
              <Text style={styles.modeDescription}>{item === '회식' ? '인원·음식·금액대' : '근처에서 한 끼'}</Text>
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
          <ChoiceChips
            label="음식 대분류"
            values={foodTypes}
            selected={foodType}
            onSelect={(value) => {
              setFoodType(value);
              setFoodDetail('전체');
            }}
            wrap
          />
          <ChoiceChips label="세부 분류" values={availableFoodDetails} selected={foodDetail} onSelect={setFoodDetail} wrap />
          <ChoiceChips label="금액대" values={budgets} selected={budget} onSelect={setBudget} wrap />

          <Pressable disabled={loading} onPress={() => void search()} style={[styles.searchButton, loading && styles.disabled]}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchText}>{mode} 장소 찾아보기</Text>}
          </Pressable>
          <Pressable onPress={() => void shareDining()} style={styles.shareButton}>
            <Text style={styles.shareText}>{mode === '회식' ? '회식' : '점심'} 조건 카카오톡 링크 공유</Text>
          </Pressable>
          <Text style={styles.note}>여러 세부 음식 검색 결과를 합쳐 최대 50곳의 음식점명을 보여드립니다. 실제 메뉴 가격과 단체 수용 여부는 매장 상세에서 최종 확인해 주세요.</Text>
          <Text style={styles.shareNote}>공유 링크에는 선택 조건과 입력한 회사·역·동네가 포함되며 계정 정보는 포함되지 않습니다.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {places.length > 0 ? (
          <>
            <View
              style={styles.mapShell}
              onLayout={(event) => {
                if (!shouldScrollToMapRef.current) return;
                shouldScrollToMapRef.current = false;
                scrollRef.current?.scrollTo({
                  y: Math.max(0, event.nativeEvent.layout.y - 16),
                  animated: true,
                });
              }}>
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
              <Text style={styles.resultTitle}>{region} · {foodDetail === '전체' ? foodType : foodDetail} · {budget} 음식점 {places.length}곳</Text>
              <Text style={styles.source}>장소: 네이버 지역검색 · 지도: 네이버 지도</Text>
              {places.map((place) => (
                <Pressable key={place.id} onPress={() => setSelected(place)} style={[styles.card, selected?.id === place.id && styles.cardSelected]}>
                  <Text style={styles.cardTitle}>{place.name}</Text>
                  <Text style={styles.cardMeta}>{place.category} · {place.address}</Text>
                  <Pressable onPress={() => void openNaverSearch(place.name)} style={styles.nameSearchButton}>
                    <Text style={styles.nameSearchText}>음식점명으로 네이버 지도 보기</Text>
                  </Pressable>
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
  shareButton: { marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2ca00', borderRadius: 14, backgroundColor: '#fee500', paddingVertical: 15 },
  shareText: { color: '#191919', fontSize: 14, fontWeight: '900' },
  note: { marginTop: 12, color: '#77827b', fontSize: 11, lineHeight: 17 },
  shareNote: { marginTop: 5, color: '#77827b', fontSize: 11, lineHeight: 17 },
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
  cardTitle: { color: '#1d2922', fontSize: 18, fontWeight: '900' },
  cardMeta: { marginTop: 5, color: '#6a756e', fontSize: 12, lineHeight: 18 },
  nameSearchButton: { marginTop: 13, alignItems: 'center', borderWidth: 1, borderColor: '#03c75a', borderRadius: 11, backgroundColor: '#eafff1', paddingVertical: 12 },
  nameSearchText: { color: '#075b2d', fontSize: 13, fontWeight: '900' },
  cardRouteButton: { marginTop: 13, alignItems: 'center', borderRadius: 11, backgroundColor: '#03c75a', paddingVertical: 12 },
  cardRouteText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
});
