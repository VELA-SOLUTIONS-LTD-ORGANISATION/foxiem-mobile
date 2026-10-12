import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useResponsiveLayout } from '@/hooks';
import { useTheme } from '@/theme';

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

/**
 * iOS keyboard avoidance measured in window coordinates, so it stays correct inside modal
 * sheets (KeyboardAvoidingView assumes the view sits at the top of the window and left the footer
 * button hidden behind the keyboard). Returns the overlap to pad the frame with.
 */
function useKeyboardOverlap(enabled: boolean) {
  const frame = useRef<View>(null);
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') {
      return;
    }
    const change = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      frame.current?.measureInWindow((_x, y, _w, height) => {
        setOverlap(Math.max(0, y + height - keyboardTop));
      });
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => setOverlap(0));
    return () => {
      change.remove();
      hide.remove();
    };
  }, [enabled]);
  return { frame, overlap };
}

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
  const { frame, overlap } = useKeyboardOverlap(keyboard);
  const { horizontalPadding, contentMaxWidth } = useResponsiveLayout();
  const inner = [
    styles.inner,
    { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth },
    contentStyle,
  ];

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={[styles.fill, styles.clip]}
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
    <View ref={frame} collapsable={false} style={[styles.fill, styles.clip, overlap > 0 && { paddingBottom: overlap }]}>
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
          <View style={[styles.footerInner, { maxWidth: contentMaxWidth }]}>{footer}</View>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView testID={testID} edges={edges} style={[styles.fill, { backgroundColor: theme.colors[background] }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {framed}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    minHeight: 0,
  },
  clip: {
    overflow: 'hidden',
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
  scrollContent: {
    flexGrow: 1,
  },
});
