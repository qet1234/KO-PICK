import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export function ChoiceChips({
  label,
  values,
  selected,
  onSelect,
  wrap = false,
}: {
  label: string;
  values: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  wrap?: boolean;
}) {
  const chips = values.map((value) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: selected === value }}
      key={value}
      onPress={() => onSelect(value)}
      style={[styles.chip, selected === value && styles.chipSelected]}>
      <Text style={[styles.chipText, selected === value && styles.chipTextSelected]}>{value}</Text>
    </Pressable>
  ));

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      {wrap ? (
        <View style={styles.wrap}>{chips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {chips}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 20 },
  label: { marginBottom: 10, color: '#34423a', fontSize: 14, fontWeight: '900' },
  row: { gap: 8, paddingRight: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 58,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dce5e0',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: { borderColor: '#146b45', backgroundColor: '#e7f6ee' },
  chipText: { color: '#68736d', fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: '#146b45', fontWeight: '900' },
});
