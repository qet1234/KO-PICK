import { useState } from 'react';
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
import { PlaceImage } from '@/components/place-image';
import { RouteMapChooser } from '@/components/route-map-chooser';
import {
  fetchRecommendations,
  type Recommendation,
  type RecommendationQuery,
} from '@/lib/api';

const regions = [
  '전국', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const;
const relationships = ['개인', '커플', '친구', '가족'] as const;
const categories = ['맛집', '카페', '관광지', '축제'] as const;
const budgets = Array.from({ length: 10 }, (_, index) => `${index + 1}만원`);

export default function RecommendationScreen() {
  const [region, setRegion] = useState<RecommendationQuery['region']>('경기');
  const [relationship, setRelationship] =
    useState<RecommendationQuery['relationship']>('커플');
  const [category, setCategory] = useState<RecommendationQuery['category']>('카페');
  const [budget, setBudget] = useState('5만원');
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const recommend = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchRecommendations({ region, relationship, category, budget });
      setItems(result.items);
    } catch (nextError) {
      setItems([]);
      setError(nextError instanceof Error ? nextError.message : '추천 장소를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>오늘어디</Text>
        <Text style={styles.title}>지금 갈 곳을{`\n`}취향대로 골라드려요</Text>
        <Text style={styles.subtitle}>전국 TourAPI 장소를 예산과 관계에 맞춰 추천합니다.</Text>

        <View style={styles.builder}>
          <ChoiceChips label="지역" values={regions} selected={region} onSelect={setRegion} />
          <ChoiceChips
            label="누구와 가나요?"
            values={relationships}
            selected={relationship}
            onSelect={(value) => setRelationship(value as RecommendationQuery['relationship'])}
          />
          <ChoiceChips
            label="무엇을 찾나요?"
            values={categories}
            selected={category}
            onSelect={(value) => setCategory(value as RecommendationQuery['category'])}
          />
          <ChoiceChips label="예산" values={budgets} selected={budget} onSelect={setBudget} wrap />
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void recommend()}
            style={[styles.submit, loading && styles.submitDisabled]}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>맞춤 장소 추천받기</Text>}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {items.length > 0 ? (
          <View style={styles.results}>
            <Text style={styles.sectionEyebrow}>YOUR PICKS</Text>
            <Text style={styles.sectionTitle}>{region}에서 찾은 추천 장소</Text>
            <Text style={styles.source}>장소 원천: 한국관광공사 TourAPI</Text>
            {items.map((place) => (
              <View key={place.id} style={styles.card}>
                <PlaceImage
                  name={place.name}
                  imageUrl={place.imageUrl}
                  attribution={place.imageAttribution}
                  copyrightCode={place.imageCopyrightCode}
                  modificationAllowed={place.imageModificationAllowed}
                />
                <View style={styles.cardCopy}>
                  <Text style={styles.score}>취향 적합도 {place.score}%</Text>
                  <Text style={styles.cardTitle}>{place.name}</Text>
                  <Text style={styles.cardMeta}>{place.category} · {place.address}</Text>
                  <Text style={styles.reason}>{place.reason}</Text>
                  <RouteMapChooser place={{ name: place.name, address: place.address }} />
                </View>
              </View>
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
  brand: { color: '#146b45', fontSize: 15, fontWeight: '900', letterSpacing: 1.4 },
  title: { marginTop: 10, color: '#17211c', fontSize: 31, fontWeight: '900', lineHeight: 39 },
  subtitle: { marginTop: 10, color: '#657069', fontSize: 14, lineHeight: 21 },
  builder: { marginTop: 24, borderRadius: 24, backgroundColor: '#ffffff', padding: 18 },
  submit: { marginTop: 24, alignItems: 'center', borderRadius: 15, backgroundColor: '#146b45', paddingVertical: 16 },
  submitDisabled: { opacity: 0.65 },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  error: { marginTop: 12, color: '#aa2f2f', fontSize: 13, lineHeight: 19 },
  results: { marginTop: 28 },
  sectionEyebrow: { color: '#146b45', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { marginTop: 4, color: '#17211c', fontSize: 23, fontWeight: '900' },
  source: { marginTop: 6, marginBottom: 14, color: '#758079', fontSize: 12 },
  card: { marginTop: 12, overflow: 'hidden', borderRadius: 20, backgroundColor: '#ffffff', padding: 12 },
  cardCopy: { paddingHorizontal: 4, paddingTop: 14, paddingBottom: 4 },
  score: { color: '#146b45', fontSize: 12, fontWeight: '900' },
  cardTitle: { marginTop: 6, color: '#1d2922', fontSize: 19, fontWeight: '900' },
  cardMeta: { marginTop: 5, color: '#6a756e', fontSize: 12, lineHeight: 18 },
  reason: { marginTop: 9, marginBottom: 14, color: '#435048', fontSize: 13, lineHeight: 20 },
});
