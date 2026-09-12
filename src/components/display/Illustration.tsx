import { Image, StyleSheet, type ImageSourcePropType, type ImageStyle } from 'react-native';

import { FOXIEM_LOGO } from '@/constants/brand';
import { sizes } from '@/theme';

type IllustrationSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<IllustrationSize, number> = {
  sm: sizes.illustrationSm,
  md: sizes.illustrationMd,
  lg: sizes.illustrationLg,
  xl: sizes.illustrationXl,
};

type IllustrationProps = {
  source?: ImageSourcePropType;
  size?: IllustrationSize;
  alt?: string;
  style?: ImageStyle;
};

export function Illustration({
  source = FOXIEM_LOGO,
  size = 'md',
  alt = 'Foxiem',
  style,
}: IllustrationProps) {
  const dimension = SIZE_MAP[size];

  return (
    <Image
      source={source}
      alt={alt}
      resizeMode="contain"
      style={[styles.image, { width: dimension, height: dimension }, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});
