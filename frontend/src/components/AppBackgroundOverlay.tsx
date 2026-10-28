import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface AppBackgroundOverlayProps {
  opacity?: number;
}

/**
 * AppBackgroundOverlay renders the branded SMART ITT truck insignia
 * as a subtle, watermarked backdrop with suitable opacity across screens.
 */
export function AppBackgroundOverlay({ opacity = 0.08 }: AppBackgroundOverlayProps) {
  return (
    <View style={styles.backgroundWrap} pointerEvents="none">
      <Image
        source={require('../../assets/app-bg.png')}
        style={[styles.backgroundImage, { opacity }]}
        resizeMode="cover"
      />
      <View style={styles.backgroundOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
    backgroundColor: '#070c14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 12, 20, 0.45)',
  },
});
