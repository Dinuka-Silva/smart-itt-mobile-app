import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../constants/theme';
import { StatusPill } from './StatusPill';

interface ListRowProps {
  title: string;
  subtitle?: string;
  metaText?: string;
  status?: string;
  statusLabel?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  onPress?: () => void;
  showArrow?: boolean;
  style?: StyleProp<ViewStyle>;
  rightElement?: React.ReactNode;
}

export function ListRow({
  title,
  subtitle,
  metaText,
  status,
  statusLabel,
  iconName,
  badgeText,
  badgeBg = '#E8F1FA',
  badgeColor = '#173B70',
  onPress,
  showArrow = false,
  style,
  rightElement,
}: ListRowProps) {
  const content = (
    <View style={[styles.row, style]}>
      {/* Optional Left Icon or Badge */}
      {badgeText ? (
        <View style={[styles.badgeWrap, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
        </View>
      ) : iconName ? (
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={18} color="#173B70" />
        </View>
      ) : null}

      {/* Main Text Content */}
      <View style={styles.contentWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {metaText ? <Text style={styles.metaText}>{metaText}</Text> : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Element: Status Chip or Custom */}
      <View style={styles.rightWrap}>
        {rightElement ? (
          rightElement
        ) : status ? (
          <StatusPill status={status} size="sm" customLabel={statusLabel} />
        ) : null}
        {showArrow && <Ionicons name="chevron-forward" size={16} color="#A3B1B8" />}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.minTapTarget,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAEC',
  },
  badgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F5FA',
    borderWidth: 1,
    borderColor: '#D0DEEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#173B70',
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#3A567F',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#5E799E',
    marginTop: 2,
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
});

export default ListRow;

