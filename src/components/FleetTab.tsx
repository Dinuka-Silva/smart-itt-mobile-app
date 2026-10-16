import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Fuel,
  Wrench,
  CheckCircle,
  Clock,
  Check,
} from 'lucide-react';
import { FleetVehicle, FleetOperator } from '../types';

interface FleetTabProps {
  vehicles: FleetVehicle[];
  onUpdateStatus: (id: string, status: FleetVehicle['status']) => void;
  onOpenAddVehicleModal: () => void;
}

export const FleetTab: React.FC<FleetTabProps> = ({
  vehicles,
  onUpdateStatus,
  onOpenAddVehicleModal,
}) => {
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState<'ALL' | FleetOperator>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FleetVehicle['status']>('ALL');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
        v.cheNumber.toLowerCase().includes(search.toLowerCase()) ||
        (v.driverName && v.driverName.toLowerCase().includes(search.toLowerCase())) ||
        (v.driverCode && v.driverCode.toLowerCase().includes(search.toLowerCase()));

      const matchOperator = operatorFilter === 'ALL' || v.operator === operatorFilter;
      const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;

      return matchSearch && matchOperator && matchStatus;
    });
  }, [vehicles, search, operatorFilter, statusFilter]);

  const operatorCounts = useMemo(() => {
    const counts = { 'SCK Logistics': 0, 'SDR LINK': 0, 'E3 Logistics': 0 };
    vehicles.forEach((v) => {
      if (counts[v.operator] !== undefined) {
        counts[v.operator]++;
      }
    });
    return counts;
  }, [vehicles]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h2>Authoritative ITT Vehicle Fleet (24 Units)</h2>
          <p>
            Port Container Handling Equipment (CHE Nos SCK 100–125) and prime mover telematics
            allocated across SCK Logistics, SDR LINK, and E3 Logistics.
          </p>
        </div>
        <div className="header-action-group">
          <button className="btn btn-primary" onClick={onOpenAddVehicleModal}>
            <Plus size={16} />
            <span>Register Prime Mover</span>
          </button>
        </div>
      </div>

      {/* Operator Breakdown Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: operatorFilter === 'SCK Logistics' ? '#3b82f6' : undefined,
          }}
          onClick={() =>
            setOperatorFilter(operatorFilter === 'SCK Logistics' ? 'ALL' : 'SCK Logistics')
          }
        >
          <div className="stat-card-header">
            <span className="stat-title">SCK Logistics Fleet</span>
            <span className="operator-badge op-sck">CHE 100 - 114</span>
          </div>
          <div className="stat-value">{operatorCounts['SCK Logistics']} Vehicles</div>
          <div className="stat-sub">Heavy Port Skeletal Chassis (40FT / 2x20FT)</div>
        </div>

        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: operatorFilter === 'SDR LINK' ? '#a855f7' : undefined,
          }}
          onClick={() => setOperatorFilter(operatorFilter === 'SDR LINK' ? 'ALL' : 'SDR LINK')}
        >
          <div className="stat-card-header">
            <span className="stat-title">SDR LINK Fleet</span>
            <span className="operator-badge op-sdr">CHE 115 - 121</span>
          </div>
          <div className="stat-value">{operatorCounts['SDR LINK']} Vehicles</div>
          <div className="stat-sub">High-capacity port terminal shuttles</div>
        </div>

        <div
          className="stat-card"
          style={{
            cursor: 'pointer',
            borderColor: operatorFilter === 'E3 Logistics' ? '#f97316' : undefined,
          }}
          onClick={() =>
            setOperatorFilter(operatorFilter === 'E3 Logistics' ? 'ALL' : 'E3 Logistics')
          }
        >
          <div className="stat-card-header">
            <span className="stat-title">E3 Logistics Fleet</span>
            <span className="operator-badge op-e3">CHE 122 - 125</span>
          </div>
          <div className="stat-value">{operatorCounts['E3 Logistics']} Vehicles</div>
          <div className="stat-sub">Dedicated inter-terminal skeletal prime movers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="panel"
        style={{ padding: '16px 20px', marginBottom: '20px' }}
      >
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
                placeholder="Search plate (e.g. LY 5234), SCK No, driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '280px' }}
              />
            </div>

            <select
              className="filter-select"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value as any)}
            >
              <option value="ALL">All Operators (24)</option>
              <option value="SCK Logistics">SCK Logistics (15)</option>
              <option value="SDR LINK">SDR LINK (5)</option>
              <option value="E3 Logistics">E3 Logistics (4)</option>
            </select>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">All Operational Statuses</option>
              <option value="ACTIVE">ACTIVE (Ready)</option>
              <option value="IN_TRANSIT">IN_TRANSIT (Mission)</option>
              <option value="MAINTENANCE">MAINTENANCE (Workshop)</option>
            </select>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Showing <b>{filteredVehicles.length}</b> of {vehicles.length} Prime Movers
          </div>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Port CHE No</th>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>License Plate</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Operator</th>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Trailer Spec</th>
                <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Assigned Driver</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Telematics / Fuel</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: '140px', textAlign: 'right', whiteSpace: 'nowrap' }}>Status Switcher</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => {
                const opClass =
                  vehicle.operator === 'SCK Logistics'
                    ? 'op-sck'
                    : vehicle.operator === 'SDR LINK'
                    ? 'op-sdr'
                    : 'op-e3';

                return (
                  <tr key={vehicle.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="tag-che" style={{ fontSize: '12px' }}>
                        {vehicle.cheNumber}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="tag-mono" style={{ fontSize: '12px', fontWeight: 700 }}>
                        {vehicle.vehicleNumber}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`operator-badge ${opClass}`}>{vehicle.operator}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {vehicle.trailerSize || '40FT Skeletal'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {vehicle.driverName ? (
                        <div>
                          <div style={{ fontWeight: 700 }}>{vehicle.driverName}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {vehicle.driverCode} • {vehicle.driverMobile}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                          Unassigned Pool
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ width: '120px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: '#94a3b8',
                            marginBottom: '4px',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Fuel size={12} color="#06b6d4" />
                            {vehicle.fuelLevel ?? 80}%
                          </span>
                          <span>{vehicle.mileageKm ? `${(vehicle.mileageKm / 1000).toFixed(0)}k km` : '42k km'}</span>
                        </div>
                        <div
                          style={{
                            height: '4px',
                            background: '#1e293b',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${vehicle.fuelLevel ?? 80}%`,
                              height: '100%',
                              background:
                                (vehicle.fuelLevel ?? 80) < 40
                                  ? '#ef4444'
                                  : (vehicle.fuelLevel ?? 80) < 65
                                  ? '#f59e0b'
                                  : '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {vehicle.status === 'ACTIVE' && (
                        <span className="badge badge-active">Active</span>
                      )}
                      {vehicle.status === 'IN_TRANSIT' && (
                        <span className="badge badge-in-progress">In-Transit</span>
                      )}
                      {vehicle.status === 'MAINTENANCE' && (
                        <span className="badge badge-maintenance">Maintenance</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select
                        className="filter-select"
                        value={vehicle.status}
                        onChange={(e) =>
                          onUpdateStatus(vehicle.id, e.target.value as FleetVehicle['status'])
                        }
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                      >
                        <option value="ACTIVE">Set ACTIVE</option>
                        <option value="IN_TRANSIT">Set IN_TRANSIT</option>
                        <option value="MAINTENANCE">Set MAINTENANCE</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
