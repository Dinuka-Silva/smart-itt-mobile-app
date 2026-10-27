import React, { useState, useEffect } from 'react';
import { Search, Truck, AlertTriangle, UserCheck, ShieldCheck, Plus, X } from 'lucide-react';
import { adminWebService } from '../services/adminWebService';
import { adminFleetWebStore } from '../store/adminFleetWebStore';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [assignModal, setAssignModal] = useState<any | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Vehicle Form State
  const [newVehicleNumber, setNewVehicleNumber] = useState('');
  const [newChassisNumber, setNewChassisNumber] = useState('');
  const [newOperator, setNewOperator] = useState('SCK Logistics');
  const [newTrailerSize, setNewTrailerSize] = useState('40FT');
  const [newPortPassNumber, setNewPortPassNumber] = useState('');
  const [newPortPassExpiryDate, setNewPortPassExpiryDate] = useState('2027-10-31');
  const [newStatus, setNewStatus] = useState('ACTIVE');

  useEffect(() => {
    loadData();
  }, [search, operatorFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const vList = await adminFleetWebStore.getVehicles(
        search,
        operatorFilter === 'ALL' ? undefined : operatorFilter,
        statusFilter === 'ALL' ? undefined : statusFilter
      );
      setVehicles(vList);

      try {
        const dData = await adminWebService.getDrivers();
        if (Array.isArray(dData) && dData.length > 0) {
          setDrivers(dData);
        }
      } catch (e) {
        // use local drivers
      }
    } catch (e) {
      console.log('Error loading vehicles:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleNumber.trim() || !newChassisNumber.trim()) {
      alert('Please fill Vehicle Registration Number and Chassis/CHE Number.');
      return;
    }

    setSubmitting(true);
    try {
      await adminFleetWebStore.addVehicle({
        vehicleNumber: newVehicleNumber.trim().toUpperCase(),
        chassisNumber: newChassisNumber.trim().toUpperCase(),
        operator: newOperator,
        trailerSize: newTrailerSize,
        portPassNumber: newPortPassNumber.trim() || undefined,
        portPassExpiryDate: newPortPassExpiryDate || undefined,
        status: newStatus,
      });

      alert(`Vehicle ${newVehicleNumber.toUpperCase()} (${newChassisNumber.toUpperCase()}) added to fleet successfully!`);
      setCreateModal(false);
      setNewVehicleNumber('');
      setNewChassisNumber('');
      setNewPortPassNumber('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to add vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (v: any) => {
    const nextStatus = v.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    try {
      await adminFleetWebStore.updateVehicleStatus(v.id || v.vehicleNumber, nextStatus);
      alert(`Vehicle ${v.vehicleNumber} status set to ${nextStatus}`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update vehicle');
    }
  };

  const handleAssign = async (vehicleId: string, driverId: string | null) => {
    try {
      await adminFleetWebStore.assignDriverToVehicle(vehicleId, driverId);
      alert('Driver assignment updated');
      setAssignModal(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to assign driver');
    }
  };

  return (
    <div style={styles.container}>
      {/* Fleet Metric Summary Chips matching Mobile styles.metricsRow */}
      <div className="metrics-bar">
        <div className="metric-chip">
          <span className="metric-chip-num">{vehicles.length}</span>
          <span className="metric-chip-label">Total Fleet</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#00e5ff' }}>
            {vehicles.filter((v) => v.operator === 'SCK Logistics').length}
          </span>
          <span className="metric-chip-label">SCK Logistics</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#feb300' }}>
            {vehicles.filter((v) => v.operator === 'SDR LINK').length}
          </span>
          <span className="metric-chip-label">SDR LINK</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#4caf50' }}>
            {vehicles.filter((v) => v.status === 'ACTIVE').length}
          </span>
          <span className="metric-chip-label">Active In Service</span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-num" style={{ color: '#ff5252' }}>
            {vehicles.filter((v) => v.status === 'MAINTENANCE').length}
          </span>
          <span className="metric-chip-label">In Maintenance</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="#78909c" />
          <input
            type="text"
            placeholder="Search by LY No, CHE No, Operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterPills}>
          {['ALL', 'SCK Logistics', 'SDR LINK'].map((op) => (
            <button
              key={op}
              onClick={() => setOperatorFilter(op)}
              style={{
                ...styles.filterPill,
                ...(operatorFilter === op ? styles.filterPillActive : {}),
              }}
            >
              {op}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {['ALL', 'ACTIVE', 'MAINTENANCE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                ...styles.filterPill,
                ...(statusFilter === st ? { background: '#2196f3', color: '#ffffff' } : {}),
              }}
            >
              {st}
            </button>
          ))}

          <button
            onClick={() => setCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontWeight: 800, fontSize: '12px' }}
          >
            <Plus size={15} />
            New Vehicle
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Vehicle (LY No)</th>
              <th>Chassis (CHE No)</th>
              <th>Operator</th>
              <th>Trailer Size</th>
              <th>Assigned Driver</th>
              <th>License Status</th>
              <th>Port Pass Renewal</th>
              <th>Vehicle Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: '#90caf9' }}>
                  Loading fleet data...
                </td>
              </tr>
            ) : vehicles.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '28px', color: '#78909c' }}>
                  No vehicles found.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id || v.vehicleNumber}>
                  <td style={{ fontWeight: 800, color: '#ffffff' }}>{v.vehicleNumber}</td>
                  <td>
                    <span className="badge badge-cyan">{v.chassisNumber || v.cheNumber || 'CHE'}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        color: v.operator === 'SDR LINK' ? '#e040fb' : '#40c4ff',
                        fontWeight: 700,
                      }}
                    >
                      {v.operator || 'SCK Logistics'}
                    </span>
                  </td>
                  <td>{v.trailerSize || '40FT'}</td>
                  <td>
                    {v.driverName ? (
                      <span style={{ fontWeight: 600, color: '#cfd8dc' }}>
                        {v.driverName} <span style={{ color: '#00e5ff' }}>({v.driverCode})</span>
                      </span>
                    ) : (
                      <span style={{ color: '#78909c', fontStyle: 'italic' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    {v.renewalDue || v.licenseStatus === 'RENEWAL_DUE' ? (
                      <span className="badge badge-amber" style={{ gap: '4px' }}>
                        <AlertTriangle size={12} />
                        Due ({v.daysUntilExpiry ?? 18}d)
                      </span>
                    ) : (
                      <span className="badge badge-green">Valid</span>
                    )}
                  </td>
                  <td>
                    {v.portPassStatus === 'RENEWAL_DUE' ? (
                      <span className="badge badge-amber" style={{ gap: '4px' }}>
                        <AlertTriangle size={12} />
                        {v.portPassExpiryDate || '2026-11-20'}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#90caf9', fontWeight: 600 }}>
                        {v.portPassExpiryDate || '2027-05-20'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${v.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                      {v.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setSelectedVehicle(v)}
                        className="btn btn-sm"
                        style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid rgba(0, 229, 255, 0.3)' }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setAssignModal(v)}
                        className="btn btn-secondary btn-sm"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => handleToggleStatus(v)}
                        className={`btn btn-sm ${v.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}`}
                      >
                        {v.status === 'ACTIVE' ? 'Maint' : 'Active'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Driver Modal */}
      {assignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#ffffff' }}>
              Assign Driver to {assignModal.vehicleNumber}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#00e5ff' }}>
              Chassis: {assignModal.chassisNumber} • Operator: {assignModal.operator}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              <div
                onClick={() => handleAssign(assignModal.id, null)}
                style={{
                  ...styles.driverOption,
                  borderColor: 'rgba(255, 82, 82, 0.4)',
                  color: '#ff8a80',
                }}
              >
                <strong>Unassign Driver</strong> (Leave Vehicle Free)
              </div>

              {drivers.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleAssign(assignModal.id, d.id)}
                  style={styles.driverOption}
                >
                  <div>
                    <strong style={{ color: '#ffffff' }}>{d.fullName}</strong>
                    <div style={{ fontSize: '11px', color: '#78909c', marginTop: '2px' }}>
                      {d.driverCode} • Phone: {d.mobileNumber}
                    </div>
                  </div>
                  <UserCheck size={16} color="#00e5ff" />
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button onClick={() => setAssignModal(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Vehicle Details & Specifications Modal */}
      {selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 229, 255, 0.15)', border: '1px solid #00e5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={24} color="#00e5ff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                    {selectedVehicle.vehicleNumber}
                  </h3>
                  <span style={{ color: '#00e5ff', fontSize: '13px', fontWeight: 700 }}>
                    {selectedVehicle.chassisNumber || selectedVehicle.cheNumber} • {selectedVehicle.operator}
                  </span>
                </div>
              </div>

              <span className={`badge ${selectedVehicle.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                {selectedVehicle.status || 'ACTIVE'}
              </span>
            </div>

            {/* 1. Fleet & Specifications */}
            <h4 style={styles.modalSectionTitle}>VEHICLE SPECIFICATIONS & OPERATOR</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Registration Plate:</span>
                <span style={{ ...styles.detailValue, color: '#00e5ff' }}>{selectedVehicle.vehicleNumber}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Chassis / CHE Number:</span>
                <span style={styles.detailValue}>{selectedVehicle.chassisNumber || selectedVehicle.cheNumber}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Fleet Operator:</span>
                <span style={styles.detailValue}>{selectedVehicle.operator || 'SCK Logistics'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Trailer Standard:</span>
                <span style={styles.detailValue}>{selectedVehicle.trailerSize || '40FT'} Skeletal Prime Mover</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Vehicle Type:</span>
                <span style={styles.detailValue}>Port Inter-Terminal Container Carrier</span>
              </div>
            </div>

            {/* 2. Assigned Driver */}
            <h4 style={styles.modalSectionTitle}>ASSIGNED DRIVER & OPERATOR</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Driver Name:</span>
                <span style={{ ...styles.detailValue, color: selectedVehicle.driverName ? '#4caf50' : '#ffb74d' }}>
                  {selectedVehicle.driverName || 'No Driver Assigned'}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Driver Code:</span>
                <span style={styles.detailValue}>{selectedVehicle.driverCode || 'N/A'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Contact Phone:</span>
                <span style={styles.detailValue}>{selectedVehicle.driverMobile || 'N/A'}</span>
              </div>
            </div>

            {/* 3. Revenue License & Compliance */}
            <h4 style={styles.modalSectionTitle}>REVENUE LICENSE & COMPLIANCE</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>License Issued Date:</span>
                <span style={styles.detailValue}>{selectedVehicle.licenseIssuedDate || '2025-11-15'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>License Expiry Date:</span>
                <span style={{ ...styles.detailValue, color: selectedVehicle.daysUntilExpiry && selectedVehicle.daysUntilExpiry <= 30 ? '#feb300' : '#4caf50' }}>
                  {selectedVehicle.licenseExpiryDate || '2026-11-15'}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Renewal Status:</span>
                <span style={{ ...styles.detailValue, color: selectedVehicle.daysUntilExpiry && selectedVehicle.daysUntilExpiry <= 30 ? '#feb300' : '#4caf50', fontWeight: 800 }}>
                  {selectedVehicle.daysUntilExpiry && selectedVehicle.daysUntilExpiry <= 30
                    ? `RENEWAL DUE (${selectedVehicle.daysUntilExpiry} days remaining)`
                    : 'VALID & COMPLIANT'}
                </span>
              </div>
            </div>

            {/* 4. SLPA Port Entry Pass & Clearance */}
            <h4 style={styles.modalSectionTitle}>PORT ENTRY PASS & CLEARANCE (SLPA)</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>SLPA Port Pass Number:</span>
                <span style={{ ...styles.detailValue, color: '#00e5ff', fontWeight: 800 }}>
                  {selectedVehicle.portPassNumber || `SLPA-VPP-${selectedVehicle.chassisNumber?.replace('CHE ', '') || '100'}`}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Port Pass Renewal Date:</span>
                <span style={{ ...styles.detailValue, color: selectedVehicle.portPassStatus === 'RENEWAL_DUE' ? '#feb300' : '#4caf50', fontWeight: 800 }}>
                  {selectedVehicle.portPassExpiryDate || '2027-05-20'}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Port Pass Status:</span>
                <span style={{ ...styles.detailValue, color: selectedVehicle.portPassStatus === 'RENEWAL_DUE' ? '#feb300' : '#4caf50', fontWeight: 800 }}>
                  {selectedVehicle.portPassStatus === 'RENEWAL_DUE'
                    ? '⚠️ RENEWAL DUE (< 30 DAYS)'
                    : '✅ ACTIVE CLEARANCE'}
                </span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Terminal Clearance:</span>
                <span style={styles.detailValue}>JCT Gate 1 / CICT Gate 2 / SAGT / ECT</span>
              </div>
            </div>

            {/* 5. Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setAssignModal(selectedVehicle);
                  setSelectedVehicle(null);
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Reassign Driver
              </button>
              <button
                onClick={() => {
                  handleToggleStatus(selectedVehicle);
                  setSelectedVehicle(null);
                }}
                className={`btn ${selectedVehicle.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                style={{ flex: 1 }}
              >
                {selectedVehicle.status === 'ACTIVE' ? 'Set Maintenance' : 'Activate Truck'}
              </button>
              <button onClick={() => setSelectedVehicle(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Vehicle Modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} color="#00e5ff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>Add New Fleet Vehicle</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#90caf9' }}>Register Prime Mover & Port Chassis</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#78909c', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label>Vehicle Plate (LY No) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LY-5660"
                    value={newVehicleNumber}
                    onChange={(e) => setNewVehicleNumber(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="form-group">
                  <label>Chassis No (SCK No) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SCK 128"
                    value={newChassisNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNewChassisNumber(val);
                      if (!newPortPassNumber || newPortPassNumber.startsWith('SLPA-VPP-')) {
                        setNewPortPassNumber(`SLPA-VPP-${val.replace(/[^A-Z0-9]/g, '')}`);
                      }
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label>Fleet Operator</label>
                  <select value={newOperator} onChange={(e) => setNewOperator(e.target.value)}>
                    <option value="SCK Logistics">SCK Logistics</option>
                    <option value="SDR LINK">SDR LINK</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Trailer Chassis Size</label>
                  <select value={newTrailerSize} onChange={(e) => setNewTrailerSize(e.target.value)}>
                    <option value="40FT">40FT Standard Skeletal</option>
                    <option value="20FT">20FT Container Chassis</option>
                    <option value="45FT">45FT Heavy Haul</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label>Vehicle Port Pass No</label>
                  <input
                    type="text"
                    placeholder="e.g. SLPA-VPP-128"
                    value={newPortPassNumber}
                    onChange={(e) => setNewPortPassNumber(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="form-group">
                  <label>Pass Renewal Date</label>
                  <input
                    type="date"
                    value={newPortPassExpiryDate}
                    onChange={(e) => setNewPortPassExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Initial Operating Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="ACTIVE">ACTIVE (Available for ITT Ops)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Workshop inspection)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ minWidth: '160px' }}
                >
                  {submitting ? 'Registering...' : 'Register Vehicle'}
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
    gap: '12px',
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
    minWidth: '240px',
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
  driverOption: {
    padding: '12px 14px',
    backgroundColor: '#070f1e',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.15s ease',
  },
};
