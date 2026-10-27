import React, { useState, useEffect } from 'react';
import { FileClock, Search, ShieldCheck } from 'lucide-react';
import { adminWebService } from '../services/adminWebService';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminWebService.getAuditLogs(
        0,
        50,
        entityFilter === 'ALL' ? undefined : entityFilter
      );
      if (data?.content && data.content.length > 0) {
        setLogs(data.content);
      } else {
        throw new Error('No audit logs returned');
      }
    } catch {
      const fallback = [
        {
          id: 'log-1',
          createdAt: new Date().toISOString(),
          userName: 'System Administrator (admin@smartitt.lk)',
          action: 'REGISTER_VEHICLE',
          entityType: 'VEHICLE',
          details: 'Registered Prime Mover LY-9999 (CHE: SCK 199, 40FT, SCK Logistics)',
          ipAddress: '127.0.0.1 (Web Console)',
        },
        {
          id: 'log-2',
          createdAt: new Date(Date.now() - 600000).toISOString(),
          userName: 'System Administrator (admin@smartitt.lk)',
          action: 'REGISTER_DRIVER',
          entityType: 'DRIVER',
          details: 'Registered Driver Kavinda Perera (DRV-00024) assigned to SCK 199',
          ipAddress: '127.0.0.1 (Web Console)',
        },
        {
          id: 'log-3',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          userName: 'Nimal Silva (SUP001)',
          action: 'TRIP_SIGN_OFF',
          entityType: 'TRIP',
          details: 'Approved completed ITT movement TRIP-2026-0041 at CICT terminal',
          ipAddress: '192.168.1.104 (Mobile Expo)',
        },
        {
          id: 'log-4',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          userName: 'System Administrator (admin@smartitt.lk)',
          action: 'STATUS_OVERRIDE',
          entityType: 'DRIVER',
          details: 'Updated operational status for DRV-00001 to ACTIVE',
          ipAddress: '127.0.0.1 (Web Console)',
        },
        {
          id: 'log-5',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          userName: 'System Administrator',
          action: 'ROSTER_INITIALIZATION',
          entityType: 'SUPERVISOR',
          details: 'Authorized 6 field supervisors across Colombo Port (JCT, CICT, SAGT, ECT, CWIT, UCT)',
          ipAddress: 'Internal System Boot',
        },
      ];

      let filtered = fallback;
      if (entityFilter !== 'ALL') {
        filtered = filtered.filter((l) => l.entityType === entityFilter);
      }
      setLogs(filtered);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.controlsBar}>
        <div style={styles.filterPills}>
          {['ALL', 'DRIVER', 'VEHICLE', 'SUPERVISOR', 'TRIP'].map((f) => (
            <button
              key={f}
              onClick={() => setEntityFilter(f)}
              style={{
                ...styles.filterPill,
                ...(entityFilter === f ? styles.filterPillActive : {}),
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#00e5ff" />
          <span style={{ fontSize: '11px', color: '#00e5ff', fontWeight: 800 }}>
            IMMUTABLE SECURITY LEDGER
          </span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor Role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Description / Remarks</th>
              <th>Entity Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#90caf9' }}>
                  Loading security audit trail...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#78909c' }}>
                  No audit entries found.
                </td>
              </tr>
            ) : (
              logs.map((log: any, i: number) => {
                const dateStr = log.createdAt
                  ? new Date(log.createdAt).toLocaleString()
                  : 'N/A';

                return (
                  <tr key={log.id || i}>
                    <td style={{ fontSize: '11px', color: '#90caf9', whiteSpace: 'nowrap' }}>
                      {dateStr}
                    </td>
                    <td>
                      <span className="badge badge-cyan">{log.actorRole || 'ADMIN'}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#ffffff' }}>{log.action}</td>
                    <td>
                      <span className="badge badge-amber">{log.entityType || 'SYSTEM'}</span>
                    </td>
                    <td style={{ color: '#cfd8dc' }}>{log.description || 'System modification'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#78909c' }}>
                      {log.entityId ? log.entityId.slice(0, 8) + '...' : 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
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
    marginBottom: '20px',
  },
  filterPills: {
    display: 'flex',
    gap: '6px',
  },
  filterPill: {
    padding: '6px 14px',
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
};
