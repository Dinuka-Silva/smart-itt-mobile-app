import React, { useState, useEffect } from 'react';
import {
  Clock,
  Server,
  RefreshCw,
  Anchor,
} from 'lucide-react';
import { adminDataService } from '../services/dataService';

export const Navbar: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [probing, setProbing] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleProbe = async () => {
    setProbing(true);
    const online = await adminDataService.probeBackend();
    setBackendOnline(online);
    setTimeout(() => setProbing(false), 600);
  };

  useEffect(() => {
    handleProbe();
  }, []);

  return (
    <header className="top-navbar">
      <div className="nav-brand-title">
        <div className="brand-logo-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/sck-logo.png"
            alt="SCK Logistics"
            style={{ height: '32px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.35))' }}
          />
        </div>
        <div className="brand-badge">
          <Anchor size={13} />
          <span>SCK LOGISTICS • PORT OF COLOMBO</span>
        </div>
        <div className="brand-text">
          <h1>SMART ITT Operations Cockpit</h1>
          <p>Supervisory Control • Driver Telematics & Vehicle Management</p>
        </div>
      </div>

      <div className="nav-actions">
        {/* Live Port Clock */}
        <div className="clock-telemetry" title="Sri Lanka Standard Time (SLST)">
          <Clock size={13} color="#94a3b8" />
          <span>{timeStr || '15:28:42'} SLST</span>
        </div>

        {/* Backend Online / Local Engine Pill */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleProbe}
          title={
            backendOnline
              ? 'Connected to Spring Boot 3.2 API (localhost:8080)'
              : 'Standalone Port Telematics Simulation Engine Active'
          }
          style={{ gap: '5px' }}
        >
          <Server size={13} color={backendOnline ? '#10b981' : '#06b6d4'} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>
            {backendOnline ? 'API: ONLINE' : 'ENGINE: STANDALONE'}
          </span>
          <RefreshCw size={11} className={probing ? 'animate-spin' : ''} />
        </button>

        {/* Live Beacon */}
        <div className="live-beacon">
          <div className="beacon-pulse" />
          <span>OPS ACTIVE</span>
        </div>
      </div>
    </header>
  );
};
