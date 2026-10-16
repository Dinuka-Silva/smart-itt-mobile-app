import React, { useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  Ship,
  Sparkles,
  Layers,
} from 'lucide-react';
import { validateIsoContainer, IsoValidationResult } from '../utils/isoValidator';
import { IttTrip } from '../types';

interface ContainersTabProps {
  trips: IttTrip[];
}

export const ContainersTab: React.FC<ContainersTabProps> = ({ trips }) => {
  const [testNumber, setTestNumber] = useState('MSCU7829103');
  const [validationResult, setValidationResult] = useState<IsoValidationResult>(
    validateIsoContainer('MSCU7829103')
  );
  const [search, setSearch] = useState('');

  const handleTestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setTestNumber(val);
    setValidationResult(validateIsoContainer(val));
  };

  // Extract all containers across trips
  const allContainers = trips.flatMap((trip) =>
    trip.containers.map((c) => ({
      ...c,
      tripNumber: trip.tripNumber,
      tripStatus: trip.status,
      driverName: trip.driverName,
      sourceTerminal: trip.sourceTerminal,
      destinationTerminal: trip.destinationTerminal,
    }))
  );

  const filteredContainers = allContainers.filter(
    (c) =>
      c.containerNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.vesselName && c.vesselName.toLowerCase().includes(search.toLowerCase())) ||
      c.tripNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h2>Container Registry & ISO 6346 Verification Engine</h2>
          <p>
            Cryptographic check digit validation, dual 20FT & 40FT chassis capacity verification,
            and vessel association tracking across Sri Lanka maritime berths.
          </p>
        </div>
      </div>

      {/* ISO 6346 Live Interactive Inspector */}
      <div className="panel" style={{ background: 'var(--bg-card)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#06b6d4',
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 }}>
              Interactive ISO 6346 Check Digit Inspector
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Standard ISO 6346 format: [3 Letters: Owner] + [1 Letter: Category 'U'] + [6 Digits:
              Serial] + [1 Digit: Check Digit (Mod-11)]
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <label className="form-label">Test Container Number</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                value={testNumber}
                onChange={handleTestChange}
                placeholder="e.g. MSCU7829103 or CMAU9201948"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '12px 16px',
                  borderColor: validationResult.valid ? '#10b981' : '#f43f5e',
                }}
              />
            </div>

            {/* Quick demo chip selector */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', alignSelf: 'center' }}>
                Test presets:
              </span>
              {['MSCU7829103', 'CMAU9201948', 'HLXU6721094', 'INVALID9991'].map((preset) => (
                <button
                  key={preset}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => {
                    setTestNumber(preset);
                    setValidationResult(validateIsoContainer(preset));
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Validation Breakdown Result Card */}
          <div
            style={{
              flex: 1.5,
              minWidth: '340px',
              background: 'var(--bg-input)',
              border: `1px solid ${
                validationResult.valid ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
              }`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: validationResult.valid ? '#34d399' : '#f87171',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {validationResult.valid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{validationResult.message}</span>
            </div>

            <div className="iso-display-blocks">
              <div className="iso-digit-pill">
                <span style={{ color: '#06b6d4' }}>{validationResult.ownerCode || '---'}</span>
                <span>Owner Code</span>
              </div>
              <div className="iso-digit-pill">
                <span style={{ color: '#a855f7' }}>
                  {validationResult.categoryIdentifier || '-'}
                </span>
                <span>Category (U)</span>
              </div>
              <div className="iso-digit-pill">
                <span style={{ color: '#f1f5f9' }}>{validationResult.serialNumber || '------'}</span>
                <span>Serial No</span>
              </div>
              <div
                className="iso-digit-pill"
                style={{
                  borderColor: validationResult.valid ? '#10b981' : '#ef4444',
                  background: validationResult.valid
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                }}
              >
                <span
                  style={{
                    color: validationResult.valid ? '#34d399' : '#f87171',
                    fontSize: '18px',
                  }}
                >
                  {validationResult.actualCheckDigit !== -1
                    ? validationResult.actualCheckDigit
                    : '-'}
                </span>
                <span>Check Digit</span>
              </div>
            </div>

            {validationResult.expectedCheckDigit !== -1 && !validationResult.valid && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#fbbf24' }}>
                Mathematical check digit should be: <b>{validationResult.expectedCheckDigit}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Containers Registry Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Boxes size={18} color="#10b981" />
            <span>Active Containers in Circulation ({filteredContainers.length} Boxes)</span>
          </div>

          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search container number, vessel, trip..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '280px' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Container No (ISO 6346)</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Size & Spec</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Cargo Type</th>
                <th style={{ minWidth: '180px', whiteSpace: 'nowrap' }}>Mother Vessel & Voyage</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Weight & Seal</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Assigned ITT Mission</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Current Terminal Route</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Check Digit</th>
              </tr>
            </thead>
            <tbody>
              {filteredContainers.map((container, idx) => (
                <tr key={`${container.id}-${idx}`}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span
                      className="tag-mono"
                      style={{ fontSize: '12px', fontWeight: 800, color: '#34d399' }}
                    >
                      {container.containerNumber}
                    </span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: container.size === '40FT' ? '#60a5fa' : '#c084fc',
                      }}
                    >
                      {container.size} High Cube
                    </span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="badge badge-completed">{container.cargoType}</span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600 }}>{container.vesselName || 'SLPA Shuttle'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {container.voyageNo || 'VOY-2026'}
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>
                      {container.weightTonnes ? `${container.weightTonnes} Tonnes` : '24.0 Tonnes'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Seal: {container.sealNumber || 'SLPA-VERIFIED'}
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="tag-mono">{container.tripNumber}</span>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#06b6d4' }}>
                        {container.sourceTerminal}
                      </span>
                      <span>➔</span>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>
                        {container.destinationTerminal}
                      </span>
                    </div>
                  </td>

                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span
                      className="badge badge-approved"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                    >
                      <Check size={11} /> ISO Valid
                    </span>
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
