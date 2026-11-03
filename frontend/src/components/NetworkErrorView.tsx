import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, Typography, Layout, Spacing } from '../constants/theme';

export interface NetworkErrorViewProps {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const NetworkErrorView: React.FC<NetworkErrorViewProps> = ({
  message = 'Unable to connect to server. Please check your network connection.',
  onRetry,
  isRetrying = false,
  inline = false,
  style,
}) => {
  if (inline) {
    return (
      <View style={[styles.inlineContainer, style]}>
        <View style={styles.inlineContent}>
          <Ionicons
            name="cloud-offline-outline"
            size={18}
            color={colors.warning}
            style={styles.inlineIcon}
          />
          <Text style={styles.inlineText} numberOfLines={2}>
            {message}
          </Text>
        </View>
        {onRetry && (
          <TouchableOpacity
            style={styles.inlineRetryButton}
            onPress={onRetry}
            disabled={isRetrying}
            activeOpacity={0.7}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.inlineRetryText}>Retry</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.accent} />
      </View>
      <Text style={styles.title}>Connection Error</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
          onPress={onRetry}
          disabled={isRetrying}
          activeOpacity={0.8}
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: Spacing.one }} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: Spacing.one }} />
          )}
          <Text style={styles.retryButtonText}>{isRetrying ? 'Connecting...' : 'Retry'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    borderColor: colors.border,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.two,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    ...Typography.sectionTitle,
    color: colors.text,
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.three,
    maxWidth: 320,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Layout.radius,
    minHeight: Layout.minTapTarget,
    minWidth: 140,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
    fontSize: 15,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.statusPendingBg,
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    borderColor: colors.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    marginVertical: Spacing.one,
  },
  inlineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  inlineIcon: {
    marginRight: Spacing.one,
  },
  inlineText: {
    ...Typography.body,
    fontSize: 13,
    color: colors.statusPendingText,
    flex: 1,
  },
  inlineRetryButton: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    backgroundColor: colors.surface,
    borderRadius: Layout.radius - 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  inlineRetryText: {
    ...Typography.label,
    color: colors.accent,
    fontWeight: '600',
    fontSize: 12,
  },
});

export default NetworkErrorView;
