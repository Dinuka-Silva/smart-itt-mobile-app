import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ScrollViewProps,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

import { AppBackgroundOverlay } from './AppBackgroundOverlay';

interface AdaptiveScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Partial<ScrollViewProps>;
  maxWidth?: number;
  useSafeArea?: boolean;
  showBackground?: boolean;
  backgroundOpacity?: number;
}

/**
 * AdaptiveScreen provides unified, responsive screen sizing across all screens:
 * - Proper safe area spacing (avoids camera notches, Dynamic Island, and navigation bars)
 * - Auto-centered responsive max-width on tablets and desktops
 * - Flexible full-width on mobile devices (iOS / Android)
 * - Optional subtle brand watermark background
 */
export function AdaptiveScreen({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
  scrollViewProps,
  maxWidth,
  useSafeArea = true,
  showBackground = false,
  backgroundOpacity = 0.06,
}: AdaptiveScreenProps) {
  const { topInset, bottomInset, contentMaxWidth, containerPaddingHorizontal } = useResponsive();

  const effectiveMaxWidth = maxWidth || contentMaxWidth;

  const innerStyle: ViewStyle = {
    width: '100%',
    maxWidth: effectiveMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: containerPaddingHorizontal,
  };

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: '#0e141d',
    paddingTop: useSafeArea ? topInset : 0,
    paddingBottom: useSafeArea ? bottomInset : 0,
  };

  const content = scrollable ? (
    <ScrollView
      style={[{ flex: 1, width: '100%' }, style]}
      contentContainerStyle={[
        innerStyle,
        styles.defaultScrollContent,
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, width: '100%' }, innerStyle, style]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={containerStyle}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {showBackground && <AppBackgroundOverlay opacity={backgroundOpacity} />}
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  defaultScrollContent: {
    flexGrow: 1,
    paddingBottom: 36,
  },
});
