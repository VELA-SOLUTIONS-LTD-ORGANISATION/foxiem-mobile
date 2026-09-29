import { StatusBar } from 'expo-status-bar';
import type { ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/hooks';
import { contentMaxWidth, useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  edges?: Edge[];
  footer?: ReactNode;
  background?: 'canvas' | 'surface';
  contentStyle?: StyleProp<ViewStyle>;
  scrollRef?: Ref<ScrollView>;
  testID?: string;
};

/** Safe-area frame with the canvas colour, centred content and native keyboard behaviour. */
export function Screen({
  children,
  scroll = true,
  keyboard = false,
  edges = ['top', 'left', 'right'],
  footer,
  background = 'canvas',
  contentStyle,
  scrollRef,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const { horizontalPadding } = useResponsiveLayout();
  const inner = [
    styles.inner,
    { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth },
    contentStyle,
  ];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={inner}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.fill, inner]}>{children}</View>
  );

  const framed = (
    <>
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: horizontalPadding,
              backgroundColor: theme.colors[background],
              borderTopColor: theme.colors.line,
            },
          ]}
        >
          <View style={[styles.footerInner, { maxWidth: contentMaxWidth - horizontalPadding * 2 }]}>{footer}</View>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView testID={testID} edges={edges} style={[styles.fill, { backgroundColor: theme.colors[background] }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {keyboard && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.fill} behavior="padding">
          {framed}
        </KeyboardAvoidingView>
      ) : (
        framed
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerInner: {
    width: '100%',
    alignSelf: 'center',
  },
});
