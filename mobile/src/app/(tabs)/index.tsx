import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MotionPressable } from '@/components/motion-pressable';
import { LiveWeatherHeader } from '@/components/live-weather-header';
import { HomeNaverMapPreview } from '@/components/home-naver-map-preview';
import { appConfig } from '@/lib/config';
import { koreaRegionDistricts } from '@/lib/korea-regions';
import courseSettingImage from '../../../assets/images/course-setting-3d.png';
import officeDiningCardImage from '../../../assets/images/office-dining-card.webp';
import relationshipSoloImage from '../../../assets/images/home/relationship-solo.webp';
import relationshipCoupleImage from '../../../assets/images/home/relationship-couple.webp';
import relationshipFriendImage from '../../../assets/images/home/relationship-friend.webp';
import relationshipFamilyImage from '../../../assets/images/home/relationship-family.webp';
import categoryAttractionImage from '../../../assets/images/home/category-attraction.webp';
import categoryFestivalImage from '../../../assets/images/home/category-festival.webp';

const homeRegions = ['전국', ...Object.keys(koreaRegionDistricts)];
const relationships = [
  { label: '혼자', image: relationshipSoloImage },
  { label: '커플', image: relationshipCoupleImage },
  { label: '친구', image: relationshipFriendImage },
  { label: '가족', image: relationshipFamilyImage },
] as const;
const quickCategories = [
  { label: '맛집', icon: '🍴', category: '맛집', color: '#ff2f2f' },
  { label: '카페', icon: '☕', category: '카페', color: '#7a3f16' },
] as const;
const destinationCategories = [
  { label: '관광지', category: '관광지', image: categoryAttractionImage },
  { label: '축제', category: '축제', image: categoryFestivalImage },
] as const;

function resolveHomeLocation(input: string, selectedRegion: string, selectedDistrict: string, selectedLocality: string) {
  let remaining = input.trim();
  let region = selectedRegion;
  let district = selectedDistrict;
  let locality = selectedLocality;
  const matchedRegion = homeRegions
    .filter((item) => item !== '전국')
    .find((item) => remaining.replace(/\s+/g, '').includes(item.replace(/\s+/g, '')));
  if (matchedRegion) {
    region = matchedRegion;
    district = '전체';
    locality = '';
    remaining = remaining.replace(matchedRegion, ' ');
  }
  const districtPool = region === '전국'
    ? Object.entries(koreaRegionDistricts).flatMap(([regionName, districts]) => districts.map((districtName) => ({ regionName, districtName })))
    : (koreaRegionDistricts[region] ?? []).map((districtName) => ({ regionName: region, districtName }));
  const matches = districtPool.filter(({ districtName }) => remaining.replace(/\s+/g, '').includes(districtName.replace(/\s+/g, '')));
  const matchedDistrict = matches.length > 0 && new Set(matches.map((item) => item.regionName)).size === 1 ? matches[0] : null;
  if (matchedDistrict) {
    region = matchedDistrict.regionName;
    district = matchedDistrict.districtName;
    locality = '';
    remaining = remaining.replace(matchedDistrict.districtName, ' ');
  }
  const localityToken = remaining.split(/\s+/).find((token) => /[읍면동리]$/.test(token));
  if (localityToken) {
    locality = localityToken;
    remaining = remaining.replace(localityToken, ' ');
  }
  return {
    region,
    district,
    locality,
    query: remaining.replace(/\s+/g, ' ').trim().replace(/^(맛집|음식점|장소)$/, ''),
  };
}

