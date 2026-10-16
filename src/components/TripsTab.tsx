import React, { useState, useMemo } from 'react';
import {
  Compass,
  Search,
  Filter,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Boxes,
  Truck,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { IttTrip, TripStatus, TerminalCode } from '../types';

interface TripsTabProps {
  trips: IttTrip[];
  onApproveTrip: (tripId: string) => void;
  onRejectTrip: (tripId: string) => void;
  onCompleteTrip: (tripId: string) => void;
  onViewTrip: (trip: IttTrip) => void;
  onOpenCreateTripModal: () => void;
}

export const TripsTab: React.FC<TripsTabProps> = ({
  trips,
  onApproveTrip,
  onRejectTrip,
  onCompleteTrip,
  onViewTrip,
  onOpenCreateTripModal,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TripStatus>('ALL');
  const [terminalFilter, setTerminalFilter] = useState<'ALL' | TerminalCode>('ALL');

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch =
        t.tripNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.driverName.toLowerCase().includes(search.toLowerCase()) ||
        t.driverCode.toLowerCase().includes(search.toLowerCase()) ||
        t.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.cheNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.containers.some((c) => c.containerNumber.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchTerminal =
        terminalFilter === 'ALL' ||
        t.sourceTerminal === terminalFilter ||
        t.destinationTerminal === terminalFilter;

      return matchSearch && matchStatus && matchTerminal;
    });
  }, [trips, search, statusFilter, terminalFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      REJECTED: 0,
    };
    trips.forEach((t) => {
      if (counts[t.status] !== undefined) counts[t.status]++;
    });
    return counts;
  }, [trips]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h2>Inter-Terminal Transportation (ITT) Mission Ledger</h2>
          <p>
            Complete dispatch lifecycle management: Driver creation ➔ Supervisor origin gate pass ➔
            Corridor in-transit telematics ➔ Destination terminal arrival & container discharge.
          </p>
        </div>
        <div className="header-action-group">
          <button className="btn btn-primary" onClick={onOpenCreateTripModal}>
            <Plus size={16} />
            <span>Create ITT Mission</span>
          </button>
        </div>
      </div>

      {/* Status Filter Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'PENDING_APPROVAL' ? '#fbbf24' : undefined,
          }}
          onClick={() =>
            setStatusFilter(statusFilter === 'PENDING_APPROVAL' ? 'ALL' : 'PENDING_APPROVAL')
          }
        >
          <div className="stat-card-header">
            <span className="stat-title">Pending Gate</span>
            <Clock size={16} color="#fbbf24" />
          </div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>
            {statusCounts.PENDING_APPROVAL}
          </div>
          <div className="stat-sub">Awaiting Pass Clearance</div>
        </div>

        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'APPROVED' ? '#10b981' : undefined,
          }}
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
        >
          <div className="stat-card-header">
            <span className="stat-title">Approved</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {statusCounts.APPROVED}
          </div>
          <div className="stat-sub">Ready to Depart Origin</div>
        </div>

        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'IN_PROGRESS' ? '#06b6d4' : undefined,
          }}
          onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
        >
          <div className="stat-card-header">
            <span className="stat-title">In-Transit</span>
            <Truck size={16} color="#06b6d4" />
          </div>
          <div className="stat-value" style={{ color: '#06b6d4' }}>
            {statusCounts.IN_PROGRESS}
          </div>
          <div className="stat-sub">On Port Internal Roads</div>
        </div>

        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'COMPLETED' ? '#94a3b8' : undefined,
          }}
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
        >
          <div className="stat-card-header">
            <span className="stat-title">Completed</span>
            <CheckCheck size={16} color="#94a3b8" />
          </div>
          <div className="stat-value">{statusCounts.COMPLETED}</div>
          <div className="stat-sub">Gate-In & Discharged</div>
        </div>

        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: statusFilter === 'REJECTED' ? '#f43f5e' : undefined,
          }}
          onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED')}
        >
          <div className="stat-card-header">
            <span className="stat-title">Rejected</span>
            <ShieldAlert size={16} color="#f43f5e" />
          </div>
          <div className="stat-value" style={{ color: '#f43f5e' }}>
            {statusCounts.REJECTED}
          </div>
          <div className="stat-sub">Failed Gate Inspection</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                className="form-input"
                placeholder="Search mission ID, container (MSCU...), driver, plate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '320px' }}
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Mission Statuses</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
              <option value="APPROVED">APPROVED (Departing)</option>
              <option value="IN_PROGRESS">IN_PROGRESS (Corridor)</option>
              <option value="COMPLETED">COMPLETED (Discharged)</option>
              <option value="REJECTED">REJECTED (Held)</option>
            </select>

            <select
              className="filter-select"
              value={terminalFilter}
              onChange={(e) => setTerminalFilter(e.target.value as any)}
            >
              <option value="ALL">All Terminals</option>
              <option value="CICT">CICT Berth</option>
              <option value="CWIT">CWIT Berth</option>
              <option value="ECT">ECT Berth</option>
              <option value="JCT">JCT Berth</option>
              <option value="UCT">UCT Berth</option>
              <option value="SAGT">SAGT Berth</option>
            </select>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Showing <b>{filteredTrips.length}</b> of {trips.length} Missions
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Mission No</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Corridor Route</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Prime Mover & CHE</th>
                <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Driver Roster</th>
                <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Container Manifest</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Timestamps</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Lifecycle Status</th>
                <th style={{ minWidth: '180px', textAlign: 'right', whiteSpace: 'nowrap' }}>Admin Control</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr key={trip.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="tag-mono" style={{ fontSize: '12px' }}>
                      {trip.tripNumber}
                    </span>
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
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{trip.driverCode}</div>
                  </td>

                  <td>
                    {trip.containers.map((c) => (
                      <div key={c.id} style={{ marginBottom: '2px', whiteSpace: 'nowrap' }}>
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
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      <div>Logged: {trip.createdAt}</div>
                      {trip.gateOutTime && (
                        <div>Gate-Out: {trip.gateOutTime.split(' ')[1]}</div>
                      )}
                      {trip.gateInTime && (
                        <div style={{ color: '#10b981' }}>
                          Gate-In: {trip.gateInTime.split(' ')[1]}
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    {trip.status === 'PENDING_APPROVAL' && (
                      <span className="badge badge-pending">Pending Approval</span>
                    )}
                    {trip.status === 'APPROVED' && (
                      <span className="badge badge-approved">Approved</span>
                    )}
                    {trip.status === 'IN_PROGRESS' && (
                      <span className="badge badge-in-progress">In-Transit</span>
                    )}
                    {trip.status === 'COMPLETED' && (
                      <span className="badge badge-completed">Completed</span>
                    )}
                    {trip.status === 'REJECTED' && (
                      <span className="badge badge-rejected">Rejected</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewTrip(trip)}
                        title="View Detailed Inspection"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>

                      {trip.status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onApproveTrip(trip.id)}
                            title="Approve Gate Pass"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => onRejectTrip(trip.id)}
                            title="Reject Gate Pass"
                          >
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {trip.status === 'IN_PROGRESS' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onCompleteTrip(trip.id)}
                          title="Record Terminal Discharge & Complete"
                        >
                          <CheckCheck size={13} />
                          <span>Discharge</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
