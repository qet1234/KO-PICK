import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MotionPressable } from '@/components/motion-pressable';

const seasons = [
  { key: '봄', months: '3–5월', title: '향긋하게 입맛을 깨우는 계절', color: '#e8f6df', accent: '#4f7d34', foods: [
    ['도다리쑥국', '담백한 도다리와 향긋한 쑥'], ['주꾸미볶음', '탱글한 식감과 매콤한 양념'], ['봄나물 비빔밥', '냉이·달래·참나물을 한 그릇에'], ['바지락 칼국수', '제철 바지락으로 낸 시원한 국물'],
  ] },
  { key: '여름', months: '6–8월', title: '시원하게 채우는 여름 한 끼', color: '#e2f4fb', accent: '#16728d', foods: [
    ['평양냉면', '슴슴하고 차가운 육수의 매력'], ['초계국수', '새콤한 육수와 담백한 닭고기'], ['삼계탕', '기운을 채워주는 대표 보양식'], ['물회', '제철 회와 채소를 시원하게'],
  ] },
  { key: '가을', months: '9–11월', title: '불향과 감칠맛이 깊어지는 계절', color: '#fff0dd', accent: '#9a5722', foods: [
    ['전어구이', '고소한 기름과 진한 불향'], ['대하구이', '소금 위에서 구워낸 탱글한 식감'], ['꽃게탕', '달큰한 꽃게와 칼칼한 국물'], ['송이버섯 전골', '가을 버섯의 깊고 은은한 향'],
  ] },
  { key: '겨울', months: '12–2월', title: '따뜻하고 든든하게 즐기는 계절', color: '#e8edfa', accent: '#405e9a', foods: [
    ['굴국밥', '통통한 굴과 뜨끈한 국물'], ['대방어회', '겨울에 더 고소하고 두툼한 맛'], ['과메기', '김·미역·채소와 즐기는 별미'], ['만두전골', '푸짐한 만두와 채소를 보글보글'],
  ] },
] as const;

function currentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

export function SeasonalFoods() {
  const [selected, setSelected] = useState(currentSeason());
  const season = useMemo(() => seasons.find((item) => item.key === selected) ?? seasons[0], [selected]);
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>FOOD BY SEASON</Text>
      <Text style={styles.title}>사계절, 지금 맛있는 음식</Text>
      <Text style={styles.subtitle}>계절마다 가장 맛있는 대표 메뉴를 한눈에 골라보세요.</Text>
      <View style={styles.tabs}>
        {seasons.map((item) => (
          <MotionPressable key={item.key} onPress={() => setSelected(item.key)} style={[styles.tab, selected === item.key && { backgroundColor: item.accent, borderColor: item.accent }]}>
            <Text style={[styles.tabText, selected === item.key && styles.tabTextSelected]}>{item.key}</Text>
          </MotionPressable>
        ))}
      </View>
      <View style={[styles.card, { backgroundColor: season.color }]}>
        <Text style={[styles.months, { color: season.accent }]}>{season.key} · {season.months}</Text>
        <Text style={styles.cardTitle}>{season.title}</Text>
        {season.foods.map(([name, note], index) => (
          <View key={name} style={styles.food}>
            <Text style={[styles.number, { color: season.accent }]}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.foodCopy}><Text style={styles.foodName}>{name}</Text><Text style={styles.foodNote}>{note}</Text></View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 30 }, eyebrow: { color: '#ff3b36', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { marginTop: 5, color: '#101010', fontSize: 23, fontWeight: '900' }, subtitle: { marginTop: 7, color: '#71716d', fontSize: 13, lineHeight: 19 },
  tabs: { marginTop: 16, flexDirection: 'row', gap: 8 }, tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 13, backgroundColor: '#ffffff' },
  tabText: { color: '#71716d', fontSize: 13, fontWeight: '900' }, tabTextSelected: { color: '#ffffff' },
  card: { marginTop: 12, borderRadius: 22, padding: 18 }, months: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 }, cardTitle: { marginTop: 5, marginBottom: 8, color: '#101010', fontSize: 19, fontWeight: '900' },
  food: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(40,55,46,0.15)' }, number: { width: 34, fontSize: 11, fontWeight: '900' },
  foodCopy: { flex: 1, paddingVertical: 10 }, foodName: { color: '#253129', fontSize: 14, fontWeight: '900' }, foodNote: { marginTop: 3, color: '#71716d', fontSize: 11, lineHeight: 16 },
});
