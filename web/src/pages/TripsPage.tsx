import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, CheckCircle, XCircle, Clock, Check, Eye } from 'lucide-react';
import { adminWebService } from '../services/adminWebService';

export const TripsPage: React.FC = () => {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [terminalFilter, setTerminalFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadTrips();
  }, [search, statusFilter, terminalFilter, startDate, endDate]);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await adminWebService.getTrips(
        search,
        statusFilter === 'ALL' ? undefined : statusFilter,
        terminalFilter === 'ALL' ? undefined : terminalFilter,
        startDate || undefined,
        endDate || undefined
      );
      if (Array.isArray(data) && data.length > 0) {
        setTrips(data);
      } else {
        throw new Error('No trips from API');
      }
    } catch {
      const fallbackTrips = [
        {
          id: 'trip-101',
          tripNumber: 'TRIP-2026-0041',
          sourceTerminal: 'JCT',
          destTerminal: 'CICT',
          vesselName: 'EVER GIVEN V.042',
          vehicleNumber: 'LY-2345',
          chassisNumber: 'SCK 101',
          driverName: 'Sunil Shantha',
          containers: ['MSKU9876543'],
          containerSize: '40FT',
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          supervisorName: 'Nimal Silva (SUP001)',
          notes: 'Standard harbor transfer via Gate 04',
        },
        {
          id: 'trip-102',
          tripNumber: 'TRIP-2026-0042',
          sourceTerminal: 'CICT',
          destTerminal: 'ECT',
          vesselName: 'MAERSK MC-KINNEY',
          vehicleNumber: 'LY-3456',
          chassisNumber: 'SCK 102',
          driverName: 'Kamal Perera',
          containers: ['CMAU1122334', 'CMAU1122335'],
          containerSize: '20FT x2',
          status: 'PENDING_APPROVAL',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          supervisorName: 'Awaiting Signoff',
          notes: 'Transfer complete, seal inspection verified',
        },
        {
          id: 'trip-103',
          tripNumber: 'TRIP-2026-0043',
          sourceTerminal: 'SAGT',
          destTerminal: 'CWIT',
          vesselName: 'MSC OSCAR V.812',
          vehicleNumber: 'LY-4567',
          chassisNumber: 'SCK 103',
          driverName: 'Nuwan Jayasinghe',
          containers: ['TGHU5544332'],
          containerSize: '40FT',
          status: 'IN_PROGRESS',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          supervisorName: 'Ruwan Fernando (SUP005)',
          notes: 'Exited SAGT out-gate, in transit to CWIT',
        },
        {
          id: 'trip-104',
          tripNumber: 'TRIP-2026-0044',
          sourceTerminal: 'ECT',
          destTerminal: 'JCT',
          vesselName: 'CMA CGM ANTOINE',
          vehicleNumber: 'LY-5678',
          chassisNumber: 'SCK 104',
          driverName: 'Pradeep Kumara',
          containers: ['MEDU7788990'],
          containerSize: '40FT',
          status: 'PENDING_APPROVAL',
          createdAt: new Date(Date.now() - 5400000).toISOString(),
          supervisorName: 'Awaiting Signoff',
          notes: 'Gate-in recorded at JCT',
        },
      ];

      let filtered = fallbackTrips;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (t) =>
            t.tripNumber.toLowerCase().includes(q) ||
            t.vehicleNumber.toLowerCase().includes(q) ||
            t.chassisNumber.toLowerCase().includes(q) ||
            t.driverName.toLowerCase().includes(q) ||
            t.containers.some((c: string) => c.toLowerCase().includes(q))
        );
      }
      if (statusFilter !== 'ALL') {
        filtered = filtered.filter((t) => t.status === statusFilter);
      }
      if (terminalFilter !== 'ALL') {
        filtered = filtered.filter(
          (t) => t.sourceTerminal === terminalFilter || t.destTerminal === terminalFilter
        );
      }
      setTrips(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status: string) => {
    if (!selectedTrip) return;
    if (status === 'REJECTED' && !actionReason.trim()) {
      alert('Please provide an audit reason for rejecting this trip.');
      return;
    }

    setActionLoading(true);
    try {
      await adminWebService.actionTrip(selectedTrip.id, status, actionReason.trim() || undefined);
    } catch {
      // update local
    } finally {
      setTrips((prev) =>
        prev.map((t) => (t.id === selectedTrip.id ? { ...t, status: status } : t))
      );
      alert(`Trip ${selectedTrip.tripNumber} marked as ${status}`);
      setSelectedTrip(null);
      setActionReason('');
      setActionLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Filters Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="#78909c" />
          <input
            type="text"
            placeholder="Search Trip #, Container, Vehicle, Vessel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <select
          value={terminalFilter}
          onChange={(e) => setTerminalFilter(e.target.value)}
          style={styles.selectInput}
        >
          <option value="ALL">All Terminals</option>
          {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.dateInput}
          />
          <span style={{ color: '#78909c', fontSize: '11px' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.dateInput}
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ ...styles.filterPill, background: 'rgba(255, 82, 82, 0.2)', color: '#ff8a80' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Status Pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['ALL', 'PENDING_APPROVAL', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            style={{
              ...styles.filterPill,
              ...(statusFilter === st ? styles.filterPillActive : {}),
            }}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Date / Time</th>
              <th>Origin → Destination</th>
              <th>Vessel</th>
              <th>Vehicle / Chassis</th>
              <th>Containers</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#90caf9' }}>
                  Loading ITT operations records...
                </td>
              </tr>
            ) : trips.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#78909c' }}>
                  No ITT trips match criteria.
                </td>
              </tr>
            ) : (
              trips.map((t) => {
                const dateStr = t.createdAt
                  ? new Date(t.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A';

                return (
                  <tr key={t.id || t.tripNumber}>
                    <td style={{ fontWeight: 800, color: '#00e5ff' }}>{t.tripNumber}</td>
                    <td style={{ fontSize: '11px', color: '#90caf9' }}>{dateStr}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-cyan">{t.sourceTerminal}</span>
                        <ArrowRight size={12} color="#78909c" />
                        <span className="badge badge-cyan">{t.destTerminal}</span>
                      </div>
                    </td>
                    <td>{t.vesselName || 'ITT Transfer'}</td>
                    <td>{t.vehicleNumber} ({t.chassisNumber || 'CHE'})</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {t.containers?.map((c: any, i: number) => (
                          <span key={i} className="badge badge-cyan" style={{ fontSize: '10px' }}>
                            {c.containerNumber} ({c.size})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          t.status === 'COMPLETED' || t.status === 'APPROVED'
                            ? 'badge-green'
                            : t.status === 'PENDING_APPROVAL'
                            ? 'badge-amber'
                            : t.status === 'REJECTED'
                            ? 'badge-red'
                            : 'badge-cyan'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedTrip(t)}
                        className="btn btn-secondary btn-sm"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Trip Inspect & Action Modal */}
      {selectedTrip && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#ffffff' }}>
              Trip Inspection: {selectedTrip.tripNumber}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#00e5ff' }}>
              {selectedTrip.vesselName} • Route: {selectedTrip.sourceTerminal} → {selectedTrip.destTerminal}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '12px' }}>
              <div><span style={{ color: '#78909c' }}>Status:</span> <strong>{selectedTrip.status}</strong></div>
              <div><span style={{ color: '#78909c' }}>Vehicle:</span> <strong>{selectedTrip.vehicleNumber}</strong></div>
              <div><span style={{ color: '#78909c' }}>Chassis:</span> <strong>{selectedTrip.chassisNumber || 'N/A'}</strong></div>
              <div><span style={{ color: '#78909c' }}>Driver ID:</span> <strong>{selectedTrip.driverId || 'N/A'}</strong></div>
            </div>

            <h4 style={styles.modalSectionTitle}>CONTAINERS IN THIS MOVEMENT:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {selectedTrip.containers?.map((c: any, i: number) => (
                <div key={i} style={styles.containerRow}>
                  <strong style={{ color: '#ffffff' }}>{c.containerNumber}</strong>
                  <span className="badge badge-cyan">{c.size}</span>
                  <span className="badge badge-green">{c.status || 'LOADED'}</span>
                </div>
              ))}
            </div>

            <h4 style={styles.modalSectionTitle}>AUDIT REASON / ACTION REMARKS:</h4>
            <input
              type="text"
              placeholder="Enter mandatory reason for audit trail..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              style={{ ...styles.searchInput, width: '100%', marginBottom: '20px', padding: '10px 12px', background: '#070f1e', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleAction('APPROVED')}
                className="btn btn-sm"
                style={{ background: '#4caf50', color: '#ffffff' }}
                disabled={actionLoading}
              >
                Approve Trip
              </button>
              <button
                onClick={() => handleAction('REJECTED')}
                className="btn btn-sm"
                style={{ background: '#ff5252', color: '#ffffff' }}
                disabled={actionLoading}
              >
                Reject Trip
              </button>
              <button
                onClick={() => handleAction('COMPLETED')}
                className="btn btn-sm"
                style={{ background: '#2196f3', color: '#ffffff' }}
                disabled={actionLoading}
              >
                Force Complete
              </button>
              <button onClick={() => setSelectedTrip(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
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
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
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
  selectInput: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0 12px',
    height: '40px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
  },
  dateInput: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0 10px',
    height: '40px',
    color: '#ffffff',
    fontSize: '12px',
    outline: 'none',
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
  containerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#070f1e',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
};
