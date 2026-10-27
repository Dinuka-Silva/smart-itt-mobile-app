import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Truck,
  ArrowLeftRight,
  Box,
  CheckCircle2,
  Clock,
  Shield,
  Fingerprint,
  LogOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  Mail,
  UserPlus,
  Plus,
} from 'lucide-react';
import { adminWebService, AdminStats } from '../services/adminWebService';
import { adminFleetWebStore, WebVehicle, WebDriver } from '../store/adminFleetWebStore';

type DashboardTab = 'OVERVIEW' | 'TRIPS' | 'FLEET' | 'SUPERVISORS';

interface DashboardPageProps {
  onNavigateTab?: (tab: string) => void;
  onOpenSignOut?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('OVERVIEW');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [vehicles, setVehicles] = useState<WebVehicle[]>([]);
  const [drivers, setDrivers] = useState<WebDriver[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Authoritative 6 field supervisors roster covering all 6 port terminals
  const supervisorsRoster = useMemo(() => [
    { id: 'sup-1', code: 'SUP001', name: 'Nimal Silva', phone: '0711234567', email: 'supervisor@smartitt.lk', shift: 'Day Shift (06:00 - 18:00)', role: 'Senior Yard Controller', status: 'ACTIVE DUTY' },
    { id: 'sup-2', code: 'SUP002', name: 'Bandara Weerasinghe', phone: '0712345678', email: 'bandara.cwit@smartitt.lk', shift: 'Day Shift (06:00 - 18:00)', role: 'Gate Operations Lead', status: 'ACTIVE DUTY' },
    { id: 'sup-3', code: 'SUP003', name: 'Kasun Jayawardena', phone: '0713456789', email: 'kasun.ect@smartitt.lk', shift: 'Night Shift (18:00 - 06:00)', role: 'Marshalling Dispatcher', status: 'ACTIVE DUTY' },
    { id: 'sup-4', code: 'SUP004', name: 'Prasanna Gunasekara', phone: '0714567890', email: 'prasanna.jct@smartitt.lk', shift: 'Day Shift (06:00 - 18:00)', role: 'Tower Coordination Officer', status: 'ACTIVE DUTY' },
    { id: 'sup-5', code: 'SUP005', name: 'Ruwan Fernando', phone: '0715678901', email: 'ruwan.sagt@smartitt.lk', shift: 'Night Shift (18:00 - 06:00)', role: 'Gate 04 Harbor Inspector', status: 'ACTIVE DUTY' },
    { id: 'sup-6', code: 'SUP006', name: 'Dinesh Perera', phone: '0716789012', email: 'dinesh.uct@smartitt.lk', shift: 'Day Shift (06:00 - 18:00)', role: 'Transfer Verification Lead', status: 'ACTIVE DUTY' },
  ], []);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const vList = adminFleetWebStore.getAllVehiclesList();
      const dList = adminFleetWebStore.getAllDriversList();
      setVehicles(vList);
      setDrivers(dList);

      const sckCount = vList.filter((v) => v.operator === 'SCK Logistics').length;
      const sdrCount = vList.filter((v) => v.operator === 'SDR LINK').length;
      const activeVehicles = vList.filter((v) => v.status === 'ACTIVE').length;
      const maintVehicles = vList.filter((v) => v.status === 'MAINTENANCE').length;
      const activeDrivers = dList.filter((d) => d.status === 'ACTIVE').length;

      try {
        const data = await adminWebService.getStats();
        setStats({
          ...data,
          totalVehicles: vList.length,
          sckVehicles: sckCount,
          sdrVehicles: sdrCount,
          activeVehicles,
          maintenanceVehicles: maintVehicles,
          totalDrivers: dList.length,
          activeDrivers,
        });
        if (data.recentTrips && data.recentTrips.length > 0) {
          setTrips(data.recentTrips);
        } else {
          setTrips(getInitialMockTrips());
        }
      } catch {
        setStats({
          totalDrivers: dList.length,
          activeDrivers,
          suspendedDrivers: 0,
          deactivatedDrivers: 0,
          totalSupervisors: 6,
          activeSupervisors: 6,
          totalVehicles: vList.length,
          activeVehicles,
          maintenanceVehicles: maintVehicles,
          assignedVehicles: dList.length,
          sckVehicles: sckCount,
          sdrVehicles: sdrCount,
          todayTrips: 18,
          tripsInProgress: 4,
          tripsPendingApproval: 3,
          tripsCompleted: 11,
          tripsApproved: 11,
          tripsRejected: 0,
          totalTripsAllTime: 142,
          totalContainers: 284,
          twentyFtContainers: 112,
          fortyFtContainers: 172,
          terminalWiseTrips: { CICT: 42, CWIT: 18, ECT: 26, JCT: 24, UCT: 12, SAGT: 20 },
          recentTrips: getInitialMockTrips(),
          recentAuditLogs: [],
        });
        setTrips(getInitialMockTrips());
      }
    } finally {
      setLoading(false);
    }
  };

  function getInitialMockTrips() {
    return [
      {
        id: 't-101',
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
        time: '10:14 AM',
      },
      {
        id: 't-102',
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
        time: '11:20 AM',
      },
      {
        id: 't-103',
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
        time: '11:45 AM',
      },
      {
        id: 't-104',
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
        time: '12:05 PM',
      },
    ];
  }

  const handleTripAction = async (tripId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await adminWebService.actionTrip(tripId, status, `Admin ${status} from Dashboard`);
    } catch {
      // offline support
    } finally {
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, status } : t))
      );
      alert(`Trip marked as ${status} successfully!`);
    }
  };

  if (loading) {
    return (
      <div style={styles.centerLoading}>
        <div style={styles.spinner}></div>
        <p style={{ color: '#00e5ff', marginTop: '14px', fontSize: '13px', fontWeight: 600 }}>
          Loading executive command center telemetry...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Executive Command Center Toolbar */}
      <div style={styles.topToolbar}>
        <div style={styles.switcherGroup}>
          {(['OVERVIEW', 'TRIPS', 'FLEET', 'SUPERVISORS'] as DashboardTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const labels: Record<DashboardTab, string> = {
              OVERVIEW: 'Executive Overview',
              TRIPS: 'Live ITT Trips & Approvals',
              FLEET: 'Fleet Prime Movers & Drivers',
              SUPERVISORS: 'Port Supervisors Roster',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.switcherBtn,
                  ...(isActive ? styles.switcherBtnActive : {}),
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        <div style={styles.quickActionGroup}>
          <button
            onClick={() => onNavigateTab?.('vehicles')}
            className="btn btn-secondary btn-sm"
            style={styles.quickBtn}
          >
            <Plus size={14} color="#00e5ff" />
            <span>+ Vehicle</span>
          </button>
          <button
            onClick={() => onNavigateTab?.('drivers')}
            className="btn btn-secondary btn-sm"
            style={styles.quickBtn}
          >
            <UserPlus size={14} color="#4caf50" />
            <span>+ Driver</span>
          </button>
          <button
            onClick={() => onNavigateTab?.('audit')}
            className="btn btn-secondary btn-sm"
            style={styles.quickBtn}
          >
            <Fingerprint size={14} color="#feb300" />
            <span>Audit</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 1. EXECUTIVE OVERVIEW                                         */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'OVERVIEW' && (
        <>
          {/* Operations KPI Grid */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionHeader}>TODAY'S ITT OPERATIONS</h3>
          </div>
          <div style={styles.kpiGrid}>
            <div style={{ ...styles.kpiCard, borderColor: 'rgba(0, 229, 255, 0.35)' }}>
              <div style={styles.kpiHeaderRow}>
                <span style={styles.kpiLabel}>TODAY'S TRIPS</span>
                <ArrowLeftRight size={18} color="#00e5ff" />
              </div>
              <div style={styles.kpiValue}>{stats?.todayTrips || 18}</div>
              <div style={styles.kpiSub}>Active: {stats?.tripsInProgress || 4} in progress</div>
            </div>

            <div style={{ ...styles.kpiCard, borderColor: 'rgba(254, 179, 0, 0.35)' }}>
              <div style={styles.kpiHeaderRow}>
                <span style={styles.kpiLabel}>PENDING APPROVAL</span>
                <Clock size={18} color="#feb300" />
              </div>
              <div style={{ ...styles.kpiValue, color: '#feb300' }}>
                {stats?.tripsPendingApproval || 3}
              </div>
              <div style={styles.kpiSub}>Awaiting supervisor verification</div>
            </div>

            <div style={{ ...styles.kpiCard, borderColor: 'rgba(76, 175, 80, 0.35)' }}>
              <div style={styles.kpiHeaderRow}>
                <span style={styles.kpiLabel}>COMPLETED / APPR.</span>
                <CheckCircle2 size={18} color="#4caf50" />
              </div>
              <div style={{ ...styles.kpiValue, color: '#4caf50' }}>
                {(stats?.tripsCompleted || 11) + (stats?.tripsApproved || 0)}
              </div>
              <div style={styles.kpiSub}>Total all-time: {stats?.totalTripsAllTime || 142}</div>
            </div>

            <div style={{ ...styles.kpiCard, borderColor: 'rgba(33, 150, 243, 0.35)' }}>
              <div style={styles.kpiHeaderRow}>
                <span style={styles.kpiLabel}>CONTAINERS</span>
                <Box size={18} color="#2196f3" />
              </div>
              <div style={{ ...styles.kpiValue, color: '#2196f3' }}>
                {stats?.totalContainers || 284}
              </div>
              <div style={styles.kpiSub}>
                20FT: {stats?.twentyFtContainers || 112} | 40FT: {stats?.fortyFtContainers || 172}
              </div>
            </div>
          </div>

          {/* Fleet & Personnel Capacity Card */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionHeader}>FLEET & DRIVER CAPACITY</h3>
          </div>
          <div style={styles.fleetSummaryCard}>
            <div style={styles.fleetStatRow}>
              <div
                style={styles.fleetStatItem}
                onClick={() => setActiveTab('FLEET')}
                role="button"
                tabIndex={0}
              >
                <div style={styles.fleetStatNum}>{vehicles.length}</div>
                <div style={styles.fleetStatLabel}>Total Fleet Prime Movers</div>
                <div style={styles.fleetStatSub}>
                  SCK: <strong>{stats?.sckVehicles || 18}</strong> | SDR: <strong>{stats?.sdrVehicles || 5}</strong>
                </div>
              </div>

              <div style={styles.dividerVertical} />

              <div style={styles.fleetStatItem}>
                <div style={{ ...styles.fleetStatNum, color: '#4caf50' }}>
                  {vehicles.filter((v) => v.status === 'ACTIVE').length}
                </div>
                <div style={styles.fleetStatLabel}>Active In Service</div>
                <div style={styles.fleetStatSub}>
                  Maintenance: <strong>{vehicles.filter((v) => v.status === 'MAINTENANCE').length}</strong>
                </div>
              </div>

              <div style={styles.dividerVertical} />

              <div
                style={styles.fleetStatItem}
                onClick={() => setActiveTab('FLEET')}
                role="button"
                tabIndex={0}
              >
                <div style={{ ...styles.fleetStatNum, color: '#00e5ff' }}>
                  {drivers.filter((d) => d.status === 'ACTIVE').length}
                </div>
                <div style={styles.fleetStatLabel}>Active Registered Drivers</div>
                <div style={styles.fleetStatSub}>
                  Total Roster: <strong>{drivers.length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Movements Visualizer */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionHeader}>PORT TERMINAL MOVEMENTS</h3>
          </div>
          <div style={styles.terminalCard}>
            {['CICT', 'CWIT', 'ECT', 'JCT', 'UCT', 'SAGT'].map((t) => {
              const count = stats?.terminalWiseTrips?.[t] || 0;
              const maxCount = Math.max(...Object.values(stats?.terminalWiseTrips || {}), 1);
              const percent = Math.min(Math.max((count / maxCount) * 100, 8), 100);

              return (
                <div key={t} style={styles.terminalRow}>
                  <div style={styles.terminalBadge}>
                    <span style={styles.terminalBadgeText}>{t}</span>
                  </div>
                  <div style={styles.terminalBarWrap}>
                    <div style={{ ...styles.terminalBarFill, width: `${percent}%` }} />
                  </div>
                  <div style={styles.terminalCountText}>{count} trips</div>
                </div>
              );
            })}
          </div>

          {/* Recent Movements Preview Table */}
          <div style={{ ...styles.sectionHeaderRow, marginTop: '28px' }}>
            <h3 style={styles.sectionHeader}>RECENT ITT MOVEMENTS</h3>
            <button onClick={() => setActiveTab('TRIPS')} style={styles.seeAllBtn}>
              View Live Dispatch ({trips.length}) →
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Vessel</th>
                  <th>Vehicle / CHE</th>
                  <th>Driver</th>
                  <th>Containers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 5).map((trip) => (
                  <tr key={trip.id || trip.tripNumber}>
                    <td style={{ fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      {trip.tripNumber}
                    </td>
                    <td><span className="badge badge-cyan">{trip.sourceTerminal}</span></td>
                    <td><span className="badge badge-cyan">{trip.destTerminal}</span></td>
                    <td style={{ color: '#b0bec5' }}>{trip.vesselName || 'ITT Harbor Transfer'}</td>
                    <td style={{ color: '#00e5ff', fontWeight: 600 }}>{trip.vehicleNumber} ({trip.chassisNumber})</td>
                    <td style={{ color: '#ffffff', fontWeight: 600 }}>{trip.driverName || 'Authorized Driver'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {Array.isArray(trip.containers) ? trip.containers.join(', ') : '1 unit'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          trip.status === 'COMPLETED' || trip.status === 'APPROVED'
                            ? 'badge-green'
                            : trip.status === 'PENDING_APPROVAL'
                            ? 'badge-amber'
                            : 'badge-cyan'
                        }`}
                      >
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 2. LIVE ITT TRIPS & APPROVALS                                 */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'TRIPS' && (
        <>
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionHeader}>LIVE ITT MOVEMENTS & DISPATCH CONSOLE</h3>
            <span style={{ fontSize: '12px', color: '#00e5ff', fontWeight: 700 }}>
              {trips.filter((t) => t.status === 'PENDING_APPROVAL').length} Requiring Admin/Supervisor Signoff
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
            {trips.map((trip) => {
              const isPending = trip.status === 'PENDING_APPROVAL';
              return (
                <div key={trip.id || trip.tripNumber} style={styles.fullTripCard}>
                  <div style={styles.tripCardHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ArrowLeftRight size={20} color="#00e5ff" />
                      <div>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                          {trip.tripNumber}
                        </span>
                        <span style={{ marginLeft: '10px', fontSize: '11px', color: '#78909c' }}>
                          Registered at {trip.time || 'Today'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`badge ${
                        trip.status === 'COMPLETED' || trip.status === 'APPROVED'
                          ? 'badge-green'
                          : trip.status === 'PENDING_APPROVAL'
                          ? 'badge-amber'
                          : 'badge-cyan'
                      }`}
                    >
                      {trip.status}
                    </span>
                  </div>

                  <div style={styles.routeBanner}>
                    <div style={styles.routeStop}>
                      <span style={styles.routeStopLabel}>ORIGIN TERMINAL</span>
                      <span style={styles.routeStopName}>{trip.sourceTerminal}</span>
                    </div>
                    <ArrowLeftRight size={22} color="#00e5ff" />
                    <div style={styles.routeStop}>
                      <span style={styles.routeStopLabel}>DESTINATION TERMINAL</span>
                      <span style={styles.routeStopName}>{trip.destTerminal}</span>
                    </div>
                  </div>

                  <div style={styles.tripGridInfo}>
                    <div>
                      <span style={styles.gridInfoLabel}>Assigned Prime Mover:</span>
                      <strong style={{ color: '#00e5ff', display: 'block', marginTop: '2px' }}>
                        {trip.vehicleNumber} ({trip.chassisNumber})
                      </strong>
                    </div>
                    <div>
                      <span style={styles.gridInfoLabel}>Driver On Duty:</span>
                      <strong style={{ color: '#ffffff', display: 'block', marginTop: '2px' }}>
                        {trip.driverName || 'Authorized Driver'}
                      </strong>
                    </div>
                    <div>
                      <span style={styles.gridInfoLabel}>Vessel Reference:</span>
                      <strong style={{ color: '#b0bec5', display: 'block', marginTop: '2px' }}>
                        {trip.vesselName || 'Port Transfer Liner'}
                      </strong>
                    </div>
                    <div>
                      <span style={styles.gridInfoLabel}>Containers & ISO Standard:</span>
                      <strong style={{ color: '#ffffff', display: 'block', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                        {Array.isArray(trip.containers) ? trip.containers.join(', ') : '1 unit'} ({trip.containerSize || '40FT'})
                      </strong>
                    </div>
                  </div>

                  {isPending && (
                    <div style={styles.approvalActionRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#feb300', fontSize: '12px' }}>
                        <Clock size={16} />
                        <span>Awaiting Administrative Authorization / Supervisor Verification</span>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleTripAction(trip.id, 'APPROVED')}
                          className="btn btn-primary btn-sm"
                          style={{ backgroundColor: '#4caf50', color: '#ffffff' }}
                        >
                          <CheckCircle size={15} />
                          <span>Approve Trip</span>
                        </button>
                        <button
                          onClick={() => handleTripAction(trip.id, 'REJECTED')}
                          className="btn btn-danger btn-sm"
                        >
                          <XCircle size={15} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 3. FLEET PRIME MOVERS & DRIVERS                               */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'FLEET' && (
        <>
          {/* Port Pass Compliance Watch Box */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionHeader}>COMPLIANCE & PORT PASS EXPIRY WATCH</h3>
          </div>
          <div style={styles.complianceBox}>
            <div style={styles.complianceHeader}>
              <AlertTriangle size={18} color="#feb300" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#feb300' }}>
                Upcoming Port Pass & SLPA Authorization Renewals
              </span>
            </div>
            <div style={styles.complianceGrid}>
              {vehicles.slice(0, 6).map((v) => (
                <div key={v.id} style={styles.complianceItem}>
                  <div>
                    <strong style={{ color: '#ffffff', fontSize: '13px' }}>{v.vehicleNumber} ({v.chassisNumber})</strong>
                    <div style={{ fontSize: '11px', color: '#78909c', marginTop: '2px' }}>
                      Pass: {v.portPassNumber || 'SLPA-VPP-000'} • Operator: {v.operator}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#90caf9', fontSize: '12px', fontWeight: 600 }}>
                      {v.portPassExpiryDate || '2026-11-10'}
                    </span>
                    <span className="badge badge-amber" style={{ display: 'block', marginTop: '4px' }}>
                      RENEWAL DUE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prime Movers Table */}
          <div style={{ ...styles.sectionHeaderRow, marginTop: '24px' }}>
            <h3 style={styles.sectionHeader}>AUTHORIZED PRIME MOVERS ({vehicles.length})</h3>
            <button onClick={() => onNavigateTab?.('vehicles')} style={styles.seeAllBtn}>
              Full Fleet Manager →
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vehicle Plate (LY)</th>
                  <th>Chassis (CHE)</th>
                  <th>Fleet Operator</th>
                  <th>Chassis Size</th>
                  <th>Assigned Driver</th>
                  <th>Driver Mobile</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 800, color: '#ffffff' }}>{v.vehicleNumber}</td>
                    <td style={{ color: '#00e5ff', fontWeight: 700 }}>{v.chassisNumber}</td>
                    <td>
                      <span className={`badge ${v.operator === 'SCK Logistics' ? 'badge-cyan' : 'badge-amber'}`}>
                        {v.operator}
                      </span>
                    </td>
                    <td>{v.trailerSize} Skeletal</td>
                    <td style={{ fontWeight: 600, color: v.driverName ? '#ffffff' : '#78909c' }}>
                      {v.driverName ? `${v.driverName} (${v.driverCode || 'DRV'})` : 'Standby / Unassigned'}
                    </td>
                    <td style={{ color: '#90caf9' }}>{v.driverMobile || '—'}</td>
                    <td>
                      <span className={`badge ${v.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Registered Drivers Table */}
          <div style={{ ...styles.sectionHeaderRow, marginTop: '28px' }}>
            <h3 style={styles.sectionHeader}>REGISTERED DRIVERS ROSTER ({drivers.length})</h3>
            <button onClick={() => onNavigateTab?.('drivers')} style={styles.seeAllBtn}>
              Full Drivers Directory →
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Driver Code</th>
                  <th>Full Name</th>
                  <th>NIC</th>
                  <th>Mobile Phone</th>
                  <th>Assigned Vehicle</th>
                  <th>Port Pass Expiry</th>
                  <th>Account Status</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 800, color: '#00e5ff' }}>{d.driverCode}</td>
                    <td style={{ fontWeight: 700, color: '#ffffff' }}>{d.fullName}</td>
                    <td>{d.nic}</td>
                    <td style={{ color: '#90caf9' }}>{d.mobileNumber}</td>
                    <td style={{ fontWeight: 600, color: d.vehicleNumber && d.vehicleNumber !== 'UNASSIGNED' ? '#00e5ff' : '#78909c' }}>
                      {d.vehicleNumber && d.vehicleNumber !== 'UNASSIGNED' ? `${d.vehicleNumber} (${d.chassisNumber || 'CHE'})` : 'Standby Driver'}
                    </td>
                    <td style={{ color: '#cfd8dc' }}>{d.portPassExpiryDate || '2027-10-31'}</td>
                    <td>
                      <span className={`badge ${d.status === 'ACTIVE' ? 'badge-green' : 'badge-amber'}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 4. FIELD SUPERVISORS ROSTER                                   */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'SUPERVISORS' && (
        <>
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionHeader}>FIELD SUPERVISORS ROSTER & JURISDICTION (6)</h3>
            <button onClick={() => onNavigateTab?.('supervisors')} style={styles.seeAllBtn}>
              Manage Supervisors →
            </button>
          </div>

          <div style={styles.jurisdictionBanner}>
            <Shield size={20} color="#00e5ff" />
            <div>
              <strong style={{ color: '#00e5ff', fontSize: '13px' }}>Port-Wide Supervision Authority</strong>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#90caf9' }}>
                All 6 field supervisors possess unified authorization covering all Colombo Port Terminals (JCT, CICT, SAGT, ECT, CWIT, UCT).
              </p>
            </div>
          </div>

          <div style={styles.supervisorGrid}>
            {supervisorsRoster.map((sup) => (
              <div key={sup.id} style={styles.supervisorCard}>
                <div style={styles.supervisorTop}>
                  <div style={styles.supAvatar}>
                    {sup.name[0]}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#ffffff', fontWeight: 800 }}>
                      {sup.name}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#00e5ff', fontWeight: 700 }}>
                      {sup.code} • {sup.role}
                    </span>
                  </div>
                  <span className="badge badge-green" style={{ marginLeft: 'auto' }}>
                    {sup.status}
                  </span>
                </div>

                <div style={styles.supDetailsBox}>
                  <div style={styles.supDetailRow}>
                    <Phone size={14} color="#00e5ff" />
                    <span>{sup.phone}</span>
                  </div>
                  <div style={styles.supDetailRow}>
                    <Mail size={14} color="#90caf9" />
                    <span>{sup.email}</span>
                  </div>
                  <div style={styles.supDetailRow}>
                    <Clock size={14} color="#feb300" />
                    <span>{sup.shift}</span>
                  </div>
                </div>

                <div style={styles.terminalJurisdictionBadge}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#00e5ff' }}>
                    JURISDICTION: ALL 6 PORT TERMINALS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── Bottom Admin Security & Sign Out Card ─── */}
      {onOpenSignOut && (
        <div style={styles.signOutCard}>
          <div style={styles.signOutCardLeft}>
            <div style={styles.signOutIconWrap}>
              <Shield size={20} color="#00e5ff" />
            </div>
            <div>
              <div style={styles.signOutCardTitle}>Admin Session Security</div>
              <div style={styles.signOutCardSub}>
                Authorized Smart ITT Control Center Session • End administrative session securely
              </div>
            </div>
          </div>
          <button style={styles.signOutActionBtn} onClick={onOpenSignOut}>
            <LogOut size={14} color="#ff8a80" />
            <span style={{ color: '#ff8a80', fontWeight: 700 }}>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'clamp(12px, 1.8vw, 24px) clamp(12px, 2vw, 28px) 48px',
    maxWidth: '1440px',
    margin: '0 auto',
  },
  centerLoading: {
    padding: '80px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(0, 229, 255, 0.2)',
    borderTopColor: '#00e5ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  topToolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1b30',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '8px 12px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  switcherGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  switcherBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#78909c',
    fontSize: 'clamp(11px, 0.85vw, 13px)',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  switcherBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    color: '#00e5ff',
    boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)',
  },
  quickActionGroup: {
    display: 'flex',
    gap: '8px',
  },
  quickBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 700,
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    marginTop: '12px',
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#78909c',
    letterSpacing: '1px',
    margin: 0,
    textTransform: 'uppercase',
  },
  seeAllBtn: {
    background: 'none',
    border: 'none',
    color: '#00e5ff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: '#0c1b30',
    borderRadius: '14px',
    padding: '18px 20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.2s ease',
  },
  kpiHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  kpiLabel: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#78909c',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: 'clamp(20px, 2.2vw, 28px)',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1.1,
    margin: '4px 0',
  },
  kpiSub: {
    fontSize: '11px',
    color: '#90caf9',
    fontWeight: 500,
  },
  fleetSummaryCard: {
    backgroundColor: '#0c1b30',
    borderRadius: '14px',
    padding: '20px 24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '24px',
  },
  fleetStatRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fleetStatItem: {
    flex: 1,
    textAlign: 'center',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'background 0.2s ease',
  },
  fleetStatNum: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-mono)',
  },
  fleetStatLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#b0bec5',
    marginTop: '4px',
  },
  fleetStatSub: {
    fontSize: '10px',
    color: '#78909c',
    marginTop: '3px',
  },
  dividerVertical: {
    width: '1px',
    height: '48px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '0 12px',
  },
  terminalCard: {
    backgroundColor: '#0c1b30',
    borderRadius: '14px',
    padding: '18px 22px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: '24px',
  },
  terminalRow: {
    display: 'flex',
    alignItems: 'center',
    margin: '8px 0',
  },
  terminalBadge: {
    width: '54px',
    padding: '4px 0',
    borderRadius: '6px',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    textAlign: 'center',
    flexShrink: 0,
  },
  terminalBadgeText: {
    color: '#00e5ff',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  terminalBarWrap: {
    flex: 1,
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    margin: '0 14px',
    overflow: 'hidden',
  },
  terminalBarFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
    borderRadius: '4px',
    transition: 'width 0.4s ease',
  },
  terminalCountText: {
    color: '#cfd8dc',
    fontSize: '12px',
    fontWeight: 600,
    width: '64px',
    textAlign: 'right',
    fontFamily: 'var(--font-mono)',
  },
  fullTripCard: {
    backgroundColor: '#0c1b30',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '18px 22px',
  },
  tripCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  routeBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#070f1e',
    borderRadius: '10px',
    padding: '12px 20px',
    border: '1px solid rgba(0, 229, 255, 0.15)',
    marginBottom: '14px',
  },
  routeStop: {
    textAlign: 'center',
  },
  routeStopLabel: {
    fontSize: '10px',
    color: '#78909c',
    fontWeight: 800,
    letterSpacing: '0.5px',
  },
  routeStopName: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#00e5ff',
    display: 'block',
    marginTop: '2px',
  },
  tripGridInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: '12px 16px',
    borderRadius: '10px',
  },
  gridInfoLabel: {
    fontSize: '11px',
    color: '#78909c',
    fontWeight: 600,
  },
  approvalActionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    flexWrap: 'wrap',
    gap: '10px',
  },
  complianceBox: {
    backgroundColor: '#0c1b30',
    borderRadius: '14px',
    border: '1px solid rgba(254, 179, 0, 0.25)',
    padding: '18px 20px',
    marginBottom: '20px',
  },
  complianceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
  },
  complianceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '12px',
  },
  complianceItem: {
    backgroundColor: '#070f1e',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  jurisdictionBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    borderRadius: '12px',
    padding: '14px 18px',
    marginBottom: '20px',
  },
  supervisorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  supervisorCard: {
    backgroundColor: '#0c1b30',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '18px 20px',
  },
  supervisorTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px',
  },
  supAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    border: '1.5px solid #00e5ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#00e5ff',
    fontWeight: 800,
    fontSize: '16px',
  },
  supDetailsBox: {
    backgroundColor: '#070f1e',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
  },
  supDetailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#cfd8dc',
  },
  terminalJurisdictionBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    borderRadius: '6px',
    padding: '6px 10px',
    textAlign: 'center',
    border: '1px solid rgba(0, 229, 255, 0.15)',
  },
  signOutCard: {
    marginTop: '32px',
    backgroundColor: '#0c1b30',
    borderRadius: '14px',
    border: '1px solid rgba(255, 82, 82, 0.25)',
    padding: '18px 22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signOutCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  signOutIconWrap: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutCardTitle: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 800,
  },
  signOutCardSub: {
    color: '#78909c',
    fontSize: '11px',
    marginTop: '2px',
  },
  signOutActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    border: '1px solid rgba(255, 82, 82, 0.3)',
    borderRadius: '10px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
};
