import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function ChoiceChips({ label, values, selected, onSelect, wrap = false, dark = false }: {
  label: string; values: readonly string[]; selected: string; onSelect: (value: string) => void; wrap?: boolean; dark?: boolean;
}) {
  const chips = values.map((value) => (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: selected === value }} key={value} onPress={() => onSelect(value)}
      style={[styles.chip, dark && styles.chipDark, selected === value && styles.chipSelected]}>
      <Text maxFontSizeMultiplier={1.25} style={[styles.chipText, dark && styles.chipTextDark, selected === value && styles.chipTextSelected]}>{value}</Text>
    </Pressable>
  ));
  return <View style={styles.group}><Text maxFontSizeMultiplier={1.25} style={[styles.label, dark && styles.labelDark]}>{label}</Text>
    {wrap ? <View style={styles.wrap}>{chips}</View> : <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{chips}</ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  group: { marginTop: 18 }, label: { marginBottom: 9, color: '#454541', fontSize: 13, fontWeight: '900' }, labelDark: { color: '#dce5df' },
  row: { gap: 8, paddingRight: 18 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 56, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dadad4', borderRadius: 999, backgroundColor: '#ffffff', paddingHorizontal: 13, paddingVertical: 9 },
  chipDark: { borderColor: '#45554b', backgroundColor: '#253129' }, chipSelected: { borderColor: '#ff3b36', backgroundColor: '#fff0ee' },
  chipText: { color: '#71716d', fontSize: 12, fontWeight: '700' }, chipTextDark: { color: '#d3dcd6' }, chipTextSelected: { color: '#ff3b36', fontWeight: '900' },
});
