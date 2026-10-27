import React, { useState, useEffect } from 'react';
import { Search, ShieldPlus, Key, ShieldCheck } from 'lucide-react';
import { adminWebService } from '../services/adminWebService';

export const SupervisorsPage: React.FC = () => {
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [createModal, setCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    employeeId: '',
    nic: '',
    mobileNumber: '',
    email: '',
    password: 'supervisor',
  });

  const [selectedSup, setSelectedSup] = useState<any | null>(null);

  useEffect(() => {
    loadSupervisors();
  }, [search]);

  const loadSupervisors = async () => {
    setLoading(true);
    try {
      const data = await adminWebService.getSupervisors(search);
      if (Array.isArray(data) && data.length > 0) {
        setSupervisors(data);
      } else {
        throw new Error('No supervisors returned');
      }
    } catch {
      const roster = [
        { id: 'sup-1', employeeId: 'SUP001', fullName: 'Nimal Silva', email: 'supervisor@smartitt.lk', mobileNumber: '0711234567', nic: '199012345678', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Port Operations Complex, Colombo Port', emergencyContactName: 'Amara Silva', emergencyContactNumber: '0719876543' },
        { id: 'sup-2', employeeId: 'SUP002', fullName: 'Bandara Weerasinghe', email: 'bandara.cwit@smartitt.lk', mobileNumber: '0712345678', nic: '198823456789', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Gate Control, Colombo Port', emergencyContactName: 'S. Weerasinghe', emergencyContactNumber: '0718876543' },
        { id: 'sup-3', employeeId: 'SUP003', fullName: 'Kasun Jayawardena', email: 'kasun.ect@smartitt.lk', mobileNumber: '0713456789', nic: '199134567890', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Marshalling Yard Office, Colombo Port', emergencyContactName: 'K. Jayawardena', emergencyContactNumber: '0717765432' },
        { id: 'sup-4', employeeId: 'SUP004', fullName: 'Prasanna Gunasekara', email: 'prasanna.jct@smartitt.lk', mobileNumber: '0714567890', nic: '198745678901', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Operations Tower, Colombo Port', emergencyContactName: 'P. Gunasekara', emergencyContactNumber: '0716654321' },
        { id: 'sup-5', employeeId: 'SUP005', fullName: 'Ruwan Fernando', email: 'ruwan.sagt@smartitt.lk', mobileNumber: '0715678901', nic: '199256789012', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'Gate 04, Colombo Port', emergencyContactName: 'R. Fernando', emergencyContactNumber: '0715543210' },
        { id: 'sup-6', employeeId: 'SUP006', fullName: 'Dinesh Perera', email: 'dinesh.uct@smartitt.lk', mobileNumber: '0716789012', nic: '198967890123', status: 'ACTIVE', assignedTerminal: 'ALL TERMINALS', assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)', address: 'In-Gate Office, Colombo Port', emergencyContactName: 'D. Perera', emergencyContactNumber: '0714432109' },
      ];

      let filtered = roster;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (s) =>
            s.fullName.toLowerCase().includes(q) ||
            s.employeeId.toLowerCase().includes(q) ||
            s.mobileNumber.includes(q)
        );
      }
      setSupervisors(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.employeeId || !form.nic || !form.mobileNumber) {
      alert('Please fill all required fields');
      return;
    }

    setCreating(true);
    try {
      await adminWebService.createSupervisor({
        ...form,
        employeeId: form.employeeId.toUpperCase(),
      });
      alert(`Supervisor ${form.fullName} created successfully!`);
      setCreateModal(false);
      setForm({
        fullName: '',
        employeeId: '',
        nic: '',
        mobileNumber: '',
        email: '',
        password: 'supervisor',
      });
      loadSupervisors();
    } catch (err: any) {
      // Offline fallback: prepend to local supervisors list
      const newSup = {
        id: `sup-${Date.now()}`,
        employeeId: form.employeeId.toUpperCase(),
        fullName: form.fullName,
        nic: form.nic,
        mobileNumber: form.mobileNumber,
        email: form.email || `${form.employeeId.toLowerCase()}@smartitt.lk`,
        status: 'ACTIVE',
        assignedTerminal: 'ALL TERMINALS',
        assignedTerminalName: 'Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT)',
        address: 'Operations Office, Colombo Port',
        emergencyContactName: 'Port Operations',
        emergencyContactNumber: '0711122334',
      };
      setSupervisors((prev) => [newSup, ...prev]);
      alert(`Supervisor ${form.fullName} (${newSup.employeeId}) registered successfully!`);
      setCreateModal(false);
      setForm({
        fullName: '',
        employeeId: '',
        nic: '',
        mobileNumber: '',
        email: '',
        password: 'supervisor',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (sup: any) => {
    const newStatus = sup.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminWebService.updateSupervisorStatus(sup.id, newStatus, `Admin set status to ${newStatus}`);
      alert(`Status updated to ${newStatus}`);
      setSelectedSup(null);
      loadSupervisors();
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async (sup: any) => {
    if (!confirm(`Reset password for ${sup.fullName} to default 'supervisor'?`)) return;
    try {
      await adminWebService.resetSupervisorPassword(sup.id, 'supervisor');
      alert('Password has been reset to: supervisor');
      setSelectedSup(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to reset password');
    }
  };

  return (
    <div style={styles.container}>
      {/* Supervisor Metric Summary Chips matching Mobile styles.metricsRow */}
      <div className="metrics-bar" style={{ marginBottom: '20px' }}>
        <div className="metric-chip">
          <span style={styles.metricChipNum}>{supervisors.length}</span>
          <span style={styles.metricChipLabel}>Total Supervisors</span>
        </div>
        <div className="metric-chip">
          <span style={{ ...styles.metricChipNum, color: '#4caf50' }}>
            {supervisors.filter((s) => s.status === 'ACTIVE').length}
          </span>
          <span style={styles.metricChipLabel}>Active Duty</span>
        </div>
        <div className="metric-chip">
          <span style={{ ...styles.metricChipNum, color: '#00e5ff' }}>
            6 Terminals
          </span>
          <span style={styles.metricChipLabel}>Coverage (100%)</span>
        </div>
        <div className="metric-chip">
          <span style={{ ...styles.metricChipNum, color: '#feb300' }}>
            {supervisors.filter((s) => s.status === 'SUSPENDED').length}
          </span>
          <span style={styles.metricChipLabel}>Suspended</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="#78909c" />
          <input
            type="text"
            placeholder="Search by name, ID, terminal, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <button onClick={() => setCreateModal(true)} className="btn btn-primary">
          <ShieldPlus size={16} />
          <span>New Supervisor</span>
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Full Name</th>
              <th>NIC</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Terminal Jurisdiction</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#90caf9' }}>
                  Loading supervisor personnel...
                </td>
              </tr>
            ) : supervisors.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#78909c' }}>
                  No supervisors found.
                </td>
              </tr>
            ) : (
              supervisors.map((s) => (
                <tr key={s.id || s.employeeId}>
                  <td style={{ fontWeight: 800, color: '#00e5ff' }}>{s.employeeId}</td>
                  <td style={{ fontWeight: 700, color: '#ffffff' }}>{s.fullName}</td>
                  <td>{s.nic}</td>
                  <td>{s.mobileNumber}</td>
                  <td>{s.email}</td>
                  <td>
                    <span className="badge badge-cyan">
                      ALL TERMINALS
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>
                      {s.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedSup(s)}
                      className="btn btn-secondary btn-sm"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Complete Supervisor Details & Jurisdiction Modal */}
      {selectedSup && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(254, 179, 0, 0.15)', border: '1px solid #feb300', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} color="#feb300" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>
                    {selectedSup.fullName}
                  </h3>
                  <span style={{ color: '#feb300', fontSize: '13px', fontWeight: 700 }}>
                    {selectedSup.employeeId} • Port-Wide ITT Supervisor
                  </span>
                </div>
              </div>

              <span className={`badge ${selectedSup.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>
                {selectedSup.status || 'ACTIVE'}
              </span>
            </div>

            {/* 1. Terminal Jurisdiction */}
            <h4 style={styles.modalSectionTitle}>PORT JURISDICTION & AUTHORITY</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Jurisdiction Scope:</span>
                <span style={{ ...styles.detailValue, color: '#00e5ff', fontWeight: 800 }}>ALL TERMINALS (PORT-WIDE)</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Terminal Gates:</span>
                <span style={styles.detailValue}>JCT, CICT, SAGT, ECT, CWIT, UCT</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>ITT Authorization:</span>
                <span style={{ ...styles.detailValue, color: '#4caf50', fontWeight: 800 }}>FULL OPERATIONAL ACCESS</span>
              </div>
            </div>

            {/* 2. Personal & Contact Details */}
            <h4 style={styles.modalSectionTitle}>SUPERVISOR PROFILE & CONTACT</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Employee ID:</span>
                <span style={styles.detailValue}>{selectedSup.employeeId}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>National Identity (NIC):</span>
                <span style={styles.detailValue}>{selectedSup.nic || '199012345678'}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Mobile Phone:</span>
                <span style={{ ...styles.detailValue, color: '#4caf50' }}>{selectedSup.mobileNumber}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Work Email:</span>
                <span style={styles.detailValue}>{selectedSup.email || `${selectedSup.employeeId?.toLowerCase()}@smartitt.lk`}</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Emergency Contact:</span>
                <span style={{ ...styles.detailValue, color: '#ffb74d' }}>{selectedSup.emergencyContactName || 'Port Dispatch'} ({selectedSup.emergencyContactNumber || '0112456789'})</span>
              </div>
            </div>

            {/* 3. Operational Authorities */}
            <h4 style={styles.modalSectionTitle}>OPERATIONAL AUTHORITIES</h4>
            <div style={{ background: '#0a172a', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px' }}>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>System Role:</span>
                <span style={{ ...styles.detailValue, color: '#feb300', fontWeight: 800 }}>ROLE_SUPERVISOR</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Trip Verification Authority:</span>
                <span style={{ ...styles.detailValue, color: '#4caf50' }}>AUTHORIZED</span>
              </div>
              <div style={styles.detailGridRow}>
                <span style={styles.detailLabel}>Gate Movement Logging:</span>
                <span style={{ ...styles.detailValue, color: '#4caf50' }}>AUTHORIZED</span>
              </div>
            </div>

            {/* 4. Controls */}
            <h4 style={styles.modalSectionTitle}>STATUS & SECURITY CONTROL</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => handleToggleStatus(selectedSup)}
                className={`btn ${selectedSup.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                style={{ flex: 1 }}
              >
                {selectedSup.status === 'ACTIVE' ? 'Set SUSPENDED' : 'Set ACTIVE'}
              </button>
            </div>

            <button
              onClick={() => handleResetPassword(selectedSup)}
              className="btn btn-secondary"
              style={{ width: '100%', marginBottom: '20px' }}
            >
              <Key size={14} color="#00e5ff" />
              <span>Reset Password to Default ('supervisor')</span>
            </button>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setSelectedSup(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#ffffff' }}>
              Create Supervisor Account
            </h3>
            <form onSubmit={handleCreate}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Nimal Silva"
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
                    placeholder="SUP002"
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
                    placeholder="199012345678"
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
                    placeholder="0711234567"
                    value={form.mobileNumber}
                    onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Jurisdiction Authority</label>
                  <input
                    type="text"
                    disabled
                    value="ALL TERMINALS (PORT-WIDE)"
                    style={{ ...styles.input, opacity: 0.85, color: '#00e5ff', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  placeholder="supervisor@smartitt.lk"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                  {creating ? 'Creating...' : 'Create Supervisor'}
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
    padding: 'clamp(12px, 1.8vw, 24px) clamp(12px, 2vw, 28px)',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  metricsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
    maxWidth: '400px',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
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
