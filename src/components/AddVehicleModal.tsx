import React, { useState } from 'react';
import { X, Truck, Plus } from 'lucide-react';
import { FleetVehicle, FleetOperator } from '../types';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: Omit<FleetVehicle, 'id'>) => void;
}

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [cheNumber, setCheNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [operator, setOperator] = useState<FleetOperator>('SCK Logistics');
  const [trailerSize, setTrailerSize] = useState<'40FT' | '2x20FT'>('40FT');
  const [status, setStatus] = useState<FleetVehicle['status']>('ACTIVE');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cheNumber || !vehicleNumber) return;

    onAdd({
      cheNumber: cheNumber.toUpperCase().trim(),
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      operator,
      trailerSize,
      status,
      fuelLevel: 100,
      mileageKm: 1200,
      lastServiceDate: new Date().toISOString().split('T')[0],
    });

    setCheNumber('');
    setVehicleNumber('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={20} color="#10b981" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
              Register Port Prime Mover & CHE
            </h3>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Port CHE No (SCK Chassis Code)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. SCK 126"
                value={cheNumber}
                onChange={(e) => setCheNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prime Mover License Plate (Tractor LY No)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. LY 6540"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fleet Operator</label>
              <select
                className="form-control"
                value={operator}
                onChange={(e) => setOperator(e.target.value as FleetOperator)}
              >
                <option value="SCK Logistics">SCK Logistics (Main Shuttles)</option>
                <option value="SDR LINK">SDR LINK (Specialist)</option>
                <option value="E3 Logistics">E3 Logistics (Dedicated ITT)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Chassis Specification</label>
              <select
                className="form-control"
                value={trailerSize}
                onChange={(e) => setTrailerSize(e.target.value as any)}
              >
                <option value="40FT">40FT Standard Skeletal Chassis</option>
                <option value="2x20FT">2 x 20FT Twin Tandem Skeletal</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Equipment Status</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="ACTIVE">ACTIVE (Ready for Dispatch)</option>
                <option value="MAINTENANCE">MAINTENANCE (Workshop)</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={14} />
              <span>Register Equipment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
