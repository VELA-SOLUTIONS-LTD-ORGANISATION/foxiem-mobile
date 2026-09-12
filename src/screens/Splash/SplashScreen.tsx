import { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { FOXIEM_SPLASH_IMAGE } from '@/constants/brand';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppState } from '@/state';

const SPLASH_DURATION_MS = 1800;

export function SplashScreen({ navigation }: RootStackScreenProps<'Splash'>) {
  const { hydrated, setupCompleted } = useAppState();
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, SPLASH_DURATION_MS - elapsed);
    const timer = setTimeout(() => {
      if (setupCompleted) {
        navigation.replace('Main', { screen: 'Tabs', params: { screen: 'HomeTab' } });
        return;
      }

      navigation.replace('ProfileSetup');
    }, remaining);

    return () => clearTimeout(timer);
  }, [hydrated, navigation, setupCompleted]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image
        source={FOXIEM_SPLASH_IMAGE}
        style={styles.image}
        resizeMode="cover"
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
