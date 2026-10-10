import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '../../../src/config/api';
import { useAuthStore } from '../../../src/store/authStore';
import { colors } from '../../../src/theme';

type Notif = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'error' | 'info';
};

function formatTime(dt?: string) {
  if (!dt) return 'Just now';
  return new Date(dt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DriverNotifications() {
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const driverParam = user?.driverId ? `?driverId=${user.driverId}` : '';
      const res = await axios.get(`${API_BASE_URL}/trips${driverParam}`);
      const trips = Array.isArray(res.data) ? res.data : [];

      const items: Notif[] = [];
      trips.forEach((trip: any) => {
        const tripNum = trip.tripNumber || `TRP-${trip.id?.slice(0, 6)}`;
        const route = `${trip.sourceTerminal || '—'} → ${trip.destTerminal || '—'}`;

        if (trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED') {
          items.push({
            id: `${trip.id}-confirmed`,
            title: 'Trip Confirmed',
            message: `Supervisor confirmed trip ${tripNum} (${route}). You can proceed to unload containers.`,
            time: formatTime(trip.updatedAt || trip.startTime || trip.createdAt),
            type: 'success',
          });
        }

        if (trip.status === 'PENDING_APPROVAL') {
          items.push({
            id: `${trip.id}-pending`,
            title: 'Awaiting Supervisor',
            message: `Trip ${tripNum} is waiting for supervisor confirmation.`,
            time: formatTime(trip.createdAt),
            type: 'info',
          });
        }

        if (trip.status === 'REJECTED') {
          items.push({
            id: `${trip.id}-rejected`,
            title: 'Trip Rejected',
            message: `Supervisor rejected trip ${tripNum} (${route}). Please create a new trip if needed.`,
            time: formatTime(trip.endTime || trip.updatedAt || trip.createdAt),
            type: 'error',
          });
        }
      });

      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 5000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSub}>
          {loading ? 'Loading...' : `${notifications.length} update${notifications.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={48} color="#A0AEC0" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>Supervisor confirmations will appear here.</Text>
        </View>
      ) : (
        notifications.map((n) => (
          <View key={n.id} style={[styles.card, n.type === 'success' && styles.successCard, n.type === 'error' && styles.errorCard]}>
            <View style={styles.cardRow}>
              <Ionicons
                name={n.type === 'success' ? 'checkmark-circle' : n.type === 'error' ? 'alert-circle' : 'information-circle'}
                size={24}
                color={n.type === 'success' ? '#43A047' : n.type === 'error' ? '#E53935' : '#1E88E5'}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifMessage}>{n.message}</Text>
                <Text style={styles.notifTime}>{n.time}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    marginTop: 10,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#1E88E5',
  },
  successCard: { borderLeftColor: '#43A047' },
  errorCard: { borderLeftColor: '#E53935' },
  cardRow: { flexDirection: 'row', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#0A1628' },
  notifMessage: { fontSize: 13, color: '#5A6570', marginTop: 4, lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#8E99A4', marginTop: 6 },
});
