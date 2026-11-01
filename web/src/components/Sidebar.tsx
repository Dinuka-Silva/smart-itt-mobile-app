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
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid #E2E8F0',
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
    borderBottom: '1px solid #E2E8F0',
  },
  logoWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#EFF6FF',
    border: '1.5px solid #2563EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#2563EB',
    fontWeight: 800,
    fontSize: '13px',
    letterSpacing: '1px',
  },
  brandTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#1E293B',
    letterSpacing: '0.5px',
    margin: 0,
  },
  brandSub: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748B',
    letterSpacing: '0.8px',
    margin: '2px 0 0 0',
  },
  telematicsPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#EFF6FF',
    borderRadius: '20px',
    padding: '4px 10px',
    marginTop: '12px',
    marginBottom: '16px',
    border: '1px solid #DBEAFE',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#2563EB',
  },
  telematicsText: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#2563EB',
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
    color: '#64748B',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  navBtnActive: {
    background: '#EFF6FF',
    color: '#2563EB',
    fontWeight: 700,
    borderLeft: '3px solid #2563EB',
  },
  footer: {
    paddingTop: '16px',
    borderTop: '1px solid #E2E8F0',
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
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
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
    color: '#1E293B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#2563EB',
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
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
  },
};
