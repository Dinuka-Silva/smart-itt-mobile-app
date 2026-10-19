import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Wrench,
  CheckCircle,
  Clock,
  Check,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  X,
} from 'lucide-react';
import { FleetVehicle, FleetOperator } from '../types';

interface FleetTabProps {
  vehicles: FleetVehicle[];
  onUpdateStatus: (id: string, status: FleetVehicle['status']) => void;
  onUpdateLicense?: (vehicleNumber: string, issuedDate?: string) => void;
  onOpenAddVehicleModal: () => void;
}

export const FleetTab: React.FC<FleetTabProps> = ({
  vehicles,
  onUpdateStatus,
  onUpdateLicense,
  onOpenAddVehicleModal,
}) => {
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState<'ALL' | FleetOperator>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FleetVehicle['status']>('ALL');

  // License Update Modal State
  const [licenseModalVehicle, setLicenseModalVehicle] = useState<FleetVehicle | null>(null);
  const [licenseIssuedDate, setLicenseIssuedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const calculatedExpiryDate = useMemo(() => {
    try {
      const d = new Date(licenseIssuedDate);
      if (isNaN(d.getTime())) return '';
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [licenseIssuedDate]);

  const renewalDueVehicles = useMemo(() => {
    return vehicles.filter(
      (v) => v.renewalDue || (v.daysUntilExpiry !== undefined && v.daysUntilExpiry <= 30)
    );
  }, [vehicles]);

  const handleOpenLicenseModal = (vehicle: FleetVehicle) => {
    setLicenseModalVehicle(vehicle);
    setLicenseIssuedDate(
      vehicle.licenseIssuedDate || new Date().toISOString().split('T')[0]
    );
  };

  const handleSaveLicense = () => {
    if (!licenseModalVehicle) return;
    if (onUpdateLicense) {
      onUpdateLicense(licenseModalVehicle.vehicleNumber, licenseIssuedDate);
    }
    setLicenseModalVehicle(null);
  };

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

      {/* ─── URGENT VEHICLE LICENSE RENEWAL NOTIFICATION BANNER (ACTIVE WITHIN 30 DAYS) ─── */}
      {renewalDueVehicles.length > 0 ? (
        <div
          className="panel"
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.16) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1.5px solid rgba(245, 158, 11, 0.6)',
            padding: '16px 20px',
            marginBottom: '20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                border: '1px solid #f59e0b',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: '13px', letterSpacing: '0.6px' }}>
                ⚠️ VEHICLE REVENUE LICENSE RENEWAL NOTIFICATION ({renewalDueVehicles.length} PRIME MOVER{renewalDueVehicles.length > 1 ? 'S' : ''} DUE WITHIN 30 DAYS)
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '2px', lineHeight: 1.4 }}>
                The following vehicle revenue licenses are within the 1-month renewal window. As Admin, update or renew each license date to extend validity for 1 year, which will immediately clear renewal notifications across Driver Cockpit, Supervisor Panel, and Admin Dashboard:
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                {renewalDueVehicles.map((rv) => (
                  <span
                    key={rv.id}
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#fde68a',
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{rv.cheNumber} ({rv.vehicleNumber}):</span>
                    <span style={{ color: '#f87171' }}>Expires {rv.licenseExpiryDate}</span>
                    <span style={{ color: '#94a3b8' }}>({rv.daysUntilExpiry}d left)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{
              backgroundColor: '#f59e0b',
              borderColor: '#f59e0b',
              color: '#080e17',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => {
              if (onUpdateLicense) {
                renewalDueVehicles.forEach((rv) => onUpdateLicense(rv.vehicleNumber));
              }
            }}
          >
            <ShieldCheck size={16} />
            <span>Renew All Due Licenses (1 Year Validity)</span>
          </button>
        </div>
      ) : null}

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
              <option value="ACTIVE">ACTIVE (Ready on Duty)</option>
              <option value="INACTIVE">INACTIVE (Off Duty)</option>
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
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Port CHE No</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>License Plate</th>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Operator</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Trailer Spec</th>
                <th style={{ minWidth: '170px', whiteSpace: 'nowrap' }}>Assigned Driver</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Fleet Status</th>
                <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Revenue License (1 Yr Valid)</th>
                <th style={{ minWidth: '220px', textAlign: 'right', whiteSpace: 'nowrap' }}>Admin Actions</th>
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
                            {vehicle.driverCode} {vehicle.driverMobile ? `• ${vehicle.driverMobile}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                          Unassigned Pool
                        </span>
                      )}
                    </td>
                    <td>
                      {vehicle.status === 'ACTIVE' && (
                        <span className="badge badge-emerald">ACTIVE</span>
                      )}
                      {vehicle.status === 'INACTIVE' && (
                        <span className="badge" style={{ background: '#334155', color: '#cbd5e1' }}>INACTIVE</span>
                      )}
                      {vehicle.status === 'IN_TRANSIT' && (
                        <span className="badge badge-cyan">IN_TRANSIT</span>
                      )}
                      {vehicle.status === 'MAINTENANCE' && (
                        <span className="badge badge-amber">MAINTENANCE</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {vehicle.renewalDue ? (
                            <span
                              className="badge badge-amber"
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                background: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid #f59e0b',
                                color: '#fde68a',
                              }}
                            >
                              ⚠️ DUE: {vehicle.licenseExpiryDate} ({vehicle.daysUntilExpiry}d left)
                            </span>
                          ) : (
                            <span
                              className="badge badge-emerald"
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                              }}
                            >
                              ✓ VALID: {vehicle.licenseExpiryDate}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Issued: {vehicle.licenseIssuedDate || '2026-08-15'} (1 Yr Valid)
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <select
                          className="filter-select"
                          value={vehicle.status}
                          onChange={(e) =>
                            onUpdateStatus(vehicle.id, e.target.value as FleetVehicle['status'])
                          }
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                        >
                          <option value="ACTIVE">Set ACTIVE</option>
                          <option value="INACTIVE">Set INACTIVE</option>
                          <option value="IN_TRANSIT">Set IN_TRANSIT</option>
                          <option value="MAINTENANCE">Set MAINTENANCE</option>
                        </select>

                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            backgroundColor: vehicle.renewalDue ? 'rgba(245, 158, 11, 0.18)' : undefined,
                            borderColor: vehicle.renewalDue ? '#f59e0b' : undefined,
                            color: vehicle.renewalDue ? '#fde68a' : undefined,
                            fontWeight: vehicle.renewalDue ? 800 : 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => handleOpenLicenseModal(vehicle)}
                          title="Update vehicle revenue license date (valid for 1 year from issued date)"
                        >
                          <Calendar size={12} />
                          <span>{vehicle.renewalDue ? 'Renew (1 Yr)' : 'Update License'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: UPDATE VEHICLE REVENUE LICENSE (VALID FOR 1 YEAR) ─── */}
      {licenseModalVehicle && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#00e5ff" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Update Vehicle Revenue License
                </h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setLicenseModalVehicle(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#849396' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div
                style={{
                  background: '#080e17',
                  border: '1px solid #242a34',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#849396', fontWeight: 700 }}>PORT CHE NUMBER</div>
                  <div style={{ fontSize: '15px', color: '#00e5ff', fontWeight: 800 }}>
                    {licenseModalVehicle.cheNumber}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#849396', fontWeight: 700 }}>TRACTOR PLATE NO</div>
                  <div style={{ fontSize: '15px', color: '#dde2f0', fontWeight: 800 }}>
                    {licenseModalVehicle.vehicleNumber}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#849396', fontWeight: 700 }}>OPERATOR</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>
                    {licenseModalVehicle.operator}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700, color: '#dde2f0', marginBottom: '6px', display: 'block' }}>
                  ADMIN REVENUE LICENSE ISSUE / RENEWAL DATE *
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                  value={licenseIssuedDate}
                  onChange={(e) => setLicenseIssuedDate(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Setting this date automatically certifies the vehicle license for <b>exactly 1 year</b>.
                </span>
              </div>

              <div
                style={{
                  background: 'rgba(0, 229, 255, 0.08)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <ShieldCheck size={20} color="#00e5ff" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', color: '#00e5ff', fontWeight: 800 }}>
                    CALCULATED EXPIRY (VALID FOR 1 YEAR):
                  </div>
                  <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: 800, marginTop: '2px' }}>
                    {calculatedExpiryDate || '—'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    Renewal notifications across Driver, Supervisor, and Admin Panel will disappear and stay clear until 30 days before this date.
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setLicenseModalVehicle(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveLicense}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={16} />
                <span>Save &amp; Extend 1 Year Validity</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
