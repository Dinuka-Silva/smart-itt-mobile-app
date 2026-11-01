import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  iconName,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = true,
}: AppButtonProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'danger':
        return styles.dangerBtn;
      case 'ghost':
        return styles.ghostBtn;
      case 'primary':
      default:
        return styles.primaryBtn;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#A3B1B8';
    switch (variant) {
      case 'secondary':
        return '#0F766E';
      case 'outline':
        return '#1F2D33';
      case 'danger':
        return '#B42318';
      case 'ghost':
        return '#0F766E';
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      style={[
        styles.baseBtn,
        getContainerStyle(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabledBtn,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {iconName && iconPosition === 'left' && (
            <Ionicons name={iconName} size={18} color={textColor} style={styles.leftIcon} />
          )}
          <Text style={[styles.btnText, { color: textColor }, textStyle]}>{label}</Text>
          {iconName && iconPosition === 'right' && (
            <Ionicons name={iconName} size={18} color={textColor} style={styles.rightIcon} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    minHeight: Layout.minTapTarget,
    borderRadius: Layout.radius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fullWidth: {
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: '#0F766E',
  },
  secondaryBtn: {
    backgroundColor: '#E3F4F1',
  },
  outlineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
  },
  dangerBtn: {
    backgroundColor: '#FDE8E8',
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default AppButton;

