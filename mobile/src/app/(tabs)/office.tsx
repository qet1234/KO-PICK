import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useSession } from '@/context/session-context';
import { fetchNaverDiningPlaces, type NaverDiningPlace } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { koreaRegionDistricts, koreaRegions } from '@/lib/korea-regions';
import { openNaverSearch, openRouteMap } from '@/lib/map-links';
import {
  libraryPlaceKey,
  loadPlaceLibrary,
  toggleSavedPlace,
  toLibraryPlace,
} from '@/lib/place-library';

type DiningMode = '회식' | '점심';
type PickerKind = 'region' | 'district' | 'headcount' | 'food' | 'budget' | null;

const headcounts = ['1~2명', '3~4명', '5~8명', '9~12명', '13~20명', '21명 이상'] as const;
const foodTypes = [
  '전체', '한식', '고기·구이', '일식', '중식', '양식',
  '아시아', '분식', '해산물', '뷔페', '카페·디저트', '주점',
] as const;
const dinnerBudgets = ['1인 2만원 이하', '1인 3만원 이하', '1인 5만원 이하', '1인 7만원 이하', '1인 10만원 이상'] as const;
const lunchBudgets = ['1인 1만원 이하', '1인 1.5만원 이하', '1인 2만원 이하', '1인 3만원 이하'] as const;

function CompactSelect({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityLabel={label + ' 선택'}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.compactSelect}
    >
      <Text style={styles.compactLabel}>{label}</Text>
      <View style={styles.compactValueRow}>
        <Text numberOfLines={1} style={styles.compactValue}>{value}</Text>
        <Text style={styles.compactArrow}>⌄</Text>
      </View>
    </MotionPressable>
  );
}

function diningPlaceInput(place: NaverDiningPlace) {
  return { ...place, source: 'NAVER_LOCAL' };
}

function diningPlaceKey(place: NaverDiningPlace) {
  return libraryPlaceKey(toLibraryPlace(diningPlaceInput(place)));
}

