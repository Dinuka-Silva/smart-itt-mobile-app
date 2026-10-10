import { create } from 'zustand';

export interface MockTrip {
  id: string;
  tripNumber: string;
  driverId: string;
  driverName: string;
  vehicleNumber: string;
  chaiNumber?: string;
  vesselName: string;
  voyageNumber?: string;
  operationDate?: string;
  operationTime?: string;
  sourceTerminal?: string;
  destTerminal: string;
  notes?: string;
  status: 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'APPROVED';
  containers: any[];
  startTime: string;
  endTime?: string;
}

interface MockTripState {
  mockTrips: MockTrip[];
  addTrip: (trip: MockTrip) => void;
  updateTripStatus: (id: string, status: MockTrip['status']) => void;
  getTripsForDriver: (driverId: string) => MockTrip[];
  getPendingTrips: () => MockTrip[];
  unloadContainer: (tripId: string, containerId: string, unloadedAt: string) => void;
  addManualContainerToTrip: (tripId: string | undefined, container: any) => void;
}

export const useMockTripStore = create<MockTripState>((set, get) => ({
  mockTrips: [],
  addTrip: (trip) => set((state) => ({ mockTrips: [trip, ...state.mockTrips] })),
  updateTripStatus: (id, status) =>
    set((state) => ({
      mockTrips: state.mockTrips.map((t) => (t.id === id ? { ...t, status } : t)),
    })),
  getTripsForDriver: (driverId) => get().mockTrips.filter((t) => t.driverId === driverId),
  getPendingTrips: () => get().mockTrips.filter((t) => t.status === 'PENDING_APPROVAL'),
  unloadContainer: (tripId, containerId, unloadedAt) =>
    set((state) => {
      const newTrips = state.mockTrips.map((t) => {
        if (t.id !== tripId) return t;
        const newContainers = t.containers.map((c) =>
          c.id === containerId ? { ...c, status: 'DISCHARGED', unloadedAt } : c
        );
        return { ...t, containers: newContainers };
      });
      return { mockTrips: newTrips };
    }),
  addManualContainerToTrip: (tripId, container) =>
    set((state) => {
      if (!tripId) return state;
      const newTrips = state.mockTrips.map((t) => {
        if (t.id !== tripId) return t;
        return {
          ...t,
          containers: [...(t.containers || []), { id: `c-${Date.now()}`, ...container }],
        };
      });
      return { mockTrips: newTrips };
    }),
}));
