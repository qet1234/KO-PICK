import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { NaverPlacesMap } from '@/components/naver-places-map';
import { fetchNaverDiningPlaces, type NaverDiningPlace } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { koreaRegionDistricts, koreaRegions } from '@/lib/korea-regions';
import { openNaverSearch, openRouteMap } from '@/lib/map-links';

type DiningMode = '회식' | '점심';
type PickerKind = 'region' | 'district' | null;

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

type ChoiceGroupProps = {
  label: string;
  values: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
};

function ChoiceGroup({ label, values, selected, onSelect }: ChoiceGroupProps) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {values.map((value) => {
          const active = selected === value;
          return (
            <MotionPressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={value}
              onPress={() => onSelect(value)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text>
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
};

function SelectField({ label, value, onPress }: SelectFieldProps) {
  return (
    <View style={styles.selectGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <MotionPressable accessibilityRole="button" onPress={onPress} style={styles.selectButton}>
        <Text numberOfLines={1} style={styles.selectText}>{value}</Text>
        <Text style={styles.selectArrow}>⌄</Text>
      </MotionPressable>
    </View>
  );
}

export default function OfficeDiningScreen() {
  const [mode, setMode] = useState<DiningMode>('회식');
  const [region, setRegion] = useState('서울');
  const [district, setDistrict] = useState('전체');
  const [officeArea, setOfficeArea] = useState('');
  const [headcount, setHeadcount] = useState('5~8명');
  const [foodType, setFoodType] = useState('전체');
  const [foodDetail, setFoodDetail] = useState('전체');
  const [budget, setBudget] = useState('1인 3만원 이하');
  const [places, setPlaces] = useState<NaverDiningPlace[]>([]);
  const [selected, setSelected] = useState<NaverDiningPlace | null>(null);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [error, setError] = useState('');

  const budgets = mode === '회식' ? dinnerBudgets : lunchBudgets;
  const availableFoodDetails = foodDetails[foodType] ?? foodDetails.전체;
  const districts = ['전체', ...(koreaRegionDistricts[region] ?? [])];
  const pickerValues = picker === 'region' ? koreaRegions : districts;
  const pickerValue = picker === 'region' ? region : district;

  const changeMode = (nextMode: DiningMode) => {
    setMode(nextMode);
    setBudget(nextMode === '회식' ? '1인 3만원 이하' : '1인 1만원 이하');
    setShareNotice('');
  };

  const search = async () => {
    setLoading(true);
    setSearched(true);
    setError('');
    setShareNotice('');
    try {
      const result = await fetchNaverDiningPlaces({
        mode,
        region,
        district,
        officeArea: officeArea.trim(),
        foodType,
        foodDetail,
        headcount,
        budget,
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

  const shareDining = async () => {
    setSharing(true);
    setError('');
    setShareNotice('');
    const url = new URL('/office-dining', appConfig.webUrl);
    url.search = new URLSearchParams({
      shared: '1',
      mode,
      region,
      district,
      officeArea: officeArea.trim(),
      foodType,
      foodDetail,
      headcount,
      budget,
    }).toString();
    const purpose = mode === '회식' ? '팀 회식' : '빠른 점심';
    const food = foodDetail === '전체' ? foodType : foodDetail;
    const area = [region, district === '전체' ? '' : district, officeArea.trim()].filter(Boolean).join(' ');
    const description = `${area} · ${food} · ${budget}${mode === '회식' ? ` · ${headcount}` : ''}`;

    try {
      const result = await Share.share({
        title: `오늘어디 · ${purpose}`,
        message: `오늘어디 · ${purpose}\n${description}\n${url.toString()}`,
      });
      if (result.action === Share.sharedAction) {
        setShareNotice('공유 화면을 열었습니다. 카카오톡을 선택해 조건을 보내세요.');
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '공유 화면을 열지 못했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const choosePickerValue = (value: string) => {
    if (picker === 'region') {
      setRegion(value);
      setDistrict('전체');
    } else {
      setDistrict(value);
    }
    setPicker(null);
  };

  const areaSummary = [region, district === '전체' ? '' : district, officeArea.trim()].filter(Boolean).join(' ');
  const foodSummary = foodDetail === '전체' ? foodType : foodDetail;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>OFFICE DINING</Text>
          <Text style={styles.heroTitle}>오늘 점심부터{`\n`}팀 회식까지 한 번에</Text>
          <Text style={styles.heroDescription}>
            지역·음식 종류·금액대를 고르면 네이버 음식점명을 지도 마커로 바로 비교할 수 있습니다.
          </Text>
          <View style={styles.stepList}>
            {['조건 선택', '지도 비교', '네이버 길찾기'].map((label, index) => (
              <View key={label} style={styles.stepItem}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.stepText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.modeRow}>
          {(['회식', '점심'] as DiningMode[]).map((item) => {
            const active = mode === item;
            return (
              <MotionPressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={item}
                onPress={() => changeMode(item)}
                style={[styles.modeButton, active && styles.modeButtonActive]}>
                <Text style={[styles.modeTitle, active && styles.modeTitleActive]}>
                  {item === '회식' ? '팀 회식' : '빠른 점심'}
                </Text>
                <Text style={[styles.modeDescription, active && styles.modeDescriptionActive]}>
                  {item === '회식' ? '인원·음식·금액대' : '근처에서 빠르게 한 끼'}
                </Text>
              </MotionPressable>
            );
          })}
        </View>

        <View style={styles.builder}>
          <View style={styles.builderHeader}>
            <View style={styles.builderHeading}>
              <Text style={styles.builderEyebrow}>{mode === '회식' ? 'TEAM DINNER' : 'QUICK LUNCH'}</Text>
              <Text style={styles.builderTitle}>어떤 식사를 찾으세요?</Text>
            </View>
            <View style={styles.naverBadge}>
              <View style={styles.naverDot} />
              <Text style={styles.naverBadgeText}>네이버 지도 연동</Text>
            </View>
          </View>

          <View style={styles.selectRow}>
            <SelectField label="시·도" value={region} onPress={() => setPicker('region')} />
            <SelectField label="시·군·구" value={district} onPress={() => setPicker('district')} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>회사·역·동네 (선택)</Text>
            <TextInput
              accessibilityLabel="회사, 역 또는 동네"
              value={officeArea}
              onChangeText={setOfficeArea}
              placeholder="예: 강남역, 판교 테크노밸리"
              placeholderTextColor="#8a94aa"
              returnKeyType="search"
              onSubmitEditing={() => void search()}
              style={styles.input}
            />
          </View>

          {mode === '회식' ? (
            <ChoiceGroup label="인원" values={headcounts} selected={headcount} onSelect={setHeadcount} />
          ) : null}
          <ChoiceGroup
            label="음식 대분류"
            values={foodTypes}
            selected={foodType}
            onSelect={(value) => {
              setFoodType(value);
              setFoodDetail('전체');
            }}
          />
          <ChoiceGroup label="세부 분류" values={availableFoodDetails} selected={foodDetail} onSelect={setFoodDetail} />
          <ChoiceGroup label="금액대" values={budgets} selected={budget} onSelect={setBudget} />

          <View style={styles.actionRow}>
            <MotionPressable
              disabled={loading}
              onPress={() => void search()}
              style={[styles.searchButton, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchText}>{mode} 장소 찾아보기</Text>}
            </MotionPressable>
            <MotionPressable
              disabled={sharing}
              onPress={() => void shareDining()}
              style={[styles.shareButton, sharing && styles.disabled]}>
              <Text style={styles.shareText}>{sharing ? '공유 준비 중' : '카카오톡 링크 공유'}</Text>
            </MotionPressable>
          </View>

          <Text style={styles.note}>
            여러 세부 음식 검색 결과를 합쳐 최대 50곳의 음식점명을 보여드립니다. 실제 메뉴 가격과 단체 수용 여부는 매장 상세에서 최종 확인해 주세요.
          </Text>
          <Text style={styles.shareNote}>
            공유 링크에는 선택 조건과 입력한 회사·역·동네가 포함되며 계정 정보는 포함되지 않습니다.
          </Text>
          {shareNotice ? <Text style={styles.shareNotice}>{shareNotice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.mapPanel}>
          <View style={styles.panelHeadingRow}>
            <View style={styles.panelHeadingCopy}>
              <Text style={styles.panelEyebrow}>NAVER MAP</Text>
              <Text style={styles.panelTitle}>음식점명과 마커로 비교하기</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{places.length}곳</Text>
            </View>
          </View>
          <View style={styles.mapShell}>
            <NaverPlacesMap places={places} selectedId={selected?.id ?? null} onSelect={setSelected} />
          </View>
          {selected ? (
            <View style={styles.selectedCard}>
              <Text style={styles.selectedLabel}>지도에서 선택한 식당</Text>
              <Text style={styles.selectedTitle}>{selected.name}</Text>
              <Text style={styles.selectedMeta}>{selected.category} · {selected.address}</Text>
              <MotionPressable onPress={() => void openRouteMap('naver', selected)} style={styles.routeButton}>
                <Text style={styles.routeText}>N  네이버 지도로 길찾기</Text>
              </MotionPressable>
            </View>
          ) : null}
        </View>

        <View style={styles.resultsPanel}>
          <Text style={styles.panelEyebrow}>NAVER RESTAURANTS</Text>
          <Text style={styles.panelTitle}>조건에 맞는 음식점</Text>
          <Text style={styles.resultSummary}>
            {areaSummary} · {foodSummary} · {budget}{mode === '회식' ? ` · ${headcount}` : ''}
          </Text>
          <Text style={styles.source}>장소: 네이버 지역검색 · 지도: 네이버 지도</Text>

          {!searched ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>조건을 고르고 음식점을 찾아보세요</Text>
              <Text style={styles.emptyText}>검색하면 최대 50곳의 음식점과 지도 마커를 한 번에 비교할 수 있습니다.</Text>
            </View>
          ) : !loading && places.length === 0 && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>조건에 맞는 음식점을 찾지 못했어요</Text>
              <Text style={styles.emptyText}>회사·역·동네를 비우거나 음식 분류와 금액대를 넓혀 다시 검색해 보세요.</Text>
            </View>
          ) : null}

          {places.map((place, index) => {
            const active = selected?.id === place.id;
            return (
              <View key={place.id} style={[styles.restaurantCard, active && styles.restaurantCardActive]}>
                <MotionPressable onPress={() => setSelected(place)} style={styles.restaurantMain}>
                  <View style={styles.restaurantNumber}>
                    <Text style={styles.restaurantNumberText}>{String(index + 1).padStart(2, '0')}</Text>
                  </View>
                  <View style={styles.restaurantCopy}>
                    <Text style={styles.restaurantCategory}>{place.category || '음식점'}</Text>
                    <Text style={styles.restaurantTitle}>{place.name}</Text>
                    <Text style={styles.restaurantAddress}>{place.address}</Text>
                  </View>
                </MotionPressable>
                <View style={styles.restaurantActions}>
                  <MotionPressable onPress={() => void openNaverSearch(place.name)} style={styles.nameSearchButton}>
                    <Text style={styles.nameSearchText}>음식점명으로 보기</Text>
                  </MotionPressable>
                  <MotionPressable onPress={() => void openRouteMap('naver', place)} style={styles.cardRouteButton}>
                    <Text style={styles.cardRouteText}>네이버 길찾기</Text>
                  </MotionPressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={picker !== null} onRequestClose={() => setPicker(null)}>
        <View style={styles.modalRoot}>
          <MotionPressable accessibilityLabel="선택 창 닫기" onPress={() => setPicker(null)} style={styles.modalBackdrop} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>AREA SELECT</Text>
                <Text style={styles.modalTitle}>{picker === 'region' ? '시·도 선택' : `${region} 시·군·구 선택`}</Text>
              </View>
              <MotionPressable accessibilityLabel="닫기" onPress={() => setPicker(null)} style={styles.closeButton}>
                <Text style={styles.closeText}>닫기</Text>
              </MotionPressable>
            </View>
            <ScrollView contentContainerStyle={styles.pickerList}>
              {pickerValues.map((value) => {
                const active = pickerValue === value;
                return (
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    key={value}
                    onPress={() => choosePickerValue(value)}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}>
                    <Text style={[styles.pickerItemText, active && styles.pickerItemTextActive]}>{value}</Text>
                    {active ? <Text style={styles.pickerCheck}>✓</Text> : null}
                  </MotionPressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fc' },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  hero: { overflow: 'hidden', borderRadius: 28, backgroundColor: '#101d47', padding: 24 },
  heroEyebrow: { color: '#91aaff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { marginTop: 10, color: '#ffffff', fontSize: 30, lineHeight: 39, fontWeight: '900', letterSpacing: -0.7 },
  heroDescription: { marginTop: 12, color: '#ced8f8', fontSize: 14, lineHeight: 22 },
  stepList: { marginTop: 20, gap: 8 },
  stepItem: { minHeight: 42, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#304273', borderRadius: 13, backgroundColor: '#19295b', paddingHorizontal: 12 },
  stepNumber: { width: 24, height: 24, textAlign: 'center', textAlignVertical: 'center', borderRadius: 12, backgroundColor: '#ff9d42', color: '#182036', fontSize: 12, fontWeight: '900' },
  stepText: { marginLeft: 10, color: '#ffffff', fontSize: 13, fontWeight: '800' },
  modeRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  modeButton: { flex: 1, minHeight: 86, justifyContent: 'center', borderWidth: 1, borderColor: '#dce2ef', borderRadius: 18, backgroundColor: '#ffffff', padding: 15 },
  modeButtonActive: { borderColor: '#3157c8', backgroundColor: '#3157c8' },
  modeTitle: { color: '#182036', fontSize: 16, fontWeight: '900' },
  modeTitleActive: { color: '#ffffff' },
  modeDescription: { marginTop: 4, color: '#667188', fontSize: 11 },
  modeDescriptionActive: { color: '#dce5ff' },
  builder: { marginTop: 12, borderWidth: 1, borderColor: '#dce2ef', borderRadius: 24, backgroundColor: '#ffffff', padding: 18 },
  builderHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  builderHeading: { flex: 1 },
  builderEyebrow: { color: '#3157c8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  builderTitle: { marginTop: 5, color: '#182036', fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  naverBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dce2ef', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  naverDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#03c75a' },
  naverBadgeText: { marginLeft: 6, color: '#566077', fontSize: 10, fontWeight: '800' },
  selectRow: { marginTop: 18, flexDirection: 'row', gap: 10 },
  selectGroup: { flex: 1 },
  fieldLabel: { marginBottom: 9, color: '#3e4961', fontSize: 13, fontWeight: '900' },
  selectButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#dce2ef', borderRadius: 13, backgroundColor: '#fbfcff', paddingHorizontal: 13 },
  selectText: { flex: 1, color: '#182036', fontSize: 14, fontWeight: '700' },
  selectArrow: { marginLeft: 6, color: '#667188', fontSize: 18, fontWeight: '700' },
  inputGroup: { marginTop: 20 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#dce2ef', borderRadius: 13, backgroundColor: '#fbfcff', color: '#182036', paddingHorizontal: 14, fontSize: 14 },
  choiceGroup: { marginTop: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: '#dce2ef', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { borderColor: '#3157c8', backgroundColor: '#eef3ff' },
  chipText: { color: '#59647b', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#3157c8', fontWeight: '900' },
  actionRow: { marginTop: 26, gap: 10 },
  searchButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#3157c8', paddingVertical: 14 },
  disabled: { opacity: 0.6 },
  searchText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  shareButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2ca00', borderRadius: 14, backgroundColor: '#fee500', paddingVertical: 14 },
  shareText: { color: '#191919', fontSize: 14, fontWeight: '900' },
  note: { marginTop: 13, color: '#667188', fontSize: 11, lineHeight: 17 },
  shareNote: { marginTop: 5, color: '#667188', fontSize: 11, lineHeight: 17 },
  shareNotice: { marginTop: 11, borderRadius: 11, backgroundColor: '#eef3ff', color: '#3157c8', padding: 11, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  error: { marginTop: 11, borderRadius: 11, backgroundColor: '#fff0f0', color: '#a23232', padding: 11, fontSize: 12, lineHeight: 18 },
  mapPanel: { marginTop: 16, borderWidth: 1, borderColor: '#dce2ef', borderRadius: 24, backgroundColor: '#ffffff', padding: 18 },
  panelHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  panelHeadingCopy: { flex: 1 },
  panelEyebrow: { color: '#3157c8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  panelTitle: { marginTop: 5, color: '#182036', fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  countBadge: { borderRadius: 999, backgroundColor: '#eef3ff', paddingHorizontal: 11, paddingVertical: 7 },
  countText: { color: '#3157c8', fontSize: 11, fontWeight: '900' },
  mapShell: { marginTop: 16, overflow: 'hidden', borderRadius: 18, backgroundColor: '#eef3ff' },
  selectedCard: { marginTop: 12, borderWidth: 1, borderColor: '#cdd9ff', borderRadius: 16, backgroundColor: '#eef3ff', padding: 14 },
  selectedLabel: { color: '#3157c8', fontSize: 10, fontWeight: '900' },
  selectedTitle: { marginTop: 4, color: '#182036', fontSize: 18, fontWeight: '900' },
  selectedMeta: { marginTop: 5, marginBottom: 13, color: '#667188', fontSize: 12, lineHeight: 18 },
  routeButton: { alignItems: 'center', borderRadius: 12, backgroundColor: '#03c75a', paddingVertical: 13 },
  routeText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  resultsPanel: { marginTop: 16, borderWidth: 1, borderColor: '#dce2ef', borderRadius: 24, backgroundColor: '#ffffff', padding: 18 },
  resultSummary: { marginTop: 9, color: '#59647b', fontSize: 12, lineHeight: 18 },
  source: { marginTop: 4, color: '#8a94aa', fontSize: 10 },
  emptyState: { marginTop: 16, borderRadius: 16, backgroundColor: '#f5f7fc', padding: 18 },
  emptyTitle: { color: '#182036', fontSize: 15, fontWeight: '900' },
  emptyText: { marginTop: 6, color: '#667188', fontSize: 12, lineHeight: 19 },
  restaurantCard: { marginTop: 12, borderWidth: 1, borderColor: '#dce2ef', borderRadius: 18, backgroundColor: '#ffffff', padding: 13 },
  restaurantCardActive: { borderColor: '#3157c8', backgroundColor: '#fbfcff' },
  restaurantMain: { flexDirection: 'row', alignItems: 'flex-start' },
  restaurantNumber: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#101d47' },
  restaurantNumberText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  restaurantCopy: { flex: 1, marginLeft: 11 },
  restaurantCategory: { color: '#3157c8', fontSize: 10, fontWeight: '900' },
  restaurantTitle: { marginTop: 3, color: '#182036', fontSize: 17, fontWeight: '900' },
  restaurantAddress: { marginTop: 5, color: '#667188', fontSize: 11, lineHeight: 17 },
  restaurantActions: { marginTop: 13, flexDirection: 'row', gap: 8 },
  nameSearchButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: '#3157c8', borderRadius: 11, backgroundColor: '#eef3ff', paddingVertical: 12 },
  nameSearchText: { color: '#3157c8', fontSize: 11, fontWeight: '900' },
  cardRouteButton: { flex: 1, alignItems: 'center', borderRadius: 11, backgroundColor: '#03c75a', paddingVertical: 12 },
  cardRouteText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(16, 29, 71, 0.42)' },
  modalSheet: { maxHeight: '76%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#ffffff', paddingTop: 10, paddingHorizontal: 18, paddingBottom: 24 },
  modalHandle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#dce2ef' },
  modalHeader: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalEyebrow: { color: '#3157c8', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  modalTitle: { marginTop: 4, color: '#182036', fontSize: 21, fontWeight: '900' },
  closeButton: { borderRadius: 999, backgroundColor: '#eef3ff', paddingHorizontal: 13, paddingVertical: 9 },
  closeText: { color: '#3157c8', fontSize: 12, fontWeight: '900' },
  pickerList: { paddingTop: 14, paddingBottom: 8, gap: 7 },
  pickerItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#dce2ef', borderRadius: 13, paddingHorizontal: 14 },
  pickerItemActive: { borderColor: '#3157c8', backgroundColor: '#eef3ff' },
  pickerItemText: { color: '#3e4961', fontSize: 14, fontWeight: '700' },
  pickerItemTextActive: { color: '#3157c8', fontWeight: '900' },
  pickerCheck: { color: '#3157c8', fontSize: 16, fontWeight: '900' },
});
