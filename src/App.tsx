import React, { useState, useEffect } from 'react';
import { Sidebar, AdminTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/OverviewTab';
import { FleetTab } from './components/FleetTab';
import { DriversTab } from './components/DriversTab';
import { TripsTab } from './components/TripsTab';
import { ContainersTab } from './components/ContainersTab';
import { TerminalsTab } from './components/TerminalsTab';
import { ReportsTab } from './components/ReportsTab';
import { SupervisionTab } from './components/SupervisionTab';

import { TripDetailModal } from './components/TripDetailModal';
import { AddVehicleModal } from './components/AddVehicleModal';
import { AddDriverModal } from './components/AddDriverModal';
import { CreateTripModal } from './components/CreateTripModal';
import { LoginPage, WebUser } from './components/LoginPage';

import { adminDataService } from './services/dataService';
import { IttTrip } from './types';

const USER_KEY = 'smart_itt_web_user';
const TOKEN_KEY = 'smart_itt_web_token';

export function App() {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<WebUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw) as WebUser;
    } catch {}
    return null;
  });

  const handleLogin = (user: WebUser) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setCurrentUser(null);
  };

  // ─── Navigation ────────────────────────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const requested = (params.get('tab') || hash) as AdminTab;
    const validTabs: AdminTab[] = [
      'overview',
      'supervision',
      'trips',
      'fleet',
      'drivers',
      'containers',
      'terminals',
      'reports',
    ];
    if (requested && validTabs.includes(requested)) return requested;
    return 'supervision';
  });
  const [, setTick] = useState(0);

  // ─── Modals ────────────────────────────────────────────────────────────────
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [inspectedTrip, setInspectedTrip] = useState<IttTrip | null>(null);

  // Subscribe to reactive data store
  useEffect(() => {
    const unsubscribe = adminDataService.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  // ─── Show login screen if not authenticated ─────────────────────────────
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // ─── Data ──────────────────────────────────────────────────────────────────
  const stats = adminDataService.getDashboardStats();
  const terminals = adminDataService.getTerminals();
  const vehicles = adminDataService.getVehicles();
  const drivers = adminDataService.getDrivers();
  const trips = adminDataService.getTrips();
  const supervisors = adminDataService.getSupervisors();

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleApproveTrip = (tripId: string) => {
    adminDataService.approveTrip(tripId, currentUser.name);
    if (inspectedTrip && inspectedTrip.id === tripId) {
      setInspectedTrip(adminDataService.getTripById(tripId) || null);
    }
  };

  const handleRejectTrip = (tripId: string, reason?: string) => {
    if (!reason) {
      const target = trips.find((t) => t.id === tripId);
      if (target) setInspectedTrip(target);
      return;
    }
    adminDataService.rejectTrip(tripId, reason, currentUser.name);
    if (inspectedTrip && inspectedTrip.id === tripId) {
      setInspectedTrip(adminDataService.getTripById(tripId) || null);
    }
  };

  const handleDispatchTrip = (tripId: string) => {
    adminDataService.dispatchTrip(tripId);
    if (inspectedTrip && inspectedTrip.id === tripId) {
      setInspectedTrip(adminDataService.getTripById(tripId) || null);
    }
  };

  const handleCompleteTrip = (tripId: string) => {
    adminDataService.completeTrip(tripId);
    if (inspectedTrip && inspectedTrip.id === tripId) {
      setInspectedTrip(adminDataService.getTripById(tripId) || null);
    }
  };

  return (
    <div className="admin-shell">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingApprovalsCount={stats.tripsPendingApproval}
      />

      {/* Main Administrative Viewport */}
      <div className="main-viewport">
        <Navbar currentUser={currentUser} onLogout={handleLogout} />

        <main className="content-area">
          {currentTab === 'overview' && (
            <OverviewTab
              stats={stats}
              terminals={terminals}
              trips={trips}
              vehicles={vehicles}
              onApproveTrip={handleApproveTrip}
              onRejectTrip={(id) => handleRejectTrip(id)}
              onViewTrip={setInspectedTrip}
              onNavigateToTab={setCurrentTab}
              onUpdateLicense={(id, date) => adminDataService.updateVehicleLicense(id, date)}
            />
          )}

          {currentTab === 'supervision' && (
            <SupervisionTab
              supervisors={supervisors}
              drivers={drivers}
              vehicles={vehicles}
              trips={trips}
              terminals={terminals}
              onApproveTrip={handleApproveTrip}
              onRejectTrip={(id, reason) => handleRejectTrip(id, reason)}
              onUpdateDriverShift={(id, status) => adminDataService.updateDriverShiftStatus(id, status)}
              onUpdateSupervisorStatus={(id, status) => adminDataService.updateSupervisorStatus(id, status)}
              onUpdateVehicleStatus={(id, status) => adminDataService.updateVehicleStatus(id, status)}
              onReassignVehicle={(drvId, che) => adminDataService.reassignDriverVehicle(drvId, che)}
              onViewTrip={setInspectedTrip}
            />
          )}

          {currentTab === 'trips' && (
            <TripsTab
              trips={trips}
              onApproveTrip={handleApproveTrip}
              onRejectTrip={(id) => handleRejectTrip(id)}
              onCompleteTrip={handleCompleteTrip}
              onViewTrip={setInspectedTrip}
              onOpenCreateTripModal={() => setCreateTripOpen(true)}
            />
          )}

          {currentTab === 'fleet' && (
            <FleetTab
              vehicles={vehicles}
              onUpdateStatus={(id, status) => adminDataService.updateVehicleStatus(id, status)}
              onUpdateLicense={(id, date) => adminDataService.updateVehicleLicense(id, date)}
              onOpenAddVehicleModal={() => setAddVehicleOpen(true)}
            />
          )}

          {currentTab === 'drivers' && (
            <DriversTab
              drivers={drivers}
              onUpdateStatus={(id, status) => adminDataService.updateDriverStatus(id, status)}
              onOpenAddDriverModal={() => setAddDriverOpen(true)}
            />
          )}

          {currentTab === 'containers' && <ContainersTab trips={trips} />}

          {currentTab === 'terminals' && <TerminalsTab terminals={terminals} />}

          {currentTab === 'reports' && <ReportsTab trips={trips} terminals={terminals} />}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <TripDetailModal
        trip={inspectedTrip}
        onClose={() => setInspectedTrip(null)}
        onApprove={handleApproveTrip}
        onReject={handleRejectTrip}
        onDispatch={handleDispatchTrip}
        onComplete={handleCompleteTrip}
      />

      <AddVehicleModal
        isOpen={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
        onAdd={(data) => adminDataService.addVehicle(data)}
      />

      <AddDriverModal
        isOpen={addDriverOpen}
        onClose={() => setAddDriverOpen(false)}
        onAdd={(data) => adminDataService.addDriver(data)}
      />

      <CreateTripModal
        isOpen={createTripOpen}
        onClose={() => setCreateTripOpen(false)}
        drivers={drivers}
        onCreate={(data) => adminDataService.createTrip(data)}
      />
    </div>
  );
}

export default App;
