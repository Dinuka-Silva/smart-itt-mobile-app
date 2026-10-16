import React, { useState } from 'react';
import { X, Users, Plus } from 'lucide-react';
import { DriverRecord, FleetOperator } from '../types';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}

export const AddDriverModal: React.FC<AddDriverModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [nic, setNic] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('2028-12-31');
  const [operator, setOperator] = useState<FleetOperator>('SCK Logistics');
  const [vehicleNumber, setVehicleNumber] = useState('LY 5234');
  const [cheNumber, setCheNumber] = useState('SCK 100');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !employeeId || !licenseNumber) return;

    onAdd({
      fullName,
      employeeId,
      nic: nic || '199012345678',
      mobileNumber: mobileNumber || '+94 77 000 0000',
      email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@smartitt.lk`,
      address: 'Port Housing Complex, Colombo 15',
      licenseNumber,
      licenseExpiryDate,
      emergencyContactName: emergencyContactName || 'Family Member',
      emergencyContactNumber: emergencyContactNumber || '+94 77 111 2233',
      vehicleNumber,
      cheNumber,
      operator,
      status: 'ACTIVE',
    });

    setFullName('');
    setEmployeeId('');
    setLicenseNumber('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="#06b6d4" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
              Onboard Prime Mover Driver
            </h3>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Driver Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Kasun Priyantha"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. EMP-SCK-099"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">NIC Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 199122334455"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. +94 77 123 9988"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Heavy Vehicle License No</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. B-9988221"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">License Expiry Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Operator</label>
                <select
                  className="form-control"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as FleetOperator)}
                >
                  <option value="SCK Logistics">SCK Logistics</option>
                  <option value="SDR LINK">SDR LINK</option>
                  <option value="E3 Logistics">E3 Logistics</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Plate</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="LY 5234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Port CHE No</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="SCK 100"
                  value={cheNumber}
                  onChange={(e) => setCheNumber(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Emergency Contact Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Nilmini Priyantha (Wife)"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Emergency Contact Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. +94 71 888 1122"
                  value={emergencyContactNumber}
                  onChange={(e) => setEmergencyContactNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={14} />
              <span>Issue Driver Gate Badge</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
