import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Layout, Spacing } from '../constants/theme';
import { adminService, BulkImportResult } from '../services/adminService';

interface BulkImportModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'drivers' | 'supervisors' | 'vehicles';
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  visible,
  onClose,
  type,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const theme = Colors.light;

  const triggerFileSelect = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          setSelectedFile(file);
          setFileName(file.name);
          setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
          setResult(null);
        }
      };
      input.click();
    } else {
      Alert.alert('Notice', 'Bulk file import is optimized for the Admin Web Portal.');
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const csvText = await adminService.downloadTemplate(type);
      if (Platform.OS === 'web') {
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('Template Available', 'CSV Template has been generated on the server.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No file', 'Please select a CSV or Excel file to import.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      let res: BulkImportResult;
      if (type === 'drivers') {
        res = await adminService.importDrivers(formData);
      } else if (type === 'supervisors') {
        res = await adminService.importSupervisors(formData);
      } else {
        res = await adminService.importVehicles(formData);
      }

      setResult(res);
      if (res.importedCount > 0) {
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Import failed';
      Alert.alert('Import Failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const downloadErrorsCsv = () => {
    if (!result || !result.errors.length) return;
    const header = 'Row Number,Field,Value,Error Reason\n';
    const rows = result.errors
      .map((e) => `${e.rowNumber},"${e.field || ''}","${e.value || ''}","${e.errorReason || ''}"`)
      .join('\n');
    const content = header + rows;

    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_import_errors.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadCredentialsCsv = () => {
    if (!result || !result.credentials.length) return;
    const header = 'Username,Temporary Password,Role,Employee ID,Full Name\n';
    const rows = result.credentials
      .map(
        (c) =>
          `"${c.username}","${c.temporaryPassword}","${c.role}","${c.employeeId || ''}","${c.fullName || ''}"`
      )
      .join('\n');
    const content = header + rows;

    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_temporary_credentials.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFileName('');
    setFileSize('');
    setResult(null);
    onClose();
  };

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, Typography.sectionTitle]}>Bulk Import {typeLabel}</Text>
              <Text style={[styles.subtitle, Typography.label]}>
                Upload CSV or Excel (.xlsx) file to register multiple {type} at once.
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {/* Step 1: Download Template */}
            <View style={[styles.sectionBox, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={18} color={theme.accent} />
                <Text style={[styles.sectionTitle, Typography.listTitle]}>1. Get Standard Template</Text>
              </View>
              <Text style={[styles.sectionDesc, Typography.label]}>
                Download the official pre-formatted template with headers and sample data.
              </Text>
              <TouchableOpacity
                style={[styles.templateBtn, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
                onPress={handleDownloadTemplate}
                disabled={downloadingTemplate}
                activeOpacity={0.8}
              >
                {downloadingTemplate ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color={theme.accent} />
                    <Text style={[styles.templateBtnText, { color: theme.accent }]}>Download Sample Template (.CSV)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Step 2: Upload File */}
            <View style={[styles.sectionBox, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border, marginTop: Spacing.two }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cloud-upload-outline" size={18} color={theme.accent} />
                <Text style={[styles.sectionTitle, Typography.listTitle]}>2. Select CSV or Excel File</Text>
              </View>

              <TouchableOpacity
                style={[styles.dropZone, { borderColor: selectedFile ? theme.accent : theme.border, backgroundColor: theme.backgroundElement }]}
                onPress={triggerFileSelect}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={selectedFile ? 'document-attach' : 'cloud-upload'}
                  size={32}
                  color={selectedFile ? theme.accent : theme.textHint}
                />
                <Text style={[styles.dropZoneMain, { color: selectedFile ? theme.accent : theme.text }]}>
                  {selectedFile ? fileName : 'Click to choose file (.csv, .xlsx)'}
                </Text>
                {selectedFile ? (
                  <Text style={[styles.fileSizeText, Typography.label]}>{fileSize}</Text>
                ) : (
                  <Text style={[styles.dropZoneSub, Typography.label]}>Maximum file size: 10MB</Text>
                )}
              </TouchableOpacity>

              {selectedFile && !result && (
                <TouchableOpacity
                  style={[styles.uploadActionBtn, { backgroundColor: theme.accent }]}
                  onPress={handleUpload}
                  disabled={uploading}
                  activeOpacity={0.85}
                >
                  {uploading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="play-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.uploadActionBtnText}>Process & Import File</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Step 3: Import Results */}
            {result && (
              <View style={[styles.resultsContainer, { marginTop: Spacing.two }]}>
                <Text style={[styles.resultsTitle, Typography.listTitle]}>Import Summary</Text>

                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, { backgroundColor: theme.backgroundSurfaceLow, borderColor: theme.border }]}>
                    <Text style={styles.statVal}>{result.totalRows}</Text>
                    <Text style={styles.statLbl}>TOTAL ROWS</Text>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: theme.statusApprovedBg, borderColor: theme.statusApprovedText }]}>
                    <Text style={[styles.statVal, { color: theme.statusApprovedText }]}>{result.importedCount}</Text>
                    <Text style={[styles.statLbl, { color: theme.statusApprovedText }]}>IMPORTED</Text>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: result.failedCount > 0 ? theme.statusRejectedBg : theme.backgroundSurfaceLow, borderColor: result.failedCount > 0 ? theme.danger : theme.border }]}>
                    <Text style={[styles.statVal, { color: result.failedCount > 0 ? theme.danger : theme.textSecondary }]}>{result.failedCount}</Text>
                    <Text style={[styles.statLbl, { color: result.failedCount > 0 ? theme.danger : theme.textSecondary }]}>FAILED</Text>
                  </View>
                </View>

                {/* Generated Credentials Download */}
                {result.credentials && result.credentials.length > 0 && (
                  <View style={[styles.credentialsBox, { backgroundColor: theme.statusApprovedBg, borderColor: theme.statusApprovedText }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="key" size={16} color={theme.statusApprovedText} />
                      <Text style={[styles.credText, { color: theme.statusApprovedText }]}>
                        {result.credentials.length} accounts created with temporary passwords.
                      </Text>
                    </View>
                    <TouchableOpacity style={[styles.credDownloadBtn, { backgroundColor: theme.accent }]} onPress={downloadCredentialsCsv}>
                      <Ionicons name="download" size={14} color="#FFFFFF" />
                      <Text style={styles.credDownloadText}>Download Credentials CSV</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Errors Table */}
                {result.errors && result.errors.length > 0 && (
                  <View style={[styles.errorSection, { borderColor: theme.danger, backgroundColor: theme.statusRejectedBg }]}>
                    <View style={styles.errorHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="warning" size={16} color={theme.danger} />
                        <Text style={[styles.errorSectionTitle, { color: theme.danger }]}>
                          Row Errors ({result.errors.length})
                        </Text>
                      </View>
                      <TouchableOpacity onPress={downloadErrorsCsv} style={styles.downloadErrorBtn}>
                        <Ionicons name="download-outline" size={12} color={theme.danger} />
                        <Text style={[styles.downloadErrorText, { color: theme.danger }]}>Export Error CSV</Text>
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 8 }}>
                      <View>
                        <View style={[styles.tableRow, styles.tableHeaderRow]}>
                          <Text style={[styles.colHeader, { width: 60 }]}>ROW #</Text>
                          <Text style={[styles.colHeader, { width: 110 }]}>FIELD</Text>
                          <Text style={[styles.colHeader, { width: 110 }]}>VALUE</Text>
                          <Text style={[styles.colHeader, { width: 220 }]}>ERROR REASON</Text>
                        </View>
                        {result.errors.map((err, idx) => (
                          <View key={idx} style={[styles.tableRow, { borderBottomColor: 'rgba(180, 35, 24, 0.15)' }]}>
                            <Text style={[styles.colCell, { width: 60, fontWeight: '700' }]}>{err.rowNumber}</Text>
                            <Text style={[styles.colCell, { width: 110 }]}>{err.field}</Text>
                            <Text style={[styles.colCell, { width: 110 }]} numberOfLines={1}>{err.value || '-'}</Text>
                            <Text style={[styles.colCell, { width: 220, color: theme.danger }]}>{err.errorReason}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: theme.accent }]} onPress={handleClose}>
              <Text style={styles.doneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.two,
  },
  card: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    borderRadius: Layout.radius,
    borderWidth: Layout.borderWidth,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  sectionBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: Spacing.two,
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  templateBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneMain: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  fileSizeText: {
    fontSize: 11,
    marginTop: 2,
  },
  dropZoneSub: {
    fontSize: 11,
    marginTop: 2,
  },
  uploadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: Layout.minTapTarget,
    borderRadius: 6,
    marginTop: Spacing.two,
  },
  uploadActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: Spacing.one,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
  credentialsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
  credText: {
    fontSize: 12,
    fontWeight: '600',
  },
  credDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  credDownloadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  errorSection: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    marginTop: Spacing.one,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  downloadErrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  downloadErrorText: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  tableHeaderRow: {
    borderBottomWidth: 1.5,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7C85',
  },
  colCell: {
    fontSize: 11,
    color: '#1F2D33',
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.two,
    alignItems: 'flex-end',
  },
  doneBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

