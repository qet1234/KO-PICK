import { Image, StyleSheet, Text, View } from 'react-native';

export function PlaceImage({
  name,
  imageUrl,
  attribution,
  copyrightCode,
  modificationAllowed,
}: {
  name: string;
  imageUrl: string | null;
  attribution: string | null;
  copyrightCode: 'Type1' | 'Type3' | null;
  modificationAllowed: boolean;
}) {
  const visible = Boolean(
    imageUrl && attribution && (copyrightCode === 'Type1' || copyrightCode === 'Type3'),
  );
  if (!visible) return null;

  return (
    <View style={styles.wrapper}>
      <Image
        accessibilityLabel={`${name} 대표 사진`}
        alt={`${name} 대표 사진`}
        source={{ uri: imageUrl ?? '' }}
        resizeMode={modificationAllowed ? 'cover' : 'contain'}
        style={styles.image}
      />
      <Text numberOfLines={1} style={styles.attribution}>{attribution}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden', borderRadius: 14, backgroundColor: '#eef2ef' },
  image: { width: '100%', height: 160 },
  attribution: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    maxWidth: '80%',
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.58)',
    color: '#ffffff',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
