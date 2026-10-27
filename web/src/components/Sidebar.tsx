import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Truck,
  ArrowLeftRight,
  Box,
  FileSpreadsheet,
  FileClock,
  LogOut,
  Radio,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'drivers'
  | 'supervisors'
  | 'vehicles'
  | 'trips'
  | 'containers'
  | 'reports'
  | 'audit';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onLogout: () => void;
  user: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  user,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'supervisors', label: 'Supervisors', icon: ShieldCheck },
    { id: 'vehicles', label: 'Fleet & Vehicles', icon: Truck },
    { id: 'trips', label: 'ITT Operations', icon: ArrowLeftRight },
    { id: 'containers', label: 'Containers', icon: Box },
    { id: 'reports', label: 'Reports & Invoices', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit Logs', icon: FileClock },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <div style={styles.logoWrap}>
          <span style={styles.logoText}>ITT</span>
        </div>
        <div>
          <h1 style={styles.brandTitle}>SMART ITT</h1>
          <p style={styles.brandSub}>SCK LOGISTICS CONSOLE</p>
        </div>
      </div>

      <div style={styles.telematicsPill}>
        <span style={styles.dot}></span>
        <span style={styles.telematicsText}>TELEMATICS GATEWAY ACTIVE</span>
      </div>

      {/* Navigation Links */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              style={{
                ...styles.navBtn,
                ...(isActive ? styles.navBtnActive : {}),
              }}
            >
              <Icon size={18} color={isActive ? '#00e5ff' : '#90caf9'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin User Card & Logout */}
      <div style={styles.footer}>
        <div style={styles.userCard}>
          <div style={styles.avatar}>
            {(user?.fullName || user?.name || 'A')[0]}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.fullName || user?.name || 'Administrator'}</div>
            <div style={styles.userRole}>SYSTEM ADMIN</div>
          </div>
        </div>

        <button onClick={onLogout} style={styles.logoutBtn}>
          <LogOut size={16} />
          <span>Exit Console</span>
        </button>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    backgroundColor: '#0a1628',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    padding: '20px 16px',
    boxSizing: 'border-box',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  logoWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    border: '1.5px solid #00e5ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#00e5ff',
    fontWeight: 800,
    fontSize: '13px',
    letterSpacing: '1px',
  },
  brandTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.5px',
    margin: 0,
  },
  brandSub: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#78909c',
    letterSpacing: '0.8px',
    margin: '2px 0 0 0',
  },
  telematicsPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    borderRadius: '20px',
    padding: '4px 10px',
    marginTop: '12px',
    marginBottom: '16px',
    border: '1px solid rgba(0, 229, 255, 0.15)',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#00e5ff',
    boxShadow: '0 0 8px #00e5ff',
  },
  telematicsText: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#00e5ff',
    letterSpacing: '0.5px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    overflowY: 'auto',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'transparent',
    color: '#90caf9',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  navBtnActive: {
    background: 'rgba(0, 229, 255, 0.12)',
    color: '#ffffff',
    fontWeight: 700,
    borderLeft: '3px solid #00e5ff',
  },
  footer: {
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    color: '#00e5ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '13px',
  },
  userInfo: {
    overflow: 'hidden',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#00e5ff',
    letterSpacing: '0.5px',
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    color: '#ff8a80',
    border: '1px solid rgba(255, 82, 82, 0.2)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
  },
};
