import React, { useState } from 'react';
import { Building2, Layers } from 'lucide-react';
import { TerminalInfo, TerminalCode } from '../types';

interface TerminalsTabProps {
  terminals: TerminalInfo[];
}

export const TerminalsTab: React.FC<TerminalsTabProps> = ({ terminals }) => {
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalCode | null>(null);

  const handleSelect = (code: TerminalCode) => {
    setSelectedTerminal((prev) => (prev === code ? null : code));
  };

  // Inter-terminal traffic exchange matrix
  const matrix: Record<TerminalCode, Record<TerminalCode, number>> = {
    CICT: { CICT: 0, CWIT: 3, ECT: 2, JCT: 5, UCT: 1, SAGT: 3 },
    CWIT: { CICT: 2, CWIT: 0, ECT: 1, JCT: 4, UCT: 0, SAGT: 2 },
    ECT: { CICT: 2, CWIT: 1, ECT: 0, JCT: 5, UCT: 1, SAGT: 2 },
    JCT: { CICT: 6, CWIT: 3, ECT: 4, JCT: 0, UCT: 2, SAGT: 4 },
    UCT: { CICT: 1, CWIT: 1, ECT: 1, JCT: 2, UCT: 0, SAGT: 1 },
    SAGT: { CICT: 4, CWIT: 2, ECT: 2, JCT: 3, UCT: 1, SAGT: 0 },
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-title-block">
          <h2>Port Corridor Traffic Matrix & Terminal Analytics</h2>
          <p>
            Multi-directional container freight movements across all 6 Sri Lanka Port Authority (SLPA)
            deep-water berths and terminal gates.
          </p>
        </div>
      </div>

      {/* Terminal Selectors Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {terminals.map((t) => (
          <button
            key={t.code}
            className={`btn ${selectedTerminal === t.code ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleSelect(t.code)}
            style={{
              borderColor: selectedTerminal === t.code ? t.color : undefined,
              gap: '8px',
            }}
          >
            <Building2 size={16} color={selectedTerminal === t.code ? '#fff' : t.color} />
            <span style={{ fontWeight: 800 }}>{t.code}</span>
            <span
              style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.15)',
              }}
            >
              {t.totalTripsToday}
            </span>
          </button>
        ))}
      </div>

      {/* 6x6 Inter-Terminal Exchange Matrix Table */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            <Layers size={18} color="#06b6d4" />
            <span>Consolidated 6x6 Corridor Transfer Matrix (Trips Today)</span>
          </div>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Rows: Origin Gate (Out) ➔ Columns: Destination Bay (In)
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table" style={{ textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: '130px', whiteSpace: 'nowrap' }}>Origin \ Dest</th>
                {terminals.map((t) => (
                  <th key={t.code} style={{ textAlign: 'center', color: t.color, minWidth: '70px', whiteSpace: 'nowrap' }}>
                    {t.code}
                  </th>
                ))}
                <th style={{ textAlign: 'center', color: '#10b981', minWidth: '85px', whiteSpace: 'nowrap' }}>Total Out</th>
              </tr>
            </thead>
            <tbody>
              {terminals.map((origin) => {
                let rowTotal = 0;
                const isSelected = selectedTerminal === origin.code;
                return (
                  <tr
                    key={origin.code}
                    style={{
                      background: isSelected ? 'rgba(14, 165, 233, 0.12)' : undefined,
                      boxShadow: isSelected ? `inset 3px 0 0 ${origin.color}` : undefined,
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td style={{ textAlign: 'left', fontWeight: 800, color: origin.color, whiteSpace: 'nowrap' }}>
                      {origin.code} ({origin.fullName.split(' ')[0]})
                    </td>
                    {terminals.map((dest) => {
                      const count = matrix[origin.code][dest.code];
                      rowTotal += count;
                      return (
                        <td key={dest.code}>
                          {origin.code === dest.code ? (
                            <span style={{ color: '#334155' }}>—</span>
                          ) : (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                color: count > 3 ? '#34d399' : '#f1f5f9',
                                background: count > 3 ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          color: '#10b981',
                        }}
                      >
                        {rowTotal}
                      </span>
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
