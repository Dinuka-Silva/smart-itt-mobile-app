import React from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  Compass,
  Boxes,
  Building2,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

export type AdminTab =
  | 'overview'
  | 'supervision'
  | 'trips'
  | 'fleet'
  | 'drivers'
  | 'containers'
  | 'terminals'
  | 'reports';

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount,
}) => {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header" style={{ padding: '16px 14px' }}>
        <div
          className="sidebar-logo"
          style={{
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
          }}
        >
          <img
            src="/sck-logo.png"
            alt="SCK Logo"
            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
          />
        </div>
        <div className="sidebar-title">
          <span style={{ color: '#06b6d4', fontWeight: 800 }}>SCK LOGISTICS</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>ITT Operations HQ</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="sidebar-nav">
        <div className="nav-section-title">Operations Command</div>

        <button
          className={`nav-item ${currentTab === 'overview' ? 'active' : ''}`}
          onClick={() => onSelectTab('overview')}
        >
          <div className="nav-item-content">
            <LayoutDashboard size={16} />
            <span>Port Overview</span>
          </div>
        </button>

        <button
          className={`nav-item ${currentTab === 'supervision' ? 'active' : ''}`}
          onClick={() => onSelectTab('supervision')}
        >
          <div className="nav-item-content">
            <ShieldCheck size={16} color={currentTab === 'supervision' ? '#06b6d4' : '#10b981'} />
            <span style={{ fontWeight: 600 }}>SCK Daily Operations</span>
          </div>
          {pendingApprovalsCount > 0 && (
            <span
              className="nav-badge"
              style={{
                background: '#f59e0b',
                color: '#0e141d',
                fontWeight: 800,
                fontSize: '10px',
                padding: '2px 7px',
              }}
              title={`${pendingApprovalsCount} trips awaiting supervisor clearance`}
            >
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          className={`nav-item ${currentTab === 'trips' ? 'active' : ''}`}
          onClick={() => onSelectTab('trips')}
        >
          <div className="nav-item-content">
            <Compass size={16} />
            <span>ITT Missions</span>
          </div>
          {pendingApprovalsCount > 0 && (
            <span className="nav-item-badge">{pendingApprovalsCount}</span>
          )}
        </button>

        <button
          className={`nav-item ${currentTab === 'terminals' ? 'active' : ''}`}
          onClick={() => onSelectTab('terminals')}
        >
          <div className="nav-item-content">
            <Building2 size={16} />
            <span>Terminal Matrix</span>
          </div>
        </button>

        <div className="nav-section-title">Fleet & Assets</div>

        <button
          className={`nav-item ${currentTab === 'fleet' ? 'active' : ''}`}
          onClick={() => onSelectTab('fleet')}
        >
          <div className="nav-item-content">
            <Truck size={16} />
            <span>Prime Movers (24)</span>
          </div>
        </button>

        <button
          className={`nav-item ${currentTab === 'drivers' ? 'active' : ''}`}
          onClick={() => onSelectTab('drivers')}
        >
          <div className="nav-item-content">
            <Users size={16} />
            <span>Driver Directory</span>
          </div>
        </button>

        <button
          className={`nav-item ${currentTab === 'containers' ? 'active' : ''}`}
          onClick={() => onSelectTab('containers')}
        >
          <div className="nav-item-content">
            <Boxes size={16} />
            <span>ISO 6346 Registry</span>
          </div>
        </button>

        <div className="nav-section-title">Analytics & Reports</div>

        <button
          className={`nav-item ${currentTab === 'reports' ? 'active' : ''}`}
          onClick={() => onSelectTab('reports')}
        >
          <div className="nav-item-content">
            <FileSpreadsheet size={16} />
            <span>Reports & Exports</span>
          </div>
        </button>
      </div>

      {/* Admin Profile Footer */}
      <div className="sidebar-footer">
        <div className="admin-profile-card">
          <div className="profile-avatar">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Admin Avatar"
            />
          </div>
          <div className="profile-meta">
            <h4>SCK Operations HQ</h4>
            <p>Supervisory Control Deck</p>
          </div>
          <ShieldCheck size={18} color="#10b981" style={{ marginLeft: 'auto' }} />
        </div>
      </div>
    </aside>
  );
};
