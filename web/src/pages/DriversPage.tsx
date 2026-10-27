import React, { useState, useEffect } from 'react';
import {
  Search,
  UserPlus,
  User,
  Key,
  ShieldAlert,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { adminWebService } from '../services/adminWebService';
import { adminFleetWebStore, WebVehicle } from '../store/adminFleetWebStore';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<WebVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    employeeId: '',
    nic: '',
    mobileNumber: '',
    drivingLicenceNumber: '',
    vehicleNumber: '',
    chassisNumber: '',
    password: 'driver',
  });

  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  useEffect(() => {
    loadDrivers();
  }, [search, statusFilter]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await adminFleetWebStore.getDrivers(
        search,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setDrivers(data);
      setFleetVehicles(adminFleetWebStore.getAllVehiclesList());
    } catch (e) {
      console.log('Error loading drivers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.employeeId || !form.nic || !form.mobileNumber || !form.drivingLicenceNumber) {
      alert('Please fill all required fields (*)');
      return;
    }

    setCreating(true);
    try {
      const newDriver = await adminFleetWebStore.addDriver({
        ...form,
        employeeId: form.employeeId.toUpperCase(),
        drivingLicenceNumber: form.drivingLicenceNumber.toUpperCase(),
        vehicleNumber: form.vehicleNumber ? form.vehicleNumber.toUpperCase() : 'UNASSIGNED',
        chassisNumber: form.chassisNumber ? form.chassisNumber.toUpperCase() : 'UNASSIGNED',
      });
      alert(`Driver ${newDriver.fullName} (${newDriver.driverCode}) registered and assigned successfully!`);
      setCreateModal(false);
      setForm({
        fullName: '',
        employeeId: '',
        nic: '',
        mobileNumber: '',
        drivingLicenceNumber: '',
        vehicleNumber: '',
        chassisNumber: '',
        password: 'driver',
      });
      loadDrivers();
    } catch (err: any) {
      alert(err?.message || 'Failed to create driver');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (driverId: string, status: string) => {
    const reason = prompt(`Enter audit reason for setting status to ${status}:`, 'Admin updated operational status');
    if (reason === null) return;

    try {
      await adminWebService.updateDriverStatus(driverId, status, reason);
      alert(`Status updated to ${status}`);
      setSelectedDriver(null);
      loadDrivers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async (driver: any) => {
    if (!confirm(`Reset password for ${driver.fullName} (${driver.driverCode}) to default 'driver'?`)) return;
    try {
      await adminWebService.resetDriverPassword(driver.id, 'driver');
      alert('Password has been reset to: driver');
      setSelectedDriver(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to reset password');
    }
  };

  return (
    <div style={styles.container}>
      {/* Driver Metric Summary Chips matching Mobile styles.metricsRow */}
      <div className="metrics-bar">
        <div className="metric-chip">
          <span className="metric-chip-num">{drivers.length}</span>
          <span className="metric-chip-label">Total Personnel</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#4caf50' }}>
            {drivers.filter((d) => d.status === 'ACTIVE').length}
          </span>
          <span className="metric-chip-label">Active Drivers</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#00e5ff' }}>
            {drivers.filter((d) => d.vehicleNumber && d.vehicleNumber !== 'UNASSIGNED').length}
          </span>
          <span className="metric-chip-label">Assigned Units</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#feb300' }}>
            {drivers.filter((d) => d.status === 'SUSPENDED').length}
          </span>
          <span className="metric-chip-label">Suspended</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#ff5252' }}>
            {drivers.filter((d) => d.status === 'DEACTIVATED').length}
          </span>
          <span className="metric-chip-label">Deactivated</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="#78909c" />
          <input
            type="text"
            placeholder="Search by code, name, phone, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterPills}>
          {['ALL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                ...styles.filterPill,
                ...(statusFilter === st ? styles.filterPillActive : {}),
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <button onClick={() => setCreateModal(true)} className="btn btn-primary">
          <UserPlus size={16} />
          <span>New Driver</span>
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Driver Code</th>
              <th>Full Name</th>
              <th>Emp ID / NIC</th>
              <th>Mobile</th>
              <th>Vehicle / CHE</th>
              <th>License No</th>
              <th>Port Pass Renewal</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: '#90caf9' }}>
                  Loading driver records...
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: '#78909c' }}>
                  No drivers found matching criteria.
                </td>
              </tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.id || d.driverCode}>
                  <td style={{ fontWeight: 800, color: '#00e5ff' }}>
                    {d.driverCode || d.employeeId}
                  </td>
                  <td style={{ fontWeight: 700, color: '#ffffff' }}>{d.fullName}</td>
                  <td>{d.employeeId} • {d.nic}</td>
                  <td>{d.mobileNumber}</td>
                  <td>
                    {d.vehicleNumber || 'Unassigned'}{' '}
                    <span style={{ color: '#78909c' }}>({d.cheNumber || d.chassisNumber || 'No CHE'})</span>
                  </td>
                  <td>{d.licenseNumber || d.drivingLicenceNumber || 'N/A'}</td>
                  <td>
                    {d.portPassStatus === 'RENEWAL_DUE' ? (
                      <span className="badge badge-amber">
                        Due ({d.portPassExpiryDate || '2026-11-20'})
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#90caf9', fontWeight: 600 }}>
                        {d.portPassExpiryDate || '2027-05-20'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        d.status === 'ACTIVE'
                          ? 'badge-green'
                          : d.status === 'SUSPENDED'
                          ? 'badge-amber'
                          : 'badge-red'
                      }`}
                    >
                      {d.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedDriver(d)}
                        className="btn btn-secondary btn-sm"
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Complete Driver Details & Profile Modal */}
      {selectedDriver && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 229, 255, 0.15)', border: '1px solid #00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="#00e5ff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                    {selectedDriver.fullName}
                  </h3>
                  <span style={{ color: '#00e5ff', fontSize: '13px', fontWeight: 700 }}>
                    {selectedDriver.driverCode} • {selectedDriver.employeeId}
                  </span>
                </div>
              </div>

              <span className={`badge ${selectedDriver.status === 'ACTIVE' ? 'badge-active' : 'badge-pending'}`}>
                {selectedDriver.status || 'ACTIVE'}
              </span>
            </div>

            {/* Section 1: Assigned Vehicle & Fleet */}
            <h4 style={styles.modalSectionTitle}>ASSIGNED VEHICLE & CHE SPECIFICATIONS</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Assigned Truck Plate:</span>
                <span style={styles.detailValue}>{selectedDriver.vehicleNumber || 'Unassigned'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Chassis / CHE Number:</span>
                <span style={{ ...styles.detailValue, color: '#00e5ff' }}>{selectedDriver.cheNumber || selectedDriver.chassisNumber || 'CHE 100'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Fleet Operator:</span>
                <span style={styles.detailValue}>{selectedDriver.vehicleNumber?.startsWith('LY-65') ? 'SDR LINK' : 'SCK Logistics'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Trailer Standard:</span>
                <span style={styles.detailValue}>40FT Skeletal Container Trailer</span>
              </div>
            </div>

            {/* Section 2: Personal & Contact */}
            <h4 style={styles.modalSectionTitle}>PERSONAL & EMPLOYMENT DETAILS</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Employee ID:</span>
                <span style={styles.detailValue}>{selectedDriver.employeeId}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>NIC Number:</span>
                <span style={styles.detailValue}>{selectedDriver.nic}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Mobile Phone:</span>
                <span style={{ ...styles.detailValue, color: '#4caf50' }}>{selectedDriver.mobileNumber}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Email Address:</span>
                <span style={styles.detailValue}>{selectedDriver.email || `${selectedDriver.driverCode?.toLowerCase()}@smartitt.lk`}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Home Address:</span>
                <span style={styles.detailValue}>{selectedDriver.address || 'Port Access Road, Colombo 15'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Emergency Contact:</span>
                <span style={{ ...styles.detailValue, color: '#ffb74d' }}>{selectedDriver.emergencyContactName || 'Fleet Dispatch'} ({selectedDriver.emergencyContactNumber || '0112456789'})</span>
              </div>
            </div>

            {/* Section 3: Driving License */}
            <h4 style={styles.modalSectionTitle}>DRIVING LICENSE & COMPLIANCE</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Heavy Vehicle License No:</span>
                <span style={styles.detailValue}>{selectedDriver.licenseNumber || selectedDriver.drivingLicenceNumber || 'LIC-001234'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>License Expiry Date:</span>
                <span style={{ ...styles.detailValue, color: '#4caf50' }}>{selectedDriver.licenseExpiryDate || '2028-12-31'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Compliance Status:</span>
                <span style={{ ...styles.detailValue, color: '#4caf50', fontWeight: 800 }}>VALID & VERIFIED</span>
              </div>
            </div>

            {/* Section 4: SLPA Port Entry Pass & Harbor Gate Clearance */}
            <h4 style={styles.modalSectionTitle}>PORT ENTRY PASS & CLEARANCE (SLPA)</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>SLPA Port Pass Number:</span>
                <span style={{ ...styles.detailValue, color: '#00e5ff', fontWeight: 800 }}>
                  {selectedDriver.portPassNumber || `SLPA-DPP-${selectedDriver.driverCode?.replace('DRV-', '') || '001'}`}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Port Pass Renewal Date:</span>
                <span style={{ ...styles.detailValue, color: selectedDriver.portPassStatus === 'RENEWAL_DUE' ? '#feb300' : '#4caf50', fontWeight: 800 }}>
                  {selectedDriver.portPassExpiryDate || '2027-05-20'}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Renewal Status:</span>
                <span style={{ ...styles.detailValue, color: selectedDriver.portPassStatus === 'RENEWAL_DUE' ? '#feb300' : '#4caf50', fontWeight: 800 }}>
                  {selectedDriver.portPassStatus === 'RENEWAL_DUE'
                    ? '⚠️ RENEWAL DUE (< 30 DAYS)'
                    : '✅ ACTIVE CLEARANCE'}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Harbor Gate Clearance:</span>
                <span style={styles.detailValue}>JCT Gate 1 / CICT Gate 2 / SAGT Gate</span>
              </div>
            </div>

            {/* Section 5: Operational Actions */}
            <h4 style={styles.modalSectionTitle}>SET ACCOUNT STATUS</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => handleUpdateStatus(selectedDriver.id, 'ACTIVE')}
                className="btn btn-sm"
                style={{ background: '#4caf50', color: '#ffffff', flex: 1 }}
              >
                Set ACTIVE
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedDriver.id, 'SUSPENDED')}
                className="btn btn-sm"
                style={{ background: '#feb300', color: '#000000', flex: 1 }}
              >
                Set SUSPENDED
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedDriver.id, 'DEACTIVATED')}
                className="btn btn-sm"
                style={{ background: '#ff5252', color: '#ffffff', flex: 1 }}
              >
                Set DEACTIVATED
              </button>
            </div>

            <h4 style={styles.modalSectionTitle}>CREDENTIAL SECURITY</h4>
            <button
              onClick={() => handleResetPassword(selectedDriver)}
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: '20px' }}
            >
              <Key size={14} color="#00e5ff" />
              <span>Reset Password to Default ('driver')</span>
            </button>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setSelectedDriver(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Driver Modal */}
      {createModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#ffffff' }}>
              Register New Driver
            </h3>
            <form onSubmit={handleCreate}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Kamal Perera"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="DRV002"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>NIC *</label>
                  <input
                    type="text"
                    required
                    placeholder="198512345678"
                    value={form.nic}
                    onChange={(e) => setForm({ ...form, nic: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="0771234567"
                    value={form.mobileNumber}
                    onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Driving License No *</label>
                  <input
                    type="text"
                    required
                    placeholder="LIC-123456"
                    value={form.drivingLicenceNumber}
                    onChange={(e) => setForm({ ...form, drivingLicenceNumber: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Assign Fleet Vehicle *</label>
                <select
                  value={form.vehicleNumber}
                  onChange={(e) => {
                    const plate = e.target.value;
                    const match = fleetVehicles.find((v) => v.vehicleNumber === plate);
                    setForm({
                      ...form,
                      vehicleNumber: plate,
                      chassisNumber: match ? (match.chassisNumber || match.cheNumber) : '',
                    });
                  }}
                  style={{
                    ...styles.input,
                    backgroundColor: '#070f1e',
                    border: '1px solid var(--border-color)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    appearance: 'auto',
                  }}
                >
                  <option value="">Standby / Unassigned Driver (Relief Driver)</option>
                  {fleetVehicles.map((v) => (
                    <option key={v.id || v.vehicleNumber} value={v.vehicleNumber}>
                      {v.chassisNumber || v.cheNumber} — {v.vehicleNumber} ({v.operator}) {v.driverName ? `• Currently Assigned: ${v.driverName}` : '• [Available Truck]'}
                    </option>
                  ))}
                </select>
                {form.vehicleNumber && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#00e5ff', fontWeight: 600 }}>
                    Assigned: {form.chassisNumber || 'CHE'} • Prime Mover Plate: {form.vehicleNumber}
                  </div>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Initial Password</label>
                <input
                  type="text"
                  placeholder="default: driver"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Registering...' : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'clamp(12px, 1.8vw, 24px)',
    maxWidth: '1440px',
    margin: '0 auto',
  },
  metricsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  metricChip: {
    backgroundColor: '#0c1b30',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricChipNum: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-mono)',
  },
  metricChipLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#78909c',
    marginTop: '2px',
    textTransform: 'uppercase',
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0 12px',
    height: '40px',
    flex: '1',
    minWidth: '260px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
  },
  filterPills: {
    display: 'flex',
    gap: '6px',
  },
  filterPill: {
    padding: '6px 12px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: '#90caf9',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  filterPillActive: {
    background: '#00e5ff',
    color: '#001529',
    borderColor: '#00e5ff',
  },
  modalSectionTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#78909c',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  formGroup: {
    marginBottom: '14px',
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    color: '#90caf9',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#070f1e',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
  },
  detailGridRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#90caf9',
    fontWeight: 600,
  },
  detailValue: {
    fontSize: '12px',
    color: '#ffffff',
    fontWeight: 700,
  },
};
