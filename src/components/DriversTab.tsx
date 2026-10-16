import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Phone,
  CreditCard,
  Calendar,
  Truck,
  Star,
  Award,
} from 'lucide-react';
import { DriverRecord, AccountStatus } from '../types';

interface DriversTabProps {
  drivers: DriverRecord[];
  onUpdateStatus: (id: string, status: AccountStatus) => void;
  onOpenAddDriverModal: () => void;
}

export const DriversTab: React.FC<DriversTabProps> = ({
  drivers,
  onUpdateStatus,
  onOpenAddDriverModal,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccountStatus>('ALL');

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        d.fullName.toLowerCase().includes(search.toLowerCase()) ||
        d.driverCode.toLowerCase().includes(search.toLowerCase()) ||
        d.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        d.nic.toLowerCase().includes(search.toLowerCase()) ||
        d.mobileNumber.includes(search) ||
        d.licenseNumber.toLowerCase().includes(search.toLowerCase()) ||
        d.vehicleNumber.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [drivers, search, statusFilter]);

  const activeCount = drivers.filter((d) => d.status === 'ACTIVE').length;
  const suspendedCount = drivers.filter((d) => d.status === 'SUSPENDED').length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h2>Driver Directory & Security Compliance</h2>
          <p>
            Port gate badges, driving licenses, vehicle assignments, and mission performance
            audits for authorized prime mover operators.
          </p>
        </div>
        <div className="header-action-group">
          <button className="btn btn-primary" onClick={onOpenAddDriverModal}>
            <Plus size={16} />
            <span>Onboard New Driver</span>
          </button>
        </div>
      </div>

      {/* Driver Summary Metrics */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Total Roster</span>
            <Users size={18} color="#06b6d4" />
          </div>
          <div className="stat-value">{drivers.length} Drivers</div>
          <div className="stat-sub">Registered with Port Security</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Active Gate Pass</span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {activeCount} Active
          </div>
          <div className="stat-sub">Cleared for terminal corridors</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Suspended / Held</span>
            <ShieldAlert size={18} color="#f43f5e" />
          </div>
          <div className="stat-value" style={{ color: suspendedCount > 0 ? '#f43f5e' : '#94a3b8' }}>
            {suspendedCount} Suspended
          </div>
          <div className="stat-sub">Expired license or violation</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Standard ITT Allowance</span>
            <Award size={18} color="#fbbf24" />
          </div>
          <div className="stat-value" style={{ color: '#fbbf24' }}>
            LKR 2,500
          </div>
          <div className="stat-sub">Per completed inter-terminal run</div>
        </div>
      </div>

      {/* Search and Filter */}
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
                placeholder="Search name, DRV code, NIC, plate, phone..."
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
              <option value="ALL">All Account Statuses</option>
              <option value="ACTIVE">ACTIVE (Authorized)</option>
              <option value="SUSPENDED">SUSPENDED (Held)</option>
              <option value="DEACTIVATED">DEACTIVATED</option>
            </select>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Showing <b>{filteredDrivers.length}</b> of {drivers.length} Drivers
          </div>
        </div>
      </div>

      {/* Driver Cards / Table */}
      <div className="panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px', whiteSpace: 'nowrap' }}>Driver Identity</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Employee / NIC</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Assigned Prime Mover</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Driver License</th>
                <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Contact & Emergency</th>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Completed Missions</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Accrued Allowance</th>
                <th style={{ minWidth: '100px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ minWidth: '140px', textAlign: 'right', whiteSpace: 'nowrap' }}>Security Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => {
                const isLicenseExpiringSoon =
                  new Date(driver.licenseExpiryDate).getTime() <
                  new Date('2027-01-01').getTime();

                return (
                  <tr key={driver.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={
                            driver.profilePhoto ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                          }
                          alt={driver.fullName}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14px' }}>
                            {driver.fullName}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span className="tag-mono" style={{ color: '#06b6d4', padding: '1px 6px' }}>
                              {driver.driverCode}
                            </span>
                            <span style={{ fontSize: '11px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Star size={11} fill="#fbbf24" /> {driver.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{driver.employeeId}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>NIC: {driver.nic}</div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="tag-mono">{driver.vehicleNumber}</span>
                        <span className="tag-che">{driver.cheNumber}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {driver.operator}
                      </div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {driver.licenseNumber}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: isLicenseExpiringSoon ? '#fbbf24' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Calendar size={11} />
                        Exp: {driver.licenseExpiryDate}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{driver.mobileNumber}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        Emerg: {driver.emergencyContactName} ({driver.emergencyContactNumber})
                      </div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 800 }}>
                        {driver.tripsCompleted} runs
                      </span>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#34d399',
                        }}
                      >
                        LKR {(driver.tripsCompleted * 2500).toLocaleString()}
                      </span>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>
                      {driver.status === 'ACTIVE' && (
                        <span className="badge badge-active">Active</span>
                      )}
                      {driver.status === 'SUSPENDED' && (
                        <span className="badge badge-suspended">Suspended</span>
                      )}
                      {driver.status === 'DEACTIVATED' && (
                        <span className="badge badge-rejected">Deactivated</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <select
                        className="filter-select"
                        value={driver.status}
                        onChange={(e) => onUpdateStatus(driver.id, e.target.value as AccountStatus)}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        <option value="ACTIVE">Authorize (ACTIVE)</option>
                        <option value="SUSPENDED">Suspend (HOLD)</option>
                        <option value="DEACTIVATED">Deactivate</option>
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
