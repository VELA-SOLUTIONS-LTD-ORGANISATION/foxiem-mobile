import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { colors, contentMaxWidth, space } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAware?: boolean;
  edgeToEdge?: boolean;
  constrained?: boolean;
  maxWidth?: number;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  backgroundColor?: string;
  statusBarStyle?: 'light' | 'dark';
  contentStyle?: StyleProp<ViewStyle>;
  scrollContentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  keyboardAware = false,
  edgeToEdge = false,
  constrained = false,
  maxWidth,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = colors.background,
  statusBarStyle = 'dark',
  contentStyle,
  scrollContentStyle,
}: ScreenProps) {
  const isIOS = Platform.OS === 'ios';
  const widthLimit = maxWidth ?? (constrained ? contentMaxWidth : undefined);
  const content = (
    <ContentContainer
      padded={padded}
      maxWidth={widthLimit}
      style={[scroll ? undefined : styles.fill, contentStyle]}
    >
      {children}
    </ContentContainer>
  );

  const scrollView = (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={isIOS ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={!isIOS || !keyboardAware}
      contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
    >
      {content}
    </ScrollView>
  );

  const staticBody = <View style={styles.body}>{content}</View>;

  let framed: ReactNode;
  if (scroll) {
    framed =
      keyboardAware && isIOS ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {scrollView}
        </KeyboardAvoidingView>
      ) : (
        scrollView
      );
  } else if (keyboardAware && isIOS) {
    framed = (
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {staticBody}
      </KeyboardAvoidingView>
    );
  } else {
    framed = staticBody;
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor }]}
      edges={edgeToEdge ? [] : edges}
    >
      <StatusBar style={statusBarStyle} />
      {framed}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: space[8],
  },
});
