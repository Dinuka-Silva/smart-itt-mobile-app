import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { AdminSignOutModal } from './components/AdminSignOutModal';
import { DashboardPage } from './pages/DashboardPage';
import { DriversPage } from './pages/DriversPage';
import { SupervisorsPage } from './pages/SupervisorsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { TripsPage } from './pages/TripsPage';
import { ContainersPage } from './pages/ContainersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { LoginPage } from './pages/LoginPage';
import { adminWebService } from './services/adminWebService';

export function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('smart_itt_admin_token');
    const u = adminWebService.getCurrentUser();
    if (token) {
      setUser(u || { fullName: 'System Administrator', role: 'ADMIN' });
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleOpenSignOut = () => {
    setSignOutModalVisible(true);
  };

  const handleConfirmSignOut = () => {
    setSignOutModalVisible(false);
    adminWebService.logout();
    setUser(null);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab as NavTab);
  };

  if (!user) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'System Overview',
      subtitle: user?.fullName || user?.name || 'Administrator',
    },
    drivers: {
      title: 'Driver Fleet Directory',
      subtitle: 'Manage Driver Accounts, Licenses, and Assigned Prime Movers',
    },
    supervisors: {
      title: 'Field Supervisors',
      subtitle: 'Port-wide Terminal Supervision & Verification Officers',
    },
    vehicles: {
      title: 'Fleet Prime Movers',
      subtitle: 'SCK Logistics & SDR LINK Authorized Fleet Units',
    },
    trips: {
      title: 'ITT Container Operations',
      subtitle: 'Live Inter-Terminal Movements, Dispatches, and Approvals',
    },
    containers: {
      title: 'Container Inventory',
      subtitle: 'Port-wide Container Tracking & Dwell Time Analysis',
    },
    reports: {
      title: 'Reports & Intelligence',
      subtitle: 'SLPA Movement Audits, Supervisor Summaries, and Invoice Totals',
    },
    audit: {
      title: 'Security Audit Trail',
      subtitle: 'Immutable System Operations & Access Logs',
    },
  };

  const currentMeta = tabTitles[activeTab];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleOpenSignOut}
        user={user}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          userName={user?.fullName || user?.name || 'Administrator'}
          onRefresh={handleRefresh}
          onLogout={handleOpenSignOut}
          onNavigateTab={handleNavigateTab}
        />

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'dashboard' && (
            <DashboardPage
              key={refreshKey}
              onNavigateTab={handleNavigateTab}
              onOpenSignOut={handleOpenSignOut}
            />
          )}
          {activeTab === 'drivers' && <DriversPage key={refreshKey} />}
          {activeTab === 'supervisors' && <SupervisorsPage key={refreshKey} />}
          {activeTab === 'vehicles' && <VehiclesPage key={refreshKey} />}
          {activeTab === 'trips' && <TripsPage key={refreshKey} />}
          {activeTab === 'containers' && <ContainersPage key={refreshKey} />}
          {activeTab === 'reports' && <ReportsPage key={refreshKey} />}
          {activeTab === 'audit' && <AuditLogsPage key={refreshKey} />}
        </main>
      </div>

      {/* Admin Sign Out Confirmation Modal matching mobile AdminSignOutModal */}
      <AdminSignOutModal
        visible={signOutModalVisible}
        onClose={() => setSignOutModalVisible(false)}
        onConfirm={handleConfirmSignOut}
        userName={user?.fullName || user?.name || 'Administrator'}
      />
    </div>
  );
}

export default App;
