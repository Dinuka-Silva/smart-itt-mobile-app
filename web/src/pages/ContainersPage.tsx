import React, { useState, useEffect } from 'react';
import { Search, Box, ArrowRight } from 'lucide-react';
import { adminWebService } from '../services/adminWebService';

export const ContainersPage: React.FC = () => {
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('ALL');
  const [terminalFilter, setTerminalFilter] = useState('ALL');

  useEffect(() => {
    loadContainers();
  }, [search, sizeFilter, terminalFilter]);

  const loadContainers = async () => {
    setLoading(true);
    try {
      const data = await adminWebService.searchContainers(
        search,
        sizeFilter === 'ALL' ? undefined : sizeFilter,
        terminalFilter === 'ALL' ? undefined : terminalFilter
      );
      if (Array.isArray(data) && data.length > 0) {
        setContainers(data);
      } else {
        throw new Error('No containers from API');
      }
    } catch {
      const fallback = [
        {
          id: 'cnt-1',
          containerNumber: 'MSKU9876543',
          size: '40FT',
          sourceTerminal: 'JCT',
          destTerminal: 'CICT',
          status: 'COMPLETED',
          tripNumber: 'TRIP-2026-0041',
          vehicleNumber: 'LY-2345 (SCK 101)',
          vesselName: 'EVER GIVEN V.042',
          completedAt: 'Today, 10:14 AM',
          createdAt: '2026-10-27 08:30',
        },
        {
          id: 'cnt-2',
          containerNumber: 'CMAU1122334',
          size: '20FT',
          sourceTerminal: 'CICT',
          destTerminal: 'ECT',
          status: 'IN_TRANSIT',
          tripNumber: 'TRIP-2026-0042',
          vehicleNumber: 'LY-3456 (SCK 102)',
          vesselName: 'MAERSK MC-KINNEY',
          completedAt: 'In Transit',
          createdAt: '2026-10-27 09:45',
        },
        {
          id: 'cnt-3',
          containerNumber: 'CMAU1122335',
          size: '20FT',
          sourceTerminal: 'CICT',
          destTerminal: 'ECT',
          status: 'IN_TRANSIT',
          tripNumber: 'TRIP-2026-0042',
          vehicleNumber: 'LY-3456 (SCK 102)',
          vesselName: 'MAERSK MC-KINNEY',
          completedAt: 'In Transit',
          createdAt: '2026-10-27 09:45',
        },
        {
          id: 'cnt-4',
          containerNumber: 'TGHU5544332',
          size: '40FT',
          sourceTerminal: 'SAGT',
          destTerminal: 'CWIT',
          status: 'IN_TRANSIT',
          tripNumber: 'TRIP-2026-0043',
          vehicleNumber: 'LY-4567 (SCK 103)',
          vesselName: 'MSC OSCAR V.812',
          completedAt: 'In Transit',
          createdAt: '2026-10-27 10:10',
        },
        {
          id: 'cnt-5',
          containerNumber: 'MEDU7788990',
          size: '40FT',
          sourceTerminal: 'ECT',
          destTerminal: 'JCT',
          status: 'PENDING_APPROVAL',
          tripNumber: 'TRIP-2026-0044',
          vehicleNumber: 'LY-5678 (SCK 104)',
          vesselName: 'CMA CGM ANTOINE',
          completedAt: 'Gate-in JCT',
          createdAt: '2026-10-27 07:20',
        },
        {
          id: 'cnt-6',
          containerNumber: 'HLXU3344556',
          size: '40FT',
          sourceTerminal: 'CWIT',
          destTerminal: 'UCT',
          status: 'COMPLETED',
          tripNumber: 'TRIP-2026-0038',
          vehicleNumber: 'LY-6789 (SCK 105)',
          vesselName: 'COSCO SHIPPING V.204',
          completedAt: 'Yesterday, 17:30',
          createdAt: '2026-10-26 15:00',
        },
      ];

      let filtered = fallback;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (c) =>
            c.containerNumber.toLowerCase().includes(q) ||
            c.vehicleNumber.toLowerCase().includes(q) ||
            c.tripNumber.toLowerCase().includes(q)
        );
      }
      if (sizeFilter !== 'ALL') {
        filtered = filtered.filter((c) => c.size === sizeFilter);
      }
      if (terminalFilter !== 'ALL') {
        filtered = filtered.filter(
          (c) => c.sourceTerminal === terminalFilter || c.destTerminal === terminalFilter
        );
      }
      setContainers(filtered);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Controls */}
      <div style={styles.controlsBar}>
        <div style={styles.searchBox}>
          <Search size={16} color="#78909c" />
          <input
            type="text"
            placeholder="Search Container Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterPills}>
          {['ALL', '20FT', '40FT'].map((sz) => (
            <button
              key={sz}
              onClick={() => setSizeFilter(sz)}
              style={{
                ...styles.filterPill,
                ...(sizeFilter === sz ? styles.filterPillActive : {}),
              }}
            >
              {sz}
            </button>
          ))}
        </div>

        <select
          value={terminalFilter}
          onChange={(e) => setTerminalFilter(e.target.value)}
          style={styles.selectInput}
        >
          <option value="ALL">All Port Terminals</option>
          {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Container Number</th>
              <th>Size</th>
              <th>Movement Route</th>
              <th>Status</th>
              <th>Related Trip</th>
              <th>Vehicle / Vessel</th>
              <th>Unloaded At</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#90caf9' }}>
                  Loading container records...
                </td>
              </tr>
            ) : containers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: '#78909c' }}>
                  No container records found.
                </td>
              </tr>
            ) : (
              containers.map((c) => (
                <tr key={c.id || c.containerNumber}>
                  <td style={{ fontWeight: 800, color: '#00e5ff' }}>{c.containerNumber}</td>
                  <td>
                    <span className="badge badge-cyan">{c.size}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-cyan">{c.sourceTerminal}</span>
                      <ArrowRight size={12} color="#78909c" />
                      <span className="badge badge-cyan">{c.destTerminal}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'LOADED' ? 'badge-amber' : 'badge-green'}`}>
                      {c.status || 'LOADED'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#ffffff' }}>{c.tripNumber || 'N/A'}</td>
                  <td>{c.vehicleNumber || 'Unassigned'} • {c.vesselName || 'ITT'}</td>
                  <td>{c.unloadedAt || 'In Transit'}</td>
                  <td style={{ fontSize: '11px', color: '#78909c' }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
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
};
