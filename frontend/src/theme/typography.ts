import React from 'react';
import { Text as RNText, TextInput as RNTextInput, TextProps, TextInputProps, StyleSheet } from 'react-native';

/**
 * Global Font Scale and Typography Configuration.
 * "Comfortable Large" scale:
 * - Headlines / Big Titles: 28-30px
 * - Section Titles / Medium Headers: 20-24px
 * - Body Text / Values / Input content: 16-17px
 * - Secondary Labels / Captions / Badges: 14px
 */

function resolveScaledStyle(style: any) {
  if (!style) return style;

  const flattened = StyleSheet.flatten(style);
  if (!flattened) return style;

  const currentFontSize = flattened.fontSize;
  if (typeof currentFontSize !== 'number') return style;

  let targetFontSize = currentFontSize;

  if (currentFontSize >= 28) {
    // Top-level Hero / Main Screen Headlines -> 28 - 30px
    targetFontSize = Math.min(Math.max(currentFontSize, 28), 32);
  } else if (currentFontSize >= 18) {
    // Section headers & Card Titles -> 20 - 24px
    targetFontSize = Math.min(Math.max(currentFontSize + 2, 20), 24);
  } else if (currentFontSize >= 13) {
    // Primary Body text, values, list titles -> 16 - 17px
    targetFontSize = Math.min(Math.max(currentFontSize + 2, 16), 17);
  } else {
    // Micro labels, chips, badges, hints (e.g. 8-12px) -> 13.5 - 14px
    targetFontSize = 14;
  }

  // Calculate proportional line height to avoid text clipping
  const currentLineHeight = flattened.lineHeight;
  let targetLineHeight = currentLineHeight;
  if (!currentLineHeight || currentLineHeight < targetFontSize) {
    targetLineHeight = Math.round(targetFontSize * 1.35);
  }

  return [
    style,
    {
      fontSize: targetFontSize,
      lineHeight: targetLineHeight,
    },
  ];
}

let isPatched = false;

export function applyGlobalTypography() {
  if (isPatched) return;
  isPatched = true;

  // Patch RNText render
  const originalTextRender = (RNText as any).render;
  if (typeof originalTextRender === 'function') {
    (RNText as any).render = function (props: TextProps, ref: any) {
      const newStyle = resolveScaledStyle(props.style);
      return originalTextRender.call(this, { ...props, style: newStyle }, ref);
    };
  }

  // Patch RNTextInput render for inputs
  const originalTextInputRender = (RNTextInput as any).render;
  if (typeof originalTextInputRender === 'function') {
    (RNTextInput as any).render = function (props: TextInputProps, ref: any) {
      const newStyle = resolveScaledStyle(props.style);
      return originalTextInputRender.call(this, { ...props, style: newStyle }, ref);
    };
  }
}
