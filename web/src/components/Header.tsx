import React from 'react';
import { RefreshCw, ShieldCheck, Server, LogOut, Receipt, Users } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  userName?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onLogout?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  userName = 'Administrator',
  onRefresh,
  refreshing,
  onLogout,
  onNavigateTab,
}) => {
  return (
    <header style={styles.header}>
      {/* Left: Mobile-Matching Header Badge + Adaptive Titles */}
      <div style={styles.headerLeft}>
        <div style={styles.badgePill}>
          <ShieldCheck size={11} color="#00e5ff" />
          <span style={styles.badgePillText}>ADMIN CONSOLE</span>
        </div>
        <h1 style={styles.title} title={title}>{title}</h1>
        {subtitle && (
          <p style={styles.subtitle} title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Actions matching Mobile Header */}
      <div style={styles.rightActions}>
        <div style={styles.statusPill}>
          <Server size={12} color="#00e676" />
          <span style={styles.statusDot}></span>
          <span style={styles.statusText} className="hide-on-tablet">GATEWAY ACTIVE</span>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('audit')}
            style={styles.iconBtn}
            title="Security Audit Trail"
          >
            <Receipt size={15} color="#90caf9" />
          </button>
        )}

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('supervisors')}
            style={styles.iconBtn}
            title="Field Supervisors"
          >
            <Users size={15} color="#90caf9" />
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            style={styles.iconBtn}
            title="Refresh Live Fleet Data"
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              color="#00e5ff"
              style={{
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            style={styles.logoutBtn}
            title="Sign Out of Admin Console"
          >
            <LogOut size={14} color="#ff8a80" />
            <span style={styles.logoutText}>Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    minHeight: '66px',
    height: 'auto',
    backgroundColor: '#070f1e',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 20px',
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
    minWidth: 0,
    flex: '1 1 auto',
    overflow: 'hidden',
  },
  badgePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    border: '1px solid rgba(0, 229, 255, 0.3)',
    borderRadius: '16px',
    padding: '1px 8px',
    width: 'fit-content',
    marginBottom: '2px',
  },
  badgePillText: {
    color: '#00e5ff',
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.08em',
  },
  title: {
    fontSize: 'clamp(15px, 1.6vw, 19px)',
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.2,
    letterSpacing: '0.2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: 'clamp(10px, 1vw, 11px)',
    color: '#78909c',
    fontWeight: 500,
    margin: 0,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: '16px',
    padding: '4px 8px',
    border: '1px solid rgba(0, 230, 118, 0.25)',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#00e676',
    boxShadow: '0 0 6px #00e676',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#00e676',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  },
  iconBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#0c1b30',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    border: '1px solid rgba(255, 82, 82, 0.25)',
    color: '#ff8a80',
    padding: '6px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  logoutText: {
    color: '#ff8a80',
    fontWeight: 700,
    fontSize: '11px',
  },
};
