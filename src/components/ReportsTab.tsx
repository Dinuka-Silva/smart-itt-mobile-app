import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Boxes,
  Truck,
  Building2,
  FileText,
} from 'lucide-react';
import { IttTrip, TerminalInfo } from '../types';

interface ReportsTabProps {
  trips: IttTrip[];
  terminals: TerminalInfo[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ trips, terminals }) => {
  const [period, setPeriod] = useState<'TODAY' | 'WEEKLY' | 'MONTHLY' | 'ALL'>('WEEKLY');
  const [operatorFilter, setOperatorFilter] = useState<string>('ALL');

  const filteredTrips = trips.filter((t) => {
    if (operatorFilter !== 'ALL' && t.operator !== operatorFilter) return false;
    return true;
  });

  const exportToCsv = () => {
    const headers = [
      'Mission Number',
      'Driver Name',
      'Driver Code',
      'Vehicle Number',
      'Port CHE No',
      'Fleet Operator',
      'Origin Terminal',
      'Destination Terminal',
      'Container Numbers',
      'Container Sizes',
      'Status',
      'Created At',
      'Gate-Out Time',
      'Gate-In Time',
      'Approved By',
      'Rejection Reason',
    ];

    const rows = filteredTrips.map((t) => [
      `"${t.tripNumber}"`,
      `"${t.driverName}"`,
      `"${t.driverCode}"`,
      `"${t.vehicleNumber}"`,
      `"${t.cheNumber}"`,
      `"${t.operator}"`,
      `"${t.sourceTerminal}"`,
      `"${t.destinationTerminal}"`,
      `"${t.containers.map((c) => c.containerNumber).join(', ')}"`,
      `"${t.containers.map((c) => c.size).join(', ')}"`,
      `"${t.status}"`,
      `"${t.createdAt}"`,
      `"${t.gateOutTime || ''}"`,
      `"${t.gateInTime || ''}"`,
      `"${t.approvedBy || ''}"`,
      `"${t.rejectionReason || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `SMART_ITT_Dispatch_Manifest_${period}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h2>Port Logistics Reports & Multi-Format Dispatch Export</h2>
          <p>
            Generate official terminal dispatch records, driver performance logs, and container
            manifests in Microsoft Excel (.csv / .xls) and formatted printable PDF.
          </p>
        </div>
        <div className="header-action-group">
          <button className="btn btn-primary" onClick={exportToCsv}>
            <Download size={16} />
            <span>EXPORT AS EXCEL (.XLS / .CSV)</span>
          </button>
          <button className="btn btn-cyan" onClick={handlePrint}>
            <Printer size={16} />
            <span>PRINT / SAVE AS PDF</span>
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div
        className="panel"
        style={{ padding: '16px 20px', marginBottom: '24px' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginRight: '6px' }}>
              Report Timeframe:
            </span>
            {(['TODAY', 'WEEKLY', 'MONTHLY', 'ALL'] as const).map((p) => (
              <button
                key={p}
                className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPeriod(p)}
                style={{ fontWeight: 700 }}
              >
                {p === 'WEEKLY' ? 'WEEKLY (7D)' : p === 'MONTHLY' ? 'MONTHLY (30D)' : p}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Filter Operator:</span>
            <select
              className="filter-select"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
              style={{ padding: '6px 12px' }}
            >
              <option value="ALL">All Operators</option>
              <option value="SCK Logistics">SCK Logistics</option>
              <option value="SDR LINK">SDR LINK</option>
              <option value="E3 Logistics">E3 Logistics</option>
            </select>
          </div>
        </div>
      </div>

      {/* Printable Report Header Manifest (Visible in print) */}
      <div className="panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderBottom: '2px solid rgba(255,255,255,0.1)',
            paddingBottom: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  background: '#059669',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800 }}>
                  SRI LANKA PORTS AUTHORITY (SLPA)
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Smart Inter-Terminal Transportation (SMART ITT) Official Manifest
                </p>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Generated:</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
              {new Date().toLocaleString()} SLST
            </div>
            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              Audit Passcode: SLPA-ITT-SEC-2026
            </div>
          </div>
        </div>

        {/* High Density Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Mission No</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Corridor Route</th>
                <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Prime Mover & CHE</th>
                <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Driver Details</th>
                <th style={{ minWidth: '150px', whiteSpace: 'nowrap' }}>Container No(s)</th>
                <th style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>Size / TEU</th>
                <th style={{ minWidth: '130px', whiteSpace: 'nowrap' }}>Gate-Out / Gate-In</th>
                <th style={{ minWidth: '160px', whiteSpace: 'nowrap' }}>Supervisor Audit</th>
                <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr key={trip.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className="tag-mono" style={{ fontSize: '12px' }}>{trip.tripNumber}</span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 800 }}>
                      {trip.sourceTerminal} ➔ {trip.destinationTerminal}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="tag-mono">{trip.vehicleNumber}</span>
                      <span className="tag-che">{trip.cheNumber}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{trip.operator}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700 }}>{trip.driverName}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{trip.driverCode}</div>
                  </td>
                  <td>
                    {trip.containers.map((c) => (
                      <div key={c.id} style={{ whiteSpace: 'nowrap', marginBottom: '2px' }}>
                        <span className="tag-mono" style={{ color: '#34d399' }}>
                          {c.containerNumber}
                        </span>
                      </div>
                    ))}
                  </td>
                  <td>
                    {trip.containers.map((c) => (
                      <div key={c.id} style={{ fontSize: '11px' }}>
                        {c.size} ({c.size === '40FT' ? '2 TEU' : '1 TEU'})
                      </div>
                    ))}
                  </td>
                  <td>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      <div>Out: {trip.gateOutTime ? trip.gateOutTime.split(' ')[1] : '—'}</div>
                      <div>In: {trip.gateInTime ? trip.gateInTime.split(' ')[1] : '—'}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11px' }}>{trip.approvedBy || 'Pending Gate'}</div>
                    {trip.rejectionReason && (
                      <div style={{ fontSize: '10px', color: '#f87171' }}>
                        {trip.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        trip.status === 'COMPLETED'
                          ? 'badge-completed'
                          : trip.status === 'IN_PROGRESS'
                          ? 'badge-in-progress'
                          : trip.status === 'APPROVED'
                          ? 'badge-approved'
                          : trip.status === 'REJECTED'
                          ? 'badge-rejected'
                          : 'badge-pending'
                      }`}
                    >
                      {trip.status}
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
