import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { tripService } from '../../../src/services/tripService';
import {
  useDriverMessageStore,
  DriverMessage,
  MessageCategory,
} from '../../../src/store/driverMessageStore';

export default function DriverNotifications() {
  const user = useAuthStore((s) => s.user);

  // Store state
  const messages = useDriverMessageStore((s) => s.messages);
  const selectedCategory = useDriverMessageStore((s) => s.selectedCategory);
  const searchQuery = useDriverMessageStore((s) => s.searchQuery);
  const onlyUnread = useDriverMessageStore((s) => s.onlyUnread);
  const setSelectedCategory = useDriverMessageStore((s) => s.setSelectedCategory);
  const setSearchQuery = useDriverMessageStore((s) => s.setSearchQuery);
  const setOnlyUnread = useDriverMessageStore((s) => s.setOnlyUnread);
  const markAsRead = useDriverMessageStore((s) => s.markAsRead);
  const markAllAsRead = useDriverMessageStore((s) => s.markAllAsRead);
  const acknowledgeMessage = useDriverMessageStore((s) => s.acknowledgeMessage);
  const sendQuickReply = useDriverMessageStore((s) => s.sendQuickReply);
  const sendRadioDispatch = useDriverMessageStore((s) => s.sendRadioDispatch);
  const syncTripsWithMessages = useDriverMessageStore((s) => s.syncTripsWithMessages);

  // Local component state
  const [refreshing, setRefreshing] = useState(false);
  const [activeReplyMsg, setActiveReplyMsg] = useState<DriverMessage | null>(null);
  const [customReplyText, setCustomReplyText] = useState('');
  const [composeModalVisible, setComposeModalVisible] = useState(false);
  const [composeCategory, setComposeCategory] = useState<'DISPATCH' | 'SUPERVISOR' | 'SAFETY'>('DISPATCH');
  const [composeText, setComposeText] = useState('');
  const [selectedQuickPreset, setSelectedQuickPreset] = useState<string | null>(null);

  // Fetch live trips and sync with message store
  const refreshMessages = useCallback(async () => {
    try {
      const trips = await tripService.getTrips(user?.driverId);
      if (Array.isArray(trips)) {
        syncTripsWithMessages(trips);
      }
    } catch {
      // Offline fallback already handled by store
    } finally {
      setRefreshing(false);
    }
  }, [user?.driverId, syncTripsWithMessages]);

  useEffect(() => {
    refreshMessages();
    const timer = setInterval(refreshMessages, 10000);
    return () => clearInterval(timer);
  }, [refreshMessages]);

  // Quick reply presets
  const quickReplies = [
    'Copy that, Roger.',
    'Arrived at Bay, waiting for crane.',
    'Twist-locks checked & secured.',
    'Delayed at Gate (~10 mins).',
    'Mission completed successfully.',
  ];

  // Radio dispatch presets for new broadcast
  const radioPresets = [
    'Approaching Terminal Gate 4 for Outbound Inspection.',
    'Container loaded onto chassis. Heading to destination bay.',
    'Gantry crane is delayed. Currently waiting in queue.',
    'Breakwater Link Road clear. Speed maintained at 25 km/h.',
    'Completed container drop-off. Ready for next ITT mission.',
  ];

  // Filtering
  const filteredMessages = messages.filter((msg) => {
    // Category filter
    if (selectedCategory !== 'ALL' && msg.category !== selectedCategory) {
      return false;
    }
    // Unread toggle
    if (onlyUnread && msg.read) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = msg.title.toLowerCase().includes(q);
      const matchBody = msg.message.toLowerCase().includes(q);
      const matchSender = msg.sender.toLowerCase().includes(q);
      const matchMeta =
        msg.metadata?.tripNumber?.toLowerCase().includes(q) ||
        msg.metadata?.containerNumber?.toLowerCase().includes(q) ||
        msg.metadata?.terminal?.toLowerCase().includes(q);
      return matchTitle || matchBody || matchSender || matchMeta;
    }
    return true;
  });

  const unreadCount = messages.filter((m) => !m.read).length;
  const urgentCount = messages.filter((m) => m.priority === 'URGENT').length;

  const handleSendReply = (presetText?: string) => {
    const textToSend = presetText || customReplyText;
    if (!textToSend.trim() || !activeReplyMsg) return;

    sendQuickReply(activeReplyMsg.id, textToSend.trim(), user?.name || 'Kamal Perera');
    setCustomReplyText('');
    setActiveReplyMsg(null);
    Alert.alert('Transmission Sent', 'Your radio acknowledgement was transmitted to Dispatch.');
  };

  const handleTransmitRadio = () => {
    const textToSend = composeText || selectedQuickPreset;
    if (!textToSend || !textToSend.trim()) {
      Alert.alert('Missing Message', 'Please enter a message or select a preset dispatch note.');
      return;
    }

    sendRadioDispatch(
      composeCategory,
      textToSend.trim(),
      user?.name || 'Kamal Perera',
      `${user?.cheNumber || 'SCK 100'} / ${user?.vehicleNumber || 'LY 5234'}`
    );

    setComposeText('');
    setSelectedQuickPreset(null);
    setComposeModalVisible(false);
    Alert.alert('Radio Transmitted', 'Your message has been broadcasted to Port Central Dispatch.');
  };

  return (
    <View style={styles.container}>
      {/* ─── TELEMATICS HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.brandBadge}>
            <Ionicons name="radio" size={13} color="#00e5ff" />
            <Text style={styles.brandBadgeText}>SCK FLEET TELEMATICS • VHF CH-16</Text>
          </View>
          <View style={styles.liveRadioPill}>
            <View style={styles.pulsingDot} />
            <Text style={styles.liveRadioText}>LIVE DISPATCH</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.headerTitle}>Driver Communications</Text>
            <Text style={styles.headerSub}>
              {user?.name || 'Kamal Perera'} • {user?.cheNumber || 'SCK 100'} ({user?.vehicleNumber || 'LY 5234'})
            </Text>
          </View>

          <TouchableOpacity
            style={styles.composeBtn}
            onPress={() => setComposeModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={15} color="#080e17" />
            <Text style={styles.composeBtnText}>TRANSMIT</Text>
          </TouchableOpacity>
        </View>

        {/* ─── STATS STRIP ─── */}
        <View style={styles.statsStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{messages.length}</Text>
            <Text style={styles.statLabel}>ALL COMMS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, unreadCount > 0 && { color: '#00e5ff' }]}>
              {unreadCount}
            </Text>
            <Text style={styles.statLabel}>UNREAD</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNum, urgentCount > 0 && { color: '#ff3366' }]}>
              {urgentCount}
            </Text>
            <Text style={styles.statLabel}>URGENT</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done" size={14} color={unreadCount > 0 ? '#00e5ff' : '#495a63'} />
            <Text style={[styles.markReadBtnText, unreadCount === 0 && { color: '#495a63' }]}>
              CLEAR ALL
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── SEARCH & FILTER CONTROLS ─── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#00e5ff" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by terminal, trip, container..."
              placeholderTextColor="#5a7184"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#849396" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.unreadToggle, onlyUnread && styles.unreadToggleActive]}
            onPress={() => setOnlyUnread(!onlyUnread)}
          >
            <Ionicons
              name={onlyUnread ? 'funnel' : 'funnel-outline'}
              size={14}
              color={onlyUnread ? '#080e17' : '#00e5ff'}
            />
            <Text style={[styles.unreadToggleText, onlyUnread && styles.unreadToggleTextActive]}>
              UNREAD
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── CATEGORY FILTER CHIPS ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {(['ALL', 'DISPATCH', 'SUPERVISOR', 'SAFETY', 'PAYMENT'] as MessageCategory[]).map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === 'ALL'
                ? messages.length
                : messages.filter((m) => m.category === cat).length;

            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {cat}
                </Text>
                <View style={[styles.chipBadge, isSelected && styles.chipBadgeActive]}>
                  <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── MESSAGES LIST ─── */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refreshMessages();
            }}
            tintColor="#00e5ff"
          />
        }
      >
        {filteredMessages.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubbles-outline" size={44} color="#5a7184" />
            </View>
            <Text style={styles.emptyTitle}>No Messages Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No transmissions match "${searchQuery}".`
                : onlyUnread
                ? 'All incoming radio messages have been read!'
                : 'No messages in this category at this time.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setOnlyUnread(false);
              }}
            >
              <Text style={styles.emptyResetBtnText}>RESET FILTERS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredMessages.map((msg) => {
            const isUrgent = msg.priority === 'URGENT';
            const isSuccess = msg.priority === 'SUCCESS';
            const isHigh = msg.priority === 'HIGH';
            const isPayment = msg.category === 'PAYMENT';

            const accentColor = isUrgent
              ? '#ff3366'
              : isSuccess
              ? '#00ff88'
              : isHigh
              ? '#ffaa00'
              : isPayment
              ? '#feb300'
              : '#00e5ff';

            const iconName =
              msg.category === 'DISPATCH'
                ? 'trail-sign'
                : msg.category === 'SUPERVISOR'
                ? 'headset'
                : msg.category === 'SAFETY'
                ? 'shield-checkmark'
                : 'cash';

            return (
              <View
                key={msg.id}
                style={[
                  styles.msgCard,
                  { borderLeftColor: accentColor },
                  !msg.read && styles.msgCardUnread,
                ]}
              >
                {/* Card Top Pill Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTagsRow}>
                    <View style={[styles.priorityPill, { backgroundColor: `${accentColor}20` }]}>
                      <Text style={[styles.priorityPillText, { color: accentColor }]}>
                        {msg.priority}
                      </Text>
                    </View>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{msg.category}</Text>
                    </View>
                    {!msg.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.timestampText}>{msg.time}</Text>
                </View>

                {/* Sender Info Row */}
                <View style={styles.senderRow}>
                  <View style={[styles.senderAvatar, { backgroundColor: `${accentColor}25` }]}>
                    <Ionicons name={iconName} size={18} color={accentColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.senderName}>{msg.sender}</Text>
                    <Text style={styles.senderRole}>{msg.senderRole}</Text>
                  </View>
                </View>

                {/* Message Title & Body */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => markAsRead(msg.id)}
                  style={{ marginTop: 8 }}
                >
                  <Text style={styles.msgTitle}>{msg.title}</Text>
                  <Text style={styles.msgBody}>{msg.message}</Text>
                </TouchableOpacity>

                {/* Metadata Highlight Box (If applicable) */}
                {msg.metadata && (
                  <View style={styles.metadataCard}>
                    {msg.metadata.tripNumber && (
                      <View style={styles.metaRow}>
                        <Ionicons name="document-text" size={13} color="#00e5ff" />
                        <Text style={styles.metaLabel}>ITT MISSION:</Text>
                        <Text style={styles.metaValue}>{msg.metadata.tripNumber}</Text>
                      </View>
                    )}
                    {msg.metadata.terminal && (
                      <View style={styles.metaRow}>
                        <Ionicons name="location" size={13} color="#00ff88" />
                        <Text style={styles.metaLabel}>TERMINAL BAY:</Text>
                        <Text style={styles.metaValue}>{msg.metadata.terminal}</Text>
                      </View>
                    )}
                    {msg.metadata.containerNumber && (
                      <View style={styles.metaRow}>
                        <Ionicons name="cube" size={13} color="#feb300" />
                        <Text style={styles.metaLabel}>CONTAINER:</Text>
                        <Text style={styles.metaValue}>{msg.metadata.containerNumber}</Text>
                      </View>
                    )}
                    {msg.metadata.speedLimit && (
                      <View style={styles.metaRow}>
                        <Ionicons name="speedometer" size={13} color="#ff3366" />
                        <Text style={styles.metaLabel}>SPEED RADAR:</Text>
                        <Text style={[styles.metaValue, { color: '#ff3366', fontWeight: '800' }]}>
                          {msg.metadata.speedLimit}
                        </Text>
                      </View>
                    )}
                    {msg.metadata.allowanceAmount && (
                      <View style={styles.metaRow}>
                        <Ionicons name="wallet" size={13} color="#feb300" />
                        <Text style={styles.metaLabel}>ALLOWANCE:</Text>
                        <Text style={[styles.metaValue, { color: '#feb300', fontWeight: '800' }]}>
                          {msg.metadata.allowanceAmount}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Existing Replies Thread */}
                {msg.replies && msg.replies.length > 0 && (
                  <View style={styles.repliesBox}>
                    <Text style={styles.repliesHeader}>TRANSMITTED ACKNOWLEDGMENTS:</Text>
                    {msg.replies.map((rep) => (
                      <View key={rep.id} style={styles.replyBubble}>
                        <View style={styles.replyBubbleHeader}>
                          <Ionicons name="return-down-forward" size={12} color="#00ff88" />
                          <Text style={styles.replySender}>{rep.sender}</Text>
                          <Text style={styles.replyTime}>{rep.time}</Text>
                        </View>
                        <Text style={styles.replyText}>{rep.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Interactive Action Row */}
                <View style={styles.actionRow}>
                  {/* Roger / Acknowledge Button */}
                  <TouchableOpacity
                    style={[
                      styles.ackButton,
                      msg.acknowledged ? styles.ackButtonSuccess : styles.ackButtonActive,
                    ]}
                    onPress={() => acknowledgeMessage(msg.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={msg.acknowledged ? 'checkmark-circle' : 'radio-outline'}
                      size={15}
                      color={msg.acknowledged ? '#00ff88' : '#080e17'}
                    />
                    <Text
                      style={[
                        styles.ackButtonText,
                        msg.acknowledged && styles.ackButtonTextSuccess,
                      ]}
                    >
                      {msg.acknowledged
                        ? `ACKNOWLEDGED ${msg.acknowledgedAt || '✓'}`
                        : 'ROGER / ACKNOWLEDGE'}
                    </Text>
                  </TouchableOpacity>

                  {/* Quick Reply Button */}
                  <TouchableOpacity
                    style={styles.replyBtn}
                    onPress={() => setActiveReplyMsg(msg)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses" size={15} color="#00e5ff" />
                    <Text style={styles.replyBtnText}>REPLY</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── MODAL: QUICK REPLY DRAWER ─── */}
      <Modal
        visible={activeReplyMsg !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveReplyMsg(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.replyModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="radio" size={20} color="#00e5ff" />
                <Text style={styles.modalTitle}>RADIO DISPATCH REPLY</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveReplyMsg(null)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            {activeReplyMsg && (
              <View style={styles.replyTargetBox}>
                <Text style={styles.replyTargetSender}>To: {activeReplyMsg.sender}</Text>
                <Text style={styles.replyTargetSubject} numberOfLines={1}>
                  Ref: {activeReplyMsg.title}
                </Text>
              </View>
            )}

            <Text style={styles.modalSectionLabel}>QUICK ONE-TAP RESPONSES:</Text>
            <View style={styles.quickPresetsWrap}>
              {quickReplies.map((qr, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickPresetChip}
                  onPress={() => handleSendReply(qr)}
                >
                  <Ionicons name="send-outline" size={13} color="#00ff88" />
                  <Text style={styles.quickPresetChipText}>{qr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSectionLabel, { marginTop: 14 }]}>CUSTOM DISPATCH NOTE:</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Type message to dispatcher..."
              placeholderTextColor="#5a7184"
              value={customReplyText}
              onChangeText={setCustomReplyText}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => handleSendReply()}
            >
              <Ionicons name="send" size={16} color="#080e17" />
              <Text style={styles.modalPrimaryBtnText}>TRANSMIT REPLY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: COMPOSE NEW RADIO TRANSMISSION ─── */}
      <Modal
        visible={composeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComposeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.replyModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="megaphone" size={20} color="#00ff88" />
                <Text style={styles.modalTitle}>TRANSMIT DISPATCH REPORT</Text>
              </View>
              <TouchableOpacity onPress={() => setComposeModalVisible(false)}>
                <Ionicons name="close" size={22} color="#849396" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>SELECT CATEGORY:</Text>
            <View style={styles.categorySelectRow}>
              {(['DISPATCH', 'SUPERVISOR', 'SAFETY'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catSelectBtn,
                    composeCategory === cat && styles.catSelectBtnActive,
                  ]}
                  onPress={() => setComposeCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catSelectBtnText,
                      composeCategory === cat && styles.catSelectBtnTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSectionLabel, { marginTop: 14 }]}>PRESET DISPATCH REPORTS:</Text>
            <View style={styles.quickPresetsWrap}>
              {radioPresets.map((rp, idx) => {
                const isSelected = selectedQuickPreset === rp;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.quickPresetChip,
                      isSelected && { borderColor: '#00ff88', backgroundColor: 'rgba(0,255,136,0.12)' },
                    ]}
                    onPress={() => {
                      setSelectedQuickPreset(rp);
                      setComposeText(rp);
                    }}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'radio'}
                      size={13}
                      color={isSelected ? '#00ff88' : '#00e5ff'}
                    />
                    <Text style={styles.quickPresetChipText}>{rp}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalSectionLabel, { marginTop: 14 }]}>MESSAGE DETAILS:</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Enter operational update or status note..."
              placeholderTextColor="#5a7184"
              value={composeText}
              onChangeText={(txt) => {
                setComposeText(txt);
                setSelectedQuickPreset(null);
              }}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleTransmitRadio}
            >
              <Ionicons name="radio" size={16} color="#080e17" />
              <Text style={styles.modalPrimaryBtnText}>BROADCAST TO TOWER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050a10',
  },
  header: {
    backgroundColor: '#08101a',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 229, 255, 0.15)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  brandBadgeText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  liveRadioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00ff88',
  },
  liveRadioText: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  headerTitle: {
    color: '#f0f6fc',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerSub: {
    color: '#849396',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00e5ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 3,
  },
  composeBtnText: {
    color: '#080e17',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 23, 38, 0.7)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: '800',
  },
  statLabel: {
    color: '#5a7184',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 6,
  },
  markReadBtnText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Search & Controls
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0e1926',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
  },
  searchInput: {
    flex: 1,
    color: '#f0f6fc',
    fontSize: 12,
    padding: 0,
  },
  unreadToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  unreadToggleActive: {
    backgroundColor: '#00e5ff',
  },
  unreadToggleText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unreadToggleTextActive: {
    color: '#080e17',
  },

  // Category Chips
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0e1926',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderColor: '#00e5ff',
  },
  chipText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#00e5ff',
  },
  chipBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  chipBadgeActive: {
    backgroundColor: '#00e5ff',
  },
  chipBadgeText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '800',
  },
  chipBadgeTextActive: {
    color: '#080e17',
  },

  // List Container
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#09121d',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.15)',
  },
  emptyTitle: {
    color: '#f0f6fc',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#849396',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 260,
  },
  emptyResetBtn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyResetBtnText: {
    color: '#080e17',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  // Message Cards
  msgCard: {
    backgroundColor: '#0a1420',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    elevation: 3,
  },
  msgCardUnread: {
    backgroundColor: '#0d1a29',
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    color: '#849396',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e5ff',
  },
  timestampText: {
    color: '#5a7184',
    fontSize: 10,
    fontWeight: '600',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  senderAvatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderName: {
    color: '#f0f6fc',
    fontSize: 13,
    fontWeight: '800',
  },
  senderRole: {
    color: '#849396',
    fontSize: 10,
    fontWeight: '500',
  },
  msgTitle: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 20,
  },
  msgBody: {
    color: '#c2ced9',
    fontSize: 12.5,
    lineHeight: 18.5,
  },

  // Metadata Box
  metadataCard: {
    backgroundColor: 'rgba(6, 12, 19, 0.75)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.12)',
    padding: 10,
    marginTop: 10,
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    color: '#5a7184',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaValue: {
    color: '#f0f6fc',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },

  // Replies Thread
  repliesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  repliesHeader: {
    color: '#5a7184',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  replyBubble: {
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    padding: 8,
  },
  replyBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  replySender: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  replyTime: {
    color: '#5a7184',
    fontSize: 9,
  },
  replyText: {
    color: '#f0f6fc',
    fontSize: 12,
    fontWeight: '500',
  },

  // Card Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  ackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 7,
  },
  ackButtonActive: {
    backgroundColor: '#00e5ff',
  },
  ackButtonSuccess: {
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.35)',
  },
  ackButtonText: {
    color: '#080e17',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  ackButtonTextSuccess: {
    color: '#00ff88',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  replyBtnText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Modals Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  replyModalCard: {
    backgroundColor: '#09121d',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    padding: 20,
    maxHeight: '88%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#f0f6fc',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  replyTargetBox: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.18)',
    padding: 10,
    marginBottom: 12,
  },
  replyTargetSender: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '800',
  },
  replyTargetSubject: {
    color: '#849396',
    fontSize: 11,
    marginTop: 2,
  },
  modalSectionLabel: {
    color: '#5a7184',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  quickPresetsWrap: {
    gap: 7,
  },
  quickPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0e1a27',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickPresetChipText: {
    color: '#f0f6fc',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalTextInput: {
    backgroundColor: '#0c1622',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#f0f6fc',
    fontSize: 12.5,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00e5ff',
    paddingVertical: 12,
    borderRadius: 9,
    marginTop: 16,
  },
  modalPrimaryBtnText: {
    color: '#080e17',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  // Category Selection in Broadcast Modal
  categorySelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  catSelectBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#0e1a27',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catSelectBtnActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: '#00ff88',
  },
  catSelectBtnText: {
    color: '#849396',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catSelectBtnTextActive: {
    color: '#00ff88',
  },
});
