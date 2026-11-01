import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../constants/theme';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
}

export function FormInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  required,
  secureTextEntry,
  value,
  ...rest
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const isPassword = !!secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label above field */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredStar}>*</Text>}
      </View>

      {/* Input box */}
      <View
        style={[
          styles.inputWrap,
          isFocused && styles.inputWrapFocused,
          error ? styles.inputWrapError : null,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={isFocused ? '#0F766E' : '#6B7C85'}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor="#A3B1B8"
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...rest}
        />
        {isPassword ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#6B7C85"
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRightIconPress}
            activeOpacity={0.7}
            disabled={!onRightIconPress}
          >
            <Ionicons name={rightIcon} size={18} color="#6B7C85" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Error message under field */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7C85',
  },
  requiredStar: {
    color: '#B42318',
    marginLeft: 3,
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAEC',
    borderRadius: Layout.radius,
    minHeight: Layout.minTapTarget,
    paddingHorizontal: 12,
  },
  inputWrapFocused: {
    borderColor: '#0F766E',
  },
  inputWrapError: {
    borderColor: '#B42318',
  },
  leftIcon: {
    marginRight: 8,
  },
  iconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2D33',
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#B42318',
    marginTop: 4,
  },
});

export default FormInput;

