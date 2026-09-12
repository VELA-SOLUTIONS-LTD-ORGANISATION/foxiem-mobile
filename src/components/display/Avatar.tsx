import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, sizes } from '@/theme';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_SIZES: Record<AvatarSize, number> = {
  sm: sizes.avatarSm,
  md: sizes.avatarMd,
  lg: sizes.avatarLg,
  xl: sizes.avatarXl,
};

type AvatarProps = {
  image?: ImageSourcePropType;
  initials?: string;
  size?: AvatarSize;
  bordered?: boolean;
  status?: 'online' | 'offline';
};

export function Avatar({
  image,
  initials = 'FX',
  size = 'md',
  bordered = false,
  status,
}: AvatarProps) {
  const dimension = AVATAR_SIZES[size];

  return (
    <View style={{ width: dimension, height: dimension }}>
      <View
        style={[
          styles.base,
          {
            width: dimension,
            height: dimension,
            borderRadius: radius.pill,
          },
          bordered && styles.bordered,
        ]}
      >
        {image ? (
          <Image source={image} alt={initials} resizeMode="cover" style={styles.image} />
        ) : (
          <AppText variant={size === 'sm' ? 'captionSmall' : 'label'} color="primary">
            {initials}
          </AppText>
        )}
      </View>
      {status ? (
        <View
          style={[
            styles.status,
            { backgroundColor: status === 'online' ? colors.success : colors.disabled },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bordered: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  status: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: sizes.iconSm,
    height: sizes.iconSm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