export default function HomeScreen() {
  const [region, setRegion] = useState('서울');
  const [district, setDistrict] = useState('전체');
  const [locality, setLocality] = useState('');
  const [query, setQuery] = useState('');

  const explore = (category: string, nextQuery = '', nextRegion = region, nextDistrict = district, nextLocality = locality) => {
    router.push({
      pathname: '/(tabs)/explore',
      params: { category, district: nextDistrict, locality: nextLocality, region: nextRegion, query: nextQuery },
    });
  };

  const searchRestaurants = () => {
    const resolved = resolveHomeLocation(query, region, district, locality);
    explore('맛집', resolved.query, resolved.region, resolved.district, resolved.locality);
  };

  const exploreTogether = (journey: string) => {
    router.push({
      pathname: '/(tabs)/explore',
      params: { category: '전체', district, journey, locality, region, query: '' },
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.brand}>오늘어디</Text>
            <LiveWeatherHeader onLocationChange={(next) => { setRegion(next.region); setDistrict(next.district); setLocality(next.locality); }} />
          </View>
          <Text style={styles.bell}>♧</Text>
        </View>

        <View style={styles.search}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="홈 장소 검색"
            onChangeText={setQuery}
            onSubmitEditing={searchRestaurants}
            placeholder="어디로 떠나볼까요?"
            placeholderTextColor="#9b9b9b"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
        </View>

        <Text style={styles.sectionTitle}>누구와 함께?</Text>
        <View style={styles.relationshipRow}>
          {relationships.map((item) => (
            <MotionPressable accessibilityLabel={`${item.label}와 함께 장소 찾기`} accessibilityRole="button" key={item.label} onPress={() => exploreTogether(item.label)} style={styles.relationshipCard}>
              <Image accessibilityIgnoresInvertColors alt="" resizeMode="cover" source={item.image} style={styles.relationshipImage} />
            </MotionPressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>어떤 곳을 찾으세요?</Text>
        <View style={styles.categoryRow}>
          {quickCategories.map((item) => (
            <MotionPressable key={item.label} onPress={() => explore(item.category)} style={styles.categoryButton}>
              <View style={styles.categoryIconCircle}>
                <Text style={[styles.categoryIconText, { color: item.color }]}>{item.icon}</Text>
              </View>
              <Text style={styles.categoryText}>{item.label}</Text>
            </MotionPressable>
          ))}
        </View>
        <View style={styles.destinationCards}>
          {destinationCategories.map((item) => (
            <MotionPressable accessibilityLabel={`${item.label} 장소 찾기`} accessibilityRole="button" key={item.label} onPress={() => explore(item.category)} style={styles.destinationCard}>
              <Image accessibilityIgnoresInvertColors alt="" resizeMode="cover" source={item.image} style={styles.destinationImage} />
            </MotionPressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>지금 여기, 인기 장소</Text>
        <HomeNaverMapPreview
          locationLabel={[region, district === '전체' ? '' : district, locality].filter(Boolean).join(' ') || '전국'}
          onPress={() => explore('전체')}
          region={region}
        />

        <View style={styles.featureRow}>
          <MotionPressable accessibilityLabel="코스 설정" accessibilityRole="button" onPress={() => void Linking.openURL(appConfig.webUrl + '/recommend')} style={[styles.featureCard, styles.courseCard]}>
            <Text style={styles.featureTitle}>코스 설정</Text>
            <Text style={styles.featureText}>테마 맞춤 코스로{`\n`}알차게 여행하기</Text>
            <Image accessibilityIgnoresInvertColors alt="지도 위 출발지와 목적지가 표시된 코스 설정" resizeMode="contain" source={courseSettingImage} style={styles.courseImage} />
          </MotionPressable>
          <MotionPressable
            accessibilityLabel="직장인 식사에서 빠르고 만족스러운 점심·회식 찾기"
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/office')}
            style={[styles.featureCard, styles.officeCard]}
          >
            <Image
              accessibilityIgnoresInvertColors
              alt=""
              resizeMode="cover"
              source={officeDiningCardImage}
              style={styles.officeImage}
            />
          </MotionPressable>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>사계절 추천</Text>
            <Text style={styles.featureText}>계절마다 딱 맞는{`\n`}장소를 추천해요</Text>
            <Text style={styles.seasonVisual}>🌸🌿</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 18 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerMain: { minWidth: 0, flex: 1, marginRight: 12 },
  brand: { color: '#111111', fontSize: 27, fontWeight: '900', letterSpacing: -1.3 },
  bell: { color: '#111111', fontSize: 21, fontWeight: '900' },
  search: { minHeight: 43, marginTop: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e2e2', borderRadius: 11, backgroundColor: '#ffffff', paddingHorizontal: 12 },
  searchIcon: { color: '#252525', fontSize: 20, marginRight: 7 },
  searchInput: { flex: 1, minHeight: 42, color: '#171717', fontSize: 13, paddingVertical: 0 },
  sectionTitle: { marginTop: 18, marginBottom: 10, color: '#171717', fontSize: 13, fontWeight: '900' },
  relationshipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relationshipCard: { width: '48.8%', aspectRatio: 900 / 516, overflow: 'hidden', borderRadius: 11, backgroundColor: '#f7fbff' },
  relationshipImage: { width: '100%', height: '100%' },
  categoryRow: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  categoryButton: { width: 76, alignItems: 'center', gap: 7 },
  categoryIconCircle: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 26, backgroundColor: '#ffffff' },
  categoryIconText: { fontSize: 23, fontWeight: '900' },
  categoryText: { color: '#242424', fontSize: 10, fontWeight: '900' },
  destinationCards: { marginTop: 12, gap: 9 },
  destinationCard: { width: '100%', aspectRatio: 2.35, overflow: 'hidden', borderRadius: 11, backgroundColor: '#f5f7fb' },
  destinationImage: { width: '100%', height: '100%' },
  featureRow: { marginTop: 13, flexDirection: 'row', gap: 7 },
  featureCard: { flex: 1, height: 145, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 9, backgroundColor: '#ffffff', padding: 10 },
  courseCard: { backgroundColor: '#fffafa' },
  officeCard: { borderColor: '#ffd7c5', backgroundColor: '#fff8f1', padding: 0 },
  officeImage: { width: '100%', height: '100%' },
  featureTitle: { color: '#171717', fontSize: 12, fontWeight: '900' },
  featureText: { marginTop: 4, color: '#626262', fontSize: 8, lineHeight: 12, fontWeight: '700' },
  courseImage: { width: 76, height: 76, alignSelf: 'center', marginTop: 'auto', marginBottom: -8 },
  seasonVisual: { marginTop: 'auto', fontSize: 31, textAlign: 'center' },
});
