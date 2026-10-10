import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../src/theme';

export default function SupervisorReports() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Reports</Text>
        <Text style={styles.headerSub}>September 29, 2026</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Daily ITT Report Summary</Text>
        <View style={styles.summaryGrid}>
          {[
            { label: 'Total Trips', value: '24', color: '#1E88E5' },
            { label: 'Completed', value: '16', color: '#43A047' },
            { label: 'Pending', value: '3', color: '#FB8C00' },
            { label: 'Approved', value: '14', color: '#1E88E5' },
            { label: 'Rejected', value: '2', color: '#E53935' },
            { label: 'In Progress', value: '5', color: '#7B1FA2' },
          ].map((s, i) => (
            <View key={i} style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Driver-wise */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver-wise Trips</Text>
        <View style={styles.tableCard}>
          {[
            { name: 'Kamal Perera', count: 6 },
            { name: 'Saman Silva', count: 5 },
            { name: 'Ruwan Fernando', count: 7 },
            { name: 'Nuwan Bandara', count: 3 },
            { name: 'Amal Jayasuriya', count: 3 },
          ].map((d, i) => (
            <View key={i} style={[styles.tableRow, i === 4 && { borderBottomWidth: 0 }]}>
              <Text style={styles.tableLabel}>{d.name}</Text>
              <Text style={styles.tableValue}>{d.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Terminal-wise */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terminal-wise Trips</Text>
        <View style={styles.tableCard}>
          {[
            { name: 'ECT - East Container Terminal', count: 9 },
            { name: 'JCT - Jaya Container Terminal', count: 8 },
            { name: 'UCT - Unity Container Terminal', count: 7 },
          ].map((t, i) => (
            <View key={i} style={[styles.tableRow, i === 2 && { borderBottomWidth: 0 }]}>
              <Text style={styles.tableLabel}>{t.name}</Text>
              <Text style={styles.tableValue}>{t.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Container Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Container Summary</Text>
        <View style={styles.containerStatsRow}>
          <View style={[styles.containerStat, { borderLeftColor: '#1E88E5' }]}>
            <Text style={[styles.containerStatValue, { color: '#1E88E5' }]}>18</Text>
            <Text style={styles.containerStatLabel}>20FT</Text>
          </View>
          <View style={[styles.containerStat, { borderLeftColor: '#FB8C00' }]}>
            <Text style={[styles.containerStatValue, { color: '#FB8C00' }]}>12</Text>
            <Text style={styles.containerStatLabel}>40FT</Text>
          </View>
        </View>
      </View>

      {/* Export buttons */}
      <View style={styles.exportRow}>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#E53935' }]}>
          <Text style={styles.exportText}>📄 Export PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: '#43A047' }]}>
          <Text style={styles.exportText}>📊 Export Excel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.background, padding: 24, paddingTop: 60, paddingBottom: 24 },
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
  headerSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  summaryCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 20, marginTop: -16, elevation: 3 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#0A1628', marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  summaryItem: { width: '33%', alignItems: 'center', paddingVertical: 10 },
  summaryValue: { fontSize: 24, fontWeight: 'bold' },
  summaryLabel: { fontSize: 11, color: '#8E99A4', marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0A1628', marginBottom: 12 },
  tableCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  tableLabel: { fontSize: 14, color: '#5A6570' },
  tableValue: { fontSize: 14, fontWeight: '700', color: '#0A1628' },
  containerStatsRow: { flexDirection: 'row', gap: 12 },
  containerStat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 20, borderLeftWidth: 4, elevation: 2 },
  containerStatValue: { fontSize: 32, fontWeight: 'bold' },
  containerStatLabel: { fontSize: 14, color: '#8E99A4', marginTop: 4 },
  exportRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 28, marginBottom: 40 },
  exportBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  exportText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
