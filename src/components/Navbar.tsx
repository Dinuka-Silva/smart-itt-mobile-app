import React, { useState, useEffect } from 'react';
import {
  Clock,
  Server,
  RefreshCw,
  Anchor,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { adminDataService } from '../services/dataService';
import { WebUser } from './LoginPage';

interface NavbarProps {
  currentUser?: WebUser | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout }) => {
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
    if (online) await adminDataService.refreshLiveData();
    setTimeout(() => setProbing(false), 600);
  };

  useEffect(() => {
    handleProbe();
  }, []);

  // Web portal only has ADMIN role
  const roleIcon = <ShieldCheck size={13} color="#06b6d4" />;
  const roleColor = '#06b6d4';

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
          <h1>SMART ITT ADMIN PANEL</h1>
          <p>Supervisory Control • Driver Telematics &amp; Vehicle Management</p>
        </div>
      </div>

      <div className="nav-actions">
        {/* Live Port Clock */}
        <div className="clock-telemetry" title="Sri Lanka Standard Time (SLST)">
          <Clock size={13} color="#94a3b8" />
          <span>{timeStr || '15:28:42'} SLST</span>
        </div>

        {/* Backend Online pill */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleProbe}
          title={
            backendOnline
              ? 'Connected to Spring Boot 3.2 API (localhost:8080) — click to refresh live data'
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

        {/* Logged-in user chip */}
        {currentUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px 5px 8px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${roleColor}33`,
              borderRadius: '999px',
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: `${roleColor}1a`,
                border: `1px solid ${roleColor}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {roleIcon}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: roleColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                ADMIN
              </div>
            </div>
          </div>
        )}

        {/* Logout button */}
        {onLogout && (
          <button
            id="navbar-logout"
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            title="Sign out of the Command Portal"
            style={{ gap: '5px', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.25)' }}
          >
            <LogOut size={13} color="#f43f5e" />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Sign Out</span>
          </button>
        )}

        {/* Live Beacon */}
        <div className="live-beacon">
          <div className="beacon-pulse" />
          <span>OPS ACTIVE</span>
        </div>
      </div>
    </header>
  );
};
