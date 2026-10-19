import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Fuel,
  Activity,
  Phone,
  Filter,
  Check,
  X,
  Eye,
  RefreshCw,
  Gauge,
  SlidersHorizontal,
  FileCheck2,
  Calendar,
} from 'lucide-react';
import {
  FleetVehicle,
  DriverRecord,
  IttTrip,
  SupervisorRecord,
  TerminalInfo,
  DriverShiftStatus,
} from '../types';

interface SupervisionTabProps {
  supervisors: SupervisorRecord[];
  drivers: DriverRecord[];
  vehicles: FleetVehicle[];
  trips: IttTrip[];
  terminals: TerminalInfo[];
  onApproveTrip: (tripId: string) => void;
  onRejectTrip: (tripId: string, reason: string) => void;
  onUpdateDriverShift: (driverId: string, status: DriverShiftStatus) => void;
  onUpdateSupervisorStatus: (supervisorId: string, status: SupervisorRecord['status']) => void;
  onUpdateVehicleStatus: (vehicleId: string, status: FleetVehicle['status']) => void;
  onReassignVehicle: (driverId: string, cheNumber: string) => void;
  onViewTrip: (trip: IttTrip) => void;
}

export const SupervisionTab: React.FC<SupervisionTabProps> = ({
  supervisors,
  drivers,
  vehicles,
  trips,
  terminals,
  onApproveTrip,
  onRejectTrip,
  onUpdateDriverShift,
  onUpdateSupervisorStatus,
  onUpdateVehicleStatus,
  onReassignVehicle,
  onViewTrip,
}) => {
  // Navigation within supervision dashboard
  const [activePanel, setActivePanel] = useState<'all' | 'drivers' | 'supervisors' | 'vehicles'>('all');
  const [operatorFilter, setOperatorFilter] = useState<'ALL' | 'SCK' | 'CONTRACTOR'>('SCK');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'MORNING' | 'EVENING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals inside supervision
  const [inspectingDriver, setInspectingDriver] = useState<DriverRecord | null>(null);
  const [reassigningDriver, setReassigningDriver] = useState<DriverRecord | null>(null);
  const [selectedCheForReassign, setSelectedCheForReassign] = useState('');
  const [rejectingTripId, setRejectingTripId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filtered collections
  const filteredDrivers = drivers.filter((d) => {
    if (operatorFilter === 'SCK' && d.operator !== 'SCK Logistics') return false;
    if (operatorFilter === 'CONTRACTOR' && d.operator === 'SCK Logistics') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.driverCode.toLowerCase().includes(q) ||
        d.cheNumber.toLowerCase().includes(q) ||
        d.vehicleNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredVehicles = vehicles.filter((v) => {
    if (operatorFilter === 'SCK' && v.operator !== 'SCK Logistics') return false;
    if (operatorFilter === 'CONTRACTOR' && v.operator === 'SCK Logistics') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.cheNumber.toLowerCase().includes(q) ||
        v.vehicleNumber.toLowerCase().includes(q) ||
        (v.driverName && v.driverName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredSupervisors = supervisors.filter((s) => {
    if (shiftFilter !== 'ALL' && s.shift !== shiftFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q) ||
        s.assignedTerminal.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingTrips = trips.filter((t) => t.status === 'PENDING_APPROVAL');
  const recentApprovedTrips = trips
    .filter((t) => t.status === 'APPROVED' || t.status === 'IN_PROGRESS' || t.status === 'COMPLETED')
    .slice(0, 8);

  // SCK Logistics Metrics
  const sckVehicles = vehicles.filter((v) => v.operator === 'SCK Logistics');
  const activeSckVehicles = sckVehicles.filter((v) => v.status === 'ACTIVE' || v.status === 'IN_TRANSIT');
  const sckDrivers = drivers.filter((d) => d.operator === 'SCK Logistics');
  const onDutySckDrivers = sckDrivers.filter((d) => d.shiftStatus !== 'OFF_DUTY');
  const totalApprovalsToday = supervisors.reduce((acc, s) => acc + s.approvalsToday, 0);

  const handleConfirmReassign = () => {
    if (reassigningDriver && selectedCheForReassign) {
      onReassignVehicle(reassigningDriver.id, selectedCheForReassign);
      setReassigningDriver(null);
      setSelectedCheForReassign('');
    }
  };

  const handleConfirmReject = () => {
    if (rejectingTripId && rejectReason.trim()) {
      onRejectTrip(rejectingTripId, rejectReason.trim());
      setRejectingTripId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="tab-pane">
      {/* ─── SCK LOGISTICS HERO COMMAND HEADER ─── */}
      <div
        className="card card-glow"
        style={{
          padding: '20px 24px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(14, 20, 29, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 8px 32px rgba(6, 182, 212, 0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                boxShadow: '0 0 16px rgba(6, 182, 212, 0.25)',
              }}
            >
              <img
                src="/sck-logo.png"
                alt="SCK Logistics Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  SCK LOGISTICS (PVT) LTD
                </h1>
                <span className="badge badge-cyan" style={{ fontSize: '11px', fontWeight: 700 }}>
                  PRIMARY ITT CARRIER
                </span>
                <span className="badge badge-emerald" style={{ fontSize: '11px', fontWeight: 700 }}>
                  LIVE OPERATIONS ACTIVE
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 0' }}>
                Inter-Terminal Transportation (ITT) Supervisory Command Deck • Driver Operations & Fleet Telematics
              </p>
            </div>
          </div>

          {/* Quick Operator Filter Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="btn-group" style={{ display: 'flex', gap: '6px', background: 'rgba(15,23,42,0.6)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.15)' }}>
              <button
                className={`btn btn-sm ${operatorFilter === 'SCK' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOperatorFilter('SCK')}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                SCK Fleet Only (15 CHE)
              </button>
              <button
                className={`btn btn-sm ${operatorFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOperatorFilter('ALL')}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                All Carriers (24 CHE)
              </button>
              <button
                className={`btn btn-sm ${operatorFilter === 'CONTRACTOR' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOperatorFilter('CONTRACTOR')}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                Contractors
              </button>
            </div>
          </div>
        </div>

        {/* ─── SCK OPERATIONAL KPI STRIP ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '18px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          <div style={{ padding: '10px 14px', background: 'rgba(6, 182, 212, 0.06)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.18)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCK Prime Movers</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#06b6d4' }}>{activeSckVehicles.length}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>/ {sckVehicles.length} Active</span>
            </div>
            <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>● 93.3% Fleet Utilization</div>
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.18)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SCK Drivers on Shift</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>{onDutySckDrivers.length}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>/ {sckDrivers.length} On Duty</span>
            </div>
            <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '2px' }}>LKR 2,500/trip Allowance Tracked</div>
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.18)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gate Pass Approvals</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>{totalApprovalsToday}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Cleared Today</span>
            </div>
            <div style={{ fontSize: '10px', color: pendingTrips.length > 0 ? '#f43f5e' : '#10b981', marginTop: '2px' }}>
              {pendingTrips.length > 0 ? `▲ ${pendingTrips.length} Waiting Clearance` : '✓ Queue Cleared'}
            </div>
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(139, 92, 246, 0.06)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.18)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shift Supervisors</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#a78bfa' }}>{supervisors.filter((s) => s.status === 'ON_DUTY').length}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>/ {supervisors.length} Gates Manned</span>
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Avg Gate Velocity: 39 sec</div>
          </div>
        </div>
      </div>

      {/* ─── NAVIGATION TABS & SEARCH BAR ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activePanel === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActivePanel('all')}
            style={{ gap: '6px' }}
          >
            <SlidersHorizontal size={13} />
            <span>Consolidated Command</span>
          </button>
          <button
            className={`btn btn-sm ${activePanel === 'drivers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActivePanel('drivers')}
            style={{ gap: '6px' }}
          >
            <Users size={13} />
            <span>Driver Supervision ({filteredDrivers.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activePanel === 'supervisors' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActivePanel('supervisors')}
            style={{ gap: '6px' }}
          >
            <ShieldCheck size={13} />
            <span>Supervisor Gate Control ({filteredSupervisors.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activePanel === 'vehicles' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActivePanel('vehicles')}
            style={{ gap: '6px' }}
          >
            <Truck size={13} />
            <span>Vehicle Fleet Management ({filteredVehicles.length})</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search driver, CHE, license, terminal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '12px', height: '34px', width: '240px' }}
          />
        </div>
      </div>

      {/* ─── PENDING GATE CLEARANCE QUEUE (Always visible if pending) ─── */}
      {pendingTrips.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(15, 23, 42, 0.95) 100%)',
          }}
        >
          <div className="card-header" style={{ padding: '14px 18px', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#f59e0b" style={{ animation: 'pulse 1.5s infinite' }} />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>
                Live Gate Clearance Queue ({pendingTrips.length} Awaiting Supervisor Decision)
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Supervisor Action Required for Origin Terminal Gate-Out
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Trip Number</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>CHE Prime Mover</th>
                  <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Assigned Driver</th>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Route</th>
                  <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Container ID</th>
                  <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Wait Time</th>
                  <th style={{ minWidth: '180px', whiteSpace: 'nowrap', textAlign: 'right' }}>Supervisor Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingTrips.map((trip) => (
                  <tr key={trip.id} style={{ background: 'rgba(245, 158, 11, 0.02)' }}>
                    <td>
                      <span className="tag-mono" style={{ color: '#f59e0b', fontWeight: 700 }}>
                        {trip.tripNumber}
                      </span>
                    </td>
                    <td>
                      <span className="tag-che">
                        <Truck size={12} /> {trip.cheNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9' }}>{trip.driverName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{trip.driverCode}</div>
                    </td>
                    <td>
                      <span className="route-tag">
                        {trip.sourceTerminal} ➔ {trip.destinationTerminal}
                      </span>
                    </td>
                    <td>
                      {trip.containers.map((c) => (
                        <span key={c.id} className="tag-mono" style={{ marginRight: '4px' }}>
                          {c.containerNumber} ({c.size})
                        </span>
                      ))}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                        14m dwell
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onApproveTrip(trip.id)}
                        style={{ padding: '5px 10px', fontSize: '11px', marginRight: '6px' }}
                        title="Approve Origin Gate Pass"
                      >
                        <CheckCircle2 size={12} /> Approve Pass
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setRejectingTripId(trip.id);
                          setRejectReason('');
                        }}
                        style={{ padding: '5px 10px', fontSize: '11px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', marginRight: '6px' }}
                      >
                        <X size={12} /> Hold
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewTrip(trip)}
                        style={{ padding: '5px 8px', fontSize: '11px' }}
                      >
                        <Eye size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SECTION 1: DRIVER OPERATIONS SUPERVISION ─── */}
      {(activePanel === 'all' || activePanel === 'drivers') && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#06b6d4" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                Driver Operations Supervision Roster ({filteredDrivers.length} Operators)
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Real-time shift management, vehicle assignments, and LKR 2,500/trip incentive tracker
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Driver Profile</th>
                  <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Assigned CHE</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Shift Status</th>
                  <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Live Location / Speed</th>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Today's Allowance</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Safety Clearance</th>
                  <th style={{ minWidth: '160px', whiteSpace: 'nowrap', textAlign: 'right' }}>Supervisor Control</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => {
                  const todayTripsCount = driver.todayTrips || Math.floor((driver.tripsCompleted % 10) + 1);
                  const dailyAllowance = todayTripsCount * 2500;
                  const shift = driver.shiftStatus || (driver.status === 'ACTIVE' ? 'ON_DUTY' : 'OFF_DUTY');

                  return (
                    <tr key={driver.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={driver.profilePhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
                            alt={driver.fullName}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(6,182,212,0.3)' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                              {driver.fullName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#06b6d4', fontFamily: 'monospace' }}>
                              {driver.driverCode} • {driver.operator}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="tag-che"
                          style={{ cursor: 'pointer', border: '1px solid rgba(6,182,212,0.3)', background: 'transparent' }}
                          onClick={() => {
                            setReassigningDriver(driver);
                            setSelectedCheForReassign(driver.cheNumber);
                          }}
                          title="Click to reassign CHE Prime Mover"
                        >
                          <Truck size={12} /> {driver.cheNumber}
                        </button>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {driver.vehicleNumber}
                        </div>
                      </td>
                      <td>
                        <select
                          className="input-field"
                          value={shift}
                          onChange={(e) => onUpdateDriverShift(driver.id, e.target.value as DriverShiftStatus)}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            height: '28px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            color:
                              shift === 'ON_DUTY'
                                ? '#10b981'
                                : shift === 'IN_TRANSIT'
                                ? '#06b6d4'
                                : shift === 'ON_BREAK'
                                ? '#f59e0b'
                                : '#94a3b8',
                            background: 'rgba(15, 23, 42, 0.8)',
                          }}
                        >
                          <option value="ON_DUTY">ON DUTY</option>
                          <option value="IN_TRANSIT">IN TRANSIT</option>
                          <option value="ON_BREAK">ON BREAK</option>
                          <option value="OFF_DUTY">OFF DUTY</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#f1f5f9' }}>
                          <MapPin size={11} color="#06b6d4" />
                          <span>{driver.currentLocation || 'Port Access Road Corridor'}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>
                          Speed: {driver.speedKmh || (shift === 'IN_TRANSIT' ? '28 km/h' : '0 km/h')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#10b981' }}>
                          LKR {dailyAllowance.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {todayTripsCount} trips today
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="badge badge-emerald" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            PASS: VALID
                          </span>
                          <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            MED: OK
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setInspectingDriver(driver)}
                          style={{ padding: '4px 8px', fontSize: '11px', marginRight: '6px' }}
                          title="View Full Driver Dossier"
                        >
                          <Eye size={12} /> Dossier
                        </button>
                        <a
                          href={`tel:${driver.mobileNumber}`}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px', color: '#06b6d4', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Call Driver"
                        >
                          <Phone size={11} /> Call
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: SUPERVISOR GATE CONTROL & TERMINAL ALLOCATION ─── */}
      {(activePanel === 'all' || activePanel === 'supervisors') && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#10b981" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                Terminal Gate Supervisor Roster & Operations Command (6 Terminals)
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`btn btn-sm ${shiftFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShiftFilter('ALL')}
                style={{ fontSize: '10px', padding: '3px 8px' }}
              >
                All Shifts
              </button>
              <button
                className={`btn btn-sm ${shiftFilter === 'MORNING' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShiftFilter('MORNING')}
                style={{ fontSize: '10px', padding: '3px 8px' }}
              >
                Morning
              </button>
              <button
                className={`btn btn-sm ${shiftFilter === 'EVENING' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShiftFilter('EVENING')}
                style={{ fontSize: '10px', padding: '3px 8px' }}
              >
                Evening
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              padding: '16px',
            }}
          >
            {filteredSupervisors.map((sup) => {
              const term = terminals.find((t) => t.code === sup.assignedTerminal);

              return (
                <div
                  key={sup.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.12)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={sup.photoUrl}
                        alt={sup.fullName}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>{sup.fullName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {sup.employeeId} • {sup.shift} SHIFT
                        </div>
                      </div>
                    </div>
                    <span
                      className={`badge ${sup.status === 'ON_DUTY' ? 'badge-emerald' : 'badge-amber'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {sup.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: '#94a3b8' }}>Assigned Terminal:</span>
                      <span style={{ fontWeight: 700, color: term?.color || '#06b6d4' }}>
                        {sup.assignedTerminal} — {sup.gateStation}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: '#94a3b8' }}>Approvals Today:</span>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{sup.approvalsToday} gate passes</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: '#94a3b8' }}>Avg Response Speed:</span>
                      <span style={{ fontWeight: 600, color: '#38bdf8' }}>{sup.avgResponseSeconds} seconds</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{sup.mobileNumber}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        onUpdateSupervisorStatus(sup.id, sup.status === 'ON_DUTY' ? 'ON_BREAK' : 'ON_DUTY')
                      }
                      style={{ fontSize: '10px', padding: '3px 8px' }}
                    >
                      Toggle {sup.status === 'ON_DUTY' ? 'Break' : 'Duty'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SECTION 3: SCK VEHICLE FLEET MANAGEMENT ─── */}
      {(activePanel === 'all' || activePanel === 'vehicles') && (
        <div className="card">
          <div className="card-header" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={16} color="#f59e0b" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                SCK Heavy Prime Mover Fleet & Telematics Control (15 Units)
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Authoritative port chassis telematics, assigned drivers, and live fleet status
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>CHE Unit</th>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Tractor License</th>
                  <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Operator / Owner</th>
                  <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Fleet Status</th>
                  <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Assigned Driver</th>
                  <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Next Service</th>
                  <th style={{ minWidth: '140px', whiteSpace: 'nowrap', textAlign: 'right' }}>Fleet Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => {
                  const statusColor =
                    vehicle.status === 'ACTIVE'
                      ? '#10b981'
                      : vehicle.status === 'IN_TRANSIT'
                      ? '#06b6d4'
                      : vehicle.status === 'MAINTENANCE'
                      ? '#f59e0b'
                      : '#94a3b8';

                  return (
                    <tr key={vehicle.id}>
                      <td>
                        <span className="tag-che" style={{ fontWeight: 800 }}>
                          <Truck size={12} /> {vehicle.cheNumber}
                        </span>
                      </td>
                      <td>
                        <span className="tag-mono" style={{ color: '#f8fafc' }}>
                          {vehicle.vehicleNumber}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            vehicle.operator === 'SCK Logistics'
                              ? 'badge-cyan'
                              : vehicle.operator === 'SDR LINK'
                              ? 'badge-emerald'
                              : 'badge-amber'
                          }`}
                          style={{ fontSize: '10px' }}
                        >
                          {vehicle.operator}
                        </span>
                      </td>
                      <td>
                        <select
                          className="input-field"
                          value={vehicle.status}
                          onChange={(e) => onUpdateVehicleStatus(vehicle.id, e.target.value as FleetVehicle['status'])}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            height: '28px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            color: statusColor,
                            background: 'rgba(15, 23, 42, 0.8)',
                            borderColor: statusColor + '55',
                          }}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="IN_TRANSIT">IN TRANSIT</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                        </select>
                      </td>
                      <td>
                        {vehicle.driverName ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '12px', color: '#f8fafc' }}>
                              {vehicle.driverName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {vehicle.driverCode} {vehicle.driverMobile ? `• ${vehicle.driverMobile}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                            Unassigned Pool
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {vehicle.lastServiceDate || '2026-09-15'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const newStatus = vehicle.status === 'MAINTENANCE' ? 'ACTIVE' : 'MAINTENANCE';
                            onUpdateVehicleStatus(vehicle.id, newStatus);
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: vehicle.status === 'MAINTENANCE' ? '#10b981' : '#f59e0b',
                            borderColor: vehicle.status === 'MAINTENANCE' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {vehicle.status === 'MAINTENANCE' ? 'Exit Maint' : 'Set Maint'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: DRIVER SIGN-UP DOSSIER ─── */}
      {inspectingDriver && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={inspectingDriver.profilePhoto}
                  alt={inspectingDriver.fullName}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #06b6d4' }}
                />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                    {inspectingDriver.fullName} ({inspectingDriver.driverCode})
                  </h3>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                    Official SCK Logistics Driver Operational Dossier
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setInspectingDriver(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '14px',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>National ID (NIC):</span>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>{inspectingDriver.nic}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Driving License No:</span>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#06b6d4', fontFamily: 'monospace' }}>
                    {inspectingDriver.licenseNumber} (Exp: {inspectingDriver.licenseExpiryDate})
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Contact Mobile:</span>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>{inspectingDriver.mobileNumber}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Assigned CHE Prime Mover:</span>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>
                    {inspectingDriver.cheNumber} ({inspectingDriver.vehicleNumber})
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Emergency Contact:</span>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>
                    {inspectingDriver.emergencyContactName} — {inspectingDriver.emergencyContactNumber}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Shift & Telematics:</span>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#10b981' }}>
                    {inspectingDriver.shiftStatus || 'ON_DUTY'} • Medical Passed
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 700, marginBottom: '6px' }}>
                  SCK LOGISTICS INCENTIVE & TRIP TARGET
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Monthly Trips: <b>{inspectingDriver.tripsCompleted} missions</b></span>
                  <span>Safety Rating: <b style={{ color: '#10b981' }}>{inspectingDriver.rating} / 5.0 ★</b></span>
                  <span>Total Earned: <b style={{ color: '#10b981' }}>LKR {inspectingDriver.totalEarnedAllowance.toLocaleString()}</b></span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setInspectingDriver(null)}>
                Close Dossier
              </button>
              <a
                href={`tel:${inspectingDriver.mobileNumber}`}
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Phone size={13} /> Direct Contact Driver
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: REASSIGN CHE PRIME MOVER ─── */}
      {reassigningDriver && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Reassign CHE Prime Mover</h3>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                  Assign a new CHE to driver {reassigningDriver.fullName} ({reassigningDriver.driverCode})
                </p>
              </div>
              <button className="btn-icon" onClick={() => setReassigningDriver(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Select Target Prime Mover (CHE)</label>
                <select
                  className="input-field"
                  value={selectedCheForReassign}
                  onChange={(e) => setSelectedCheForReassign(e.target.value)}
                >
                  <option value="">-- Choose Prime Mover --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.cheNumber}>
                      {v.cheNumber} ({v.vehicleNumber}) • {v.operator} • Status: {v.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReassigningDriver(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmReassign}
                disabled={!selectedCheForReassign}
              >
                Confirm Vehicle Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: REJECT / HOLD GATE PASS ─── */}
      {rejectingTripId && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f87171' }}>
                Hold / Reject Gate Clearance
              </h3>
              <button className="btn-icon" onClick={() => setRejectingTripId(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                Please specify the gate rejection reason or required physical inspection:
              </p>
              <textarea
                className="input-field"
                rows={3}
                placeholder="e.g. Container seal broken, weight discrepancy, chassis brake defect..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectingTripId(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
              >
                Confirm Rejection & Alert Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