export default function OfficeDiningScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [mode, setMode] = useState<DiningMode>('점심');
  const [region, setRegion] = useState('서울');
  const [district, setDistrict] = useState('전체');
  const [officeArea, setOfficeArea] = useState('');
  const [headcount, setHeadcount] = useState('3~4명');
  const [foodType, setFoodType] = useState('한식');
  const [budget, setBudget] = useState('1인 2만원 이하');
  const [places, setPlaces] = useState<NaverDiningPlace[]>([]);
  const [selected, setSelected] = useState<NaverDiningPlace | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());
  const [picker, setPicker] = useState<PickerKind>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const [error, setError] = useState('');

  const budgets = mode === '회식' ? dinnerBudgets : lunchBudgets;
  const districts = ['전체', ...(koreaRegionDistricts[region] ?? [])];

  useEffect(() => {
    let active = true;
    void loadPlaceLibrary().then((library) => {
      if (active) setSavedKeys(new Set(library.saved.map(libraryPlaceKey)));
    });
    return () => { active = false; };
  }, [session?.user.id]);

  const changeMode = (nextMode: DiningMode) => {
    setMode(nextMode);
    setBudget(nextMode === '회식' ? '1인 3만원 이하' : '1인 2만원 이하');
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
        foodDetail: '전체',
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
      foodDetail: '전체',
      headcount,
      budget,
    }).toString();
    const purpose = mode === '회식' ? '팀 회식' : '빠른 점심';
    const area = [region, district === '전체' ? '' : district, officeArea.trim()].filter(Boolean).join(' ');
    try {
      const result = await Share.share({
        title: '오늘어디 · ' + purpose,
        message: ['오늘어디 · ' + purpose, area + ' · ' + foodType + ' · ' + budget, url.toString()].join('\n'),
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

  const toggleSaved = async (place: NaverDiningPlace) => {
    if (!session) {
      Alert.alert('로그인이 필요합니다', '장소를 저장하려면 로그인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return;
    }
    try {
      const next = await toggleSavedPlace(diningPlaceInput(place));
      const key = diningPlaceKey(place);
      setSavedKeys((current) => {
        const updated = new Set(current);
        if (next) updated.add(key);
        else updated.delete(key);
        return updated;
      });
    } catch (nextError) {
      Alert.alert('저장 실패', nextError instanceof Error ? nextError.message : '잠시 후 다시 시도해 주세요.');
    }
  };

  const pickerValues: readonly string[] =
    picker === 'region' ? koreaRegions :
    picker === 'district' ? districts :
    picker === 'headcount' ? headcounts :
    picker === 'food' ? foodTypes :
    picker === 'budget' ? budgets : [];

  const pickerValue =
    picker === 'region' ? region :
    picker === 'district' ? district :
    picker === 'headcount' ? headcount :
    picker === 'food' ? foodType :
    picker === 'budget' ? budget : '';

  const pickerTitle =
    picker === 'region' ? '시·도 선택' :
    picker === 'district' ? region + ' 시·군·구 선택' :
    picker === 'headcount' ? '인원 선택' :
    picker === 'food' ? '음식 종류 선택' :
    picker === 'budget' ? '금액대 선택' : '조건 선택';

  const choosePickerValue = (value: string) => {
    if (picker === 'region') {
      setRegion(value);
      setDistrict('전체');
    } else if (picker === 'district') {
      setDistrict(value);
    } else if (picker === 'headcount') {
      setHeadcount(value);
    } else if (picker === 'food') {
      setFoodType(value);
    } else if (picker === 'budget') {
      setBudget(value);
    }
    setPicker(null);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MotionPressable accessibilityLabel="뒤로 가기" onPress={() => router.back()} style={styles.headerSide}>
            <Text style={styles.back}>‹</Text>
          </MotionPressable>
          <Text style={styles.title}>직장인 식사</Text>
          <View style={styles.headerSide} />
        </View>

        <View style={styles.modeRow}>
          <MotionPressable onPress={() => changeMode('점심')} style={[styles.modeButton, mode === '점심' && styles.modeButtonActive]}>
            <Text style={[styles.modeIcon, mode === '점심' && styles.modeTextActive]}>◷</Text>
            <Text style={[styles.modeText, mode === '점심' && styles.modeTextActive]}>빠른 점심</Text>
          </MotionPressable>
          <MotionPressable onPress={() => changeMode('회식')} style={[styles.modeButton, mode === '회식' && styles.modeButtonActive]}>
            <Text style={[styles.modeIcon, mode === '회식' && styles.modeTextActive]}>♙♙</Text>
            <Text style={[styles.modeText, mode === '회식' && styles.modeTextActive]}>회식</Text>
          </MotionPressable>
        </View>

        <View style={styles.areaRow}>
          <CompactSelect label="시·도" value={region} onPress={() => setPicker('region')} />
          <CompactSelect label="시·군·구" value={district} onPress={() => setPicker('district')} />
        </View>

        <TextInput
          accessibilityLabel="회사, 역 또는 동네"
          onChangeText={setOfficeArea}
          onSubmitEditing={() => void search()}
          placeholder="회사·역·동네 입력 (예: 강남역)"
          placeholderTextColor="#999999"
          returnKeyType="search"
          style={styles.areaInput}
          value={officeArea}
        />

        <View style={styles.filterRow}>
          <CompactSelect label="인원" value={headcount} onPress={() => setPicker('headcount')} />
          <CompactSelect label="음식 종류" value={foodType} onPress={() => setPicker('food')} />
          <CompactSelect label="금액대" value={budget} onPress={() => setPicker('budget')} />
        </View>

        <MotionPressable disabled={loading} onPress={() => void search()} style={[styles.searchButton, loading && styles.disabled]}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.searchButtonText}>조건에 맞는 장소 찾기</Text>}
        </MotionPressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{searched ? '조건에 맞는 장소 ' + places.length + '곳' : '조건을 선택해 장소를 찾아보세요'}</Text>
          <MotionPressable disabled={sharing} onPress={() => void shareDining()} style={styles.shareConditionButton}>
            <Text style={styles.shareConditionText}>{sharing ? '준비 중' : '조건 공유'}</Text>
          </MotionPressable>
        </View>
        {shareNotice ? <Text style={styles.shareNotice}>{shareNotice}</Text> : null}

        {!searched ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyText}>인원·음식 종류·금액대를 고른 뒤 검색해 주세요.</Text>
          </View>
        ) : !loading && places.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyText}>조건에 맞는 음식점을 찾지 못했어요.</Text>
          </View>
        ) : null}

        <View style={styles.list}>
          {places.map((place) => {
            const saved = savedKeys.has(diningPlaceKey(place));
            return (
              <View key={place.id} style={styles.restaurantCard}>
                <MotionPressable onPress={() => setSelected(place)} style={styles.restaurantMain}>
                  <View style={styles.restaurantThumb}>
                    {place.imageUrl ? (
                      <>
                        <Image
                          accessibilityLabel={`${place.name} 음식점 사진`}
                          resizeMode={place.imageModificationAllowed ? 'cover' : 'contain'}
                          source={{ uri: place.imageThumbnailUrl || place.imageUrl }}
                          style={styles.restaurantImage}
                        />
                        <Text numberOfLines={1} style={styles.restaurantPhotoCredit}>
                          관광공사 · {place.imageCopyrightCode === 'Type1' ? '공공누리 1' : '공공누리 3'}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.restaurantPhotoEmpty}>공공사진{"\n"}없음</Text>
                    )}
                  </View>
                  <View style={styles.restaurantCopy}>
                    <Text numberOfLines={1} style={styles.restaurantTitle}>{place.name}</Text>
                    <Text numberOfLines={1} style={styles.restaurantCategory}>{place.category || foodType} · 음식점</Text>
                    <Text numberOfLines={1} style={styles.restaurantMeta}>{budget} · {place.address || region}</Text>
                  </View>
                </MotionPressable>
                <View style={styles.restaurantActions}>
                  <MotionPressable onPress={() => void openRouteMap('naver', place)} style={styles.cardAction}>
                    <Text style={styles.routeIcon}>➤</Text><Text style={styles.cardActionText}>길찾기</Text>
                  </MotionPressable>
                  <MotionPressable onPress={() => void toggleSaved(place)} style={styles.cardAction}>
                    <Text style={[styles.saveIcon, saved && styles.saveIconActive]}>{saved ? '♥' : '♡'}</Text>
                    <Text style={styles.cardActionText}>저장</Text>
                  </MotionPressable>
                </View>
              </View>
            );
          })}
        </View>

        {places.length > 0 ? (
          <View style={styles.mapPanel}>
            <View style={styles.mapHeader}>
              <Text style={styles.mapTitle}>지도에서 보기</Text>
              <Text style={styles.mapCount}>{places.length}곳</Text>
            </View>
            <View style={styles.mapShell}>
              <NaverPlacesMap places={places} selectedId={selected?.id ?? null} onSelect={setSelected} />
            </View>
            {selected ? (
              <View style={styles.selectedBar}>
                <Text numberOfLines={1} style={styles.selectedName}>{selected.name}</Text>
                <MotionPressable onPress={() => void openNaverSearch(selected.name)} style={styles.selectedButton}>
                  <Text style={styles.selectedButtonText}>네이버에서 보기</Text>
                </MotionPressable>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.source}>장소: 네이버 지역검색 · 사진: 한국관광공사 TourAPI · 지도: 네이버 지도</Text>
      </ScrollView>

      <Modal animationType="slide" transparent visible={picker !== null} onRequestClose={() => setPicker(null)}>
        <View style={styles.modalRoot}>
          <MotionPressable accessibilityLabel="선택 창 닫기" onPress={() => setPicker(null)} style={styles.modalBackdrop} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
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
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                  >
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
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 26 },
  header: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSide: { width: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  back: { color: '#171717', fontSize: 32, lineHeight: 34 },
  title: { color: '#171717', fontSize: 18, fontWeight: '900' },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 3 },
  modeButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: '#dedede', borderRadius: 9, backgroundColor: '#ffffff' },
  modeButtonActive: { borderColor: '#ff3b36', backgroundColor: '#ff3b36' },
  modeIcon: { color: '#222222', fontSize: 17, fontWeight: '900' },
  modeText: { color: '#222222', fontSize: 14, fontWeight: '900' },
  modeTextActive: { color: '#ffffff' },
  areaRow: { marginTop: 9, flexDirection: 'row', gap: 7 },
  areaInput: { minHeight: 42, marginTop: 7, borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 9, backgroundColor: '#ffffff', color: '#171717', paddingHorizontal: 11, fontSize: 11 },
  filterRow: { marginTop: 7, flexDirection: 'row', gap: 7 },
  compactSelect: { flex: 1, minWidth: 0, minHeight: 56, justifyContent: 'center', borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 9, backgroundColor: '#ffffff', paddingHorizontal: 9, paddingVertical: 7 },
  compactLabel: { color: '#8a8a8a', fontSize: 9, fontWeight: '800' },
  compactValueRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  compactValue: { flex: 1, color: '#242424', fontSize: 11, fontWeight: '900' },
  compactArrow: { color: '#333333', fontSize: 13 },
  searchButton: { minHeight: 47, marginTop: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#ff3b36' },
  searchButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  error: { marginTop: 8, borderRadius: 8, backgroundColor: '#fff0ef', color: '#a32925', padding: 10, fontSize: 10 },
  resultHeader: { marginTop: 18, minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultTitle: { flex: 1, color: '#242424', fontSize: 12, fontWeight: '900' },
  shareConditionButton: { minHeight: 31, justifyContent: 'center', borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 8, paddingHorizontal: 10 },
  shareConditionText: { color: '#555555', fontSize: 9, fontWeight: '800' },
  shareNotice: { marginTop: 4, color: '#39735a', fontSize: 9 },
  emptyState: { minHeight: 125, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ededed', borderRadius: 10, backgroundColor: '#fafafa', padding: 18 },
  emptyIcon: { fontSize: 28 },
  emptyText: { marginTop: 8, color: '#777777', fontSize: 11, textAlign: 'center' },
  list: { gap: 8 },
  restaurantCard: { minHeight: 102, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e3e3e3', borderRadius: 10, backgroundColor: '#ffffff', padding: 7 },
  restaurantMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  restaurantThumb: { width: 84, height: 84, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 8, backgroundColor: '#f1f2f0' },
  restaurantImage: { width: '100%', height: '100%' },
  restaurantPhotoEmpty: { color: '#818681', fontSize: 10, fontWeight: '800', lineHeight: 14, textAlign: 'center' },
  restaurantPhotoCredit: { maxWidth: 78, position: 'absolute', right: 3, bottom: 3, overflow: 'hidden', borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.62)', color: '#ffffff', fontSize: 6, fontWeight: '800', paddingHorizontal: 3, paddingVertical: 2 },
  restaurantCopy: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
  restaurantTitle: { color: '#202020', fontSize: 14, fontWeight: '900' },
  restaurantCategory: { marginTop: 5, color: '#2ba756', fontSize: 10, fontWeight: '800' },
  restaurantMeta: { marginTop: 5, color: '#5f5f5f', fontSize: 9 },
  restaurantActions: { width: 66, gap: 5 },
  cardAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1, borderColor: '#e1e1e1', borderRadius: 8, backgroundColor: '#ffffff' },
  routeIcon: { color: '#ff3b36', fontSize: 11, fontWeight: '900' },
  saveIcon: { color: '#333333', fontSize: 13, fontWeight: '900' },
  saveIconActive: { color: '#ff3b36' },
  cardActionText: { color: '#2a2a2a', fontSize: 9, fontWeight: '900' },
  mapPanel: { marginTop: 18 },
  mapHeader: { marginBottom: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapTitle: { color: '#242424', fontSize: 12, fontWeight: '900' },
  mapCount: { color: '#ff3b36', fontSize: 10, fontWeight: '900' },
  mapShell: { height: 205, overflow: 'hidden', borderRadius: 10, backgroundColor: '#eef2e8' },
  selectedBar: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderTopWidth: 0, borderColor: '#e2e2e2', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingHorizontal: 9 },
  selectedName: { flex: 1, color: '#242424', fontSize: 11, fontWeight: '900' },
  selectedButton: { minHeight: 31, justifyContent: 'center', borderRadius: 7, backgroundColor: '#ff3b36', paddingHorizontal: 9 },
  selectedButtonText: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  source: { marginTop: 12, color: '#9a9a9a', fontSize: 8, textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  modalSheet: { maxHeight: '72%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: '#ffffff', paddingHorizontal: 15, paddingTop: 9, paddingBottom: 24 },
  modalHandle: { width: 40, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#d5d5d5' },
  modalHeader: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#171717', fontSize: 16, fontWeight: '900' },
  closeButton: { minWidth: 44, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#555555', fontSize: 11, fontWeight: '800' },
  pickerList: { gap: 6, paddingBottom: 14 },
  pickerItem: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 9, paddingHorizontal: 12 },
  pickerItemActive: { borderColor: '#ff3b36', backgroundColor: '#fff0ef' },
  pickerItemText: { color: '#3a3a3a', fontSize: 12, fontWeight: '800' },
  pickerItemTextActive: { color: '#d42c27' },
  pickerCheck: { color: '#ff3b36', fontSize: 15, fontWeight: '900' },
});
