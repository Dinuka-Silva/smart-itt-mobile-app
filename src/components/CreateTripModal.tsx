import React, { useState } from 'react';
import { X, Compass, Plus, CheckCircle2, AlertTriangle, Boxes } from 'lucide-react';
import { DriverRecord, TerminalCode, ContainerItem, IttTrip } from '../types';
import { validateIsoContainer } from '../utils/isoValidator';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: DriverRecord[];
  onCreate: (trip: Partial<IttTrip>) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  drivers,
  onCreate,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id || '');
  const [sourceTerminal, setSourceTerminal] = useState<TerminalCode>('CICT');
  const [destTerminal, setDestTerminal] = useState<TerminalCode>('JCT');
  const [loadConfig, setLoadConfig] = useState<'40FT' | '2x20FT'>('40FT');

  const [container1, setContainer1] = useState('MSCU7829103');
  const [vessel1, setVessel1] = useState('MSC ANNA V.241');
  const [container2, setContainer2] = useState('CMAU9201948');
  const [status, setStatus] = useState<IttTrip['status']>('APPROVED');

  if (!isOpen) return null;

  const currentDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  const val1 = validateIsoContainer(container1);
  const val2 = validateIsoContainer(container2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!container1) return;

    const containers: ContainerItem[] = [];

    if (loadConfig === '40FT') {
      containers.push({
        id: `cnt-${Date.now()}-1`,
        containerNumber: container1.toUpperCase().trim(),
        size: '40FT',
        cargoType: 'DRY',
        vesselName: vessel1,
        weightTonnes: 26.5,
        sealNumber: 'SLPA-VERIFIED',
        checkDigitValid: val1.valid,
        expectedCheckDigit: val1.expectedCheckDigit,
        actualCheckDigit: val1.actualCheckDigit,
      });
    } else {
      containers.push(
        {
          id: `cnt-${Date.now()}-1`,
          containerNumber: container1.toUpperCase().trim(),
          size: '20FT',
          cargoType: 'DRY',
          vesselName: vessel1,
          weightTonnes: 14.0,
          sealNumber: 'SLPA-20FT-1',
          checkDigitValid: val1.valid,
          expectedCheckDigit: val1.expectedCheckDigit,
          actualCheckDigit: val1.actualCheckDigit,
        },
        {
          id: `cnt-${Date.now()}-2`,
          containerNumber: container2.toUpperCase().trim(),
          size: '20FT',
          cargoType: 'DRY',
          vesselName: vessel1,
          weightTonnes: 12.5,
          sealNumber: 'SLPA-20FT-2',
          checkDigitValid: val2.valid,
          expectedCheckDigit: val2.expectedCheckDigit,
          actualCheckDigit: val2.actualCheckDigit,
        }
      );
    }

    onCreate({
      driverId: currentDriver.id,
      driverName: currentDriver.fullName,
      driverCode: currentDriver.driverCode,
      driverPhone: currentDriver.mobileNumber,
      vehicleNumber: currentDriver.vehicleNumber,
      cheNumber: currentDriver.cheNumber,
      operator: currentDriver.operator,
      sourceTerminal,
      destinationTerminal: destTerminal,
      status,
      containers,
      approvedBy: status === 'APPROVED' ? 'HQ Admin Direct Clearance' : undefined,
      approvedAt: status === 'APPROVED' ? new Date().toISOString().replace('T', ' ').slice(0, 16) : undefined,
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass size={20} color="#10b981" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
              Dispatch ITT Mission (Admin Direct)
            </h3>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Driver Picker */}
            <div className="form-group">
              <label className="form-label">Assign Prime Mover Driver</label>
              <select
                className="form-control"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
              >
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.driverCode}) — {d.vehicleNumber} [{d.cheNumber}] • {d.operator}
                  </option>
                ))}
              </select>
            </div>

            {/* Origin & Destination */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Origin Terminal (Departure Gate)</label>
                <select
                  className="form-control"
                  value={sourceTerminal}
                  onChange={(e) => setSourceTerminal(e.target.value as TerminalCode)}
                >
                  <option value="CICT">CICT Berth</option>
                  <option value="CWIT">CWIT Berth</option>
                  <option value="ECT">ECT Berth</option>
                  <option value="JCT">JCT Berth</option>
                  <option value="UCT">UCT Berth</option>
                  <option value="SAGT">SAGT Berth</option>
                </select>
              </div>

              <div>
                <label className="form-label">Destination Terminal (Arrival Bay)</label>
                <select
                  className="form-control"
                  value={destTerminal}
                  onChange={(e) => setDestTerminal(e.target.value as TerminalCode)}
                >
                  <option value="JCT">JCT Berth</option>
                  <option value="CICT">CICT Berth</option>
                  <option value="CWIT">CWIT Berth</option>
                  <option value="ECT">ECT Berth</option>
                  <option value="UCT">UCT Berth</option>
                  <option value="SAGT">SAGT Berth</option>
                </select>
              </div>
            </div>

            {/* Chassis Load Configuration */}
            <div className="form-group">
              <label className="form-label">Chassis Load Configuration</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${loadConfig === '40FT' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLoadConfig('40FT')}
                  style={{ flex: 1 }}
                >
                  1 x 40FT Standard Container
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${loadConfig === '2x20FT' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setLoadConfig('2x20FT')}
                  style={{ flex: 1 }}
                >
                  2 x 20FT Twin Tandem Boxes
                </button>
              </div>
            </div>

            {/* Container 1 Number & Validation */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">
                  Container 1 Number {loadConfig === '2x20FT' ? '(Front Slot)' : ''}
                </label>
                {val1.valid ? (
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={12} /> ISO 6346 Valid
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <AlertTriangle size={12} /> Check Digit Issue
                  </span>
                )}
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MSCU7829103"
                value={container1}
                onChange={(e) => setContainer1(e.target.value.toUpperCase())}
                required
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Container 2 Number (if tandem) */}
            {loadConfig === '2x20FT' && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Container 2 Number (Rear Slot)</label>
                  {val2.valid ? (
                    <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={12} /> ISO 6346 Valid
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <AlertTriangle size={12} /> Check Digit Issue
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. CMAU9201948"
                  value={container2}
                  onChange={(e) => setContainer2(e.target.value.toUpperCase())}
                  required
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Calling Vessel / Voyage</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MSC ANNA V.241"
                  value={vessel1}
                  onChange={(e) => setVessel1(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dispatch Status</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="APPROVED">APPROVED (Immediate Gate Clearance)</option>
                  <option value="PENDING_APPROVAL">PENDING_APPROVAL (Supervisor Gate Hold)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Currently Departing)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={14} />
              <span>Issue Mission Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
