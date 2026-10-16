import React, { useState } from 'react';
import {
  X,
  Compass,
  ArrowRight,
  Truck,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Boxes,
  MapPin,
  Calendar,
  CheckCheck,
} from 'lucide-react';
import { IttTrip } from '../types';

interface TripDetailModalProps {
  trip: IttTrip | null;
  onClose: () => void;
  onApprove: (tripId: string) => void;
  onReject: (tripId: string, reason: string) => void;
  onDispatch: (tripId: string) => void;
  onComplete: (tripId: string) => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  trip,
  onClose,
  onApprove,
  onReject,
  onDispatch,
  onComplete,
}) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (!trip) return null;

  const handleConfirmReject = () => {
    if (!reason.trim()) return;
    onReject(trip.id, reason.trim());
    setRejecting(false);
    onClose();
  };

  const steps = [
    { label: 'Created', done: true, time: trip.createdAt },
    {
      label: 'Gate Pass Approved',
      done: trip.status !== 'PENDING_APPROVAL' && trip.status !== 'REJECTED',
      time: trip.approvedAt,
    },
    {
      label: 'Corridor In-Transit',
      done: trip.status === 'IN_PROGRESS' || trip.status === 'COMPLETED',
      time: trip.gateOutTime,
    },
    {
      label: 'Discharged & Completed',
      done: trip.status === 'COMPLETED',
      time: trip.gateInTime,
    },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass size={20} color="#06b6d4" />
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
                ITT Mission Inspection: {trip.tripNumber}
              </h3>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>
                Full telematics audit trail & gate pass clearance ledger
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Corridor Route Header Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(16, 185, 129, 0.1) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                Origin Terminal
              </span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#06b6d4' }}>
                {trip.sourceTerminal} Gate
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ArrowRight size={22} color="#34d399" />
              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
                Corridor Shuttle
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                Destination Berth
              </span>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                {trip.destinationTerminal} Bay
              </div>
            </div>
          </div>

          {/* Lifecycle Stepper */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            {steps.map((st, i) => (
              <div
                key={i}
                style={{
                  background: st.done ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                  border: `1px solid ${st.done ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: st.done ? '#34d399' : '#64748b',
                    marginBottom: '4px',
                  }}
                >
                  Step {i + 1}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: st.done ? '#f1f5f9' : '#94a3b8' }}>
                  {st.label}
                </div>
                {st.time && (
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {st.time.split(' ')[1] || st.time}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Driver & Equipment Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div
              style={{
                background: 'var(--bg-input)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Assigned Driver
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px' }}>{trip.driverName}</div>
              <div style={{ fontSize: '12px', color: '#06b6d4', marginTop: '2px' }}>
                Code: {trip.driverCode} • Phone: {trip.driverPhone}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-input)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Prime Mover & Port CHE No
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="tag-mono" style={{ fontSize: '14px' }}>
                  {trip.vehicleNumber}
                </span>
                <span className="tag-che" style={{ fontSize: '14px' }}>
                  {trip.cheNumber}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Operator: <b>{trip.operator}</b>
              </div>
            </div>
          </div>

          {/* Containers Manifest */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#94a3b8',
                marginBottom: '8px',
              }}
            >
              Loaded Freight Containers ({trip.containers.length})
            </div>
            {trip.containers.map((c) => (
              <div
                key={c.id}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tag-mono" style={{ color: '#34d399', fontSize: '14px' }}>
                      {c.containerNumber}
                    </span>
                    <span className="badge badge-completed">{c.size} High Cube</span>
                    <span className="badge badge-in-progress">{c.cargoType}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Vessel: {c.vesselName || 'SLPA Shuttle'} • Seal: {c.sealNumber || 'SLPA-OK'} • Weight: {c.weightTonnes || 24}T
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-approved">ISO 6346 Verified</span>
                  {c.unloadedAt && (
                    <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                      Discharged: {c.unloadedAt.split(' ')[1]}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Supervisor / Admin Audit Trail */}
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '12px',
              color: '#94a3b8',
            }}
          >
            <div>
              <b>Supervisor Clearance:</b> {trip.approvedBy || 'Pending origin gate pass'}
            </div>
            {trip.approvedAt && <div><b>Approved Timestamp:</b> {trip.approvedAt}</div>}
            {trip.notes && <div><b>Notes:</b> {trip.notes}</div>}
            {trip.rejectionReason && (
              <div style={{ color: '#f87171', marginTop: '4px' }}>
                <b>Rejection Reason:</b> {trip.rejectionReason}
              </div>
            )}
          </div>

          {/* Reject Reason Form (if toggled) */}
          {rejecting && (
            <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <label className="form-label" style={{ color: '#f87171' }}>
                Specify Reason for Gate Rejection
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Broken seal, overweight, or hazardous documentation missing..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setRejecting(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleConfirmReject}>
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>

          {trip.status === 'PENDING_APPROVAL' && !rejecting && (
            <>
              <button className="btn btn-danger" onClick={() => setRejecting(true)}>
                <ShieldAlert size={14} />
                <span>Reject Pass</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onApprove(trip.id);
                  onClose();
                }}
              >
                <CheckCircle2 size={14} />
                <span>Approve Gate Pass</span>
              </button>
            </>
          )}

          {trip.status === 'APPROVED' && (
            <button
              className="btn btn-cyan"
              onClick={() => {
                onDispatch(trip.id);
                onClose();
              }}
            >
              <Truck size={14} />
              <span>Depart Origin Gate</span>
            </button>
          )}

          {trip.status === 'IN_PROGRESS' && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onComplete(trip.id);
                onClose();
              }}
            >
              <CheckCheck size={14} />
              <span>Discharge & Complete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
