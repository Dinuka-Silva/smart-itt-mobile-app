import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../../../src/theme';

export default function SupervisorDrivers() {
  const drivers = [
    { id: '1', name: 'Kamal Perera', empId: 'EMP001', vehicle: 'WP-BA-1234', status: 'ACTIVE', trips: 45 },
    { id: '2', name: 'Saman Silva', empId: 'EMP002', vehicle: 'WP-CB-5678', status: 'ACTIVE', trips: 38 },
    { id: '3', name: 'Ruwan Fernando', empId: 'EMP003', vehicle: 'WP-DA-9012', status: 'ACTIVE', trips: 52 },
    { id: '4', name: 'Nuwan Bandara', empId: 'EMP004', vehicle: 'WP-EA-3456', status: 'INACTIVE', trips: 12 },
    { id: '5', name: 'Amal Jayasuriya', empId: 'EMP005', vehicle: 'WP-FA-7890', status: 'ACTIVE', trips: 29 },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Management</Text>
        <Text style={styles.headerSub}>{drivers.length} registered drivers</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="Search by name or employee ID..." placeholderTextColor="#8E99A4" />
      </View>

      {drivers.map((d) => (
        <View key={d.id} style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{d.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.driverName}>{d.name}</Text>
              <Text style={styles.empId}>{d.empId}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: d.status === 'ACTIVE' ? '#43A04720' : '#E5393520' }]}>
              <Text style={[styles.statusText, { color: d.status === 'ACTIVE' ? '#43A047' : '#E53935' }]}>{d.status}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>🚛 {d.vehicle}</Text>
            <Text style={styles.infoText}>📋 {d.trips} trips</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.background, padding: 24, paddingTop: 60, paddingBottom: 24 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  searchContainer: { paddingHorizontal: 16, marginTop: 16 },
  searchInput: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 14, borderWidth: 1, borderColor: '#E8ECF0' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 16, marginTop: 12, elevation: 2 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  driverName: { fontSize: 16, fontWeight: '700', color: '#0A1628' },
  empId: { fontSize: 12, color: '#8E99A4', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F2F5' },
  infoText: { fontSize: 13, color: '#5A6570' },
});
