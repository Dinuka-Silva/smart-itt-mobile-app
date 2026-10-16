import React from 'react';
import {
  Compass,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Boxes,
  Truck,
  ArrowRight,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { DashboardStats, TerminalInfo, IttTrip } from '../types';

interface OverviewTabProps {
  stats: DashboardStats;
  terminals: TerminalInfo[];
  trips: IttTrip[];
  onApproveTrip: (tripId: string) => void;
  onRejectTrip: (tripId: string) => void;
  onViewTrip: (trip: IttTrip) => void;
  onNavigateToTab: (tab: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  terminals,
  trips,
  onApproveTrip,
  onRejectTrip,
  onViewTrip,
  onNavigateToTab,
}) => {
  const pendingTrips = trips.filter((t) => t.status === 'PENDING_APPROVAL');
  const activeTrips = trips.filter((t) => t.status === 'IN_PROGRESS');

  return (
    <div>
      {/* Top Welcome & KPI Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h2>Port Operational Command Radar</h2>
          <p>
            Real-time inter-terminal transportation overview across all 6 container terminals
            (CICT, CWIT, ECT, JCT, UCT, SAGT).
          </p>
        </div>
        <div className="header-action-group">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onNavigateToTab('supervision')}
            style={{
              background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
              borderColor: '#06b6d4',
              gap: '6px',
              fontWeight: 700,
            }}
          >
            <img src="/sck-logo.png" alt="SCK" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
            <span>SCK Daily Operations</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('reports')}
          >
            <TrendingUp size={14} />
            <span>Executive Report</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('trips')}
          >
            <Compass size={14} />
            <span>All Missions</span>
          </button>
        </div>
      </div>

      {/* SCK Logistics Daily Operations Banner */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/sck-logo.png" alt="SCK Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '13px', color: '#f8fafc' }}>SCK LOGISTICS OPERATIONAL FLEET</span>
              <span className="badge badge-cyan" style={{ fontSize: '10px' }}>15 PRIME MOVERS ACTIVE</span>
              <span className="badge badge-emerald" style={{ fontSize: '10px' }}>LKR 2,500/TRIP TRACKED</span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Primary inter-terminal container logistics carrier across CICT, CWIT, ECT, JCT, UCT, and SAGT terminals.
            </p>
          </div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigateToTab('supervision')}
          style={{ fontSize: '11px', gap: '6px', borderColor: 'rgba(6, 182, 212, 0.4)', color: '#06b6d4' }}
        >
          <span>Supervise Drivers & Fleet</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Total Trips Today</span>
            <div className="stat-icon emerald">
              <Compass size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.totalTripsToday}</div>
          <div className="stat-sub">
            <span className="stat-trend-up">↑ 18.4%</span>
            <span>vs previous shift</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Active In-Transit</span>
            <div className="stat-icon cyan">
              <Truck size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.activeTrips}</div>
          <div className="stat-sub">
            <span>Prime movers on corridor roads</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Pending Gate Approvals</span>
            <div className="stat-icon amber">
              <Clock size={20} />
            </div>
          </div>
          <div
            className="stat-value"
            style={{ color: stats.tripsPendingApproval > 0 ? '#fbbf24' : '#f8fafc' }}
          >
            {stats.tripsPendingApproval}
          </div>
          <div className="stat-sub">
            {stats.tripsPendingApproval > 0 ? (
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>Action Required</span>
            ) : (
              <span>All clear at origin gates</span>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">TEU Handled Today</span>
            <div className="stat-icon purple">
              <Boxes size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.totalTeuToday} TEU</div>
          <div className="stat-sub">
            <span>20FT & 40FT dual capacity</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Authoritative Fleet</span>
            <div className="stat-icon blue">
              <Truck size={20} />
            </div>
          </div>
          <div className="stat-value">
            {stats.activeVehicles} / {stats.totalVehicles}
          </div>
          <div className="stat-sub">
            <span>CHE 100–125 (SCK, SDR, E3)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Discharge Completed</span>
            <div className="stat-icon emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-value">{stats.completedTripsToday}</div>
          <div className="stat-sub">
            <span>Logged to My Trips archives</span>
          </div>
        </div>
      </div>

      {/* Urgent Pending Approvals Banner (If any) */}
      {pendingTrips.length > 0 && (
        <div
          className="panel"
          style={{
            borderColor: 'rgba(245, 158, 11, 0.4)',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 26, 46, 0.95) 100%)',
          }}
        >
          <div className="panel-header">
            <div className="panel-title" style={{ color: '#fbbf24' }}>
              <AlertTriangle size={18} />
              <span>Gate Clearance Queue ({pendingTrips.length} Awaiting Verification)</span>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Drivers held at terminal origin gates
            </span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Mission No</th>
                  <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Driver & Phone</th>
                  <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Vehicle & CHE</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Corridor Route</th>
                  <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Container(s)</th>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Logged At</th>
                  <th style={{ minWidth: '220px', textAlign: 'right', whiteSpace: 'nowrap' }}>Admin Decision</th>
                </tr>
              </thead>
              <tbody>
                {pendingTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="tag-mono">{trip.tripNumber}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{trip.driverName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {trip.driverCode} • {trip.driverPhone}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="tag-mono">{trip.vehicleNumber}</span>
                        <span className="tag-che">{trip.cheNumber}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {trip.operator}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#06b6d4' }}>
                          {trip.sourceTerminal}
                        </span>
                        <ArrowRight size={13} color="#64748b" />
                        <span style={{ fontWeight: 800, color: '#10b981' }}>
                          {trip.destinationTerminal}
                        </span>
                      </div>
                    </td>
                    <td>
                      {trip.containers.map((c) => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                          <span className="tag-mono" style={{ color: '#34d399' }}>
                            {c.containerNumber}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>({c.size})</span>
                        </div>
                      ))}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {trip.createdAt}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onApproveTrip(trip.id)}
                          title="Grant Gate Pass clearance"
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve Gate Pass</span>
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onRejectTrip(trip.id)}
                          title="Deny Gate Pass clearance"
                        >
                          <ShieldAlert size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6 Sri Lankan Port Terminals Grid */}
      <div className="terminals-panel-header">
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
            Colombo Maritime Terminals Matrix (6 Terminals)
          </h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            Consolidated throughput and congestion tracking across all Sri Lanka Port Authority berths
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigateToTab('terminals')}
        >
          <span>Corridor Flow Analysis</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="terminal-grid">
        {terminals.map((term) => (
          <div
            key={term.code}
            className={`terminal-card term-${term.code.toLowerCase()}`}
          >
            <div className="term-header">
              <span className="term-code" style={{ color: term.color }}>
                {term.code}
              </span>
              <span
                className="term-status-badge"
                style={{
                  background:
                    term.congestionLevel === 'ELEVATED'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(16, 185, 129, 0.15)',
                  color:
                    term.congestionLevel === 'ELEVATED' ? '#fbbf24' : '#34d399',
                  border: `1px solid ${
                    term.congestionLevel === 'ELEVATED'
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(16, 185, 129, 0.3)'
                  }`,
                }}
              >
                {term.congestionLevel}
              </span>
            </div>

            <div className="term-fullname" title={term.fullName}>
              {term.fullName}
            </div>

            <div className="term-metrics-row">
              <div className="term-metric-item">
                <span className="term-metric-label">Today's Runs</span>
                <span className="term-metric-val">{term.totalTripsToday}</span>
              </div>
              <div className="term-metric-item">
                <span className="term-metric-label">TEU Total</span>
                <span className="term-metric-val" style={{ color: term.color }}>
                  {term.teuHandledToday}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>Inbound: <b style={{ color: '#10b981' }}>{term.inboundTrips}</b></span>
              <span>Outbound: <b style={{ color: '#06b6d4' }}>{term.outboundTrips}</b></span>
            </div>

            <div className="term-flow-bar" title="Inbound vs Outbound Flow Ratio">
              <div
                className="term-flow-in"
                style={{
                  width: `${(term.inboundTrips / (term.inboundTrips + term.outboundTrips || 1)) * 100}%`,
                }}
              />
              <div
                className="term-flow-out"
                style={{
                  width: `${(term.outboundTrips / (term.inboundTrips + term.outboundTrips || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Active In-Transit Telematics Live Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Truck size={18} color="#06b6d4" />
            <span>Active In-Transit Telematics ({activeTrips.length} Prime Movers on Internal Roads)</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('trips')}
          >
            <span>View All Missions</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Mission No</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Corridor Route</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Prime Mover & CHE</th>
                <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Driver Roster</th>
                <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Loaded Freight</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Gate-Out Time</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: '90px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    No prime movers currently in transit on internal corridors.
                  </td>
                </tr>
              ) : (
                activeTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="tag-mono">{trip.tripNumber}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#06b6d4' }}>
                          {trip.sourceTerminal}
                        </span>
                        <ArrowRight size={13} color="#64748b" />
                        <span style={{ fontWeight: 800, color: '#10b981' }}>
                          {trip.destinationTerminal}
                        </span>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="tag-mono">{trip.vehicleNumber}</span>
                        <span className="tag-che">{trip.cheNumber}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {trip.operator}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 700 }}>{trip.driverName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {trip.driverCode}
                      </div>
                    </td>
                    <td>
                      {trip.containers.map((c) => (
                        <div key={c.id} style={{ whiteSpace: 'nowrap' }}>
                          <span className="tag-mono" style={{ color: '#34d399' }}>
                            {c.containerNumber}
                          </span>{' '}
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            ({c.size} {c.cargoType})
                          </span>
                        </div>
                      ))}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {trip.gateOutTime || trip.createdAt}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="badge badge-in-progress">
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            background: '#22d3ee',
                            borderRadius: '50%',
                            display: 'inline-block',
                          }}
                        />
                        In-Transit
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewTrip(trip)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
